import { BaseError } from './base-error.js';

/**
 * Network-related errors (timeouts, connection issues, etc.)
 */
export class NetworkError extends BaseError {
    constructor(message, code = 'NETWORK_ERROR', statusCode = 502) {
        super(message, code, statusCode);
        this.name = 'NetworkError';
    }
}