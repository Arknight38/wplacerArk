import { Image, createCanvas } from 'canvas';
import { CookieJar } from 'tough-cookie';
import { Impit } from 'impit';
import { WPLACE_ME, WPLACE_PIXEL, WPLACE_PURCHASE, TILE_URL, HTTP_STATUS, MS } from '../config/constants.js';
import { palette, VALID_COLOR_IDS } from '../config/palette.js';
import { NetworkError, SuspensionError } from '../utils/errors.js';
import { log } from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';

/**
 * Minimal WPlacer client for authenticated calls.
 * Holds cookie jar, optional proxy, and Impit fetch context.
 */
export class WPlacer {
    constructor({ template, coords, globalSettings, templateSettings, templateName }) {
        this.template = template;
        this.templateName = templateName;
        this.coords = coords;
        this.globalSettings = globalSettings;
        this.templateSettings = templateSettings || {};
        this.cookies = null;
        this.browser = null;
        this.userInfo = null;
        this.tiles = new Map();
        this.token = null;
        this.pawtect = null;
    }

    async _fetch(url, options) {
        try {
            // Add a default timeout to all requests to prevent hangs
            const optsWithTimeout = { timeout: 30000, ...options };
            return await this.browser.fetch(url, optsWithTimeout);
        } catch (error) {
            if (error.code === 'InvalidArg') {
                throw new NetworkError(`Internal fetch error (InvalidArg) for URL: ${url}. This may be a temporary network issue or a problem with a proxy.`);
            }
            // Re-throw other errors
            throw error;
        }
    }

    async login(cookies) {
        this.cookies = cookies;
        const jar = new CookieJar();
        for (const k of Object.keys(this.cookies)) {
            jar.setCookieSync(`${k}=${this.cookies[k]}; Path=/`, 'https://backend.wplace.live');
        }
        const opts = { cookieJar: jar, browser: 'chrome', ignoreTlsErrors: true };
        // Note: Proxy handling would be injected here
        this.browser = new Impit(opts);
        await this.loadUserInfo();
        return this.userInfo;
    }

    async switchUser(cookies) {
        this.cookies = cookies;
        const jar = new CookieJar();
        for (const k of Object.keys(this.cookies)) jar.setCookieSync(`${k}=${this.cookies[k]}; Path=/`, 'https://backend.wplace.live');
        this.browser.cookieJar = jar;
        await this.loadUserInfo();
        return this.userInfo;
    }

    async loadUserInfo() {
        const me = await this._fetch(WPLACE_ME);
        const bodyText = await me.text();

        if (bodyText.trim().startsWith('<!DOCTYPE html>')) throw new NetworkError('Cloudflare interruption detected.');

        try {
            const userInfo = JSON.parse(bodyText);
            if (userInfo.error === 'Unauthorized')
                throw new NetworkError('(401) Unauthorized. The cookie may be invalid or the current IP/proxy is rate-limited.');
            if (userInfo.error) throw new Error(`(500) Auth failed: "${userInfo.error}".`);
            if (userInfo.id && userInfo.name) {
                this.userInfo = userInfo;
                return true;
            }
            throw new Error(`Unexpected /me response: ${JSON.stringify(userInfo)}`);
        } catch (e) {
            if (e instanceof NetworkError) throw e;
            if (bodyText.includes('Error 1015')) throw new NetworkError('(1015) Rate-limited.');
            if (bodyText.includes('502') && bodyText.includes('gateway')) throw new NetworkError(`(502) Bad Gateway.`);
            throw new Error(`Failed to parse server response: "${bodyText.substring(0, 150)}..."`);
        }
    }

    async post(url, body) {
        const headers = { Accept: '*/*', 'Content-Type': 'text/plain;charset=UTF-8', Referer: 'https://wplace.live/' };
        if (this.pawtect) headers['x-pawtect-token'] = this.pawtect;
        
        // Try to get pawtect token from global context if not already set
        if (!this.pawtect && globalThis.__wplacer_pawtect_token) {
            this.pawtect = globalThis.__wplacer_pawtect_token;
            headers['x-pawtect-token'] = this.pawtect;
        }
        
        const req = await this._fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const data = await req.json();
        return { status: req.status, data };
    }

