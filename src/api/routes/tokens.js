import express from 'express';
import { tokenManager } from '../../core/TokenManager.js';
import { HTTP_STATUS } from '../../config/constants.js';

const router = express.Router();

// Token endpoints
router.get('/needed', (_req, res) => res.json({ needed: tokenManager.isTokenNeeded }));

router.post('/', (req, res) => {
    const { t, pawtect, fp } = req.body || {};
    if (!t) return res.status(HTTP_STATUS.BAD_REQ).send();
    
    // Store Turnstile token as usual
    tokenManager.setToken(t);
    
    // Also keep latest pawtect in memory for pairing with paints
    try {
        if (pawtect && typeof pawtect === 'string') {
            globalThis.__wplacer_last_pawtect = pawtect;
        }
        if (fp && typeof fp === 'string') {
            globalThis.__wplacer_last_fp = fp;
        }
    } catch {}
    
    res.status(HTTP_STATUS.OK).send();
});

export default router;
