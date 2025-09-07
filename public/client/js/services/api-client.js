/**
 * API Client - Centralized backend API wrapper
 * Handles all communication with the backend API
 */
class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiUrl = `${this.baseUrl}/api`;
    }

    /**
     * Make a GET request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<any>} Response data
     */
    async get(endpoint, params = {}) {
        const url = new URL(`${this.apiUrl}${endpoint}`, this.baseUrl);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Make a POST request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<any>} Response data
     */
    async post(endpoint, data = {}) {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        // Handle empty responses
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    /**
     * Make a PUT request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise<any>} Response data
     */
    async put(endpoint, data = {}) {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    /**
     * Make a DELETE request to the API
     * @param {string} endpoint - API endpoint
     * @returns {Promise<any>} Response data
     */
    async delete(endpoint) {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    // User API methods
    async getUsers() {
        return await this.get('/users');
    }

    async addUser(userData) {
        return await this.post('/users', userData);
    }

    async deleteUser(userId) {
        return await this.delete(`/users/${userId}`);
    }

    async checkUserStatus(userId) {
        return await this.get(`/users/status/${userId}`);
    }

    async checkAllUsersStatus() {
        return await this.post('/users/status');
    }

    // Template API methods
    async getTemplates() {
        return await this.get('/templates');
    }

    async createTemplate(templateData) {
        return await this.post('/templates', templateData);
    }

    async updateTemplate(templateId, templateData) {
        return await this.put(`/templates/${templateId}`, templateData);
    }

    async deleteTemplate(templateId) {
        return await this.delete(`/templates/${templateId}`);
    }

    async importTemplate(importData) {
        return await this.post('/templates/import', importData);
    }

    async startTemplate(templateId) {
        return await this.put(`/templates/${templateId}`, { running: true });
    }

    async stopTemplate(templateId) {
        return await this.put(`/templates/${templateId}`, { running: false });
    }

    async getTemplateColors(templateId) {
        return await this.get(`/templates/${templateId}/colors`);
    }

    // Settings API methods
    async getSettings() {
        return await this.get('/settings');
    }

    async updateSettings(settings) {
        return await this.put('/settings', settings);
    }

    // Color ordering API methods
    async getColorOrdering(templateId = null) {
        return await this.get('/color-ordering', templateId ? { templateId } : {});
    }

    async updateGlobalColorOrdering(order) {
        return await this.put('/color-ordering/global', { order });
    }

    async updateTemplateColorOrdering(templateId, order) {
        return await this.put(`/color-ordering/template/${templateId}`, { order });
    }

    async resetTemplateColorOrdering(templateId) {
        return await this.delete(`/color-ordering/template/${templateId}`);
    }

    // System API methods
    async getTokenNeeded() {
        return await this.get('/system/token-needed');
    }

    async submitToken(tokenData) {
        return await this.post('/system/token', tokenData);
    }

    async getPawtectStatus() {
        return await this.get('/system/pawtect-status');
    }

    async getCanvasTile(tx, ty) {
        return await this.get('/system/canvas', { tx, ty });
    }

    async reloadProxies() {
        return await this.post('/system/reload-proxies');
    }

    // Logs API methods
    async getLogs(lastSize = 0) {
        return await this.get('/system/logs', { lastSize });
    }

    async getErrors(lastSize = 0) {
        return await this.get('/system/errors', { lastSize });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
