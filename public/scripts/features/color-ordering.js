/**
 * Color ordering functionality
 */
import { $, createElement, clearElement } from '../utils/dom.js';
import { api } from '../utils/api.js';

const colorGrid = $('colorGrid');
let currentTemplateId = null;
let availableColors = new Set();

// Color definitions
const colors = {
    '0,0,0': { id: 1, name: 'Black' },
    '60,60,60': { id: 2, name: 'Dark Gray' },
    '120,120,120': { id: 3, name: 'Gray' },
    '210,210,210': { id: 4, name: 'Light Gray' },
    '255,255,255': { id: 5, name: 'White' },
    '96,0,24': { id: 6, name: 'Dark Red' },
    '237,28,36': { id: 7, name: 'Red' },
    '255,127,39': { id: 8, name: 'Orange' },
    '246,170,9': { id: 9, name: 'Dark Orange' },
    '249,221,59': { id: 10, name: 'Yellow' },
    '255,250,188': { id: 11, name: 'Light Yellow' },
    '14,185,104': { id: 12, name: 'Green' },
    '19,230,123': { id: 13, name: 'Light Green' },
    '135,255,94': { id: 14, name: 'Bright Green' },
    '12,129,110': { id: 15, name: 'Teal' },
    '16,174,166': { id: 16, name: 'Cyan' },
    '19,225,190': { id: 17, name: 'Light Cyan' },
    '40,80,158': { id: 18, name: 'Dark Blue' },
    '64,147,228': { id: 19, name: 'Blue' },
    '96,247,242': { id: 20, name: 'Light Blue' },
    '107,80,246': { id: 21, name: 'Purple' },
    '153,177,251': { id: 22, name: 'Light Purple' },
    '120,12,153': { id: 23, name: 'Dark Purple' },
    '170,56,185': { id: 24, name: 'Magenta' },
    '224,159,249': { id: 25, name: 'Light Magenta' },
    '203,0,122': { id: 26, name: 'Dark Pink' },
    '236,31,128': { id: 27, name: 'Pink' },
    '243,141,169': { id: 28, name: 'Light Pink' },
    '104,70,52': { id: 29, name: 'Brown' },
    '149,104,42': { id: 30, name: 'Dark Brown' },
    '248,178,119': { id: 31, name: 'Tan' },
    '170,170,170': { id: 32, name: 'Medium Gray' },
    '165,14,30': { id: 33, name: 'Maroon' },
    '250,128,114': { id: 34, name: 'Salmon' },
    '228,92,26': { id: 35, name: 'Red Orange' },
    '214,181,148': { id: 36, name: 'Beige' },
    '156,132,49': { id: 37, name: 'Olive' },
    '197,173,49': { id: 38, name: 'Yellow Green' },
    '232,212,95': { id: 39, name: 'Pale Yellow' },
    '74,107,58': { id: 40, name: 'Forest Green' },
    '90,148,74': { id: 41, name: 'Moss Green' },
    '132,197,115': { id: 42, name: 'Mint Green' },
    '15,121,159': { id: 43, name: 'Steel Blue' },
    '187,250,242': { id: 44, name: 'Aqua' },
    '125,199,255': { id: 45, name: 'Sky Blue' },
    '77,49,184': { id: 46, name: 'Indigo' },
    '74,66,132': { id: 47, name: 'Navy Blue' },
    '122,113,196': { id: 48, name: 'Slate Blue' },
    '181,174,241': { id: 49, name: 'Periwinkle' },
    '219,164,99': { id: 50, name: 'Peach' },
    '209,128,81': { id: 51, name: 'Bronze' },
    '255,197,165': { id: 52, name: 'Light Peach' },
    '155,82,73': { id: 53, name: 'Rust' },
    '209,128,120': { id: 54, name: 'Rose' },
    '250,182,164': { id: 55, name: 'Blush' },
    '123,99,82': { id: 56, name: 'Coffee' },
    '156,132,107': { id: 57, name: 'Taupe' },
    '51,57,65': { id: 58, name: 'Charcoal' },
    '109,117,141': { id: 59, name: 'Slate' },
    '179,185,209': { id: 60, name: 'Lavender' },
    '109,100,63': { id: 61, name: 'Khaki' },
    '148,140,107': { id: 62, name: 'Sand' },
    '205,197,158': { id: 63, name: 'Cream' },
};

let draggedElement = null;

export const initializeColorOrdering = () => {
    if (!colorGrid) return;
    
    setupDragAndDrop();
    initializeGrid();
};

