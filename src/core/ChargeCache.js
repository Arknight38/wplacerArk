/**
 * Charge prediction cache for tracking user charge regeneration
 */
export class ChargeCache {
    constructor() {
        this._m = new Map();
        this.REGEN_MS = 30_000;
        this.SYNC_MS = 8 * 60_000;
    }

    _key(id) {
        return String(id);
    }

    has(id) {
        return this._m.has(this._key(id));
    }

    stale(id, now = Date.now()) {
        const u = this._m.get(this._key(id));
        if (!u) return true;
        return now - u.lastSync > this.SYNC_MS;
    }

    markFromUserInfo(userInfo, now = Date.now()) {
        if (!userInfo?.id || !userInfo?.charges) return;
        const k = this._key(userInfo.id);
        const base = Math.floor(userInfo.charges.count ?? 0);
        const max = Math.floor(userInfo.charges.max ?? 0);
        this._m.set(k, { base, max, lastSync: now });
    }

    predict(id, now = Date.now()) {
        const u = this._m.get(this._key(id));
        if (!u) return null;
        const grown = Math.floor((now - u.lastSync) / this.REGEN_MS);
        const count = Math.min(u.max, u.base + Math.max(0, grown));
        return { count, max: u.max, cooldownMs: this.REGEN_MS };
    }

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
}

// Export a singleton instance
export const chargeCache = new ChargeCache();
