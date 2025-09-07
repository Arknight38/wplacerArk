/**
 * Main application entry point
 */
import { $, hideElement, showElement } from './utils/dom.js';
import { initializeMessageBox } from './utils/ui.js';
import { initializeLogsViewer, startLogsViewer, stopLogsViewer } from './features/logs.js';
import { initializeUserManagement, loadUsersList } from './features/users.js';
import { initializeTemplateManagement, loadTemplatesList, loadUserSelectList, resetTemplateForm } from './features/templates.js';
import { initializeSettings, loadSettingsData } from './features/settings.js';
import { initializeColorOrdering, resetOrder } from './features/color-ordering.js';
import { initializePawtect } from './features/pawtect.js';

// Global state
let currentTab = 'main';
let templateUpdateInterval = null;

// Tab management
const tabs = {
    main: $('main'),
    manageUsers: $('manageUsers'),
    addTemplate: $('addTemplate'),
    manageTemplates: $('manageTemplates'),
    settings: $('settings'),
    logsViewer: $('logsViewer'),
};

export const changeTab = (tabName) => {
    if (templateUpdateInterval) {
        clearInterval(templateUpdateInterval);
        templateUpdateInterval = null;
    }
    
    Object.values(tabs).forEach((tab) => hideElement(tab));
    if (tabs[tabName]) {
        showElement(tabs[tabName]);
    }
    
    currentTab = tabName;
    
    if (tabName === 'logsViewer') {
        startLogsViewer();
    } else {
        stopLogsViewer();
    }
};

// Make functions globally available for inline handlers
window.changeTab = changeTab;
window.resetTemplateForm = resetTemplateForm;
window.resetOrder = resetOrder;

// Initialize pawtect integration
initializePawtect();

// Initialize the application
export const initializeApp = () => {
    // Initialize message box
    initializeMessageBox();
    
    // Initialize features
    initializeLogsViewer();
    initializeUserManagement();
    initializeTemplateManagement();
    initializeSettings();
    initializeColorOrdering();
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Initialize main tab
    changeTab('main');
};

const setupTabNavigation = () => {
    const openManageUsers = $('openManageUsers');
    const openAddTemplate = $('openAddTemplate');
    const openManageTemplates = $('openManageTemplates');
    const openSettings = $('openSettings');
    const openLogsViewer = $('openLogsViewer');
    
    if (openManageUsers) {
        openManageUsers.addEventListener('click', () => {
            loadUsersList();
            changeTab('manageUsers');
        });
    }
    
    if (openAddTemplate) {
        openAddTemplate.addEventListener('click', () => {
            resetTemplateForm();
            loadUserSelectList();
            changeTab('addTemplate');
        });
    }
    
    if (openManageTemplates) {
        openManageTemplates.addEventListener('click', () => {
            loadTemplatesList();
            changeTab('manageTemplates');
        });
    }
    
    if (openSettings) {
        openSettings.addEventListener('click', async () => {
            await loadSettingsData();
            changeTab('settings');
        });
    }
    
    if (openLogsViewer) {
        openLogsViewer.addEventListener('click', () => {
            changeTab('logsViewer');
        });
    }
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
