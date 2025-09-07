import { exec } from 'node:child_process';

/**
 * Cross-platform open-in-browser function
 * @param {string} url - URL to open
 */
export function openBrowser(url) {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`);
}

/**
 * Check if a hostname looks valid
 * @param {string} hostname - Hostname to validate
 * @returns {boolean} True if valid
 */
export const looksHostname = (hostname) => {
    return !!hostname && /^[a-z0-9-._[\]]+$/i.test(hostname);
};

/**
 * Check if port is in valid range
 * @param {number} port - Port number to validate
 * @returns {boolean} True if valid
 */
export const inRange = (port) => {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
};