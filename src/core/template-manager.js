import { MS, COLOR_NAMES } from '../config/constants.js';
import { settingsManager } from '../config/settings.js';
import { WPlacer } from './wplacer-client.js';
import { TokenManager } from './token-manager.js';
import { ChargeCache } from './charge-cache.js';
import { log, logUserError } from '../utils/logger.js';
import { sleep, duration } from '../utils/time.js';

export class TemplateManager {
    constructor({
        templateId,
        name,
        templateData,
        coords,
        canBuyCharges = false,
        canBuyMaxCharges = false,
        antiGriefMode = false,
        eraseMode = false,
        outlineMode = false,
        skipPaintedPixels = false,
        enableAutostart = false,
        userIds = []
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
        this.sleepAbortController = null;

        this.totalPixels = this.template.data.flat().filter(p => p !== 0).length;
        this.pixelsRemaining = this.totalPixels;
        this.currentPixelSkip = settingsManager.get('pixelSkip');

        this.initialRetryDelay = MS.THIRTY_SEC;
        this.maxRetryDelay = MS.FIVE_MIN;
        this.currentRetryDelay = this.initialRetryDelay;

        this.userQueue = [...this.userIds];
    }

    cancellableSleep(ms) {
        return new Promise(resolve => {
            const controller = new AbortController();
            this.sleepAbortController = controller;
            const timeout = setTimeout(() => {
                if (this.sleepAbortController === controller) {
                    this.sleepAbortController = null;
                }
                resolve();
            }, ms);
            controller.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                if (this.sleepAbortController === controller) {
                    this.sleepAbortController = null;
                }
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

    async handleUpgrades(wplacer) {
        if (!this.canBuyMaxCharges) return;
        
        await wplacer.loadUserInfo();
        const affordableDroplets = wplacer.userInfo.droplets - settingsManager.get('dropletReserve');
        const amountToBuy = Math.floor(affordableDroplets / 500);
        
        if (amountToBuy > 0) {
            try {
                await wplacer.buyProduct(70, amountToBuy);
                await sleep(settingsManager.get('purchaseCooldown'));
                await wplacer.loadUserInfo();
            } catch (error) {
                logUserError(error, wplacer.userInfo.id, wplacer.userInfo.name, 'purchase max charge upgrades');
            }
        }
    }

    async handleChargePurchases(wplacer) {
        if (!this.canBuyCharges) return;
        
        await wplacer.loadUserInfo();
        const charges = wplacer.userInfo.charges;
        
        if (charges.count < charges.max && wplacer.userInfo.droplets > settingsManager.get('dropletReserve')) {
            const affordableDroplets = wplacer.userInfo.droplets - settingsManager.get('dropletReserve');
            const amountToBuy = Math.floor(affordableDroplets / 500);
            
            if (amountToBuy > 0) {
                try {
                    await wplacer.buyProduct(80, amountToBuy);
                    await sleep(settingsManager.get('purchaseCooldown'));
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
                wplacer.token = await TokenManager.getToken(this.name);
                // Pawtect token is now handled automatically by the WPlacer client
                
                const painted = await wplacer.paint(this.currentPixelSkip, colorFilter);
                paintedTotal += painted;
                done = true;
            } catch (error) {
                if (error.name === 'SuspensionError') {
                    const until = new Date(error.suspendedUntil).toLocaleString();
                    log(wplacer.userInfo.id, wplacer.userInfo.name, 
                        `[${this.name}] 🛑 Account suspended until ${until}.`);
                    // TODO: Update user suspension status
                    throw error;
                }
                if (error.message === 'REFRESH_TOKEN') {
                    log(wplacer.userInfo.id, wplacer.userInfo.name, 
                        `[${this.name}] 🔥 Token expired. Next token...`);
                    TokenManager.invalidateToken();
                    await sleep(1000);
                } else {
                    throw error;
                }
            }
        }
        
        if (wplacer?.userInfo?.id && paintedTotal > 0) {
            ChargeCache.consume(wplacer.userInfo.id, paintedTotal);
        }
        
        return paintedTotal;
    }

    async _findWorkingUserAndCheckPixels(users) {
        for (let i = 0; i < this.userQueue.length; i++) {
            const userId = this.userQueue.shift();
            this.userQueue.push(userId);

            if (!users[userId] || (users[userId].suspendedUntil && Date.now() < users[userId].suspendedUntil)) {
                continue;
            }

            const wplacer = new WPlacer({
                template: this.template,
                coords: this.coords,
                globalSettings: settingsManager.getAll(),
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
                const mismatchedPixels = wplacer._getMismatchedPixels(1, null);
                log('SYSTEM', 'wplacer', `[${this.name}] Check complete. Found ${mismatchedPixels.length} mismatched pixels.`);
                return { wplacer, mismatchedPixels };
            } catch (error) {
                logUserError(error, userId, users[userId].name, 'cycle pixel check');
            }
        }
        
        return null;
    }

    async start(users, activeBrowserUsers, activeTemplateUsers) {
        this.running = true;
        this.status = 'Started.';
        log('SYSTEM', 'wplacer', `▶️ Starting template "${this.name}"...`);

        try {
            while (this.running) {
                this.status = 'Checking for pixels...';
                log('SYSTEM', 'wplacer', `[${this.name}] 🔍 Starting new check cycle...`);

                const checkResult = await this._findWorkingUserAndCheckPixels(users);
                if (!checkResult) {
                    log('SYSTEM', 'wplacer', `[${this.name}] ❌ No working users found for pixel check. Retrying in 30s.`);
                    await this.cancellableSleep(30_000);
                    continue;
                }

                this.pixelsRemaining = checkResult.mismatchedPixels.length;

                // Completion & anti-grief check
                if (this.pixelsRemaining === 0) {
                    if (this.antiGriefMode) {
                        this.status = 'Monitoring for changes.';
                        log('SYSTEM', 'wplacer', 
                            `[${this.name}] 🖼️ Template complete. Monitoring... Recheck in ${duration(settingsManager.get('antiGriefStandby'))}.`);
                        await this.cancellableSleep(settingsManager.get('antiGriefStandby'));
                        continue;
                    } else {
                        log('SYSTEM', 'wplacer', `[${this.name}] ✅ Template finished.`);
                        this.status = 'Finished.';
                        this.running = false;
                        break;
                    }
                }

                // Reset retry delay
                this.currentRetryDelay = this.initialRetryDelay;

                // Main painting logic would go here...
                // This is a simplified version - the full logic would handle color ordering,
                // user rotation, charge checking, etc.
                
                log('SYSTEM', 'wplacer', `[${this.name}] Found ${this.pixelsRemaining} pixels to paint.`);
                await this.cancellableSleep(settingsManager.get('accountCooldown'));
            }
        } finally {
            if (this.status !== 'Finished.') {
                this.status = 'Stopped.';
            }
            this.userIds.forEach(id => activeTemplateUsers.delete(id));
        }
    }
}