import { exec } from 'node:child_process';

/** Cross-platform open-in-browser. */
export function openBrowser(url) {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`);
}

/** Human-readable duration. */
export const duration = (ms) => {
    if (ms <= 0) return '0s';
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60) % 60;
    const h = Math.floor(s / 3600);
    return [h ? `${h}h` : '', m ? `${m}m` : '', `${s % 60}s`].filter(Boolean).join(' ');
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
