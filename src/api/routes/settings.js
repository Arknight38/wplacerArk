import express from 'express';
import { getSettings, updateSettings } from '../../config/settings.js';
import { log } from '../../utils/logger.js';

const router = express.Router();

// Settings
router.get('/', (req, res) => {
    const settings = getSettings();
    res.json({ ...settings, proxyCount: 0 }); // TODO: Add proxy count when proxy service is implemented
});

router.put('/', (req, res) => {
    const prev = getSettings();
    updateSettings(req.body);
    const newSettings = getSettings();
    
    // Notify running templates of settings changes
    const templates = req.app.locals.templates;
    if (prev.chargeThreshold !== newSettings.chargeThreshold) {
        for (const id in templates) {
            if (templates[id].running) {
                templates[id].interruptSleep();
            }
        }
    }
    res.status(200).send();
});

export default router;
