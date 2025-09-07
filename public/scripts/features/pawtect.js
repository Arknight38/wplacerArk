/**
 * Pawtect integration for wplacer
 */

// Listen for messages from the pawtect_inject.js script
window.addEventListener('message', (event) => {
    // Only process messages from the same window
    if (event.source !== window) return;
    
    // Handle pawtect token messages
    if (event.data && event.data.type === 'WPLACER_PAWTECT_TOKEN') {
        const { token, fp } = event.data;
        console.log('Received pawtect token:', token);
        
        // Store the token in localStorage for persistence
        if (token) {
            localStorage.setItem('wplacer_pawtect_token', token);
            // Make it available globally for the WPlacer.js file
            window.__wplacer_pawtect_token = token;
        }
        
        // Store the fingerprint if available
        if (fp) {
            localStorage.setItem('wplacer_pawtect_fp', fp);
            // Make it available globally for the WPlacer.js file
            window.__wplacer_last_fp = fp;
        }
    }
    
    // Handle WASM URL messages
    if (event.data && event.data.type === 'WPLACER_PAWTECT_WASM_URL') {
        console.log('Detected WASM URL:', event.data.url);
    }
});

/**
 * Get the stored pawtect token
 * @returns {string|null} The pawtect token or null if not available
 */
export const getPawtectToken = () => {
    return localStorage.getItem('wplacer_pawtect_token');
};

/**
 * Get the stored fingerprint
 * @returns {string|null} The fingerprint or null if not available
 */
export const getPawtectFingerprint = () => {
    return localStorage.getItem('wplacer_pawtect_fp');
};

/**
 * Initialize the pawtect integration
 * This function should be called when the application starts
 */
export const initializePawtect = () => {
    // Set up the global fingerprint variable if available in localStorage
    const fp = getPawtectFingerprint();
    if (fp) {
        window.__wplacer_last_fp = fp;
    }
    
    // Set up the global token variable if available in localStorage
    const token = getPawtectToken();
    if (token) {
        window.__wplacer_pawtect_token = token;
    }
    
    console.log('Pawtect integration initialized');
};