const setupDragAndDrop = () => {
    colorGrid.addEventListener('mousedown', e => {
        const item = e.target.closest('.color-item');
        if (item) item.setAttribute('draggable', 'true');
    });

    colorGrid.addEventListener('dragstart', e => {
        draggedElement = e.target.closest('.color-item');
        if (draggedElement) {
            draggedElement.classList.add('dragging');
        }
    });

    colorGrid.addEventListener('dragover', e => {
        e.preventDefault();
        const item = e.target.closest('.color-item');
        [...colorGrid.children].forEach(el => 
            el.classList.toggle('drag-over', el === item && el !== draggedElement)
        );
    });

    colorGrid.addEventListener('drop', e => {
        const dropTarget = e.target.closest('.color-item');
        if (dropTarget && dropTarget !== draggedElement && draggedElement) {
            const items = [...colorGrid.children];
            const [dragIdx, dropIdx] = [items.indexOf(draggedElement), items.indexOf(dropTarget)];
            colorGrid.insertBefore(draggedElement, dropIdx < dragIdx ? dropTarget : dropTarget.nextSibling);
            
            // Update priorities and save
            [...colorGrid.children].forEach((item, i) => {
                const priorityNumber = item.querySelector('.priority-number');
                if (priorityNumber) priorityNumber.textContent = i + 1;
            });
            
            if (currentTemplateId) {
                saveColorOrder(currentTemplateId);
            }
        }
    });

    colorGrid.addEventListener('dragend', () => {
        [...colorGrid.children].forEach(item => 
            item.classList.remove('dragging', 'drag-over')
        );
        draggedElement = null;
    });
};

export const initializeGrid = async (templateId = null) => {
    currentTemplateId = templateId;
    let colorEntries = Object.entries(colors);
    
    if (templateId) {
        try {
            const response = await api.get(`/template/${templateId}/colors`);
            availableColors = new Set(response.colors.map(c => c.id));
            colorEntries = response.colors.map(c => {
                const rgb = Object.keys(colors).find(rgb => colors[rgb].id === c.id);
                return [rgb, colors[rgb]];
            }).filter(([rgb]) => rgb);
        } catch {
            availableColors = new Set(Object.values(colors).map(c => c.id));
        }
    } else {
        availableColors = new Set(Object.values(colors).map(c => c.id));
    }
    
    await buildGrid(colorEntries, templateId);
};

const buildGrid = async (colorEntries, templateId = null) => {
    try {
        const response = await api.get(templateId ? `/color-ordering?templateId=${templateId}` : `/color-ordering`);
        const order = response.order || [];
        const colorMap = new Map(colorEntries.map(([rgb, data]) => [data.id, { rgb, ...data }]));
        
        clearElement(colorGrid);
        let priority = 1;
        
        // Add ordered colors first
        order.forEach(id => {
            const colorInfo = colorMap.get(id);
            if (colorInfo) {
                colorGrid.appendChild(createColorItem(colorInfo.rgb, colorInfo, priority++));
                colorMap.delete(id);
            }
        });
        
        // Add remaining colors
        [...colorMap.values()].sort((a, b) => a.id - b.id).forEach(colorInfo => {
            colorGrid.appendChild(createColorItem(colorInfo.rgb, colorInfo, priority++));
        });
    } catch {
        colorEntries.sort((a, b) => a[1].id - b[1].id);
        clearElement(colorGrid);
        colorEntries.forEach(([rgb, data], i) => 
            colorGrid.appendChild(createColorItem(rgb, data, i + 1))
        );
    }
};

const createColorItem = (rgb, { id, name }, priority) => {
    const div = createElement('div', 'color-item', '');
    div.draggable = true;
    Object.assign(div.dataset, { id, rgb, name });
    div.title = `ID ${id}: ${name} (${rgb})`;
    div.innerHTML = `
        <div class="color-swatch" style="background:rgb(${rgb})"></div>
        <div class="color-info">
            <span class="priority-number">${priority}</span>
            <span class="color-name">${name}</span>
        </div>
    `;
    return div;
};

const saveColorOrder = async (templateId = null) => {
    const order = [...colorGrid.children].map(el => parseInt(el.dataset.id));
    const url = templateId ? `/color-ordering/template/${templateId}` : `/color-ordering/global`;
    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order })
        });
        return response.ok;
    } catch {
        return false;
    }
};

export const resetOrder = () => {
    buildGrid(Object.entries(colors).filter(([_, data]) => 
        !currentTemplateId || availableColors.has(data.id)
    ));
};

export const updateColorGridForImage = (imageColorIds) => {
    availableColors = new Set(imageColorIds);
    const imageColors = imageColorIds.map(id => {
        const rgb = Object.keys(colors).find(rgb => colors[rgb].id === id);
        return [rgb, colors[rgb]];
    }).filter(([rgb]) => rgb);
    
    buildGrid(imageColors);
};

// Export colors for use in other modules
export { colors };
