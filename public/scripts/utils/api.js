/**
 * API utility functions
 */
import { handleError } from './errors.js';

const API_BASE = '';

export const api = {
    get: async (endpoint) => {
        try {
            const response = await axios.get(API_BASE + endpoint);
            return response.data;
        } catch (error) {
            handleError(error);
            throw error;
        }
    },

    post: async (endpoint, data) => {
        try {
            const response = await axios.post(API_BASE + endpoint, data);
            return response.data;
        } catch (error) {
            handleError(error);
            throw error;
        }
    },

    put: async (endpoint, data) => {
        try {
            const response = await axios.put(API_BASE + endpoint, data);
            return response.data;
        } catch (error) {
            handleError(error);
            throw error;
        }
    },

    delete: async (endpoint) => {
        try {
            const response = await axios.delete(API_BASE + endpoint);
            return response.data;
        } catch (error) {
            handleError(error);
            throw error;
        }
    }
};

export const loadUsers = async (callback) => {
    try {
        const users = await api.get('/users');
        if (callback) callback(users);
        return users;
    } catch (error) {
        console.error('Failed to load users:', error);
        return {};
    }
};

export const loadTemplates = async (callback) => {
    try {
        const templates = await api.get('/templates');
        if (callback) callback(templates);
        return templates;
    } catch (error) {
        console.error('Failed to load templates:', error);
        return {};
    }
};

export const loadSettings = async () => {
    try {
        return await api.get('/settings');
    } catch (error) {
        console.error('Failed to load settings:', error);
        return {};
    }
};

export const saveSetting = async (setting) => {
    try {
        await api.put('/settings', setting);
        return true;
    } catch (error) {
        console.error('Failed to save setting:', error);
        return false;
    }
};
