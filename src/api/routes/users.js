import express from 'express';
import { WPlacer } from '../../core/WPlacer.js';
import { log, logUserError } from '../../utils/logger.js';
import { HTTP_STATUS } from '../../config/constants.js';

const router = express.Router();

// Users
router.get('/', (req, res) => {
    const users = req.app.locals.users;
    res.json(users);
});

router.post('/', async (req, res) => {
    const users = req.app.locals.users;
    const saveUsers = req.app.locals.saveUsers;
    
    if (!req.body?.cookies || !req.body.cookies.j) return res.sendStatus(HTTP_STATUS.BAD_REQ);
    const wplacer = new WPlacer({});
    try {
        const userInfo = await wplacer.login(req.body.cookies);
        users[userInfo.id] = {
            name: userInfo.name,
            cookies: req.body.cookies,
            expirationDate: req.body.expirationDate,
        };
        saveUsers();
        res.json(userInfo);
    } catch (error) {
        logUserError(error, 'NEW_USER', 'N/A', 'add new user');
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const users = req.app.locals.users;
    const saveUsers = req.app.locals.saveUsers;
    const templates = req.app.locals.templates;
    const saveTemplates = req.app.locals.saveTemplates;
    
    const userId = req.params.id;
    if (!userId || !users[userId]) return res.sendStatus(HTTP_STATUS.BAD_REQ);

    const deletedName = users[userId].name;
    delete users[userId];
    saveUsers();
    log('SYSTEM', 'Users', `🗑️ Deleted user ${deletedName}#${userId}.`);

    let templatesModified = false;
    for (const templateId in templates) {
        const manager = templates[templateId];
        const before = manager.userIds.length;
        manager.userIds = manager.userIds.filter((id) => id !== userId);
        manager.userQueue = manager.userQueue.filter((id) => id !== userId);
        if (manager.userIds.length < before) {
            templatesModified = true;
            log('SYSTEM', 'Templates', `🗑️ Removed user ${deletedName}#${userId} from template "${manager.name}".`);
            if (manager.masterId === userId) {
                manager.masterId = manager.userIds[0] || null;
                manager.masterName = manager.masterId ? users[manager.masterId].name : null;
            }
            if (manager.userIds.length === 0 && manager.running) {
                manager.running = false;
                log('SYSTEM', 'wplacer', `[${manager.name}] 🛑 Template stopped, no users left.`);
            }
        }
    }
    if (templatesModified) saveTemplates();
    res.sendStatus(HTTP_STATUS.OK);
});

router.get('/status/:id', async (req, res) => {
    const users = req.app.locals.users;
    const activeBrowserUsers = req.app.locals.activeBrowserUsers;
    
    const { id } = req.params;
    if (!users[id] || activeBrowserUsers.has(id)) return res.sendStatus(HTTP_STATUS.CONFLICT);
    activeBrowserUsers.add(id);
    const wplacer = new WPlacer({});
    try {
        const userInfo = await wplacer.login(users[id].cookies);
        res.status(HTTP_STATUS.OK).json(userInfo);
    } catch (error) {
        logUserError(error, id, users[id].name, 'validate cookie');
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    } finally {
        activeBrowserUsers.delete(id);
    }
});

router.post('/status', async (req, res) => {
    const users = req.app.locals.users;
    const activeBrowserUsers = req.app.locals.activeBrowserUsers;
    
    const userIds = Object.keys(users);
    const results = {};

    const USER_TIMEOUT_MS = 30_000;
    const withTimeout = (p, ms, label) =>
        Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms))]);

    const checkUser = async (id) => {
        if (activeBrowserUsers.has(id)) {
            results[id] = { success: false, error: 'User is busy.' };
            return;
        }
        activeBrowserUsers.add(id);
        const wplacer = new WPlacer({});
        try {
            const userInfo = await wplacer.login(users[id].cookies);
            results[id] = { success: true, data: userInfo };
        } catch (error) {
            logUserError(error, id, users[id].name, 'bulk check');
            results[id] = { success: false, error: error.message };
        } finally {
            activeBrowserUsers.delete(id);
        }
    };

    for (const uid of userIds) {
        try {
            await withTimeout(checkUser(uid), USER_TIMEOUT_MS, `user ${uid}`);
        } catch (err) {
            results[uid] = { success: false, error: err.message };
        }
    }
    res.json(results);
});

export default router;
