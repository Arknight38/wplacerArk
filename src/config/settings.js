import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MS } from './constants.js';

// Default settings
const DEFAULT_SETTINGS = {
    accountCooldown: 20_000,
    purchaseCooldown: 5_000,
    keepAliveCooldown: MS.ONE_HOUR,
    dropletReserve: 0,
    antiGriefStandby: 600_000,
    drawingDirection: 'ttb',
    drawingOrder: 'linear',
    chargeThreshold: 0.5,
    pixelSkip: 1,
    proxyEnabled: false,
    proxyRotationMode: 'sequential', // 'sequential' | 'random'
    logProxyUsage: false,
    openBrowserOnStart: true,
};

let currentSettings = { ...DEFAULT_SETTINGS };

// Load settings from file
export function loadSettings() {
    if (existsSync('./data/settings.json')) {
        const fileSettings = JSON.parse(readFileSync('./data/settings.json', 'utf8'));
        currentSettings = { ...DEFAULT_SETTINGS, ...fileSettings };
        
        // Sanitize keepAliveCooldown to prevent issues from old/bad settings files
        if (currentSettings.keepAliveCooldown < MS.FIVE_MIN) {
            console.log(
                `[SYSTEM] WARNING: keepAliveCooldown is set to a very low value (${duration(
                    currentSettings.keepAliveCooldown
                )}). Adjusting to 1 hour.`
            );
            currentSettings.keepAliveCooldown = MS.ONE_HOUR;
        }
    }
    return currentSettings;
}

// Save settings to file
export function saveSettings() {
    writeFileSync('./data/settings.json', JSON.stringify(currentSettings, null, 2));
}

// Get current settings
export function getSettings() {
    return { ...currentSettings };
}

// Update settings
export function updateSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    saveSettings();
    return currentSettings;
}

// Helper function for duration formatting
function duration(ms) {
    if (ms <= 0) return '0s';
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60) % 60;
    const h = Math.floor(s / 3600);
    return [h ? `${h}h` : '', m ? `${m}m` : '', `${s % 60}s`].filter(Boolean).join(' ');
}
