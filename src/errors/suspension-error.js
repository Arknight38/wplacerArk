import { BaseError } from './base-error.js';

/**
 * Account suspension errors
 */
export class SuspensionError extends BaseError {
    constructor(message, durationMs = 0, code = 'SUSPENSION_ERROR', statusCode = 451) {
        super(message, code, statusCode);
        this.name = 'SuspensionError';
        this.durationMs = durationMs;
        this.suspendedUntil = Date.now() + durationMs;
    }
    
    getRemainingTime() {
        return Math.max(0, this.suspendedUntil - Date.now());
    }
    
    isExpired() {
        return this.getRemainingTime() === 0;
    }
}