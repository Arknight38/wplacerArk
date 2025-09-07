import { existsSync } from 'node:fs';
import { TEMPLATES_PATH } from '../config/constants.js';
import { loadJSON, saveJSON } from '../utils/file-ops.js';
import { templateFromShareCode, shareCodeFromTemplate, ensureXMajor } from '../utils/codec.js';
import { sanitizePalette2D } from '../utils/palette.js';
import { TemplateManager } from '../core/template-manager.js';
import { log } from '../utils/logger.js';

class TemplateService {
    constructor() {
        this.templates = {};
    }

    loadTemplatesFromDisk() {
        if (!existsSync(TEMPLATES_PATH)) {
            this.templates = {};
            return;
        }

        const raw = loadJSON(TEMPLATES_PATH);
        const out = {};

        for (const id in raw) {
            const e = raw[id] || {};
            const te = e.template || {};
            let { width, height, data, shareCode } = te;

            try {
                if (!data && shareCode) {
                    const dec = templateFromShareCode(shareCode);
                    width = dec.width;
                    height = dec.height;
                    data = dec.data;
                }
                if (!width || !height || !Array.isArray(data)) {
                    throw new Error('missing data');
                }

                out[id] = {
                    ...e,
                    template: {
                        width,
                        height,
                        data,
                        shareCode: shareCode || shareCodeFromTemplate({ width, height, data }),
                    },
                };
            } catch (err) {
                console.error(`[templates] skip ${id}: ${err.message}`);
            }
        }
        
        this.templates = out;
    }

    saveTemplatesCompressed() {
        const toSave = {};
        
        for (const id in this.templates) {
            try {
                const t = this.templates[id];
                const { width, height, data } = t.template;
                const shareCode = t.template.shareCode || shareCodeFromTemplate({ width, height, data });
                
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
                    template: { width, height, shareCode },
                };
            } catch (e) {
                console.error(`[templates] skip ${id}: ${e.message}`);
            }
        }
        
        saveJSON(TEMPLATES_PATH, toSave);
    }

    createTemplate(templateData) {
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
        } = templateData;

        if (!templateName || !template || !coords || !userIds || !userIds.length) {
            throw new Error('Missing required template data');
        }

        if (Object.values(this.templates).some((t) => t.name === templateName)) {
            throw new Error('A template with this name already exists');
        }

        const templateId = Date.now().toString();
        this.templates[templateId] = new TemplateManager({
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

        this.saveTemplatesCompressed();
        return templateId;
    }

    updateTemplate(id, updateData) {
        if (!this.templates[id]) {
            throw new Error('Template not found');
        }

        const manager = this.templates[id];
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
        } = updateData;

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
        // Note: masterName would need user service reference
        
        this.saveTemplatesCompressed();
    }

    deleteTemplate(id) {
        if (!this.templates[id] || this.templates[id].running) {
            throw new Error('Cannot delete running template or template not found');
        }

        delete this.templates[id];
        this.saveTemplatesCompressed();
    }

    importTemplate({ id, name, coords, code }) {
        if (!id || !code) {
            throw new Error('id and code required');
        }

        const tmpl = templateFromShareCode(code);
        this.templates[id] = {
            templateId: id,
            name: name || `Template ${id}`,
            coords: coords || [0, 0],
            canBuyCharges: false,
            canBuyMaxCharges: false,
            antiGriefMode: false,
            eraseMode: false,
            outlineMode: false,
            skipPaintedPixels: false,
            enableAutostart: false,
            userIds: [],
            template: { ...tmpl, shareCode: code },
            running: false,
            status: 'idle',
            pixelsRemaining: tmpl.width * tmpl.height,
            totalPixels: tmpl.width * tmpl.height,
        };

        this.saveTemplatesCompressed();
        return { ok: true };
    }

    getTemplatesForAPI() {
        const templateList = {};

        for (const id in this.templates) {
            const manager = this.templates[id];
            try {
                let shareCode;
                try {
                    shareCode = manager.template.shareCode || shareCodeFromTemplate(manager.template);
                } catch (shareCodeError) {
                    console.warn(`Could not generate share code for template ${id}: ${shareCodeError.message}`);
                    shareCode = null;
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

        return templateList;
    }

    getColorsInTemplate(templateData) {
        if (!templateData?.data) return [];

        const uniqueColors = new Set();
        templateData.data.flat().forEach(colorId => {
            if (colorId > 0) uniqueColors.add(colorId);
        });

        return Array.from(uniqueColors).sort((a, b) => a - b);
    }

    migrateOldTemplatesIfNeeded() {
        if (!existsSync(TEMPLATES_PATH)) return;
        
        let raw;
        try {
            raw = loadJSON(TEMPLATES_PATH);
        } catch {
            return;
        }

        let changed = false;
        const out = {};
        
        for (const id in raw) {
            const e = raw[id] || {};
            const te = e.template || {};
            try {
                if (!te.data || te.shareCode) {
                    out[id] = e;
                    continue;
                }
                
                const width = te.width, height = te.height, data = te.data;
                const code = shareCodeFromTemplate({ width, height, data });
                out[id] = { ...e, template: { width, height, shareCode: code } };
                changed = true;
                console.log(`[migrate] compressed template ${id} (${e.name || 'unnamed'})`);
            } catch (err) {
                console.error(`[migrate] skip ${id}: ${err.message}`);
                out[id] = e;
            }
        }
        
        if (changed) {
            saveJSON(TEMPLATES_PATH, out);
            console.log(`[migrate] templates.json updated to compressed format`);
        }
    }

    ensureTemplateData(te) {
        if (te?.data && Array.isArray(te.data)) {
            const w = Number(te.width) >>> 0;
            const h = Number(te.height) >>> 0;
            if (!w || !h) throw new Error('invalid template dimensions');
            const data = ensureXMajor(te.data, w, h);
            sanitizePalette2D(data);
            return {
                width: w,
                height: h,
                data,
                shareCode: te.shareCode ?? shareCodeFromTemplate({ width: w, height: h, data }),
            };
        }
        
        if (te?.shareCode) {
            const dec = templateFromShareCode(te.shareCode);
            return { width: dec.width, height: dec.height, data: dec.data, shareCode: te.shareCode };
        }
        
        throw new Error('template missing data/shareCode');
    }

    getAllTemplates() {
        return this.templates;
    }

    getTemplate(id) {
        return this.templates[id];
    }

    removeUserFromTemplates(userId, users) {
        let templatesModified = false;
        
        for (const templateId in this.templates) {
            const manager = this.templates[templateId];
            const before = manager.userIds.length;
            manager.userIds = manager.userIds.filter((id) => id !== userId);
            manager.userQueue = manager.userQueue.filter((id) => id !== userId);
            
            if (manager.userIds.length < before) {
                templatesModified = true;
                const deletedName = users[userId]?.name || 'Unknown';
                log('SYSTEM', 'Templates', `Removed user ${deletedName}#${userId} from template "${manager.name}".`);
                
                if (manager.masterId === userId) {
                    manager.masterId = manager.userIds[0] || null;
                    manager.masterName = manager.masterId ? users[manager.masterId].name : null;
                }
                
                if (manager.userIds.length === 0 && manager.running) {
                    manager.running = false;
                    log('SYSTEM', 'wplacer', `[${manager.name}] Template stopped, no users left.`);
                }
            }
        }
        
        if (templatesModified) {
            this.saveTemplatesCompressed();
        }
        
        return templatesModified;
    }
}

export const templateService = new TemplateService();