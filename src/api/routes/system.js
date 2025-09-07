import express from 'express';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { Impit } from 'impit';
import { DATA_DIR, HTTP_STATUS, TILE_URL } from '../../config/constants.js';
import { TokenManager } from '../../core/token-manager.js';
import { proxyService } from '../../services/proxy-service.js';
import { pawtectService } from '../../services/pawtect-service.js';

const router = express.Router();

// Helper: stream file from offset
function streamLogFile(res, filePath, lastSize) {
    try {
        const stats = statSync(filePath);
        const size = stats.size;
        if (lastSize && lastSize < size) {
            // Send only new data
            const stream = createReadStream(filePath, { start: lastSize });
            stream.pipe(res);
        } else {
            // Send whole file
            const stream = createReadStream(filePath);
            stream.pipe(res);
        }
    } catch (e) {
        res.status(HTTP_STATUS.SRV_ERR).end();
    }
}

// Get logs
router.get('/logs', (req, res) => {
    const filePath = path.join(DATA_DIR, 'logs.log');
    const lastSize = req.query.lastSize ? parseInt(req.query.lastSize, 10) : 0;
    streamLogFile(res, filePath, lastSize);
});

// Get error logs
router.get('/errors', (req, res) => {
    const filePath = path.join(DATA_DIR, 'errors.log');
    const lastSize = req.query.lastSize ? parseInt(req.query.lastSize, 10) : 0;
    streamLogFile(res, filePath, lastSize);
});

// Check if token is needed
router.get('/token-needed', (req, res) => {
    res.json({ needed: TokenManager.isTokenNeeded });
});

// Submit token
router.post('/token', (req, res) => {
    const { t, pawtect, fp } = req.body || {};
    if (!t) return res.sendStatus(HTTP_STATUS.BAD_REQ);
    
    // Store Turnstile token as usual
    TokenManager.setToken(t);
    
    // Store pawtect token and fingerprint using the service
    pawtectService.setPawtectToken(pawtect, fp);
    
    res.sendStatus(HTTP_STATUS.OK);
});

// Get pawtect status
router.get('/pawtect-status', (req, res) => {
    res.json(pawtectService.getPawtectStatus());
});

// Canvas proxy (returns data URI)
router.get('/canvas', async (req, res) => {
    const { tx, ty } = req.query;
    if (isNaN(parseInt(tx)) || isNaN(parseInt(ty))) {
        return res.sendStatus(HTTP_STATUS.BAD_REQ);
    }
    
    try {
        const proxyUrl = proxyService.getNext();
        const imp = new Impit({ 
            ignoreTlsErrors: true, 
            ...(proxyUrl ? { proxyUrl } : {}) 
        });
        const r = await imp.fetch(TILE_URL(tx, ty));
        
        if (!r.ok) return res.sendStatus(r.status);
        
        const buffer = Buffer.from(await r.arrayBuffer());
        res.json({ 
            image: `data:image/png;base64,${buffer.toString('base64')}` 
        });
    } catch (error) {
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

export default router;