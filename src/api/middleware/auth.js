import { HTTP_STATUS } from '../../config/constants.js';

// Basic rate limiting middleware
export const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        if (requests.has(clientId)) {
            const clientRequests = requests.get(clientId).filter(time => time > windowStart);
            requests.set(clientId, clientRequests);
        } else {
            requests.set(clientId, []);
        }

        const clientRequests = requests.get(clientId);
        
        if (clientRequests.length >= maxRequests) {
            return res.status(HTTP_STATUS.TOO_MANY).json({
                error: 'Too many requests',
                message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        clientRequests.push(now);
        next();
    };
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;
        
        console.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });
    
    next();
};

// CORS helper (though we're using the cors package, this is for custom cases)
export const corsHeaders = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
};