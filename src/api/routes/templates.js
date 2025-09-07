import express from 'express';
import { TemplateManager } from '../../core/TemplateManager.js';
import { log } from '../../utils/logger.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { shareCodeFromTemplate, templateFromShareCode } from '../../utils/templateCodec.js';

const router = express.Router();

// Templates
router.get('/', (req, res) => {
    const templates = req.app.locals.templates;
    const templateList = {};

    for (const id in templates) {
        const manager = templates[id];
        try {
            // Create a safe share code
            let shareCode;
            try {
                shareCode = manager.template.shareCode || shareCodeFromTemplate(manager.template);
            } catch (shareCodeError) {
                console.warn(`Could not generate share code for template ${id}: ${shareCodeError.message}`);
                shareCode = null; // Don't include invalid share code
            }

            templateList[id] = {
                id: id,
                name: manager.name,
                coords: manager.coords,
                canBuyCharges: manager.canBuyCharges,
                canBuyMaxCharges: manager.canBuyMaxCharges,
                antiGriefMode: manager.antiGriefMode,
                eraseMode: manager.eraseMode,
                outlineMode: manager.outlineMode,
                skipPaintedPixels: manager.skipPaintedPixels,
                enableAutostart: manager.enableAutostart,
                userIds: manager.userIds,
                running: manager.running,
                status: manager.status,
                masterId: manager.masterId,
                masterName: manager.masterName,
                totalPixels: manager.totalPixels,
                pixelsRemaining: manager.pixelsRemaining,
                currentPixelSkip: manager.currentPixelSkip,
                template: {
                    width: manager.template.width,
                    height: manager.template.height,
                    data: manager.template.data,
                    shareCode: shareCode
                }
            };
        } catch (error) {
            console.warn(`Error processing template ${id} for API response: ${error.message}`);
        }
    }

    res.json(templateList);
});

router.post('/import', (req, res) => {
    const templates = req.app.locals.templates;
    const saveTemplates = req.app.locals.saveTemplates;
    
    const { id, name, coords, code } = req.body || {};
    if (!id || !code) return res.status(HTTP_STATUS.BAD_REQ).json({ error: 'id and code required' });
    const tmpl = templateFromShareCode(code);
    templates[id] = new TemplateManager({
        templateId: id,
        name: name || `Template ${id}`,
        templateData: tmpl,
        coords: coords || [0, 0],
        canBuyCharges: false,
        canBuyMaxCharges: false,
        antiGriefMode: false,
        eraseMode: false,
        outlineMode: false,
        skipPaintedPixels: false,
        enableAutostart: false,
        userIds: [],
    });
    saveTemplates();
    res.json({ ok: true });
});

router.post('/', (req, res) => {
    const templates = req.app.locals.templates;
    const saveTemplates = req.app.locals.saveTemplates;
    
    const {
        templateName,
        template,
        coords,
        userIds,
        canBuyCharges,
        canBuyMaxCharges,
        antiGriefMode,
        eraseMode,
        outlineMode,
        skipPaintedPixels,
        enableAutostart,
    } = req.body || {};
    if (!templateName || !template || !coords || !userIds || !userIds.length)
        return res.sendStatus(HTTP_STATUS.BAD_REQ);
    if (Object.values(templates).some((t) => t.name === templateName))
        return res.status(HTTP_STATUS.CONFLICT).json({ error: 'A template with this name already exists.' });

    const templateId = Date.now().toString();
    templates[templateId] = new TemplateManager({
        templateId: templateId,
        name: templateName,
        templateData: template,
        coords,
        canBuyCharges,
        canBuyMaxCharges,
        antiGriefMode,
        eraseMode,
        outlineMode,
        skipPaintedPixels,
        enableAutostart,
        userIds,
    });
    saveTemplates();
    res.status(HTTP_STATUS.OK).json({ id: templateId });
});

router.delete('/:id', (req, res) => {
    const templates = req.app.locals.templates;
    const saveTemplates = req.app.locals.saveTemplates;
    
    const { id } = req.params;
    if (!id || !templates[id] || templates[id].running) return res.sendStatus(HTTP_STATUS.BAD_REQ);
    delete templates[id];
    saveTemplates();
    res.sendStatus(HTTP_STATUS.OK);
});

router.put('/edit/:id', (req, res) => {
    const templates = req.app.locals.templates;
    const users = req.app.locals.users;
    const saveTemplates = req.app.locals.saveTemplates;
    
    const { id } = req.params;
    if (!templates[id]) return res.sendStatus(HTTP_STATUS.BAD_REQ);
    const manager = templates[id];
    const {
        templateName,
        coords,
        userIds,
        canBuyCharges,
        canBuyMaxCharges,
        antiGriefMode,
        eraseMode,
        outlineMode,
        skipPaintedPixels,
        enableAutostart,
        template,
    } = req.body || {};

    manager.name = templateName;
    manager.coords = coords;
    manager.userIds = userIds;
    manager.userQueue = [...userIds];
    manager.canBuyCharges = canBuyCharges;
    manager.canBuyMaxCharges = canBuyMaxCharges;
    manager.antiGriefMode = antiGriefMode;
    manager.eraseMode = eraseMode;
    manager.outlineMode = outlineMode;
    manager.skipPaintedPixels = skipPaintedPixels;
    manager.enableAutostart = enableAutostart;

    if (template) {
        manager.template = template;
        manager.totalPixels = manager.template.data.flat().filter((p) => p > 0).length;
    }
    manager.masterId = manager.userIds[0];
    manager.masterName = users[manager.masterId].name;
    saveTemplates();
    res.sendStatus(HTTP_STATUS.OK);
});

router.put('/:id', (req, res) => {
    const templates = req.app.locals.templates;
    const activeTemplateUsers = req.app.locals.activeTemplateUsers;
    const templateQueue = req.app.locals.templateQueue;
    const processQueue = req.app.locals.processQueue;
    
    const { id } = req.params;
    if (!id || !templates[id]) return res.sendStatus(HTTP_STATUS.BAD_REQ);
    const manager = templates[id];

    if (req.body.running && !manager.running) {
        // STARTING a template
        const busy = manager.userIds.some((uid) => activeTemplateUsers.has(uid));
        if (busy) {
            if (!templateQueue.includes(id)) {
                templateQueue.push(id);
                manager.status = 'Queued';
                log('SYSTEM', 'wplacer', `[${manager.name}] ⏳ Template queued as its users are busy.`);
            }
        } else {
            manager.userIds.forEach((uid) => activeTemplateUsers.add(uid));
            // Note: In a real implementation, this would need to be properly handled
            // manager.start().catch((e) => log(id, manager.masterName, 'Error starting template', e));
        }
    } else if (!req.body.running && manager.running) {
        // STOPPING a template
        log('SYSTEM', 'wplacer', `[${manager.name}] 🛑 Template stopped by user.`);
        manager.running = false;
        const idx = templateQueue.indexOf(id);
        if (idx > -1) templateQueue.splice(idx, 1);

        manager.userIds.forEach((uid) => activeTemplateUsers.delete(uid));
        processQueue(); // Always process queue after stopping
    }
    res.sendStatus(HTTP_STATUS.OK);
});

export default router;
