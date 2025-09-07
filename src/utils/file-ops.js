import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../config/constants.js';

/**
 * Load JSON from file, return empty object if file doesn't exist
 * @param {string} filename - Path to JSON file
 * @returns {Object} Parsed JSON or empty object
 */
export const loadJSON = (filename) => {
    const fullPath = path.isAbsolute(filename) ? filename : path.join(DATA_DIR, filename);
    return existsSync(fullPath) ? JSON.parse(readFileSync(fullPath, 'utf8')) : {};
};

/**
 * Save JSON to file
 * @param {string} filename - Path to JSON file
 * @param {Object} data - Data to save
 */
export const saveJSON = (filename, data) => {
    const fullPath = path.isAbsolute(filename) ? filename : path.join(DATA_DIR, filename);
    writeFileSync(fullPath, JSON.stringify(data, null, 2));
};

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
export const ensureDir = (dirPath) => {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Ensure data directory and log files exist
 */
export const bootstrapDataDir = () => {
    ensureDir(DATA_DIR);
    
    // Ensure logs.log and errors.log exist
    const logFiles = [
        path.join(DATA_DIR, 'logs.log'),
        path.join(DATA_DIR, 'errors.log')
    ];
    
    for (const file of logFiles) {
        if (!existsSync(file)) {
            writeFileSync(file, '', { flag: 'w' });
        }
    }
};