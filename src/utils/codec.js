/**
 * Compact template codec for sharing templates
 */

/**
 * Base64URL encoding/decoding
 */
export const Base64URL = {
    enc: (u8) => Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
};

/**
 * Write varint to output array
 * @param {number} n - Number to encode
 * @param {Array<number>} out - Output array
 */
export function varintWrite(n, out) {
    n = Number(n);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        throw new Error('varint invalid');
    }
    while (n >= 0x80) {
        out.push((n & 0x7f) | 0x80);
        n >>>= 7;
    }
    out.push(n);
}

/**
 * Read varint from input array
 * @param {Uint8Array} u8 - Input array
 * @param {number} i - Start index
 * @returns {[number, number]} [value, newIndex]
 */
export function varintRead(u8, i) {
    let n = 0;
    let shift = 0;
    let b;
    do {
        b = u8[i++];
        n |= (b & 0x7f) << shift;
        shift += 7;
    } while (b & 0x80);
    return [n >>> 0, i];
}

/**
 * Run-length encode array
 * @param {Array<number>} arr - Array to encode
 * @returns {Array<[number, number]>} RLE encoded array
 */
export function rleEncode(arr) {
    if (!arr?.length) return [];
    const out = [];
    let prev = arr[0];
    let count = 1;
    
    for (let i = 1; i < arr.length; i++) {
        const value = arr[i];
        if (value === prev) {
            count++;
        } else {
            out.push([prev, count]);
            prev = value;
            count = 1;
        }
    }
    out.push([prev, count]);
    return out;
}

/**
 * Flatten 2D array in X-major order
 * @param {Array<Array<number>>} cols - 2D array
 * @returns {{flat: Array<number>, w: number, h: number}} Flattened array and dimensions
 */
export function flatten2D_XMajor(cols) {
    const w = cols.length;
    const h = cols[0]?.length ?? 0;
    const flat = new Array(w * h);
    let k = 0;
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            flat[k++] = cols[x][y];
        }
    }
    
    return { flat, w, h };
}

/**
 * Reshape flat array to 2D in X-major order
 * @param {Array<number>} flat - Flat array
 * @param {number} w - Width
 * @param {number} h - Height
 * @returns {Array<Array<number>>} 2D array
 */
export function reshape_XMajor(flat, w, h) {
    const cols = Array.from({ length: w }, () => Array(h));
    let k = 0;
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            cols[x][y] = flat[k++];
        }
    }
    
    return cols;
}

/**
 * Transpose matrix to X-major order
 * @param {Array<Array<number>>} mat - Matrix to transpose
 * @returns {Array<Array<number>>} Transposed matrix
 */
export function transposeToXMajor(mat) {
    const h = mat.length;
    const w = mat[0]?.length ?? 0;
    const out = Array.from({ length: w }, () => Array(h));
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            out[x][y] = mat[y][x];
        }
    }
    
    return out;
}

/**
 * Ensure matrix is in X-major order
 * @param {Array<Array<number>>} data - Matrix data
 * @param {number} w - Expected width
 * @param {number} h - Expected height
 * @returns {Array<Array<number>>} X-major matrix
 */
export function ensureXMajor(data, w, h) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('bad matrix');
    }
    
    if (data.length === w && data[0].length === h) {
        return data; // already x-major
    }
    
    if (data.length === h && data[0].length === w) {
        return transposeToXMajor(data); // transpose
    }
    
    throw new Error(`matrix dims mismatch: got ${data.length}x${data[0].length}, want ${w}x${h}`);
}

/**
 * Build share bytes from template data
 * @param {number} width - Template width
 * @param {number} height - Template height
 * @param {Array<Array<number>>} data2D - Template data
 * @returns {Uint8Array} Share bytes
 */
export function buildShareBytes(width, height, data2D) {
    const w = Number(width) >>> 0;
    const h = Number(height) >>> 0;
    
    if (!w || !h) {
        throw new Error('zero dimension');
    }
    
    const xmaj = ensureXMajor(data2D, w, h);
    const { flat } = flatten2D_XMajor(xmaj);
    const runs = rleEncode(flat);
    const bytes = [];
    
    // Magic bytes and version
    bytes.push(0x57, 0x54, 0x01);
    
    // Dimensions
    varintWrite(w, bytes);
    varintWrite(h, bytes);
    
    // Run count
    varintWrite(runs.length, bytes);
    
    // Runs
    for (const [val, cnt] of runs) {
        const vb = val === -1 ? 255 : val;
        bytes.push(vb & 0xff);
        varintWrite(cnt, bytes);
    }
    
    return Uint8Array.from(bytes);
}

/**
 * Parse share bytes to template data
 * @param {Uint8Array} u8 - Share bytes
 * @returns {{width: number, height: number, data: Array<Array<number>>}} Template data
 */
export function parseShareBytes(u8) {
    if (u8.length < 3 || u8[0] !== 0x57 || u8[1] !== 0x54 || u8[2] !== 0x01) {
        throw new Error('bad magic/version');
    }
    
    let i = 3;
    let w;
    [w, i] = varintRead(u8, i);
    let h;
    [h, i] = varintRead(u8, i);
    let rc;
    [rc, i] = varintRead(u8, i);
    
    const flat = [];
    for (let r = 0; r < rc; r++) {
        const raw = u8[i++];
        let cnt;
        [cnt, i] = varintRead(u8, i);
        const v = raw === 255 ? -1 : raw;
        while (cnt--) flat.push(v);
    }
    
    if (flat.length !== w * h) {
        throw new Error(`size mismatch ${flat.length} != ${w * h}`);
    }
    
    const data = reshape_XMajor(flat, w, h);
    return { width: w, height: h, data };
}

/**
 * Generate share code from template
 * @param {Object} template - Template object with width, height, data
 * @returns {string} Share code
 */
export const shareCodeFromTemplate = (template) => {
    return Base64URL.enc(buildShareBytes(template.width, template.height, template.data));
};

/**
 * Parse template from share code
 * @param {string} code - Share code
 * @returns {Object} Template object
 */
export const templateFromShareCode = (code) => {
    const decoded = parseShareBytes(new Uint8Array(Base64URL.dec(code)));
    return decoded;
};