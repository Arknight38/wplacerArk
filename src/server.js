// --- Global error handler for listen EACCES ---
process.on('uncaughtException', (err) => {
    if (err && err.code === 'EACCES' && /listen/i.test(err.message)) {
        // Try to extract port from error message
        let port = '';
        const match = err.message.match(/:(\d+)/);
        if (match) port = match[1];
        console.error(`\n❌ Permission denied for port${port ? ' ' + port : ''}.\nYou do not have permission to bind to this port.${port ? ' (' + port + ')' : ''}\nPlease use a different port (e.g., 3000) or run with elevated privileges.\n`);
        process.exit(1);
    }
    throw err;
});

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import gradient from 'gradient-string';
import express from 'express';
import path from 'node:path';
import cors from 'cors';

// WebSocket for logs
import { WebSocketServer } from 'ws';
import { watch } from 'node:fs';

// Import our modules
import { APP_HOST, APP_PRIMARY_PORT, APP_FALLBACK_PORTS, DATA_DIR } from './config/constants.js';
import { loadSettings, saveSettings, getSettings, updateSettings } from './config/settings.js';
import { tokenManager } from './core/TokenManager.js';
import { chargeCache } from './core/ChargeCache.js';
import { TemplateManager } from './core/TemplateManager.js';
import { openBrowser } from './utils/helpers.js';
import { log } from './utils/logger.js';

// Import routes
import usersRouter from './api/routes/users.js';
import templatesRouter from './api/routes/templates.js';
import settingsRouter from './api/routes/settings.js';
import logsRouter from './api/routes/logs.js';
import tokensRouter from './api/routes/tokens.js';
import proxyRouter from './api/routes/proxy.js';
import colorOrderingRouter from './api/routes/color-ordering.js';

// ---------- Runtime constants ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- FS bootstrap ----------
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ---------- Persistence helpers ----------
const loadJSON = (filename) =>
    existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf8')) : {};
const saveJSON = (filename, data) => writeFileSync(filename, JSON.stringify(data, null, 2));

const users = loadJSON('./data/users.json');
const saveUsers = () => saveJSON('./data/users.json', users);

let templates = {}; // id -> TemplateManager

// ---------- Template load/save ----------
function loadTemplatesFromDisk() {
    if (!existsSync('./data/templates.json')) {
        templates = {};
        return;
    }
    const raw = JSON.parse(readFileSync('./data/templates.json', 'utf8'));
    const out = {};
    for (const id in raw) {
        const e = raw[id] || {};
        const te = e.template || {};
        let { width, height, data, shareCode } = te;

        try {
            if (!data && shareCode) {
                // Note: In a real implementation, this would use the template codec
                // const dec = templateFromShareCode(shareCode);
                // width = dec.width;
                // height = dec.height;
                // data = dec.data;
            }
            if (!width || !height || !Array.isArray(data)) throw new Error('missing data');

            out[id] = {
                ...e,
                template: {
                    width,
                    height,
                    data,
                    shareCode: shareCode || 'placeholder', // In real implementation, generate from data
                },
            };
        } catch (err) {
            console.error(`[templates] ⚠️ skip ${id}: ${err.message}`);
        }
    }
    templates = out;
}
loadTemplatesFromDisk();

function saveTemplatesCompressed() {
    const toSave = {};
    for (const id in templates) {
        try {
            const t = templates[id];
            const { width, height, data } = t.template;
            const shareCode = t.template.shareCode || 'placeholder';
            toSave[id] = {
                name: t.name,
                coords: t.coords,
                canBuyCharges: t.canBuyCharges,
                canBuyMaxCharges: t.canBuyMaxCharges,
                antiGriefMode: t.antiGriefMode,
                eraseMode: t.eraseMode,
                outlineMode: t.outlineMode,
                skipPaintedPixels: t.skipPaintedPixels,
                enableAutostart: t.enableAutostart,
                userIds: t.userIds,
                template: { width, height, shareCode }, // compact on disk
            };
        } catch (e) {
            console.error(`[templates] ⚠️ skip ${id}: ${e.message}`);
        }
    }
    writeFileSync('./data/templates.json', JSON.stringify(toSave, null, 2));
}
const saveTemplates = saveTemplatesCompressed;

// ---------- Settings ----------
loadSettings();
const currentSettings = getSettings();

// ---------- Server state ----------
const activeBrowserUsers = new Set();
const activeTemplateUsers = new Set();
const templateQueue = [];

