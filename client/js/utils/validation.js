/**
 * Validation Utilities - Form validation helpers
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate numeric value
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {boolean} True if valid number
 */
export const isValidNumber = (value, min = null, max = null) => {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
};

/**
 * Validate integer value
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {boolean} True if valid integer
 */
export const isValidInteger = (value, min = null, max = null) => {
    const num = Number(value);
    if (!Number.isInteger(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
};

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @returns {boolean} True if not empty
 */
export const isRequired = (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
};

/**
 * Validate string length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length (optional)
 * @param {number} maxLength - Maximum length (optional)
 * @returns {boolean} True if valid length
 */
export const isValidLength = (value, minLength = null, maxLength = null) => {
    const length = value ? value.length : 0;
    if (minLength !== null && length < minLength) return false;
    if (maxLength !== null && length > maxLength) return false;
    return true;
};

/**
 * Validate template coordinates
 * @param {string|number} tx - Tile X coordinate
 * @param {string|number} ty - Tile Y coordinate
 * @param {string|number} px - Pixel X coordinate
 * @param {string|number} py - Pixel Y coordinate
 * @returns {Object} Validation result
 */
export const validateTemplateCoordinates = (tx, ty, px, py) => {
    const errors = [];
    
    if (!isValidInteger(tx, -1000, 1000)) {
        errors.push('Tile X must be an integer between -1000 and 1000');
    }
    
    if (!isValidInteger(ty, -1000, 1000)) {
        errors.push('Tile Y must be an integer between -1000 and 1000');
    }
    
    if (!isValidInteger(px, 0, 999)) {
        errors.push('Pixel X must be an integer between 0 and 999');
    }
    
    if (!isValidInteger(py, 0, 999)) {
        errors.push('Pixel Y must be an integer between 0 and 999');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate template name
 * @param {string} name - Template name
 * @returns {Object} Validation result
 */
export const validateTemplateName = (name) => {
    const errors = [];
    
    if (!isRequired(name)) {
        errors.push('Template name is required');
    } else if (!isValidLength(name, 1, 100)) {
        errors.push('Template name must be between 1 and 100 characters');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate user cookies
 * @param {string} scookie - S cookie value
 * @param {string} jcookie - J cookie value
 * @returns {Object} Validation result
 */
export const validateUserCookies = (scookie, jcookie) => {
    const errors = [];
    
    if (!isRequired(scookie)) {
        errors.push('S cookie is required');
    }
    
    if (!isRequired(jcookie)) {
        errors.push('J cookie is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate settings values
 * @param {Object} settings - Settings object
 * @returns {Object} Validation result
 */
export const validateSettings = (settings) => {
    const errors = [];
    
    // Validate numeric settings
    const numericSettings = [
        { key: 'accountCooldown', min: 0, max: 300000 },
        { key: 'purchaseCooldown', min: 0, max: 60000 },
        { key: 'keepAliveCooldown', min: 300000, max: 86400000 },
        { key: 'dropletReserve', min: 0, max: 1000000 },
        { key: 'antiGriefStandby', min: 60000, max: 3600000 },
        { key: 'chargeThreshold', min: 0, max: 1 },
        { key: 'pixelSkip', min: 1, max: 16 }
    ];
    
    numericSettings.forEach(({ key, min, max }) => {
        if (settings[key] !== undefined && !isValidNumber(settings[key], min, max)) {
            errors.push(`${key} must be a number between ${min} and ${max}`);
        }
    });
    
    // Validate string settings
    const stringSettings = [
        { key: 'drawingDirection', values: ['ttb', 'btt', 'ltr', 'rtl', 'center_out', 'random'] },
        { key: 'drawingOrder', values: ['linear', 'color'] },
        { key: 'proxyRotationMode', values: ['sequential', 'random'] }
    ];
    
    stringSettings.forEach(({ key, values }) => {
        if (settings[key] !== undefined && !values.includes(settings[key])) {
            errors.push(`${key} must be one of: ${values.join(', ')}`);
        }
    });
    
    // Validate boolean settings
    const booleanSettings = [
        'proxyEnabled', 'logProxyUsage', 'openBrowserOnStart'
    ];
    
    booleanSettings.forEach(key => {
        if (settings[key] !== undefined && typeof settings[key] !== 'boolean') {
            errors.push(`${key} must be a boolean value`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate color ordering
 * @param {Array} order - Color order array
 * @returns {Object} Validation result
 */
export const validateColorOrdering = (order) => {
    const errors = [];
    
    if (!Array.isArray(order)) {
        errors.push('Color order must be an array');
        return { isValid: false, errors };
    }
    
    if (order.length === 0) {
        errors.push('Color order cannot be empty');
    }
    
    // Check for valid color IDs (1-63)
    const validColorIds = new Set(Array.from({ length: 63 }, (_, i) => i + 1));
    
    order.forEach((colorId, index) => {
        if (!isValidInteger(colorId, 1, 63)) {
            errors.push(`Invalid color ID at position ${index}: ${colorId}`);
        }
    });
    
    // Check for duplicates
    const uniqueColors = new Set(order);
    if (uniqueColors.size !== order.length) {
        errors.push('Color order contains duplicate color IDs');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate share code format
 * @param {string} shareCode - Share code to validate
 * @returns {Object} Validation result
 */
export const validateShareCode = (shareCode) => {
    const errors = [];
    
    if (!isRequired(shareCode)) {
        errors.push('Share code is required');
    } else if (!isValidLength(shareCode, 10, 10000)) {
        errors.push('Share code must be between 10 and 10000 characters');
    } else {
        // Basic format validation (should be base64-like)
        const base64Regex = /^[A-Za-z0-9_-]+$/;
        if (!base64Regex.test(shareCode)) {
            errors.push('Share code contains invalid characters');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate form data
 * @param {Object} formData - Form data object
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
export const validateForm = (formData, rules) => {
    const errors = {};
    let isValid = true;
    
    Object.keys(rules).forEach(field => {
        const fieldRules = rules[field];
        const value = formData[field];
        const fieldErrors = [];
        
        // Required validation
        if (fieldRules.required && !isRequired(value)) {
            fieldErrors.push(`${field} is required`);
        }
        
        // Type validation
        if (value && fieldRules.type) {
            switch (fieldRules.type) {
                case 'email':
                    if (!isValidEmail(value)) {
                        fieldErrors.push(`${field} must be a valid email`);
                    }
                    break;
                case 'url':
                    if (!isValidUrl(value)) {
                        fieldErrors.push(`${field} must be a valid URL`);
                    }
                    break;
                case 'number':
                    if (!isValidNumber(value, fieldRules.min, fieldRules.max)) {
                        fieldErrors.push(`${field} must be a valid number`);
                    }
                    break;
                case 'integer':
                    if (!isValidInteger(value, fieldRules.min, fieldRules.max)) {
                        fieldErrors.push(`${field} must be a valid integer`);
                    }
                    break;
            }
        }
        
        // Length validation
        if (value && fieldRules.length) {
            if (!isValidLength(value, fieldRules.length.min, fieldRules.length.max)) {
                fieldErrors.push(`${field} length must be between ${fieldRules.length.min} and ${fieldRules.length.max}`);
            }
        }
        
        // Custom validation
        if (value && fieldRules.custom) {
            const customResult = fieldRules.custom(value, formData);
            if (!customResult.isValid) {
                fieldErrors.push(...customResult.errors);
            }
        }
        
        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
            isValid = false;
        }
    });
    
    return {
        isValid,
        errors
    };
};
