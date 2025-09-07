import { MS } from '../config/constants.js';

export class Settings {
    constructor(data = {}) {
        // Set defaults
        this.accountCooldown = data.accountCooldown ?? 20000;
        this.purchaseCooldown = data.purchaseCooldown ?? 5000;
        this.keepAliveCooldown = data.keepAliveCooldown ?? MS.ONE_HOUR;
        this.dropletReserve = data.dropletReserve ?? 0;
        this.antiGriefStandby = data.antiGriefStandby ?? 600000;
        this.drawingDirection = data.drawingDirection ?? 'ttb';
        this.drawingOrder = data.drawingOrder ?? 'linear';
        this.chargeThreshold = data.chargeThreshold ?? 0.5;
        this.pixelSkip = data.pixelSkip ?? 1;
        this.proxyEnabled = data.proxyEnabled ?? false;
        this.proxyRotationMode = data.proxyRotationMode ?? 'sequential';
        this.logProxyUsage = data.logProxyUsage ?? false;
        this.openBrowserOnStart = data.openBrowserOnStart ?? true;

        this.sanitize();
    }

    static fromJSON(data) {
        return new Settings(data);
    }

    toJSON() {
        return {
            accountCooldown: this.accountCooldown,
            purchaseCooldown: this.purchaseCooldown,
            keepAliveCooldown: this.keepAliveCooldown,
            dropletReserve: this.dropletReserve,
            antiGriefStandby: this.antiGriefStandby,
            drawingDirection: this.drawingDirection,
            drawingOrder: this.drawingOrder,
            chargeThreshold: this.chargeThreshold,
            pixelSkip: this.pixelSkip,
            proxyEnabled: this.proxyEnabled,
            proxyRotationMode: this.proxyRotationMode,
            logProxyUsage: this.logProxyUsage,
            openBrowserOnStart: this.openBrowserOnStart
        };
    }

    update(newSettings) {
        Object.assign(this, newSettings);
        this.sanitize();
        return this;
    }

    sanitize() {
        // Ensure numeric values are within reasonable bounds
        this.accountCooldown = Math.max(0, Math.min(300000, Number(this.accountCooldown) || 20000));
        this.purchaseCooldown = Math.max(0, Math.min(60000, Number(this.purchaseCooldown) || 5000));
        this.keepAliveCooldown = Math.max(MS.FIVE_MIN, Math.min(24 * MS.ONE_HOUR, Number(this.keepAliveCooldown) || MS.ONE_HOUR));
        this.dropletReserve = Math.max(0, Number(this.dropletReserve) || 0);
        this.antiGriefStandby = Math.max(0, Math.min(MS.ONE_HOUR, Number(this.antiGriefStandby) || 600000));
        this.chargeThreshold = Math.max(0, Math.min(1, Number(this.chargeThreshold) || 0.5));
        this.pixelSkip = Math.max(1, Math.min(100, Number(this.pixelSkip) || 1));

        // Validate string enums
        const validDirections = ['ttb', 'btt', 'ltr', 'rtl', 'center_out', 'random'];
        if (!validDirections.includes(this.drawingDirection)) {
            this.drawingDirection = 'ttb';
        }

        const validOrders = ['linear', 'color'];
        if (!validOrders.includes(this.drawingOrder)) {
            this.drawingOrder = 'linear';
        }

        const validProxyModes = ['sequential', 'random'];
        if (!validProxyModes.includes(this.proxyRotationMode)) {
            this.proxyRotationMode = 'sequential';
        }

        // Ensure boolean values
        this.proxyEnabled = Boolean(this.proxyEnabled);
        this.logProxyUsage = Boolean(this.logProxyUsage);
        this.openBrowserOnStart = Boolean(this.openBrowserOnStart);
    }

    validate() {
        const errors = [];

        if (this.accountCooldown < 0) {
            errors.push('Account cooldown cannot be negative');
        }

        if (this.purchaseCooldown < 0) {
            errors.push('Purchase cooldown cannot be negative');
        }

        if (this.keepAliveCooldown < MS.FIVE_MIN) {
            errors.push('Keep-alive cooldown must be at least 5 minutes');
        }

        if (this.chargeThreshold < 0 || this.chargeThreshold > 1) {
            errors.push('Charge threshold must be between 0 and 1');
        }

        if (this.pixelSkip < 1) {
            errors.push('Pixel skip must be at least 1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getDrawingDirectionName() {
        const names = {
            'ttb': 'Top to Bottom',
            'btt': 'Bottom to Top',
            'ltr': 'Left to Right',
            'rtl': 'Right to Left',
            'center_out': 'Center Outward',
            'random': 'Random'
        };
        return names[this.drawingDirection] || 'Unknown';
    }

    getDrawingOrderName() {
        const names = {
            'linear': 'Linear (Position-based)',
            'color': 'Color-based'
        };
        return names[this.drawingOrder] || 'Unknown';
    }

    clone() {
        return new Settings(this.toJSON());
    }
}