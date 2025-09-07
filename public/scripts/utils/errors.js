/**
 * Error handling utilities
 */
import { showMessage } from './ui.js';

export const handleError = (error) => {
    console.error(error);
    let message = 'An unknown error occurred. Check the console for details.';

    if (error.code === 'ERR_NETWORK') {
        message = 'Could not connect to the server. Please ensure the bot is running and accessible.';
    } else if (error.response && error.response.data && error.response.data.error) {
        const errMsg = error.response.data.error;
        if (errMsg.includes('(1015)')) {
            message = 'You are being rate-limited by the server. Please wait a moment before trying again.';
        } else if (errMsg.includes('(500)')) {
            message = "Authentication failed. The user's cookie may be expired or invalid. Please try adding the user again with a new cookie.";
        } else if (errMsg.includes('(401)')) {
            message = 'Authentication failed (401). This may be due to an invalid cookie or the IP/proxy being rate-limited. Please try again later or with a different proxy.';
        } else if (errMsg.includes('(502)')) {
            message = "The server reported a 'Bad Gateway' error. It might be temporarily down or restarting. Please try again in a few moments.";
        } else {
            message = errMsg;
        }
    }
    
    showMessage('Error', message);
};

export const validateInput = (value, type, required = true) => {
    if (required && (!value || value.trim() === '')) {
        return { valid: false, message: 'This field is required.' };
    }

    switch (type) {
        case 'number':
            const num = parseInt(value, 10);
            if (isNaN(num) || num < 0) {
                return { valid: false, message: 'Please enter a valid non-negative number.' };
            }
            return { valid: true, value: num };

        case 'percentage':
            const percent = parseInt(value, 10);
            if (isNaN(percent) || percent < 0 || percent > 100) {
                return { valid: false, message: 'Please enter a valid percentage between 0 and 100.' };
            }
            return { valid: true, value: percent / 100 };

        case 'coordinates':
            const coords = value.split(/\s+/).map(v => v.replace(/[^0-9]/g, ''));
            if (coords.length !== 4 || coords.some(c => c === '')) {
                return { valid: false, message: 'Please enter valid coordinates (4 numbers).' };
            }
            return { valid: true, value: coords.map(Number) };

        default:
            return { valid: true, value: value.trim() };
    }
};
