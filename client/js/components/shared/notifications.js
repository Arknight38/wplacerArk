/**
 * Notifications Component - Handles user notifications and alerts
 */
class Notifications {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.init();
    }

    /**
     * Initialize notifications system
     */
    init() {
        this.createContainer();
        this.addStyles();
    }

    /**
     * Create notifications container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.className = 'notifications-container';
        document.body.appendChild(this.container);
    }

    /**
     * Add notification styles
     */
    addStyles() {
        if (document.getElementById('notifications-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notifications-styles';
        styles.textContent = `
            .notifications-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }

            .notification {
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px;
                min-width: 300px;
                max-width: 500px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
                opacity: 0;
            }

            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification.success {
                border-left: 4px solid #4CAF50;
                background: #f8fff8;
            }

            .notification.error {
                border-left: 4px solid #f44336;
                background: #fff8f8;
            }

            .notification.warning {
                border-left: 4px solid #ff9800;
                background: #fffbf0;
            }

            .notification.info {
                border-left: 4px solid #2196F3;
                background: #f0f8ff;
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                margin: 0;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notification-close:hover {
                color: #333;
            }

            .notification-message {
                font-size: 13px;
                color: #666;
                margin: 0;
                line-height: 1.4;
            }

            .notification-progress {
                height: 3px;
                background: #e0e0e0;
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;
            }

            .notification-progress-bar {
                height: 100%;
                background: #4CAF50;
                border-radius: 2px;
                transition: width 0.1s linear;
            }

            .notification-progress-bar.error {
                background: #f44336;
            }

            .notification-progress-bar.warning {
                background: #ff9800;
            }

            .notification-progress-bar.info {
                background: #2196F3;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Show notification
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {string} Notification ID
     */
    show(type, title, message, options = {}) {
        const id = this.generateId();
        const duration = options.duration || 5000;
        const persistent = options.persistent || false;

        const notification = this.createNotification(id, type, title, message, duration, persistent);
        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto-remove if not persistent
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    /**
     * Create notification element
     * @param {string} id - Notification ID
     * @param {string} type - Notification type
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} duration - Auto-remove duration
     * @param {boolean} persistent - Whether notification is persistent
     * @returns {HTMLElement} Notification element
     */
    createNotification(id, type, title, message, duration, persistent) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;

        const header = document.createElement('div');
        header.className = 'notification-header';

        const titleElement = document.createElement('h4');
        titleElement.className = 'notification-title';
        titleElement.textContent = title;

        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => this.remove(id);

        header.appendChild(titleElement);
        header.appendChild(closeButton);

        const messageElement = document.createElement('p');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;

        notification.appendChild(header);
        notification.appendChild(messageElement);

        // Add progress bar for non-persistent notifications
        if (!persistent && duration > 0) {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'notification-progress';

            const progressBar = document.createElement('div');
            progressBar.className = `notification-progress-bar ${type}`;
            progressBar.style.width = '100%';

            progressContainer.appendChild(progressBar);
            notification.appendChild(progressContainer);

            // Animate progress bar
            const startTime = Date.now();
            const updateProgress = () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, duration - elapsed);
                const percentage = (remaining / duration) * 100;
                progressBar.style.width = `${percentage}%`;

                if (remaining > 0) {
                    requestAnimationFrame(updateProgress);
                }
            };
            requestAnimationFrame(updateProgress);
        }

        return notification;
    }

    /**
     * Remove notification
     * @param {string} id - Notification ID
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.remove('show');
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clear() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Convenience methods
    success(title, message, options = {}) {
        return this.show('success', title, message, options);
    }

    error(title, message, options = {}) {
        return this.show('error', title, message, { ...options, duration: 8000 });
    }

    warning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    }

    info(title, message, options = {}) {
        return this.show('info', title, message, options);
    }
}

// Export singleton instance
export const notifications = new Notifications();
