import { log } from '../utils/logger.js';

/**
 * Pawtect Service - Handles pawtect token generation and management
 * Integrates with the pawtect_inject.js functionality
 */
class PawtectService {
    constructor() {
        this.lastPawtectToken = null;
        this.lastFingerprint = null;
        this.wasmDetector = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the pawtect service
     */
    initialize() {
        if (this.isInitialized) return;
        
        try {
            // Store the last pawtect token and fingerprint globally
            globalThis.__wplacer_last_pawtect = null;
            globalThis.__wplacer_last_fp = null;
            
            this.isInitialized = true;
            log('SYSTEM', 'PawtectService', '✅ Pawtect service initialized');
        } catch (error) {
            log('SYSTEM', 'PawtectService', '❌ Failed to initialize pawtect service', error);
        }
    }

    /**
     * Store a new pawtect token and fingerprint
     * @param {string} pawtectToken - The pawtect token
     * @param {string} fingerprint - The fingerprint
     */
    setPawtectToken(pawtectToken, fingerprint) {
        try {
            if (pawtectToken && typeof pawtectToken === 'string') {
                this.lastPawtectToken = pawtectToken;
                globalThis.__wplacer_last_pawtect = pawtectToken;
                log('SYSTEM', 'PawtectService', `🔐 Pawtect token updated (${pawtectToken.substring(0, 8)}...)`);
            }
            
            if (fingerprint && typeof fingerprint === 'string') {
                this.lastFingerprint = fingerprint;
                globalThis.__wplacer_last_fp = fingerprint;
                log('SYSTEM', 'PawtectService', `🔍 Fingerprint updated (${fingerprint.substring(0, 8)}...)`);
            }
        } catch (error) {
            log('SYSTEM', 'PawtectService', '❌ Failed to store pawtect token/fingerprint', error);
        }
    }

    /**
     * Get the current pawtect token
     * @returns {string|null} The current pawtect token
     */
    getPawtectToken() {
        return this.lastPawtectToken || globalThis.__wplacer_last_pawtect || null;
    }

    /**
     * Get the current fingerprint
     * @returns {string|null} The current fingerprint
     */
    getFingerprint() {
        return this.lastFingerprint || globalThis.__wplacer_last_fp || null;
    }

    /**
     * Clear stored pawtect data
     */
    clearPawtectData() {
        this.lastPawtectToken = null;
        this.lastFingerprint = null;
        globalThis.__wplacer_last_pawtect = null;
        globalThis.__wplacer_last_fp = null;
        log('SYSTEM', 'PawtectService', '🗑️ Pawtect data cleared');
    }

    /**
     * Check if pawtect is available and ready
     * @returns {boolean} True if pawtect is ready
     */
    isPawtectReady() {
        return !!(this.getPawtectToken() && this.getFingerprint());
    }

    /**
     * Get pawtect status for API responses
     * @returns {Object} Pawtect status information
     */
    getPawtectStatus() {
        return {
            isReady: this.isPawtectReady(),
            hasToken: !!this.getPawtectToken(),
            hasFingerprint: !!this.getFingerprint(),
            tokenPreview: this.getPawtectToken()?.substring(0, 8) + '...' || null,
            fingerprintPreview: this.getFingerprint()?.substring(0, 8) + '...' || null
        };
    }
}

// Export singleton instance
export const pawtectService = new PawtectService();
