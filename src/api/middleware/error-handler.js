import { HTTP_STATUS } from '../../config/constants.js';
import { NetworkError } from '../../errors/network-error.js';
import { SuspensionError } from '../../errors/suspension-error.js';
import { log } from '../../utils/logger.js';

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
    // If response was already sent, delegate to Express default error handler
    if (res.headersSent) {
        return next(err);
    }

    log('SYSTEM', 'ErrorHandler', `API Error: ${err.message}`, err);

    // Handle specific error types
    if (err instanceof NetworkError) {
        return res.status(HTTP_STATUS.BAD_GATEWAY).json({
            error: 'Network error occurred',
            message: err.message
        });
    }

    if (err instanceof SuspensionError) {
        return res.status(HTTP_STATUS.UNAVAILABLE_LEGAL).json({
            error: 'Account suspended',
            message: err.message,
            suspendedUntil: err.suspendedUntil,
            durationMs: err.durationMs
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(HTTP_STATUS.BAD_REQ).json({
            error: 'Validation failed',
            message: err.message
        });
    }

    // Handle JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(HTTP_STATUS.BAD_REQ).json({
            error: 'Invalid JSON in request body'
        });
    }

    // Default to 500 server error
    res.status(HTTP_STATUS.SRV_ERR).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
};