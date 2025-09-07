/**
 * Loading Component - Handles loading states and spinners
 */
class Loading {
    constructor() {
        this.loadingElements = new Map();
        this.init();
    }

    /**
     * Initialize loading system
     */
    init() {
        this.addStyles();
    }

    /**
     * Add loading styles
     */
    addStyles() {
        if (document.getElementById('loading-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'loading-styles';
        styles.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }

            .loading-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .loading-spinner {
                background: white;
                border-radius: 8px;
                padding: 24px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                min-width: 200px;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                font-size: 14px;
                color: #666;
                margin: 0;
            }

            .loading-button {
                position: relative;
                overflow: hidden;
            }

            .loading-button .spinner-small {
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                display: inline-block;
                margin-right: 8px;
            }

            .loading-button.loading {
                pointer-events: none;
                opacity: 0.7;
            }

            .loading-inline {
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .loading-inline .spinner-small {
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .loading-inline .loading-text {
                font-size: 13px;
                color: #666;
                margin: 0;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Show full-screen loading overlay
     * @param {string} message - Loading message
     * @returns {string} Loading ID
     */
    show(message = 'Loading...') {
        const id = this.generateId();
        const overlay = this.createOverlay(id, message);
        document.body.appendChild(overlay);
        this.loadingElements.set(id, overlay);

        // Trigger animation
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);

        return id;
    }

    /**
     * Hide loading overlay
     * @param {string} id - Loading ID
     */
    hide(id) {
        const overlay = this.loadingElements.get(id);
        if (!overlay) return;

        overlay.classList.remove('show');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            this.loadingElements.delete(id);
        }, 300);
    }

    /**
     * Create loading overlay
     * @param {string} id - Loading ID
     * @param {string} message - Loading message
     * @returns {HTMLElement} Overlay element
     */
    createOverlay(id, message) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.dataset.id = id;

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';

        const spinnerIcon = document.createElement('div');
        spinnerIcon.className = 'spinner';

        const text = document.createElement('p');
        text.className = 'loading-text';
        text.textContent = message;

        spinner.appendChild(spinnerIcon);
        spinner.appendChild(text);
        overlay.appendChild(spinner);

        return overlay;
    }

    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Loading state
     * @param {string} text - Loading text (optional)
     */
    setButtonLoading(button, loading, text = 'Loading...') {
        if (!button) return;

        if (loading) {
            button.classList.add('loading');
            button.dataset.originalText = button.textContent;
            
            const spinner = document.createElement('span');
            spinner.className = 'spinner-small';
            button.insertBefore(spinner, button.firstChild);
            
            if (text) {
                button.textContent = text;
            }
        } else {
            button.classList.remove('loading');
            const spinner = button.querySelector('.spinner-small');
            if (spinner) {
                spinner.remove();
            }
            
            const originalText = button.dataset.originalText;
            if (originalText) {
                button.textContent = originalText;
                delete button.dataset.originalText;
            }
        }
    }

    /**
     * Create inline loading element
     * @param {string} message - Loading message
     * @returns {HTMLElement} Loading element
     */
    createInline(message = 'Loading...') {
        const container = document.createElement('div');
        container.className = 'loading-inline';

        const spinner = document.createElement('div');
        spinner.className = 'spinner-small';

        const text = document.createElement('span');
        text.className = 'loading-text';
        text.textContent = message;

        container.appendChild(spinner);
        container.appendChild(text);

        return container;
    }

    /**
     * Wrap async function with loading state
     * @param {Function} asyncFunction - Async function to wrap
     * @param {string} message - Loading message
     * @returns {Function} Wrapped function
     */
    wrapAsync(asyncFunction, message = 'Loading...') {
        return async (...args) => {
            const loadingId = this.show(message);
            try {
                const result = await asyncFunction(...args);
                return result;
            } finally {
                this.hide(loadingId);
            }
        };
    }

    /**
     * Wrap button click with loading state
     * @param {HTMLElement} button - Button element
     * @param {Function} clickHandler - Click handler function
     * @param {string} loadingText - Loading text
     * @returns {Function} Wrapped click handler
     */
    wrapButtonClick(button, clickHandler, loadingText = 'Loading...') {
        return async (event) => {
            this.setButtonLoading(button, true, loadingText);
            try {
                await clickHandler(event);
            } finally {
                this.setButtonLoading(button, false);
            }
        };
    }

    /**
     * Clear all loading overlays
     */
    clear() {
        this.loadingElements.forEach((overlay, id) => {
            this.hide(id);
        });
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if any loading is active
     * @returns {boolean} True if loading is active
     */
    isLoading() {
        return this.loadingElements.size > 0;
    }
}

// Export singleton instance
export const loading = new Loading();
