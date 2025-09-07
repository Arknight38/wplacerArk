import { palette, VALID_COLOR_IDS } from '../config/constants.js';

/**
 * Sanitize palette data in 2D matrix
 * @param {Array<Array<number>>} matrix - 2D color matrix
 */
export function sanitizePalette2D(matrix) {
    for (let x = 0; x < matrix.length; x++) {
        const col = matrix[x];
        if (!Array.isArray(col)) continue;
        for (let y = 0; y < col.length; y++) {
            if (!VALID_COLOR_IDS.has(col[y])) {
                col[y] = 0;
            }
        }
    }
}

/**
 * Normalize pixel value to valid color ID
 * @param {number} value - Pixel value to normalize
 * @returns {number} Normalized color ID
 */
export function normPix(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new Error('pixel invalid');
    }
    if (n === -1) return -1;
    if (n < 0 || n > 255) {
        throw new Error('pixel out of range');
    }
    return n >>> 0;
}

/**
 * Get RGB string from color ID
 * @param {number} colorId - Color ID
 * @returns {string|null} RGB string or null if not found
 */
export function getRgbFromColorId(colorId) {
    return Object.keys(palette).find(key => palette[key] === colorId) || null;
}

/**
 * Get color ID from RGB string
 * @param {string} rgb - RGB string (e.g., "255,0,0")
 * @returns {number|null} Color ID or null if not found
 */
export function getColorIdFromRgb(rgb) {
    return palette[rgb] || null;
}