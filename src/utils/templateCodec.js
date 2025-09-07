// Compact template codec for efficient storage and sharing

const Base64URL = {
    enc: (u8) => Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
};

function varintWrite(n, out) {
    n = Number(n);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw new Error('varint invalid');
    while (n >= 0x80) {
        out.push((n & 0x7f) | 0x80);
        n >>>= 7;
    }
    out.push(n);
}

function varintRead(u8, i) {
    let n = 0,
        shift = 0,
        b;
    do {
        b = u8[i++];
        n |= (b & 0x7f) << shift;
        shift += 7;
    } while (b & 0x80);
    return [n >>> 0, i];
}

function rleEncode(a) {
    if (!a?.length) return [];
    const o = [];
    let p = a[0],
        c = 1;
    for (let i = 1; i < a.length; i++) {
        const v = a[i];
        if (v === p) c++;
        else {
            o.push([p, c]);
            p = v;
            c = 1;
        }
    }
    o.push([p, c]);
    return o;
}

function normPix(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error('pixel invalid');
    if (n === -1) return -1;
    if (n < 0 || n > 255) throw new Error('pixel out of range');
    return n >>> 0;
}

function flatten2D_XMajor(cols) {
    const w = cols.length,
        h = cols[0]?.length ?? 0;
    const flat = new Array(w * h);
    let k = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) flat[k++] = cols[x][y];
    return { flat, w, h };
}

function reshape_XMajor(flat, w, h) {
    const cols = Array.from({ length: w }, () => Array(h));
    let k = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cols[x][y] = flat[k++];
    return cols;
}

function transposeToXMajor(mat) {
    const h = mat.length,
        w = mat[0]?.length ?? 0;
    const out = Array.from({ length: w }, () => Array(h));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][y] = mat[y][x];
    return out;
}

function ensureXMajor(data, w, h) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('bad matrix');
    if (data.length === w && data[0].length === h) return data; // already x-major
    if (data.length === h && data[0].length === w) return transposeToXMajor(data); // transpose
    throw new Error(`matrix dims mismatch: got ${data.length}x${data[0].length}, want ${w}x${h}`);
}

function sanitizePalette2D(matrix) {
    const VALID_COLOR_IDS = new Set([-1, 0, ...Object.values({
        '0,0,0': 1, '60,60,60': 2, '120,120,120': 3, '210,210,210': 4, '255,255,255': 5,
        '96,0,24': 6, '237,28,36': 7, '255,127,39': 8, '246,170,9': 9, '249,221,59': 10,
        '255,250,188': 11, '14,185,104': 12, '19,230,123': 13, '135,255,94': 14, '12,129,110': 15,
        '16,174,166': 16, '19,225,190': 17, '40,80,158': 18, '64,147,228': 19, '96,247,242': 20,
        '107,80,246': 21, '153,177,251': 22, '120,12,153': 23, '170,56,185': 24, '224,159,249': 25,
        '203,0,122': 26, '236,31,128': 27, '243,141,169': 28, '104,70,52': 29, '149,104,42': 30,
        '248,178,119': 31, '170,170,170': 32, '165,14,30': 33, '250,128,114': 34, '228,92,26': 35,
        '214,181,148': 36, '156,132,49': 37, '197,173,49': 38, '232,212,95': 39, '74,107,58': 40,
        '90,148,74': 41, '132,197,115': 42, '15,121,159': 43, '187,250,242': 44, '125,199,255': 45,
        '77,49,184': 46, '74,66,132': 47, '122,113,196': 48, '181,174,241': 49, '219,164,99': 50,
        '209,128,81': 51, '255,197,165': 52, '155,82,73': 53, '209,128,120': 54, '250,182,164': 55,
        '123,99,82': 56, '156,132,107': 57, '51,57,65': 58, '109,117,141': 59, '179,185,209': 60,
        '109,100,63': 61, '148,140,107': 62, '205,197,158': 63,
    })]);
    
    for (let x = 0; x < matrix.length; x++) {
        const col = matrix[x];
        if (!Array.isArray(col)) continue;
        for (let y = 0; y < col.length; y++) if (!VALID_COLOR_IDS.has(col[y])) col[y] = 0;
    }
}

export function buildShareBytes(width, height, data2D) {
    const w = Number(width) >>> 0,
        h = Number(height) >>> 0;
    if (!w || !h) throw new Error('zero dimension');
    const xmaj = ensureXMajor(data2D, w, h).map((col) => col.map(normPix));
    const { flat } = flatten2D_XMajor(xmaj);
    const runs = rleEncode(flat);
    const bytes = [];
    bytes.push(0x57, 0x54, 0x01);
    varintWrite(w, bytes);
    varintWrite(h, bytes);
    varintWrite(runs.length, bytes);
    for (const [val, cnt] of runs) {
        const vb = val === -1 ? 255 : val;
        bytes.push(vb & 0xff);
        varintWrite(cnt, bytes);
    }
    return Uint8Array.from(bytes);
}

export function parseShareBytes(u8) {
    if (u8.length < 3 || u8[0] !== 0x57 || u8[1] !== 0x54 || u8[2] !== 0x01) throw new Error('bad magic/version');
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
    if (flat.length !== w * h) throw new Error(`size mismatch ${flat.length} != ${w * h}`);
    const data = reshape_XMajor(flat, w, h);
    sanitizePalette2D(data);
    return { width: w, height: h, data };
}

export const shareCodeFromTemplate = (t) => Base64URL.enc(buildShareBytes(t.width, t.height, t.data));

export const templateFromShareCode = (code) => {
    const decoded = parseShareBytes(new Uint8Array(Base64URL.dec(code)));
    sanitizePalette2D(decoded.data);
    return decoded;
};
