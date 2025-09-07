export class SuspensionError extends Error {
    constructor(message, durationMs) {
        super(message);
        this.name = 'SuspensionError';
        this.durationMs = durationMs;
        this.suspendedUntil = Date.now() + durationMs;
    }
}

export class NetworkError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NetworkError';
    }
}
