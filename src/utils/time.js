/**
 * Time and duration utility functions
 */

/**
 * Human-readable duration from milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human-readable duration string
 */
export const duration = (ms) => {
    if (ms <= 0) return '0s';
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60) % 60;
    const h = Math.floor(s / 3600);
    return [h ? `${h}h` : '', m ? `${m}m` : '', `${s % 60}s`].filter(Boolean).join(' ');
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a cancellable sleep promise
 * @param {number} ms - Milliseconds to sleep
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<void>}
 */
export const cancellableSleep = (ms, controller) => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve();
        }, ms);
        
        if (controller) {
            controller.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                resolve();
            });
        }
    });
};

/**
 * Format timestamp for logging
 * @param {Date} date - Date to format
 * @returns {string} Formatted timestamp
 */
export const formatTimestamp = (date = new Date()) => {
    return date.toLocaleString();
};

/**
 * Check if a timestamp is expired
 * @param {number} timestamp - Timestamp to check
 * @returns {boolean} True if expired
 */
export const isExpired = (timestamp) => {
    return Date.now() > timestamp;
};