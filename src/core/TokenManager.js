import { log } from '../utils/logger.js';
import { MS } from '../config/constants.js';

/**
 * Manages Turnstile tokens for authentication
 */
export class TokenManager {
    constructor() {
        this.tokenQueue = [];
        this.tokenPromise = null;
        this.resolvePromise = null;
        this.isTokenNeeded = false;
        this.TOKEN_EXPIRATION_MS = MS.TWO_MIN;
    }

    _purgeExpiredTokens() {
        const now = Date.now();
        const size0 = this.tokenQueue.length;
        this.tokenQueue = this.tokenQueue.filter((t) => now - t.receivedAt < this.TOKEN_EXPIRATION_MS);
        const removed = size0 - this.tokenQueue.length;
        if (removed > 0) log('SYSTEM', 'wplacer', `TOKEN_MANAGER: 🗑️ Discarded ${removed} expired token(s).`);
    }

    getToken(templateName = 'Unknown') {
        this._purgeExpiredTokens();
        if (this.tokenQueue.length > 0) return Promise.resolve(this.tokenQueue.shift().token);
        if (!this.tokenPromise) {
            log('SYSTEM', 'wplacer', `TOKEN_MANAGER: ⏳ Template "${templateName}" is waiting for a token.`);
            this.isTokenNeeded = true;
            this.tokenPromise = new Promise((resolve) => {
                this.resolvePromise = resolve;
            });
        }
        return this.tokenPromise;
    }

    setToken(t) {
        const newToken = { token: t, receivedAt: Date.now() };
        if (this.resolvePromise) {
            log('SYSTEM', 'wplacer', `TOKEN_MANAGER: ✅ Token received, immediately consumed by waiting task.`);
            this.resolvePromise(newToken.token);
            this.tokenPromise = null;
            this.resolvePromise = null;
            this.isTokenNeeded = false;
        } else {
            this.tokenQueue.push(newToken);
            log('SYSTEM', 'wplacer', `TOKEN_MANAGER: ✅ Token received. Queue size: ${this.tokenQueue.length}`);
        }
    }

    invalidateToken() {
        // This is now handled by the consumer (getToken), but we keep it in case of explicit invalidation needs.
        const invalidated = this.tokenQueue.shift();
        if (invalidated) {
            log('SYSTEM', 'wplacer', `TOKEN_MANAGER: 🔄 Invalidating token. ${this.tokenQueue.length} left.`);
        }
    }
}

// Export a singleton instance
export const tokenManager = new TokenManager();
