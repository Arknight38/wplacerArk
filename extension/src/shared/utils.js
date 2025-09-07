/**
 * Shared Utilities - Common utility functions used across extension components
 */

import { 
    DEFAULT_HOST, 
    DEFAULT_PORT, 
    API_BASE_PATH,
    STORAGE_KEYS,
    TOKEN_PATTERNS,
    TIMEOUTS
} from './constants.js';

/**
 * Get extension settings from storage
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
    const result = await chrome.storage.local.get([
        STORAGE_KEYS.WPLACER_PORT,
        STORAGE_KEYS.WPLACER_HOST
    ]);
    
    return {
        host: result[STORAGE_KEYS.WPLACER_HOST] || DEFAULT_HOST,
        port: result[STORAGE_KEYS.WPLACER_PORT] || DEFAULT_PORT
    };
}

/**
 * Save extension settings to storage
 * @param {Object} settings - Settings to save
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
    const storageData = {};
    
    if (settings.host !== undefined) {
        storageData[STORAGE_KEYS.WPLACER_HOST] = settings.host;
    }
    
    if (settings.port !== undefined) {
        storageData[STORAGE_KEYS.WPLACER_PORT] = settings.port;
    }
    
    await chrome.storage.local.set(storageData);
}

/**
 * Get server URL
 * @param {string} path - API path
 * @returns {Promise<string>} Full server URL
 */
export async function getServerUrl(path = '') {
    const settings = await getSettings();
    return `http://${settings.host}:${settings.port}${API_BASE_PATH}${path}`;
}

/**
 * Make a request to the server with timeout
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithTimeout(url, options = {}, timeout = TIMEOUTS.SERVER_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Validate token format
 * @param {string} token - Token to validate
 * @param {string} type - Token type ('turnstile', 'pawtect', 'fingerprint')
 * @returns {boolean} True if valid
 */
export function validateToken(token, type) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    
    switch (type) {
        case 'turnstile':
            return TOKEN_PATTERNS.TURNSTILE.test(token);
        case 'pawtect':
            return TOKEN_PATTERNS.PAWTECT.test(token);
        case 'fingerprint':
            return TOKEN_PATTERNS.FINGERPRINT.test(token);
        default:
            return false;
    }
}

/**
 * Generate random hex string
 * @param {number} length - String length
 * @returns {string} Random hex string
 */
export function generateRandomHex(length = 32) {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, length);
}

/**
 * Generate random integer in range
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random integer
 */
export function randomInt(max) {
    return Math.floor(Math.random() * Math.max(1, Number(max) || 1));
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format error message for display
 * @param {Error} error - Error object
 * @returns {string} Formatted error message
 */
export function formatError(error) {
    if (error.name === 'AbortError') {
        return 'Request timed out';
    }
    if (error.message) {
        return error.message;
    }
    return 'An unknown error occurred';
}

/**
 * Log message with timestamp and context
 * @param {string} context - Log context
 * @param {string} message - Log message
 * @param {any} data - Additional data
 */
export function log(context, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${context}] ${message}`;
    
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
}

/**
 * Check if current tab is wplace.live
 * @returns {Promise<boolean>} True if on wplace.live
 */
export async function isWPlaceTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return false;
        
        const url = new URL(tabs[0].url);
        return url.hostname === 'wplace.live';
    } catch (error) {
        return false;
    }
}

/**
 * Get all wplace.live tabs
 * @returns {Promise<chrome.tabs.Tab[]>} Array of tabs
 */
export async function getWPlaceTabs() {
    try {
        return await chrome.tabs.query({ url: 'https://wplace.live/*' });
    } catch (error) {
        console.error('Failed to get wplace.live tabs:', error);
        return [];
    }
}

/**
 * Send message to content script
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from content script
 */
export async function sendMessageToTab(tabId, message) {
    try {
        return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
        console.error('Failed to send message to tab:', error);
        throw error;
    }
}

/**
 * Reload tab
 * @param {number} tabId - Tab ID
 * @returns {Promise<void>}
 */
export async function reloadTab(tabId) {
    try {
        await chrome.tabs.reload(tabId);
    } catch (error) {
        console.error('Failed to reload tab:', error);
        throw error;
    }
}

/**
 * Create new tab
 * @param {string} url - URL to open
 * @returns {Promise<chrome.tabs.Tab>} Created tab
 */
export async function createTab(url) {
    try {
        return await chrome.tabs.create({ url });
    } catch (error) {
        console.error('Failed to create tab:', error);
        throw error;
    }
}

/**
 * Set alarm for polling
 * @param {string} name - Alarm name
 * @param {number} delayInMinutes - Delay in minutes
 * @returns {Promise<void>}
 */
export async function setAlarm(name, delayInMinutes) {
    try {
        await chrome.alarms.create(name, { periodInMinutes: delayInMinutes });
    } catch (error) {
        console.error('Failed to set alarm:', error);
        throw error;
    }
}

/**
 * Clear alarm
 * @param {string} name - Alarm name
 * @returns {Promise<void>}
 */
export async function clearAlarm(name) {
    try {
        await chrome.alarms.clear(name);
    } catch (error) {
        console.error('Failed to clear alarm:', error);
        throw error;
    }
}
