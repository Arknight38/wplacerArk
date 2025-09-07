/**
 * Charge prediction cache for user charge management
 */
export class ChargeCache {
    constructor() {
        this._m = new Map();
        this.REGEN_MS = 30_000; // 30 seconds
        this.SYNC_MS = 8 * 60_000; // 8 minutes
    }

    /**
     * Get cache key for user ID
     * @param {string|number} id - User ID
     * @returns {string} Cache key
     */
    _key(id) {
        return String(id);
    }

    /**
     * Check if user has cached charge data
     * @param {string|number} id - User ID
     * @returns {boolean} True if cached
     */
    has(id) {
        return this._m.has(this._key(id));
    }

    /**
     * Check if cached data is stale
     * @param {string|number} id - User ID
     * @param {number} now - Current timestamp
     * @returns {boolean} True if stale
     */
    stale(id, now = Date.now()) {
        const u = this._m.get(this._key(id));
        if (!u) return true;
        return now - u.lastSync > this.SYNC_MS;
    }

    /**
     * Mark charge data from user info
     * @param {Object} userInfo - User information
     * @param {number} now - Current timestamp
     */
    markFromUserInfo(userInfo, now = Date.now()) {
        if (!userInfo?.id || !userInfo?.charges) return;
        
        const k = this._key(userInfo.id);
        const base = Math.floor(userInfo.charges.count ?? 0);
        const max = Math.floor(userInfo.charges.max ?? 0);
        
        this._m.set(k, { base, max, lastSync: now });
    }

    /**
     * Predict current charges for user
     * @param {string|number} id - User ID
     * @param {number} now - Current timestamp
     * @returns {Object|null} Predicted charges or null
     */
    predict(id, now = Date.now()) {
        const u = this._m.get(this._key(id));
        if (!u) return null;
        
        const grown = Math.floor((now - u.lastSync) / this.REGEN_MS);
        const count = Math.min(u.max, u.base + Math.max(0, grown));
        
        return { count, max: u.max, cooldownMs: this.REGEN_MS };
    }

    /**
     * Consume charges for user
     * @param {string|number} id - User ID
     * @param {number} n - Number of charges to consume
     * @param {number} now - Current timestamp
     */
    consume(id, n = 1, now = Date.now()) {
        const k = this._key(id);
        const u = this._m.get(k);
        if (!u) return;
        
        const grown = Math.floor((now - u.lastSync) / this.REGEN_MS);
        const avail = Math.min(u.max, u.base + Math.max(0, grown));
        const newCount = Math.max(0, avail - n);
        
        u.base = newCount;
        // align to last regen tick
        u.lastSync = now - ((now - u.lastSync) % this.REGEN_MS);
        
        this._m.set(k, u);
    }

    /**
     * Clear cache for user
     * @param {string|number} id - User ID
     */
    clear(id) {
        this._m.delete(this._key(id));
    }

    /**
     * Clear all cache
     */
    clearAll() {
        this._m.clear();
    }

    /**
     * Get cache size
     * @returns {number} Number of cached users
     */
    size() {
        return this._m.size;
    }
}

// Export singleton instance
export const chargeCache = new ChargeCache();