import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Get current file directory for ES modules
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// Environment variables with defaults
export const ENV = {
    PORT: process.env.PORT || 80,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATA_DIR: process.env.DATA_DIR || './data',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    PROXY_ENABLED: process.env.PROXY_ENABLED === 'true',
    OPEN_BROWSER_ON_START: process.env.OPEN_BROWSER_ON_START !== 'false',
};

// Validate environment
export function validateEnvironment() {
    const warnings = [];
    
    if (ENV.NODE_ENV === 'production' && ENV.PORT < 1024) {
        warnings.push('Running on privileged port in production may require elevated privileges');
    }
    
    if (ENV.DATA_DIR.startsWith('./') && ENV.NODE_ENV === 'production') {
        warnings.push('Using relative data directory in production is not recommended');
    }
    
    return warnings;
}
