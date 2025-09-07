import express from 'express';
import { Impit } from 'impit';
import { TILE_URL, HTTP_STATUS } from '../../config/constants.js';

const router = express.Router();

// Proxies
router.post('/reload', (_req, res) => {
    // TODO: Implement proxy loading when proxy service is created
    res.status(HTTP_STATUS.OK).json({ success: true, count: 0 });
});

// Canvas proxy (returns data URI)
router.get('/canvas', async (req, res) => {
    const { tx, ty } = req.query;
    if (isNaN(parseInt(tx)) || isNaN(parseInt(ty))) return res.status(HTTP_STATUS.BAD_REQ).send();
    
    try {
        // TODO: Add proxy support when proxy service is implemented
        const imp = new Impit({ ignoreTlsErrors: true });
        const r = await imp.fetch(TILE_URL(tx, ty));
        if (!r.ok) return res.status(r.status).send();
        const buffer = Buffer.from(await r.arrayBuffer());
        res.json({ image: `data:image/png;base64,${buffer.toString('base64')}` });
    } catch (error) {
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

export default router;
