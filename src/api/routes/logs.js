import express from 'express';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../../config/constants.js';

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
        res.status(500).end();
    }
}

// Simple polling endpoint for logs (returns full file, or new data if client provides lastSize)
router.get('/', (req, res) => {
    const filePath = path.join(DATA_DIR, 'logs.log');
    const lastSize = req.query.lastSize ? parseInt(req.query.lastSize, 10) : 0;
    streamLogFile(res, filePath, lastSize);
});

router.get('/errors', (req, res) => {
    const filePath = path.join(DATA_DIR, 'errors.log');
    const lastSize = req.query.lastSize ? parseInt(req.query.lastSize, 10) : 0;
    streamLogFile(res, filePath, lastSize);
});

export default router;
