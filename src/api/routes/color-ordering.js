import express from 'express';
import { 
    getColorOrdering, 
    getTemplateColors, 
    setColorOrder, 
    validateColorIds 
} from '../../services/color-ordering-service.js';
import { log } from '../../utils/logger.js';

const router = express.Router();

// Get color ordering
router.get('/', (req, res) => {
    const templates = req.app.locals.templates;
    const { templateId } = req.query;
    
    try {
        const result = getColorOrdering(templateId, templates);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update global color ordering
router.put('/global', (req, res) => {
    const validOrder = validateColorIds(req.body.order || []);

    if (!validOrder.length) {
        return res.status(400).json({ error: 'No valid color IDs provided' });
    }

    setColorOrder(validOrder);
    res.json({ success: true });
});

// Update template-specific color ordering
router.put('/template/:templateId', (req, res) => {
    const templates = req.app.locals.templates;
    const { templateId } = req.params;
    const template = templates[templateId];

    if (!template) {
        return res.status(400).json({ error: 'Template not found' });
    }

    const validOrder = validateColorIds(req.body.order || []);
    if (!validOrder.length) {
        return res.status(400).json({ error: 'No valid color IDs provided' });
    }

    setColorOrder(validOrder, templateId);
    log('SYSTEM', 'color-ordering', `Template "${template.name}" color order updated (${validOrder.length} colors)`);
    res.json({ success: true });
});

// Reset template color ordering
router.delete('/template/:templateId', (req, res) => {
    const templates = req.app.locals.templates;
    const { templateId } = req.params;

    // TODO: Implement reset functionality when color ordering service is complete
    const templateName = templates[templateId]?.name || 'Unknown';
    log('SYSTEM', 'color-ordering', `Template "${templateName}" color order reset to global`);
    res.json({ success: true });
});

// Get template colors
router.get('/template/:id/colors', (req, res) => {
    const templates = req.app.locals.templates;
    const { id } = req.params;

    try {
        const result = getTemplateColors(id, templates);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
