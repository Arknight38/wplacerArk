/**
 * WebSocket Service - Handles real-time log streaming
 * Manages WebSocket connections for logs and errors
 */
class WebSocketService {
    constructor() {
        this.logsWs = null;
        this.errorsWs = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.listeners = {
            logs: new Set(),
            errors: new Set(),
            connection: new Set()
        };
    }

    /**
     * Connect to WebSocket servers
     */
    connect() {
        this.connectLogs();
        this.connectErrors();
    }

    /**
     * Connect to logs WebSocket
     */
    connectLogs() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws-logs?type=logs`;
            
            this.logsWs = new WebSocket(wsUrl);
            
            this.logsWs.onopen = () => {
                console.log('✅ Logs WebSocket connected');
                this.reconnectAttempts = 0;
                this.isConnected = true;
                this.notifyConnectionListeners('connected');
            };

            this.logsWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.initial) {
                        // Initial log history
                        this.notifyLogsListeners('initial', data.initial);
                    } else {
                        // New log line
                        this.notifyLogsListeners('new', event.data);
                    }
                } catch (error) {
                    // Handle plain text messages
                    this.notifyLogsListeners('new', event.data);
                }
            };

            this.logsWs.onclose = () => {
                console.log('❌ Logs WebSocket disconnected');
                this.isConnected = false;
                this.notifyConnectionListeners('disconnected');
                this.attemptReconnect('logs');
            };

            this.logsWs.onerror = (error) => {
                console.error('❌ Logs WebSocket error:', error);
                this.notifyConnectionListeners('error');
            };
        } catch (error) {
            console.error('❌ Failed to connect to logs WebSocket:', error);
        }
    }

    /**
     * Connect to errors WebSocket
     */
    connectErrors() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws-logs?type=errors`;
            
            this.errorsWs = new WebSocket(wsUrl);
            
            this.errorsWs.onopen = () => {
                console.log('✅ Errors WebSocket connected');
            };

            this.errorsWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.initial) {
                        // Initial error history
                        this.notifyErrorsListeners('initial', data.initial);
                    } else {
                        // New error line
                        this.notifyErrorsListeners('new', event.data);
                    }
                } catch (error) {
                    // Handle plain text messages
                    this.notifyErrorsListeners('new', event.data);
                }
            };

            this.errorsWs.onclose = () => {
                console.log('❌ Errors WebSocket disconnected');
                this.attemptReconnect('errors');
            };

            this.errorsWs.onerror = (error) => {
                console.error('❌ Errors WebSocket error:', error);
            };
        } catch (error) {
            console.error('❌ Failed to connect to errors WebSocket:', error);
        }
    }

    /**
     * Attempt to reconnect WebSocket
     * @param {string} type - 'logs' or 'errors'
     */
    attemptReconnect(type) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ Max reconnection attempts reached for ${type} WebSocket`);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Attempting to reconnect ${type} WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (type === 'logs') {
                this.connectLogs();
            } else {
                this.connectErrors();
            }
        }, delay);
    }

    /**
     * Disconnect all WebSocket connections
     */
    disconnect() {
        if (this.logsWs) {
            this.logsWs.close();
            this.logsWs = null;
        }
        if (this.errorsWs) {
            this.errorsWs.close();
            this.errorsWs = null;
        }
        this.isConnected = false;
    }

    /**
     * Add listener for logs events
     * @param {Function} callback - Callback function
     */
    addLogsListener(callback) {
        this.listeners.logs.add(callback);
    }

    /**
     * Remove listener for logs events
     * @param {Function} callback - Callback function
     */
    removeLogsListener(callback) {
        this.listeners.logs.delete(callback);
    }

    /**
     * Add listener for errors events
     * @param {Function} callback - Callback function
     */
    addErrorsListener(callback) {
        this.listeners.errors.add(callback);
    }

    /**
     * Remove listener for errors events
     * @param {Function} callback - Callback function
     */
    removeErrorsListener(callback) {
        this.listeners.errors.delete(callback);
    }

    /**
     * Add listener for connection events
     * @param {Function} callback - Callback function
     */
    addConnectionListener(callback) {
        this.listeners.connection.add(callback);
    }

    /**
     * Remove listener for connection events
     * @param {Function} callback - Callback function
     */
    removeConnectionListener(callback) {
        this.listeners.connection.delete(callback);
    }

    /**
     * Notify logs listeners
     * @param {string} type - Event type
     * @param {any} data - Event data
     */
    notifyLogsListeners(type, data) {
        this.listeners.logs.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {
                console.error('Error in logs listener:', error);
            }
        });
    }

    /**
     * Notify errors listeners
     * @param {string} type - Event type
     * @param {any} data - Event data
     */
    notifyErrorsListeners(type, data) {
        this.listeners.errors.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {
                console.error('Error in errors listener:', error);
            }
        });
    }

    /**
     * Notify connection listeners
     * @param {string} status - Connection status
     */
    notifyConnectionListeners(status) {
        this.listeners.connection.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    /**
     * Get connection status
     * @returns {boolean} True if connected
     */
    isWebSocketConnected() {
        return this.isConnected;
    }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
