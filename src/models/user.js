export class User {
    constructor({ id, name, cookies, expirationDate, suspendedUntil = null }) {
        this.id = id;
        this.name = name;
        this.cookies = cookies;
        this.expirationDate = expirationDate;
        this.suspendedUntil = suspendedUntil;
    }

    static fromJSON(data) {
        return new User(data);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            cookies: this.cookies,
            expirationDate: this.expirationDate,
            suspendedUntil: this.suspendedUntil
        };
    }

    isSuspended() {
        return this.suspendedUntil && Date.now() < this.suspendedUntil;
    }

    isExpired() {
        return this.expirationDate && Date.now() > new Date(this.expirationDate);
    }

    suspend(durationMs) {
        this.suspendedUntil = Date.now() + durationMs;
    }

    unsuspend() {
        this.suspendedUntil = null;
    }

    updateCookies(cookies) {
        this.cookies = cookies;
    }

    validate() {
        const errors = [];
        
        if (!this.id) errors.push('User ID is required');
        if (!this.name) errors.push('User name is required');
        if (!this.cookies || !this.cookies.j) errors.push('Valid cookies with j property required');
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}