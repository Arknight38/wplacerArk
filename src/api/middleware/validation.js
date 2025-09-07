import { HTTP_STATUS } from '../../config/constants.js';

// Validation middleware for templates
export const validateTemplate = (req, res, next) => {
    const {
        templateName,
        template,
        coords,
        userIds,
    } = req.body || {};

    if (!templateName || typeof templateName !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'templateName is required and must be a string' 
        });
    }

    if (!template || !template.width || !template.height || !Array.isArray(template.data)) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'template must have width, height, and data array' 
        });
    }

    if (!Array.isArray(coords) || coords.length !== 4) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'coords must be an array of 4 numbers [tx, ty, px, py]' 
        });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'userIds must be a non-empty array' 
        });
    }

    next();
};

// Validation middleware for user creation
export const validateUser = (req, res, next) => {
    const { cookies } = req.body || {};

    if (!cookies || typeof cookies !== 'object' || !cookies.j) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'cookies object with j property is required' 
        });
    }

    next();
};

// Validation middleware for template import
export const validateTemplateImport = (req, res, next) => {
    const { id, code } = req.body || {};

    if (!id || typeof id !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'id is required and must be a string' 
        });
    }

    if (!code || typeof code !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'code is required and must be a string' 
        });
    }

    next();
};

// Validation middleware for template ID params
export const validateTemplateId = (req, res, next) => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'Valid template ID is required' 
        });
    }

    next();
};

// Validation middleware for user ID params
export const validateUserId = (req, res, next) => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'Valid user ID is required' 
        });
    }

    next();
};

// Validation middleware for color ordering
export const validateColorOrder = (req, res, next) => {
    const { order } = req.body || {};

    if (!Array.isArray(order)) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'order must be an array of color IDs' 
        });
    }

    if (!order.every(id => Number.isInteger(id) && id >= 0)) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ 
            error: 'all color IDs must be non-negative integers' 
        });
    }

    next();
};