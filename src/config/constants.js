// Runtime constants
export const APP_HOST = '0.0.0.0';
export const APP_PRIMARY_PORT = Number(process.env.PORT) || 80;
export const APP_FALLBACK_PORTS = [
    3000, 5173, 8080, 8000, 5000, 7000, 4200, 5500,
    ...Array.from({ length: 50 }, (_, i) => 3001 + i),
];

// WPlace API endpoints
export const WPLACE_BASE = 'https://backend.wplace.live';
export const WPLACE_FILES = `${WPLACE_BASE}/files/s0`;
export const WPLACE_ME = `${WPLACE_BASE}/me`;
export const WPLACE_PIXEL = (tx, ty) => `${WPLACE_BASE}/s0/pixel/${tx}/${ty}`;
export const WPLACE_PURCHASE = `${WPLACE_BASE}/purchase`;
export const TILE_URL = (tx, ty) => `${WPLACE_FILES}/tiles/${tx}/${ty}.png`;

// File paths
export const DATA_DIR = './data';
export const USERS_FILE = './data/users.json';
export const SETTINGS_FILE = './data/settings.json';
export const TEMPLATES_PATH = './data/templates.json';

// Limits and timeouts
export const JSON_LIMIT = '50mb';

// Time constants (in milliseconds)
export const MS = {
    THIRTY_SEC: 30_000,
    TWO_MIN: 120_000,
    FIVE_MIN: 300_000,
    FORTY_SEC: 40_000,
    ONE_HOUR: 3600_000,
};

// HTTP status codes
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQ: 400,
    UNAUTH: 401,
    FORBIDDEN: 403,
    TOO_MANY: 429,
    UNAVAILABLE_LEGAL: 451,
    SRV_ERR: 500,
    BAD_GATEWAY: 502,
    CONFLICT: 409,
};
