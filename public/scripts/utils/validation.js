/**
 * Input validation utilities
 */
import { showMessage } from './ui.js';

export const validateCoordinates = (tx, ty, px, py) => {
    const coords = [tx, ty, px, py].map(val => parseInt(val, 10));
    
    if (coords.some(isNaN)) {
        showMessage('Error', 'Please enter valid numeric coordinates.');
        return false;
    }
    
    if (coords.some(val => val < 0)) {
        showMessage('Error', 'Coordinates must be non-negative numbers.');
        return false;
    }
    
    return true;
};

export const validateTemplateData = (templateName, coords, selectedUsers) => {
    if (!templateName || templateName.trim() === '') {
        showMessage('Error', 'Please enter a template name.');
        return false;
    }
    
    if (!validateCoordinates(...coords)) {
        return false;
    }
    
    if (!selectedUsers || selectedUsers.length === 0) {
        showMessage('Error', 'Please select at least one user.');
        return false;
    }
    
    return true;
};

export const validateUserData = (jcookie) => {
    if (!jcookie || jcookie.trim() === '') {
        showMessage('Error', 'JWT Cookie (j) is required.');
        return false;
    }
    
    return true;
};

export const validateSettings = (settings) => {
    const errors = [];
    
    if (settings.accountCooldown < 0) {
        errors.push('Account cooldown must be non-negative.');
    }
    
    if (settings.purchaseCooldown < 0) {
        errors.push('Purchase cooldown must be non-negative.');
    }
    
    if (settings.accountCheckCooldown < 0) {
        errors.push('Account check cooldown must be non-negative.');
    }
    
    if (settings.dropletReserve < 0) {
        errors.push('Droplet reserve must be non-negative.');
    }
    
    if (settings.antiGriefStandby < 60000) {
        errors.push('Anti-grief standby time must be at least 1 minute.');
    }
    
    if (settings.chargeThreshold < 0 || settings.chargeThreshold > 1) {
        errors.push('Charge threshold must be between 0 and 100%.');
    }
    
    if (errors.length > 0) {
        showMessage('Validation Error', errors.join('<br>'));
        return false;
    }
    
    return true;
};

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, 1000); // Limit length
};

export const validateFileUpload = (file, allowedTypes = ['image/png']) => {
    if (!file) {
        showMessage('Error', 'Please select a file.');
        return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
        showMessage('Error', `Please select a valid file type. Allowed types: ${allowedTypes.join(', ')}`);
        return false;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showMessage('Error', 'File size must be less than 10MB.');
        return false;
    }
    
    return true;
};
