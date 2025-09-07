import { WPlacer } from './WPlacer.js';
import { tokenManager } from './TokenManager.js';
import { chargeCache } from './ChargeCache.js';
import { log, logUserError } from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';
import { MS } from '../config/constants.js';

/**
 * Manages template execution and user coordination
 */
export class TemplateManager {
    constructor({
        templateId,
        name,
        templateData,
        coords,
        canBuyCharges,
        canBuyMaxCharges,
        antiGriefMode,
        eraseMode,
        outlineMode,
        skipPaintedPixels,
        enableAutostart,
        userIds,
    }) {
        this.templateId = templateId;
        this.name = name;
        this.template = templateData;
        this.coords = coords;
        this.canBuyCharges = canBuyCharges;
        this.canBuyMaxCharges = canBuyMaxCharges;
        this.antiGriefMode = antiGriefMode;
        this.eraseMode = eraseMode;
        this.outlineMode = outlineMode;
        this.skipPaintedPixels = skipPaintedPixels;
        this.enableAutostart = enableAutostart;
        this.userIds = userIds;

        this.running = false;
        this.status = 'Waiting to be started.';
        this.masterId = this.userIds[0];
        this.masterName = 'Unknown'; // Will be set when users are loaded
        this.sleepAbortController = null;

        this.totalPixels = this.template.data.flat().filter((p) => p !== 0).length;
        this.pixelsRemaining = this.totalPixels;
        this.currentPixelSkip = 1; // Will be set from settings

        this.initialRetryDelay = MS.THIRTY_SEC;
        this.maxRetryDelay = MS.FIVE_MIN;
        this.currentRetryDelay = this.initialRetryDelay;

        this.userQueue = [...this.userIds];
    }

