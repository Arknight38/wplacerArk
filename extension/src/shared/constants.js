/**
 * Shared Constants - Common constants used across extension components
 */

// Extension constants
export const EXTENSION_NAME = 'WPlacer';
export const EXTENSION_VERSION = '5.4.0';

// Server constants
export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 80;
export const API_BASE_PATH = '/api';

// Message types
export const MESSAGE_TYPES = {
    TOKEN_CAPTURED: 'tokenCaptured',
    RELOAD_FOR_TOKEN: 'reloadForToken',
    PAWTECT_TOKEN: 'WPLACER_PAWTECT_TOKEN',
    PAWTECT_WASM_URL: 'WPLACER_PAWTECT_WASM_URL'
};

// Alarm names
export const ALARM_NAMES = {
    POLL: 'wplacer-poll-alarm',
    COOKIE: 'wplacer-cookie-alarm'
};

// Storage keys
export const STORAGE_KEYS = {
    WPLACER_PORT: 'wplacerPort',
    WPLACER_HOST: 'wplacerHost',
    LAST_TOKEN: 'lastToken',
    LAST_PAWTECT: 'lastPawtect',
    LAST_FINGERPRINT: 'lastFingerprint'
};

// URLs
export const WPLACE_BASE_URL = 'https://wplace.live';
export const CLOUDFLARE_CHALLENGE_URL = 'challenges.cloudflare.com';

// Timeouts and intervals
export const TIMEOUTS = {
    POLL_INTERVAL: 60000, // 1 minute
    TOKEN_CHECK_INTERVAL: 2000, // 2 seconds
    SERVER_TIMEOUT: 5000, // 5 seconds
    RELOAD_DELAY: 1000 // 1 second
};

// Token validation
export const TOKEN_PATTERNS = {
    TURNSTILE: /^[a-zA-Z0-9_-]{100,}$/,
    PAWTECT: /^[a-zA-Z0-9_-]{20,}$/,
    FINGERPRINT: /^[a-f0-9]{32}$/
};

// Error messages
export const ERROR_MESSAGES = {
    SERVER_CONNECTION_FAILED: 'Failed to connect to WPlacer server',
    TOKEN_SUBMISSION_FAILED: 'Failed to submit token to server',
    TAB_RELOAD_FAILED: 'Failed to reload tab for token capture',
    INVALID_TOKEN: 'Invalid token format',
    NO_WPLACE_TABS: 'No wplace.live tabs found'
};

// Success messages
export const SUCCESS_MESSAGES = {
    TOKEN_CAPTURED: 'Token captured successfully',
    TOKEN_SUBMITTED: 'Token submitted to server',
    SERVER_CONNECTED: 'Connected to WPlacer server',
    TAB_RELOADED: 'Tab reloaded for token capture'
};