// ---------- Queue processor ----------
const processQueue = () => {
    for (let i = 0; i < templateQueue.length; i++) {
        const templateId = templateQueue[i];
        const manager = templates[templateId];
        if (!manager) {
            templateQueue.splice(i, 1);
            i--;
            continue;
        }
        const busy = manager.userIds.some((id) => activeTemplateUsers.has(id));
        if (!busy) {
            templateQueue.splice(i, 1);
            manager.userIds.forEach((id) => activeTemplateUsers.add(id));
            // Note: In a real implementation, this would start the template
            // manager.start(users, currentSettings, activeBrowserUsers, activeTemplateUsers)
            //     .catch((e) => log(templateId, manager.masterName, 'Error starting queued template', e));
            break;
        }
    }
};

// ---------- Express setup ----------
const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

// Store shared data in app.locals
app.locals.users = users;
app.locals.saveUsers = saveUsers;
app.locals.templates = templates;
app.locals.saveTemplates = saveTemplates;
app.locals.activeBrowserUsers = activeBrowserUsers;
app.locals.activeTemplateUsers = activeTemplateUsers;
app.locals.templateQueue = templateQueue;
app.locals.processQueue = processQueue;

// Use routes
app.use('/user', usersRouter);
app.use('/template', templatesRouter);
app.use('/users', usersRouter);
app.use('/templates', templatesRouter);
app.use('/settings', settingsRouter);
app.use('/logs', logsRouter);
app.use('/t', tokensRouter);
app.use('/token-needed', tokensRouter);
app.use('/proxy', proxyRouter);
app.use('/color-ordering', colorOrderingRouter);

// ---------- API ----------
// All API endpoints are now handled by route modules


// ---------- Startup ----------
const diffVer = (v1, v2) => {
  const [a1, b1, c1] = v1.split(".").map(Number);
  const [a2, b2, c2] = v2.split(".").map(Number);
  return a1 !== a2 ? (a1 - a2) * 100 : b1 !== b2 ? (b1 - b2) * 10 : c1 - c2;
};

(async () => {
    console.clear();
    const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
    console.log(gradient(["#EF8F20", "#CB3D27", "#A82421"])(`                           ████
                          ▒▒███
 █████ ███ █████ ████████  ▒███   ██████    ██████   ██████  ████████
▒▒███ ▒███▒▒███ ▒▒███▒▒███ ▒███  ▒▒▒▒▒███  ███▒▒███ ███▒▒███▒▒███▒▒███
 ▒███ ▒███ ▒███  ▒███ ▒███ ▒███   ███████ ▒███ ▒▒▒ ▒███████  ▒███ ▒▒▒
 ▒▒███████████   ▒███ ▒███ ▒███  ███▒▒███ ▒███  ███▒███▒▒▒   ▒███
  ▒▒████▒████    ▒███████  █████▒▒████████▒▒██████ ▒▒██████  █████
   ▒▒▒▒ ▒▒▒▒     ▒███▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒   ▒▒▒▒▒▒  ▒▒▒▒▒
                 ▒███
                 █████
                ▒▒▒▒▒                                          v${version}`));
    
    // check versions (dont delete this ffs)
    try {
        const githubPackage = await fetch("https://raw.githubusercontent.com/luluwaffless/wplacer/refs/heads/main/package.json");
        const githubVersion = (await githubPackage.json()).version;
        const diff = diffVer(version, githubVersion);
        if (diff !== 0) console.warn(`${diff < 0 ? "⚠️ Outdated version! Please update using \"git pull\"." : "🤖 Unreleased."}\n  GitHub: ${githubVersion}\n  Local: ${version} (${diff})`);
    } catch {
        console.warn("⚠️ Could not check for updates.");
    };

    console.log(`✅ Loaded ${Object.keys(templates).length} templates, ${Object.keys(users).length} users.`);

    const probe = Array.from(new Set([APP_PRIMARY_PORT, ...APP_FALLBACK_PORTS]));
    function tryListen(idx = 0) {
        if (idx >= probe.length) {
            console.error('❌ No available port found.');
            process.exit(1);
        }
        const port = probe[idx];
        const server = app.listen(port, APP_HOST);
        
        server.on('listening', () => {
            const url = `http://localhost:${port}`;
            console.log(`✅ Server listening on ${url}`);
            console.log('   Open the web UI in your browser to start.');
            if (currentSettings.openBrowserOnStart) openBrowser(url);
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${port} in use. Trying ${probe[idx + 1]}...`);
                tryListen(idx + 1);
            } else if (err.code === 'EACCES') {
                const nextIdx = Math.max(idx + 1, probe.indexOf(APP_FALLBACK_PORTS[0]));
                console.error(`❌ Permission denied on ${port}. Trying ${probe[nextIdx]}...`);
                tryListen(nextIdx);
            } else {
                console.error('❌ Server error:', err);
                process.exit(1);
            };
        });
    };
    tryListen(0);
})();
