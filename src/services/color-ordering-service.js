import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DATA_DIR } from '../config/constants.js';
import { palette, COLOR_NAMES } from '../config/palette.js';
import { log } from '../utils/logger.js';

// Default color order sorted by id
const defaultColorOrder = Object.values(palette).sort((a, b) => a - b);

// Store color orders - initialize from disk
let colorOrdering = loadColorOrdering();

// Extract unique colors from template data
export function getColorsInTemplate(templateData) {
    if (!templateData?.data) return [];

    const uniqueColors = new Set();

    // Flatten and filter in one pass
    templateData.data.flat().forEach(colorId => {
        if (colorId > 0) uniqueColors.add(colorId);
    });

    return Array.from(uniqueColors).sort((a, b) => a - b);
}

// Load color ordering from disk
function loadColorOrdering() {
    const orderingPath = `${DATA_DIR}/color_ordering.json`;

    if (existsSync(orderingPath)) {
        try {
            const data = JSON.parse(readFileSync(orderingPath, 'utf8'));
            return {
                global: data.global || [...defaultColorOrder],
                templates: data.templates || {}
            };
        } catch (e) {
            console.error('Error loading color ordering:', e.message);
        }
    }

    return {
        global: [...defaultColorOrder],
        templates: {}
    };
}

// Save color ordering to disk
function saveColorOrdering() {
    const orderingPath = `${DATA_DIR}/color_ordering.json`;

    try {
        writeFileSync(orderingPath, JSON.stringify(colorOrdering, null, 2));
        console.log('Color ordering saved successfully');
    } catch (e) {
        console.error('Error saving color ordering:', e.message);
        throw e; // Re-throw so calling code knows it failed
    }
}

// Helper to get color order for specific context
export function getColorOrder(templateId = null) {
    return templateId && colorOrdering.templates[templateId]
        ? colorOrdering.templates[templateId]
        : colorOrdering.global;
}

// Helper to set color order for specific context
export function setColorOrder(order, templateId = null) {
    if (templateId) {
        colorOrdering.templates[templateId] = [...order];
    } else {
        colorOrdering.global = [...order];
    }
    saveColorOrdering();
}

export const validateColorIds = (order) => {
    const validIds = new Set(Object.values(palette));
    return order.filter(id => Number.isInteger(id) && validIds.has(id));
};

// Get color ordering
export function getColorOrdering(templateId, templates) {
    if (templateId && templates[templateId]) {
        const availableColors = getColorsInTemplate(templates[templateId].template);
        const currentOrder = getColorOrder(templateId).filter(id => availableColors.includes(id));
        return { order: currentOrder, availableColors, filteredByTemplate: true };
    } else {
        return {
            order: colorOrdering.global,
            availableColors: Object.values(palette),
            filteredByTemplate: false
        };
    }
}

// Get template colors
export function getTemplateColors(templateId, templates) {
    const template = templates[templateId];

    if (!template) {
        throw new Error('Template not found');
    }

    const colorsInTemplate = getColorsInTemplate(template.template);
    const colorInfo = colorsInTemplate.map(colorId => ({
        id: colorId,
        name: COLOR_NAMES[colorId] || `Color ${colorId}`,
        rgb: Object.keys(palette).find(key => palette[key] === colorId) || null
    }));

    return {
        templateId: templateId,
        templateName: template.name,
        colors: colorInfo,
        totalUniqueColors: colorsInTemplate.length
    };
}