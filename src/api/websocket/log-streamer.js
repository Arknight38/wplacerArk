import { WebSocketServer } from 'ws';
import { watch, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../../config/constants.js';

export class LogStreamer {
    constructor() {
        this.wsServer = null;
        this.wsClients = { logs: new Set(), errors: new Set() };
    }

    initialize(server) {
        if (this.wsServer) return; // Already initialized

        this.wsServer = new WebSocketServer({ server, path: '/ws-logs' });

        this.wsServer.on('connection', (ws, req) => {
            // URL: ws://host/ws-logs?type=logs|errors
            const url = new URL(req.url, `http://${req.headers.host}`);
            const type = url.searchParams.get('type') === 'errors' ? 'errors' : 'logs';
            this.wsClients[type].add(ws);

            // Send initial log history (last 200 lines)
            try {
                const file = path.join(DATA_DIR, type + '.log');
                const data = readFileSync(file, 'utf8');
                const lines = data.split(/\r?\n/).filter(Boolean);
                ws.send(JSON.stringify({ initial: lines.slice(-200) }));
            } catch {}

            ws.on('close', () => this.wsClients[type].delete(ws));
        });

        this.startWatching();
    }

    startWatching() {
        // Watch logs.log and errors.log for changes
        const logFiles = [
            { file: path.join(DATA_DIR, 'logs.log'), type: 'logs' },
            { file: path.join(DATA_DIR, 'errors.log'), type: 'errors' }
        ];

        for (const { file, type } of logFiles) {
            let lastSize = 0;
            try { 
                lastSize = statSync(file).size; 
            } catch {}

            watch(file, { persistent: false }, (event) => {
                if (event === 'change') {
                    try {
                        const stats = statSync(file);
                        if (stats.size > lastSize) {
                            const fd = readFileSync(file);
                            const newData = fd.slice(lastSize).toString();
                            newData.split(/\r?\n/).filter(Boolean).forEach(line => 
                                this.broadcastLog(type, line)
                            );
                            lastSize = stats.size;
                        }
                    } catch {}
                }
            });
        }
    }

    broadcastLog(type, line) {
        for (const ws of this.wsClients[type]) {
            if (ws.readyState === ws.OPEN) {
                ws.send(line);
            }
        }
    }
}

export const logStreamer = new LogStreamer();