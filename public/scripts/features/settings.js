/**
 * Settings management functionality
 */
import { $, setText } from '../utils/dom.js';
import { api, loadSettings, saveSetting } from '../utils/api.js';
import { showMessage } from '../utils/ui.js';
import { validateSettings } from '../utils/validation.js';

const settings = $('settings');
const openBrowserOnStart = $('openBrowserOnStart');
const drawingDirectionSelect = $('drawingDirectionSelect');
const drawingOrderSelect = $('drawingOrderSelect');
const pixelSkipSelect = $('pixelSkipSelect');
const accountCooldown = $('accountCooldown');
const purchaseCooldown = $('purchaseCooldown');
const accountCheckCooldown = $('accountCheckCooldown');
const dropletReserve = $('dropletReserve');
const antiGriefStandby = $('antiGriefStandby');
const chargeThreshold = $('chargeThreshold');
const proxyEnabled = $('proxyEnabled');
const proxyFormContainer = $('proxyFormContainer');
const proxyRotationMode = $('proxyRotationMode');
const logProxyUsage = $('logProxyUsage');
const proxyCount = $('proxyCount');
const reloadProxiesBtn = $('reloadProxiesBtn');

export const initializeSettings = () => {
    setupSettingsEventListeners();
};

const setupSettingsEventListeners = () => {
    // Basic settings
    if (openBrowserOnStart) {
        openBrowserOnStart.addEventListener('change', () => 
            saveSetting({ openBrowserOnStart: openBrowserOnStart.checked })
        );
    }
    
    if (drawingDirectionSelect) {
        drawingDirectionSelect.addEventListener('change', () =>
            saveSetting({ drawingDirection: drawingDirectionSelect.value })
        );
    }
    
    if (drawingOrderSelect) {
        drawingOrderSelect.addEventListener('change', () => 
            saveSetting({ drawingOrder: drawingOrderSelect.value })
        );
    }
    
    if (pixelSkipSelect) {
        pixelSkipSelect.addEventListener('change', () => 
            saveSetting({ pixelSkip: parseInt(pixelSkipSelect.value, 10) })
        );
    }
    
    // Proxy settings
    if (proxyEnabled) {
        proxyEnabled.addEventListener('change', () => {
            if (proxyFormContainer) {
                proxyFormContainer.style.display = proxyEnabled.checked ? 'block' : 'none';
            }
            saveSetting({ proxyEnabled: proxyEnabled.checked });
        });
    }
    
    if (logProxyUsage) {
        logProxyUsage.addEventListener('change', () => {
            saveSetting({ logProxyUsage: logProxyUsage.checked });
        });
    }
    
    if (proxyRotationMode) {
        proxyRotationMode.addEventListener('change', () => {
            saveSetting({ proxyRotationMode: proxyRotationMode.value });
        });
    }
    
    if (reloadProxiesBtn) {
        reloadProxiesBtn.addEventListener('click', handleReloadProxies);
    }
    
    // Numeric settings with validation
    if (accountCooldown) {
        accountCooldown.addEventListener('change', () => {
            const value = parseInt(accountCooldown.value, 10) * 1000;
            if (isNaN(value) || value < 0) {
                showMessage('Error', 'Please enter a valid non-negative number.');
                return;
            }
            saveSetting({ accountCooldown: value });
        });
    }
    
    if (purchaseCooldown) {
        purchaseCooldown.addEventListener('change', () => {
            const value = parseInt(purchaseCooldown.value, 10) * 1000;
            if (isNaN(value) || value < 0) {
                showMessage('Error', 'Please enter a valid non-negative number.');
                return;
            }
            saveSetting({ purchaseCooldown: value });
        });
    }
    
    if (accountCheckCooldown) {
        accountCheckCooldown.addEventListener('change', () => {
            const value = parseInt(accountCheckCooldown.value, 10) * 1000;
            if (isNaN(value) || value < 0) {
                showMessage('Error', 'Please enter a valid non-negative number.');
                return;
            }
            saveSetting({ accountCheckCooldown: value });
        });
    }
    
    if (dropletReserve) {
        dropletReserve.addEventListener('change', () => {
            const value = parseInt(dropletReserve.value, 10);
            if (isNaN(value) || value < 0) {
                showMessage('Error', 'Please enter a valid non-negative number.');
                return;
            }
            saveSetting({ dropletReserve: value });
        });
    }
    
    if (antiGriefStandby) {
        antiGriefStandby.addEventListener('change', () => {
            const value = parseInt(antiGriefStandby.value, 10) * 60000;
            if (isNaN(value) || value < 60000) {
                showMessage('Error', 'Please enter a valid number (at least 1 minute).');
                return;
            }
            saveSetting({ antiGriefStandby: value });
        });
    }
    
    if (chargeThreshold) {
        chargeThreshold.addEventListener('change', () => {
            const value = parseInt(chargeThreshold.value, 10);
            if (isNaN(value) || value < 0 || value > 100) {
                showMessage('Error', 'Please enter a valid percentage between 0 and 100.');
                return;
            }
            saveSetting({ chargeThreshold: value / 100 });
        });
    }
};

const handleReloadProxies = async () => {
    try {
        const response = await api.post('/proxy/reload');
        if (response.success) {
            if (proxyCount) {
                setText(proxyCount, `${response.count} proxies reloaded from file.`);
            }
            showMessage('Success', 'Proxies reloaded successfully!');
        }
    } catch (error) {
        console.error('Failed to reload proxies:', error);
    }
};

export const loadSettingsData = async () => {
    try {
        const currentSettings = await loadSettings();
        
        if (openBrowserOnStart) openBrowserOnStart.checked = currentSettings.openBrowserOnStart;
        if (drawingDirectionSelect) drawingDirectionSelect.value = currentSettings.drawingDirection;
        if (drawingOrderSelect) drawingOrderSelect.value = currentSettings.drawingOrder;
        if (pixelSkipSelect) pixelSkipSelect.value = currentSettings.pixelSkip;

        if (proxyEnabled) proxyEnabled.checked = currentSettings.proxyEnabled;
        if (proxyRotationMode) proxyRotationMode.value = currentSettings.proxyRotationMode || 'sequential';
        if (logProxyUsage) logProxyUsage.checked = currentSettings.logProxyUsage;
        if (proxyCount) setText(proxyCount, `${currentSettings.proxyCount} proxies loaded from file.`);
        if (proxyFormContainer) {
            proxyFormContainer.style.display = proxyEnabled.checked ? 'block' : 'none';
        }

        if (accountCooldown) accountCooldown.value = currentSettings.accountCooldown / 1000;
        if (purchaseCooldown) purchaseCooldown.value = currentSettings.purchaseCooldown / 1000;
        if (accountCheckCooldown) accountCheckCooldown.value = currentSettings.accountCheckCooldown / 1000;
        if (dropletReserve) dropletReserve.value = currentSettings.dropletReserve;
        if (antiGriefStandby) antiGriefStandby.value = currentSettings.antiGriefStandby / 60000;
        if (chargeThreshold) chargeThreshold.value = currentSettings.chargeThreshold * 100;
        
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
};
