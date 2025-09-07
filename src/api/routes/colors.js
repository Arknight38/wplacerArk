import express from 'express';
import { HTTP_STATUS } from '../../config/constants.js';
import { ColorOrderingService } from '../../services/color-ordering-service.js';
import { templateService } from '../../services/template-service.js';
import { log } from '../../utils/logger.js';

const router = express.Router();
const colorOrderingService = new ColorOrderingService();

// Get color ordering
router.get('/ordering', async (req, res) => {
    const { templateId } = req.query;
    
    if (templateId && templateService.getTemplate(templateId)) {
        const template = templateService.getTemplate(templateId);
        const availableColors = templateService.getColorsInTemplate(template.template);
        const currentOrder = colorOrderingService.getColorOrder(templateId).filter(id => availableColors.includes(id));
        
        res.json({
            order: currentOrder,
            availableColors,
            filteredByTemplate: true
        });
    } else {
        const { palette } = await import('../../config/constants.js');
        res.json({
            order: colorOrderingService.getGlobalColorOrder(),
            availableColors: Object.values(palette),
            filteredByTemplate: false
        });
    }
});

// Update global color ordering
router.put('/ordering/global', (req, res) => {
    try {
        const validOrder = colorOrderingService.validateColorIds(req.body.order || []);
        
        if (!validOrder.length) {
            return res.status(HTTP_STATUS.BAD_REQ).json({ error: 'No valid color IDs provided' });
        }

        colorOrderingService.setGlobalColorOrder(validOrder);
        res.json({ success: true });
    } catch (error) {
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

// Update template-specific color ordering
router.put('/ordering/template/:templateId', (req, res) => {
    const { templateId } = req.params;
    const template = templateService.getTemplate(templateId);

    if (!template) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Template not found' });
    }

    try {
        const validOrder = colorOrderingService.validateColorIds(req.body.order || []);
        
        if (!validOrder.length) {
            return res.status(HTTP_STATUS.BAD_REQ).json({ error: 'No valid color IDs provided' });
        }

        colorOrderingService.setTemplateColorOrder(validOrder, templateId);
        log('SYSTEM', 'color-ordering', `Template "${template.name}" color order updated (${validOrder.length} colors)`);
        
        res.json({ success: true });
    } catch (error) {
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

// Reset template color ordering to global default
router.delete('/ordering/template/:templateId', (req, res) => {
    const { templateId } = req.params;

    try {
        const template = templateService.getTemplate(templateId);
        colorOrderingService.resetTemplateColorOrder(templateId);
        
        const templateName = template?.name || 'Unknown';
        log('SYSTEM', 'color-ordering', `Template "${templateName}" color order reset to global`);
        
        res.json({ success: true });
    } catch (error) {
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

// Get template colors (useful for UI to show available colors)
router.get('/template/:id/colors', async (req, res) => {
    const template = templateService.getTemplate(req.params.id);

    if (!template) {
        return res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Template not found' });
    }

    try {
        const { COLOR_NAMES, palette } = await import('../../config/constants.js');
        const colorsInTemplate = templateService.getColorsInTemplate(template.template);
        
        const colorInfo = colorsInTemplate.map(colorId => ({
            id: colorId,
            name: COLOR_NAMES[colorId] || `Color ${colorId}`,
            rgb: Object.keys(palette).find(key => palette[key] === colorId) || null
        }));

        res.json({
            templateId: req.params.id,
            templateName: template.name,
            colors: colorInfo,
            totalUniqueColors: colorsInTemplate.length
        });
    } catch (error) {
        res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
    }
});

export default router;