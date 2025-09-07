import { existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { DATA_DIR } from '../config/constants.js';

// Ensure logs.log and errors.log exist
const logFiles = [
    `${DATA_DIR}/logs.log`,
    `${DATA_DIR}/errors.log`
];
for (const file of logFiles) {
    if (!existsSync(file)) {
        writeFileSync(file, '', { flag: 'w' });
    }
}

/** Structured logger. Errors to errors.log, info to logs.log. */
export const log = async (id, name, data, error) => {
    const ts = new Date().toLocaleString();
    const who = `(${name}#${id})`;
    if (error) {
        console.error(`[${ts}] ${who} ${data}:`, error);
        appendFileSync(`${DATA_DIR}/errors.log`, `[${ts}] ${who} ${data}: ${error.stack || error.message}\n`);
    } else {
        console.log(`[${ts}] ${who} ${data}`);
        appendFileSync(`${DATA_DIR}/logs.log`, `[${ts}] ${who} ${data}\n`);
    }
};

export function logUserError(error, id, name, context) {
    const message = error?.message || 'Unknown error.';
    if (
        error?.name === 'NetworkError' ||
        message.includes('(500)') ||
        message.includes('(1015)') ||
        message.includes('(502)') ||
        error?.name === 'SuspensionError'
    ) {
        log(id, name, `❌ Failed to ${context}: ${message}`);
    } else {
        log(id, name, `❌ Failed to ${context}`, error);
    }
}