    /* Sleep that can be interrupted when settings change. */
    cancellableSleep(ms) {
        return new Promise((resolve) => {
            const controller = new AbortController();
            this.sleepAbortController = controller;
            const timeout = setTimeout(() => {
                if (this.sleepAbortController === controller) this.sleepAbortController = null;
                resolve();
            }, ms);
            controller.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                if (this.sleepAbortController === controller) this.sleepAbortController = null;
                resolve();
            });
        });
    }

    interruptSleep() {
        if (this.sleepAbortController) {
            log('SYSTEM', 'wplacer', `[${this.name}] ⚙️ Settings changed, waking.`);
            this.sleepAbortController.abort();
        }
    }

    /* Optional purchase of max-charge upgrades. */
    async handleUpgrades(wplacer, currentSettings) {
        if (!this.canBuyMaxCharges) return;
        await wplacer.loadUserInfo();
        const affordableDroplets = wplacer.userInfo.droplets - currentSettings.dropletReserve;
        const amountToBuy = Math.floor(affordableDroplets / 500);
        if (amountToBuy > 0) {
            try {
                await wplacer.buyProduct(70, amountToBuy);
                await sleep(currentSettings.purchaseCooldown);
                await wplacer.loadUserInfo();
            } catch (error) {
                logUserError(error, wplacer.userInfo.id, wplacer.userInfo.name, 'purchase max charge upgrades');
            }
        }
    }

    async handleChargePurchases(wplacer, currentSettings) {
        if (!this.canBuyCharges) return;
        await wplacer.loadUserInfo();
        const charges = wplacer.userInfo.charges;
        if (charges.count < charges.max && wplacer.userInfo.droplets > currentSettings.dropletReserve) {
            const affordableDroplets = wplacer.userInfo.droplets - currentSettings.dropletReserve;
            const amountToBuy = Math.floor(affordableDroplets / 500);
            if (amountToBuy > 0) {
                try {
                    await wplacer.buyProduct(80, amountToBuy);
                    await sleep(currentSettings.purchaseCooldown);
                    await wplacer.loadUserInfo();
                } catch (error) {
                    logUserError(error, wplacer.userInfo.id, wplacer.userInfo.name, 'purchase charges');
                }
            }
        }
    }

    async _performPaintTurn(wplacer, colorFilter = null) {
        let paintedTotal = 0;
        let done = false;
        while (!done && this.running) {
            try {
                wplacer.token = await tokenManager.getToken(this.name);
                // Pull latest pawtect token if available
                wplacer.pawtect = globalThis.__wplacer_last_pawtect || null;
                const painted = await wplacer.paint(this.currentPixelSkip, colorFilter);
                paintedTotal += painted;
                done = true;
            } catch (error) {
                if (error.name === 'SuspensionError') {
                    const until = new Date(error.suspendedUntil).toLocaleString();
                    log(wplacer.userInfo.id, wplacer.userInfo.name, `[${this.name}] 🛑 Account suspended until ${until}.`);
                    throw error;
                }
                if (error.message === 'REFRESH_TOKEN') {
                    log(wplacer.userInfo.id, wplacer.userInfo.name, `[${this.name}] 🔄 Token expired. Next token...`);
                    tokenManager.invalidateToken();
                    await sleep(1000);
                } else {
                    throw error;
                }
            }
        }
        if (wplacer?.userInfo?.id && paintedTotal > 0) chargeCache.consume(wplacer.userInfo.id, paintedTotal);
        return paintedTotal;
    }

    async _findWorkingUserAndCheckPixels(users, currentSettings) {
        // Iterate through all users in the queue to find one that works.
        for (let i = 0; i < this.userQueue.length; i++) {
            const userId = this.userQueue.shift();
            this.userQueue.push(userId); // Immediately cycle user to the back of the queue.

            if (!users[userId] || (users[userId].suspendedUntil && Date.now() < users[userId].suspendedUntil)) {
                continue; // Skip suspended or non-existent users.
            }

            const wplacer = new WPlacer({
                template: this.template,
                coords: this.coords,
                globalSettings: currentSettings,
                templateSettings: {
                    eraseMode: this.eraseMode,
                    outlineMode: this.outlineMode,
                    skipPaintedPixels: this.skipPaintedPixels,
                },
                templateName: this.name,
            });

            try {
                log('SYSTEM', 'wplacer', `[${this.name}] Checking template status with user ${users[userId].name}...`);
                await wplacer.login(users[userId].cookies);
                await wplacer.loadTiles();
                const mismatchedPixels = wplacer._getMismatchedPixels(1, null); // Check all pixels, no skip, no color filter.
                log('SYSTEM', 'wplacer', `[${this.name}] Check complete. Found ${mismatchedPixels.length} mismatched pixels.`);
                return { wplacer, mismatchedPixels }; // Success
            } catch (error) {
                logUserError(error, userId, users[userId].name, 'cycle pixel check');
                // This user failed, loop will continue to the next one.
            }
        }
        return null; // No working users were found in the entire queue.
    }

    async start(users, currentSettings, activeBrowserUsers, activeTemplateUsers) {
        const isColorMode = currentSettings.drawingOrder === 'color';
        this.running = true;
        this.status = 'Started.';
        log('SYSTEM', 'wplacer', `▶️ Starting template "${this.name}"...`);

        try {
            while (this.running) {
                this.status = 'Checking for pixels...';
                log('SYSTEM', 'wplacer', `[${this.name}] 💓 Starting new check cycle...`);
                
                // --- Find a working user and get mismatched pixels ---
                const checkResult = await this._findWorkingUserAndCheckPixels(users, currentSettings);
                if (!checkResult) {
                    log('SYSTEM', 'wplacer', `[${this.name}] ❌ No working users found for pixel check. Retrying in 30s.`);
                    await this.cancellableSleep(30_000);
                    continue;
                }

                this.pixelsRemaining = checkResult.mismatchedPixels.length;

                // --- COMPLETION & ANTI-GRIEF CHECK ---
                if (this.pixelsRemaining === 0) {
                    if (this.antiGriefMode) {
                        this.status = 'Monitoring for changes.';
                        log('SYSTEM', 'wplacer', `[${this.name}] 🖼️ Template complete. Monitoring... Recheck in ${duration(currentSettings.antiGriefStandby)}.`);
                        await this.cancellableSleep(currentSettings.antiGriefStandby);
                        continue; // Restart the while loop to re-check for changes.
                    } else {
                        log('SYSTEM', 'wplacer', `[${this.name}] ✅ Template finished.`);
                        this.status = 'Finished.';
                        this.running = false;
                        break; // Exit the main while loop.
                    }
                }

                // If we reached here, there are pixels to paint. Reset retry delay.
                this.currentRetryDelay = this.initialRetryDelay;

                // --- PAINTING LOGIC ---
                // This is a simplified version - the full implementation would be much more complex
                // and would include all the color ordering, density management, etc.
                
                // For now, just do a basic paint cycle
                for (let i = 0; i < this.userQueue.length && this.running; i++) {
                    const userId = this.userQueue[i];
                    if (!users[userId] || (users[userId].suspendedUntil && Date.now() < users[userId].suspendedUntil)) {
                        continue;
                    }

                    const wplacer = new WPlacer({
                        template: this.template,
                        coords: this.coords,
                        globalSettings: currentSettings,
                        templateSettings: {
                            eraseMode: this.eraseMode,
                            outlineMode: this.outlineMode,
                            skipPaintedPixels: this.skipPaintedPixels,
                        },
                        templateName: this.name,
                    });

                    try {
                        await wplacer.login(users[userId].cookies);
                        await this._performPaintTurn(wplacer);
                        await this.handleUpgrades(wplacer, currentSettings);
                        await this.handleChargePurchases(wplacer, currentSettings);
                    } catch (error) {
                        if (error.name !== 'SuspensionError') {
                            logUserError(error, userId, users[userId].name, 'perform paint turn');
                        }
                    }
                }

                if (this.running && currentSettings.accountCooldown > 0) {
                    log('SYSTEM', 'wplacer', `[${this.name}] ⏱️ Waiting for cooldown (${duration(currentSettings.accountCooldown)}).`);
                    await this.cancellableSleep(currentSettings.accountCooldown);
                }
            }
        } finally {
            if (this.status !== 'Finished.') this.status = 'Stopped.';
            this.userIds.forEach((id) => activeTemplateUsers.delete(id));
        }
    }
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
