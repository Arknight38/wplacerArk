/**
 * Main Application Entry Point
 * Initializes the WPlacer application and coordinates all components
 */

// Import services
import { apiClient } from './services/api-client.js';
import { webSocketService } from './services/websocket.js';

// Import components
import { notifications } from './components/shared/notifications.js';
import { loading } from './components/shared/loading.js';

// Import utilities
import { $, show, hide, addEventListener } from './utils/dom.js';

/**
 * Main Application Class
 */
class WPlacerApp {
    constructor() {
        this.currentTab = 'main';
        this.templateUpdateInterval = null;
        this.isInitialized = false;
        this.components = new Map();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing WPlacer application...');
            
            // Initialize core services
            await this.initializeServices();
            
            // Initialize UI components
            this.initializeUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            this.isInitialized = true;
            console.log('✅ WPlacer application initialized successfully');
            
            // Show welcome notification
            notifications.success('Welcome!', 'WPlacer is ready to use');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            notifications.error('Initialization Error', 'Failed to start WPlacer. Please refresh the page.');
        }
    }

    /**
     * Initialize core services
     */
    async initializeServices() {
        // Initialize WebSocket connections
        webSocketService.connect();
        
        // Set up WebSocket event listeners
        webSocketService.addConnectionListener((status) => {
            if (status === 'connected') {
                console.log('✅ WebSocket connected');
            } else if (status === 'disconnected') {
                console.log('❌ WebSocket disconnected');
                notifications.warning('Connection Lost', 'Real-time updates are unavailable');
            }
        });
    }

    /**
     * Initialize UI components
     */
    initializeUI() {
        // Initialize tab system
        this.initializeTabs();
        
        // Initialize modals
        this.initializeModals();
        
        // Initialize forms
        this.initializeForms();
        
        // Initialize data tables
        this.initializeDataTables();
    }

    /**
     * Initialize tab system
     */
    initializeTabs() {
        const tabButtons = document.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            addEventListener(button, 'click', (e) => {
                e.preventDefault();
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Initialize modal system
     */
    initializeModals() {
        // Modal open buttons
        const modalButtons = document.querySelectorAll('[data-modal]');
        modalButtons.forEach(button => {
            addEventListener(button, 'click', (e) => {
                e.preventDefault();
                const modalId = button.dataset.modal;
                this.openModal(modalId);
            });
        });

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.modal-close, [data-close-modal]');
        closeButtons.forEach(button => {
            addEventListener(button, 'click', (e) => {
                e.preventDefault();
                const modal = button.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Close modal on overlay click
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            addEventListener(modal, 'click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * Initialize forms
     */
    initializeForms() {
        // Form submission handlers
        const forms = document.querySelectorAll('form[data-form]');
        forms.forEach(form => {
            addEventListener(form, 'submit', (e) => {
                e.preventDefault();
                const formType = form.dataset.form;
                this.handleFormSubmit(form, formType);
            });
        });

        // Form validation
        const inputs = document.querySelectorAll('input[data-validate]');
        inputs.forEach(input => {
            addEventListener(input, 'blur', () => {
                this.validateInput(input);
            });
        });
    }

    /**
     * Initialize data tables
     */
    initializeDataTables() {
        // Initialize user list
        this.initializeUserList();
        
        // Initialize template list
        this.initializeTemplateList();
    }

    /**
     * Initialize user list
     */
    initializeUserList() {
        const userList = $('userList');
        if (userList) {
            this.userListComponent = this.createUserListComponent(userList);
        }
    }

    /**
     * Initialize template list
     */
    initializeTemplateList() {
        const templateList = $('templateList');
        if (templateList) {
            this.templateListComponent = this.createTemplateListComponent(templateList);
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Global keyboard shortcuts
        addEventListener(document, 'keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window events
        addEventListener(window, 'beforeunload', () => {
            this.cleanup();
        });

        // WebSocket events
        webSocketService.addLogsListener((type, data) => {
            this.handleLogUpdate(type, data);
        });

        webSocketService.addErrorsListener((type, data) => {
            this.handleErrorUpdate(type, data);
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load users
            await this.loadUsers();
            
            // Load templates
            await this.loadTemplates();
            
            // Load settings
            await this.loadSettings();
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            notifications.error('Data Load Error', 'Failed to load application data');
        }
    }

    /**
     * Load users data
     */
    async loadUsers() {
        try {
            const users = await apiClient.getUsers();
            this.updateUserList(users);
        } catch (error) {
            console.error('❌ Failed to load users:', error);
        }
    }

    /**
     * Load templates data
     */
    async loadTemplates() {
        try {
            const templates = await apiClient.getTemplates();
            this.updateTemplateList(templates);
        } catch (error) {
            console.error('❌ Failed to load templates:', error);
        }
    }

    /**
     * Load settings data
     */
    async loadSettings() {
        try {
            const settings = await apiClient.getSettings();
            this.updateSettingsForm(settings);
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Update templates every 5 seconds
        this.templateUpdateInterval = setInterval(async () => {
            try {
                await this.loadTemplates();
            } catch (error) {
                console.error('❌ Failed to update templates:', error);
            }
        }, 5000);
    }

    /**
     * Switch to a different tab
     * @param {string} tabName - Tab name to switch to
     */
    switchTab(tabName) {
        // Hide all tabs
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            hide(tab);
        });

        // Show selected tab
        const selectedTab = $(tabName);
        if (selectedTab) {
            show(selectedTab);
        }

        // Update tab buttons
        const tabButtons = document.querySelectorAll('[data-tab]');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            }
        });

        this.currentTab = tabName;
    }

    /**
     * Open modal
     * @param {string} modalId - Modal ID to open
     */
    openModal(modalId) {
        const modal = $(modalId);
        if (modal) {
            show(modal, 'flex');
            modal.classList.add('show');
        }
    }

    /**
     * Close modal
     * @param {string} modalId - Modal ID to close
     */
    closeModal(modalId) {
        const modal = $(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                hide(modal);
            }, 300);
        }
    }

    /**
     * Handle form submission
     * @param {HTMLFormElement} form - Form element
     * @param {string} formType - Form type
     */
    async handleFormSubmit(form, formType) {
        const submitButton = form.querySelector('button[type="submit"]');
        
        try {
            // Set loading state
            loading.setButtonLoading(submitButton, true);
            
            // Handle different form types
            switch (formType) {
                case 'user':
                    await this.handleUserFormSubmit(form);
                    break;
                case 'template':
                    await this.handleTemplateFormSubmit(form);
                    break;
                case 'settings':
                    await this.handleSettingsFormSubmit(form);
                    break;
                default:
                    console.warn('Unknown form type:', formType);
            }
            
        } catch (error) {
            console.error('❌ Form submission error:', error);
            notifications.error('Form Error', error.message || 'Failed to submit form');
        } finally {
            loading.setButtonLoading(submitButton, false);
        }
    }

    /**
     * Handle user form submission
     * @param {HTMLFormElement} form - Form element
     */
    async handleUserFormSubmit(form) {
        const formData = new FormData(form);
        const userData = {
            cookies: {
                s: formData.get('scookie'),
                j: formData.get('jcookie')
            },
            expirationDate: formData.get('expirationDate')
        };

        await apiClient.addUser(userData);
        notifications.success('User Added', 'User has been added successfully');
        
        // Reload users
        await this.loadUsers();
        
        // Close modal and reset form
        this.closeModal('addUserModal');
        form.reset();
    }

    /**
     * Handle template form submission
     * @param {HTMLFormElement} form - Form element
     */
    async handleTemplateFormSubmit(form) {
        // Implementation for template form submission
        console.log('Template form submission not yet implemented');
    }

    /**
     * Handle settings form submission
     * @param {HTMLFormElement} form - Form element
     */
    async handleSettingsFormSubmit(form) {
        // Implementation for settings form submission
        console.log('Settings form submission not yet implemented');
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape: Close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                this.closeModal(openModal.id);
            }
        }
    }

    /**
     * Handle log updates from WebSocket
     * @param {string} type - Update type
     * @param {any} data - Update data
     */
    handleLogUpdate(type, data) {
        // Implementation for log updates
        console.log('Log update:', type, data);
    }

    /**
     * Handle error updates from WebSocket
     * @param {string} type - Update type
     * @param {any} data - Update data
     */
    handleErrorUpdate(type, data) {
        // Implementation for error updates
        console.log('Error update:', type, data);
    }

    /**
     * Update user list display
     * @param {Object} users - Users data
     */
    updateUserList(users) {
        // Implementation for updating user list
        console.log('Updating user list:', users);
    }

    /**
     * Update template list display
     * @param {Object} templates - Templates data
     */
    updateTemplateList(templates) {
        // Implementation for updating template list
        console.log('Updating template list:', templates);
    }

    /**
     * Update settings form
     * @param {Object} settings - Settings data
     */
    updateSettingsForm(settings) {
        // Implementation for updating settings form
        console.log('Updating settings form:', settings);
    }

    /**
     * Validate input field
     * @param {HTMLInputElement} input - Input element
     */
    validateInput(input) {
        // Implementation for input validation
        console.log('Validating input:', input);
    }

    /**
     * Create user list component
     * @param {HTMLElement} container - Container element
     * @returns {Object} Component instance
     */
    createUserListComponent(container) {
        // Implementation for user list component
        return {
            container,
            update: (users) => {
                console.log('User list component update:', users);
            }
        };
    }

    /**
     * Create template list component
     * @param {HTMLElement} container - Container element
     * @returns {Object} Component instance
     */
    createTemplateListComponent(container) {
        // Implementation for template list component
        return {
            container,
            update: (templates) => {
                console.log('Template list component update:', templates);
            }
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear intervals
        if (this.templateUpdateInterval) {
            clearInterval(this.templateUpdateInterval);
        }

        // Disconnect WebSocket
        webSocketService.disconnect();

        // Clear notifications
        notifications.clear();

        // Clear loading states
        loading.clear();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new WPlacerApp();
    app.init();
    
    // Make app globally available for debugging
    window.wplacerApp = app;
});

// Export for module usage
export default WPlacerApp;
