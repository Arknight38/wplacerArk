import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../config/constants.js';
import { settingsManager } from '../config/settings.js';
import { log } from '../utils/logger.js';

class ProxyService {
    constructor() {
        this.loadedProxies = [];
        this.nextProxyIndex = 0;
        this.proxyPath = path.join(DATA_DIR, 'proxies.txt');
    }

    load() {
        if (!existsSync(this.proxyPath)) {
            writeFileSync(this.proxyPath, '');
            console.log('[SYSTEM] `data/proxies.txt` not found, created an empty one.');
            this.loadedProxies = [];
            return;
        }

        const raw = readFileSync(this.proxyPath, 'utf8');
        const lines = raw
            .split(/\r?\n/)
            .map(l => l.replace(/\s+#.*$|\s+\/\/.*$|^\s*#.*$|^\s*\/\/.*$/g, '').trim())
            .filter(Boolean);

        const protoMap = new Map([
            ['http', 'http'],
            ['https', 'https'],
            ['socks4', 'socks4'],
            ['socks5', 'socks5'],
        ]);

        const inRange = p => Number.isInteger(p) && p >= 1 && p <= 65535;
        const looksHostname = h => !!h && /^[a-z0-9-._[\]]+$/i.test(h);

        const parseOne = (line) => {
            // url-like: scheme://user:pass@host:port
            const urlLike = line.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.+)$/);
            if (urlLike) {
                const scheme = urlLike[1].toLowerCase();
                const protocol = protoMap.get(scheme);
                if (!protocol) return null;
                try {
                    const u = new URL(line);
                    const host = u.hostname;
                    const port = u.port ? parseInt(u.port, 10) : NaN;
                    const username = decodeURIComponent(u.username || '');
                    const password = decodeURIComponent(u.password || '');
                    if (!looksHostname(host) || !inRange(port)) return null;
                    return { protocol, host, port, username, password };
                } catch {
                    return null;
                }
            }

            // user:pass@host:port
            const authHost = line.match(/^([^:@\s]+):([^@\s]+)@(.+)$/);
            if (authHost) {
                const username = authHost[1], password = authHost[2], rest = authHost[3];
                const m6 = rest.match(/^\[([^\]]+)\]:(\d+)$/);
                const m4 = rest.match(/^([^:\s]+):(\d+)$/);
                let host = '', port = NaN;
                if (m6) {
                    host = m6[1];
                    port = parseInt(m6[2], 10);
                } else if (m4) {
                    host = m4[1];
                    port = parseInt(m4[2], 10);
                } else return null;
                if (!looksHostname(host) || !inRange(port)) return null;
                return { protocol: 'http', host, port, username, password };
            }

            // [ipv6]:port
            const bare6 = line.match(/^\[([^\]]+)\]:(\d+)$/);
            if (bare6) {
                const host = bare6[1], port = parseInt(bare6[2], 10);
                if (!inRange(port)) return null;
                return { protocol: 'http', host, port, username: '', password: '' };
            }

            // host:port
            const bare = line.match(/^([^:\s]+):(\d+)$/);
            if (bare) {
                const host = bare[1], port = parseInt(bare[2], 10);
                if (!looksHostname(host) || !inRange(port)) return null;
                return { protocol: 'http', host, port, username: '', password: '' };
            }

            // user:pass:host:port
            const uphp = line.split(':');
            if (uphp.length === 4 && /^\d+$/.test(uphp[3])) {
                const [username, password, host, portStr] = uphp;
                const port = parseInt(portStr, 10);
                if (looksHostname(host) && inRange(port)) {
                    return { protocol: 'http', host, port, username, password };
                }
            }
            return null;
        };

        const seen = new Set();
        const proxies = [];
        for (const line of lines) {
            const p = parseOne(line);
            if (!p) {
                console.log(`[SYSTEM] ⚠️ WARNING: Invalid proxy skipped: "${line}"`);
                continue;
            }
            const key = `${p.protocol}://${p.username}:${p.password}@${p.host}:${p.port}`;
            if (seen.has(key)) continue;
            seen.add(key);
            proxies.push(p);
        }
        this.loadedProxies = proxies;
    }

    getNext() {
        const { proxyEnabled, proxyRotationMode } = settingsManager.getAll();
        if (!proxyEnabled || this.loadedProxies.length === 0) return null;

        let proxy;
        if (proxyRotationMode === 'random') {
            proxy = this.loadedProxies[Math.floor(Math.random() * this.loadedProxies.length)];
        } else {
            proxy = this.loadedProxies[this.nextProxyIndex];
            this.nextProxyIndex = (this.nextProxyIndex + 1) % this.loadedProxies.length;
        }

        let proxyUrl = `${proxy.protocol}://`;
        if (proxy.username && proxy.password) {
            proxyUrl += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
        }
        proxyUrl += `${proxy.host}:${proxy.port}`;
        
        if (settingsManager.get('logProxyUsage')) {
            log('SYSTEM', 'wplacer', `Using proxy: ${proxyUrl.split('@').pop()}`);
        }
        
        return proxyUrl;
    }

    getCount() {
        return this.loadedProxies.length;
    }
}

export const proxyService = new ProxyService();