    /*
     * Load all tiles intersecting the template bounding box into memory.
     * Converts to palette IDs for quick mismatch checks.
     */
    async loadTiles() {
        this.tiles.clear();
        const [tx, ty, px, py] = this.coords;
        const endPx = px + this.template.width;
        const endPy = py + this.template.height;
        const endTx = tx + Math.floor(endPx / 1000);
        const endTy = ty + Math.floor(endPy / 1000);

        const promises = [];
        for (let X = tx; X <= endTx; X++) {
            for (let Y = ty; Y <= endTy; Y++) {
                const p = this._fetch(`${TILE_URL(X, Y)}?t=${Date.now()}`)
                    .then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null))
                    .then((buf) => {
                        if (!buf) return null;
                        const image = new Image();
                        image.src = buf; // node-canvas accepts Buffer
                        const canvas = createCanvas(image.width, image.height);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(image, 0, 0);
                        const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const tile = {
                            width: canvas.width,
                            heigh: canvas.height,
                            data: Array.from({ length: canvas.width }, () => Array(canvas.height)),
                        };
                        for (let x = 0; x < canvas.width; x++) {
                            for (let y = 0; y < canvas.height; y++) {
                                const i = (y * canvas.width + x) * 4;
                                const r = d.data[i],
                                    g = d.data[i + 1],
                                    b = d.data[i + 2],
                                    a = d.data[i + 3];
                                tile.data[x][y] = a === 255 ? palette[`${r},${g},${b}`] || 0 : 0;
                            }
                        }
                        return tile;
                    })
                    .then((tileData) => {
                        if (tileData) {
                            this.tiles.set(`${X}_${Y}`, tileData);
                        }
                    });
                promises.push(p);
            }
        }
        await Promise.all(promises);
        return true;
    }

    hasColor(id) {
        if (id < 32) return true;
        return !!(this.userInfo.extraColorsBitmap & (1 << (id - 32)));
    }

    async _executePaint(tx, ty, body) {
        if (body.colors.length === 0) return { painted: 0 };
        const response = await this.post(WPLACE_PIXEL(tx, ty), body);

        if (response.data.painted && response.data.painted === body.colors.length) {
            log(
                this.userInfo.id,
                this.userInfo.name,
                `[${this.templateName}] 🎨 Painted ${body.colors.length} px at ${tx},${ty}.`
            );
            // Update the in-memory tile data.
            const tile = this.tiles.get(`${tx}_${ty}`);
            if (tile) {
                for (let i = 0; i < body.colors.length; i++) {
                    const px = body.coords[i * 2];
                    const py = body.coords[i * 2 + 1];
                    const color = body.colors[i];
                    if (tile.data[px]) {
                        tile.data[px][py] = color;
                    }
                }
            }
            return { painted: body.colors.length };
        }

        // classify
        if (response.status === HTTP_STATUS.UNAUTH && response.data.error === 'Unauthorized')
            throw new NetworkError('(401) Unauthorized during paint. The cookie may be invalid or the current IP/proxy is rate-limited.');
        if (
            response.status === HTTP_STATUS.FORBIDDEN &&
            (response.data.error === 'refresh' || response.data.error === 'Unauthorized')
        )
            throw new Error('REFRESH_TOKEN');
        if (response.status === HTTP_STATUS.UNAVAILABLE_LEGAL && response.data.suspension)
            throw new SuspensionError(`Account is suspended.`, response.data.durationMs || 0);
        if (response.status === HTTP_STATUS.SRV_ERR) {
            log(this.userInfo.id, this.userInfo.name, `[${this.templateName}] ⏱️ Server error (500). Wait 40s.`);
            await sleep(MS.FORTY_SEC);
            return { painted: 0 };
        }
        if (
            response.status === HTTP_STATUS.TOO_MANY ||
            (response.data.error && response.data.error.includes('Error 1015'))
        )
            throw new NetworkError('(1015) Rate-limited.');

        throw new Error(`Unexpected response for tile ${tx},${ty}: ${JSON.stringify(response)}`);
    }

    /** Compute pixels needing change, honoring modes. */
    _getMismatchedPixels(currentSkip = 1, colorFilter = null) {
        const [startX, startY, startPx, startPy] = this.coords;
        const out = [];

        for (let y = 0; y < this.template.height; y++) {
            for (let x = 0; x < this.template.width; x++) {
                if ((x + y) % currentSkip !== 0) continue;

                const tplColor = this.template.data[x][y];
                if (colorFilter !== null && tplColor !== colorFilter) continue;

                const globalPx = startPx + x,
                    globalPy = startPy + y;

                const targetTx = startX + Math.floor(globalPx / 1000);
                const targetTy = startY + Math.floor(globalPy / 1000);
                const localPx = globalPx % 1000,
                    localPy = globalPy % 1000;

                const tile = this.tiles.get(`${targetTx}_${targetTy}`);
                if (!tile || !tile.data[localPx]) continue;

                const canvasColor = tile.data[localPx][localPy];
                const neighbors = [
                    this.template.data[x - 1]?.[y],
                    this.template.data[x + 1]?.[y],
                    this.template.data[x]?.[y - 1],
                    this.template.data[x]?.[y + 1],
                ];
                const isEdge = neighbors.some((n) => n === 0 || n === undefined);

                // erase non-template
                if (this.templateSettings.eraseMode && tplColor === 0 && canvasColor !== 0) {
                    out.push({
                        tx: targetTx,
                        ty: targetTy,
                        px: localPx,
                        py: localPy,
                        color: 0,
                        isEdge: false,
                        localX: x,
                        localY: y,
                    });
                    continue;
                }
                // treat -1 as "clear if filled"
                if (tplColor === -1 && canvasColor !== 0) {
                    out.push({
                        tx: targetTx,
                        ty: targetTy,
                        px: localPx,
                        py: localPy,
                        color: 0,
                        isEdge,
                        localX: x,
                        localY: y,
                    });
                    continue;
                }
                // positive colors
                if (tplColor > 0 && this.hasColor(tplColor)) {
                    const shouldPaint = this.templateSettings.skipPaintedPixels
                        ? canvasColor === 0
                        : tplColor !== canvasColor;
                    if (shouldPaint) {
                        out.push({
                            tx: targetTx,
                            ty: targetTy,
                            px: localPx,
                            py: localPy,
                            color: tplColor,
                            isEdge,
                            localX: x,
                            localY: y,
                        });
                    }
                }
            }
        }
        return out;
    }

    async paint(currentSkip = 1, colorFilter = null) {
        if (this.tiles.size === 0) await this.loadTiles();
        if (!this.token) throw new Error('Token not provided.');

        let mismatched = this._getMismatchedPixels(currentSkip, colorFilter);
        if (mismatched.length === 0) return 0;

        log(this.userInfo.id, this.userInfo.name, `[${this.templateName}] Found ${mismatched.length} paintable pixels.`);

        // outline
        if (this.templateSettings.outlineMode) {
            const edge = mismatched.filter((p) => p.isEdge);
            if (edge.length > 0) mismatched = edge;
        }

        // direction
        switch (this.globalSettings.drawingDirection) {
            case 'btt':
                mismatched.sort((a, b) => b.localY - a.localY);
                break;
            case 'ltr':
                mismatched.sort((a, b) => a.localX - b.localX);
                break;
            case 'rtl':
                mismatched.sort((a, b) => b.localX - a.localX);
                break;
            case 'center_out': {
                const cx = this.template.width / 2,
                    cy = this.template.height / 2;
                const d2 = (p) => (p.localX - cx) ** 2 + (p.localY - cy) ** 2;
                mismatched.sort((a, b) => d2(a) - d2(b));
                break;
            }
            case 'random': {
                for (let i = mismatched.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [mismatched[i], mismatched[j]] = [mismatched[j], mismatched[i]];
                }
                break;
            }
            case 'ttb':
            default:
                mismatched.sort((a, b) => a.localY - b.localY);
                break;
        }

        // order (only applies if not using a color-based direction)
        if (this.globalSettings.drawingOrder === 'color') {
            const buckets = mismatched.reduce((acc, p) => ((acc[p.color] ??= []).push(p), acc), {});
            const colors = Object.keys(buckets);
            mismatched = colors.flatMap((c) => buckets[c]);
        }

        const chargesNow = Math.floor(this.userInfo?.charges?.count ?? 0);
        const todo = mismatched.slice(0, chargesNow);

        // group per tile
        const byTile = todo.reduce((acc, p) => {
            const key = `${p.tx},${p.ty}`;
            if (!acc[key]) acc[key] = { colors: [], coords: [] };
            acc[key].colors.push(p.color);
            acc[key].coords.push(p.px, p.py);
            return acc;
        }, {});

        let total = 0;
        for (const k in byTile) {
            const [tx, ty] = k.split(',').map(Number);
            const body = { ...byTile[k], t: this.token };
            
            // Add fingerprint if available
            if (globalThis.__wplacer_last_fp) body.fp = globalThis.__wplacer_last_fp;
            
            // Generate pawtect token if needed
            if (globalThis.wplacerRunPawtect && !this.pawtect) {
                try {
                    const url = WPLACE_PIXEL(tx, ty);
                    const pawtectToken = await globalThis.wplacerRunPawtect(url, body);
                    if (pawtectToken) {
                        this.pawtect = pawtectToken;
                    }
                } catch (e) {
                    console.error('Failed to generate pawtect token:', e);
                }
            }
            
            const r = await this._executePaint(tx, ty, body);
            total += r.painted;
        }

        return total;
    }

    async buyProduct(productId, amount) {
        const res = await this.post(WPLACE_PURCHASE, { product: { id: productId, amount } });
        if (res.data.success) {
            let msg = `Purchase ok product #${productId} amount ${amount}`;
            if (productId === 80) msg = `Bought ${amount * 30} pixels for ${amount * 500} droplets`;
            else if (productId === 70) msg = `Bought ${amount} Max Charge for ${amount * 500} droplets`;
            log(this.userInfo.id, this.userInfo.name, `[${this.templateName}] 💰 ${msg}`);
            return true;
        }
        if (res.status === HTTP_STATUS.TOO_MANY || (res.data.error && res.data.error.includes('Error 1015')))
            throw new NetworkError('(1015) Rate-limited during purchase.');
        throw new Error(`Unexpected purchase response: ${JSON.stringify(res)}`);
    }
}
