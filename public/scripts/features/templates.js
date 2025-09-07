/**
 * Template management functionality
 */
import { $, createElement, setText, clearElement } from '../utils/dom.js';
import { api, loadUsers, loadTemplates } from '../utils/api.js';
import { showMessage, showConfirmation, showLoading, hideLoading } from '../utils/ui.js';
import { validateTemplateData, validateFileUpload, sanitizeInput } from '../utils/validation.js';
import { drawTemplate, processImageFile, fetchCanvas } from '../utils/canvas.js';

const addTemplate = $('addTemplate');
const templateForm = $('templateForm');
const templateFormTitle = $('templateFormTitle');
const submitTemplate = $('submitTemplate');
const templateName = $('templateName');
const tx = $('tx');
const ty = $('ty');
const px = $('px');
const py = $('py');
const userSelectList = $('userSelectList');
const selectAllUsers = $('selectAllUsers');
const templateList = $('templateList');
const startAll = $('startAll');
const stopAll = $('stopAll');
const convertInput = $('convertInput');
const details = $('details');
const size = $('size');
const ink = $('ink');
const templateCanvas = $('templateCanvas');
const previewCanvas = $('previewCanvas');
const previewCanvasButton = $('previewCanvasButton');
const previewBorder = $('previewBorder');

let currentTemplate = { width: 0, height: 0, data: [] };
let templateUpdateInterval = null;

export const initializeTemplateManagement = () => {
    if (templateForm) {
        templateForm.addEventListener('submit', handleTemplateSubmit);
    }
    
    if (selectAllUsers) {
        selectAllUsers.addEventListener('click', handleSelectAllUsers);
    }
    
    if (startAll) {
        startAll.addEventListener('click', handleStartAll);
    }
    
    if (stopAll) {
        stopAll.addEventListener('click', handleStopAll);
    }
    
    if (convertInput) {
        convertInput.addEventListener('change', handleImageUpload);
    }
    
    if (previewCanvasButton) {
        previewCanvasButton.addEventListener('click', handlePreviewCanvas);
    }
    
    setupCoordinateInputs();
    setupTemplateForm();
};

const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    
    const isEditMode = !!templateForm.dataset.editId;
    if (!isEditMode && (!currentTemplate || currentTemplate.width === 0)) {
        showMessage('Error', 'Please convert an image before creating a template.');
        return;
    }
    
    const selectedUsers = Array.from(document.querySelectorAll('input[name="user_checkbox"]:checked'))
        .map(cb => cb.value);
    
    const coords = [tx.value, ty.value, px.value, py.value];
    
    if (!validateTemplateData(templateName.value, coords, selectedUsers)) {
        return;
    }
    
    const data = {
        templateName: sanitizeInput(templateName.value),
        coords: coords.map(Number),
        userIds: selectedUsers,
        canBuyCharges: $('canBuyCharges').checked,
        canBuyMaxCharges: $('canBuyMaxCharges').checked,
        antiGriefMode: $('antiGriefMode').checked,
        eraseMode: $('eraseMode').checked,
        outlineMode: $('templateOutlineMode').checked,
        skipPaintedPixels: $('templateSkipPaintedPixels').checked,
        enableAutostart: $('enableAutostart').checked,
    };
    
    if (currentTemplate && currentTemplate.width > 0) {
        data.template = currentTemplate;
    }
    
    try {
        showLoading($('submitTemplate'), isEditMode ? 'Saving...' : 'Creating...');
        
        let templateId;
        if (isEditMode) {
            templateId = templateForm.dataset.editId;
            await api.put(`/template/edit/${templateId}`, data);
            showMessage('Success', 'Template updated!');
        } else {
            const response = await api.post('/template', data);
            templateId = response.id;
            showMessage('Success', 'Template created!');
        }
        
        resetTemplateForm();
        loadTemplatesList();
        
    } catch (error) {
        console.error('Failed to save template:', error);
    } finally {
        hideLoading($('submitTemplate'));
    }
};

const handleSelectAllUsers = () => {
    const checkboxes = document.querySelectorAll('#userSelectList input[type="checkbox"]');
    if (checkboxes.length === 0) return;

    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    const targetState = !allSelected;
    checkboxes.forEach(cb => cb.checked = targetState);
};

const handleStartAll = async () => {
    const children = Array.from(templateList.children);
    for (const child of children) {
        try {
            await api.put(`/template/${child.id}`, { running: true });
        } catch (error) {
            console.error('Failed to start template:', error);
        }
    }
    showMessage('Success', 'Finished! Check console for details.');
    loadTemplatesList();
};

const handleStopAll = async () => {
    const children = Array.from(templateList.children);
    for (const child of children) {
        try {
            await api.put(`/template/${child.id}`, { running: false });
        } catch (error) {
            console.error('Failed to stop template:', error);
        }
    }
    showMessage('Success', 'Finished! Check console for details.');
    loadTemplatesList();
};

const setupCoordinateInputs = () => {
    [tx, ty, px, py].forEach((input) => {
        if (input) {
            input.addEventListener('blur', () => {
                input.value = input.value.replace(/[^0-9]/g, '');
            });
        }
    });
    
    if (tx) {
        tx.addEventListener('blur', () => {
            const value = tx.value.trim();
            const urlRegex = /pixel\/(\d+)\/(\d+)\?x=(\d+)&y=(\d+)/;
            const urlMatch = value.match(urlRegex);

            if (urlMatch) {
                tx.value = urlMatch[1];
                ty.value = urlMatch[2];
                px.value = urlMatch[3];
                py.value = urlMatch[4];
            } else {
                const parts = value.split(/\s+/);
                if (parts.length === 4) {
                    tx.value = parts[0].replace(/[^0-9]/g, '');
                    ty.value = parts[1].replace(/[^0-9]/g, '');
                    px.value = parts[2].replace(/[^0-9]/g, '');
                    py.value = parts[3].replace(/[^0-9]/g, '');
                } else {
                    tx.value = value.replace(/[^0-9]/g, '');
                }
            }
        });
    }
};

const setupTemplateForm = () => {
    // Setup checkbox mutual exclusivity
    const canBuyMaxCharges = $('canBuyMaxCharges');
    const canBuyCharges = $('canBuyCharges');
    
    if (canBuyMaxCharges && canBuyCharges) {
        canBuyMaxCharges.addEventListener('change', () => {
            if (canBuyMaxCharges.checked) {
                canBuyCharges.checked = false;
            }
        });
        
        canBuyCharges.addEventListener('change', () => {
            if (canBuyCharges.checked) {
                canBuyMaxCharges.checked = false;
            }
        });
    }
    
    // Setup paste functionality
    document.addEventListener('paste', (e) => {
        const text = e.clipboardData?.getData('text');
        if (text && pastePinCoordinates(text)) {
            e.preventDefault();
        }
    });
};

const pastePinCoordinates = (text) => {
    const patterns = [
        /Tl X:\s*(\d+),\s*Tl Y:\s*(\d+),\s*Px X:\s*(\d+),\s*Px Y:\s*(\d+)/,
        /^\s*(\d+)[\s,;]+(\d+)[\s,;]+(\d+)[\s,;]+(\d+)\s*$/,
    ];
    
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
            tx.value = match[1];
            ty.value = match[2];
            px.value = match[3];
            py.value = match[4];
            return true;
        }
    }
    return false;
};

export const loadTemplatesList = () => {
    if (!templateList) return;
    
    clearElement(templateList);
    
    loadTemplates((templates) => {
        if (Object.keys(templates).length === 0) {
            templateList.innerHTML = '<span>No templates created yet.</span>';
            return;
        }
        
        for (const id in templates) {
            const card = createTemplateCard(templates[id], id);
            templateList.appendChild(card);
        }
        
        // Start update interval
        if (templateUpdateInterval) clearInterval(templateUpdateInterval);
        templateUpdateInterval = setInterval(updateTemplateStatus, 2000);
    });
};

const createTemplateCard = (template, id) => {
    const total = template.totalPixels || 1;
    const remaining = template.pixelsRemaining != null ? template.pixelsRemaining : total;
    const completed = total - remaining;
    const percent = Math.floor((completed / total) * 100);

    const card = createElement('div', 'template', '');
    card.id = id;

    // Header: Name and Pixels
    const info = createElement('div', 'template-info', `
        <span><b>Name:</b> <span class="template-data">${sanitizeInput(template.name)}</span></span>
        <span><b>Pixels:</b> <span class="template-data pixel-count">${completed} / ${total}</span></span>
    `);
    card.appendChild(info);

    // Progress Bar
    const pc = createElement('div', 'progress-bar-container', '');
    const pb = createElement('div', 'progress-bar', '');
    pb.style.width = `${percent}%`;
    const pbt = createElement('span', 'progress-bar-text', `${percent}% | ${template.status}`);
    
    if (template.status === 'Finished.') pb.classList.add('finished');
    else if (!template.running) pb.classList.add('stopped');
    
    pc.append(pb, pbt);
    card.appendChild(pc);

    // Actions
    const actions = createElement('div', 'template-actions', '');
    actions.appendChild(createToggleButton(template, id, pbt, percent));
    actions.appendChild(createShareButton(template));
    actions.appendChild(createEditButton(template, id));
    actions.appendChild(createDeleteButton(template, id));
    card.appendChild(actions);

    // Canvas Preview
    const canvasContainer = createElement('div', '');
    const canvas = createElement('canvas', '');
    canvasContainer.appendChild(canvas);
    card.appendChild(canvasContainer);
    
    if (template.template) {
        drawTemplate(template.template, canvas);
    }

    return card;
};

const createToggleButton = (template, id, progressBarText, currentPercent) => {
    const button = createElement('button', template.running ? 'destructive-button' : 'primary-button', 
        `<img src="icons/${template.running ? 'pause' : 'play'}.svg">${template.running ? 'Stop' : 'Start'}`);

    button.addEventListener('click', async (event) => {
        event.preventDefault();
        const shouldBeRunning = !template.running;
        
        try {
            await api.put(`/template/${id}`, { running: shouldBeRunning });
            template.running = shouldBeRunning;

            button.className = template.running ? 'destructive-button' : 'primary-button';
            button.innerHTML = `<img src="icons/${template.running ? 'pause' : 'play'}.svg">${template.running ? 'Stop' : 'Start'}`;

            const newStatus = template.running ? 'Started' : 'Stopped';
            setText(progressBarText, `${currentPercent}% | ${newStatus}`);
            
            const progressBar = progressBarText.previousElementSibling;
            if (progressBar) {
                progressBar.classList.toggle('stopped', !template.running);
            }
        } catch (error) {
            console.error('Failed to toggle template:', error);
        }
    });
    
    return button;
};

const createShareButton = (template) => {
    const button = createElement('button', 'secondary-button', '<img src="icons/open.svg">Share');
    
    button.addEventListener('click', async () => {
        if (!template.shareCode) {
            showMessage('Error', 'No share code available for this template.');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(template.shareCode);
            showMessage('Copied!', 'Share code copied to clipboard.');
        } catch (error) {
            console.error('Failed to copy share code:', error);
        }
    });
    
    return button;
};

const createEditButton = (template, id) => {
    const button = createElement('button', 'secondary-button', '<img src="icons/settings.svg">Edit');
    
    button.addEventListener('click', () => {
        // Switch to add template tab and populate form
        changeTab('addTemplate');
        populateEditForm(template, id);
    });
    
    return button;
};

const createDeleteButton = (template, id) => {
    const button = createElement('button', 'destructive-button', '<img src="icons/remove.svg">Delete');
    
    button.addEventListener('click', () => {
        showConfirmation('Delete Template', `Are you sure you want to delete "${template.name}"?`, async () => {
            try {
                await api.delete(`/template/${id}`);
                loadTemplatesList();
            } catch (error) {
                console.error('Failed to delete template:', error);
            }
        });
    });
    
    return button;
};

const populateEditForm = (template, id) => {
    if (templateFormTitle) templateFormTitle.textContent = `Edit Template: ${template.name}`;
    if (submitTemplate) submitTemplate.innerHTML = '<img src="icons/edit.svg">Save Changes';
    
    templateForm.dataset.editId = id;
    templateName.value = template.name;
    [tx.value, ty.value, px.value, py.value] = template.coords;
    
    $('canBuyCharges').checked = template.canBuyCharges;
    $('canBuyMaxCharges').checked = template.canBuyMaxCharges;
    $('antiGriefMode').checked = template.antiGriefMode;
    $('eraseMode').checked = template.eraseMode;
    $('templateOutlineMode').checked = template.outlineMode;
    $('templateSkipPaintedPixels').checked = template.skipPaintedPixels;
    $('enableAutostart').checked = template.enableAutostart;
    
    setTimeout(() => {
        document.querySelectorAll('input[name="user_checkbox"]').forEach((cb) => {
            cb.checked = template.userIds.includes(cb.value);
        });
    }, 100);
};

const updateTemplateStatus = async () => {
    try {
        const templates = await api.get('/templates');
        for (const id in templates) {
            const t = templates[id];
            const templateElement = $(id);
            if (!templateElement) continue;

            const total = t.totalPixels || 1;
            const remaining = t.pixelsRemaining !== null ? t.pixelsRemaining : total;
            const completed = total - remaining;
            const percent = Math.floor((completed / total) * 100);

            const progressBar = templateElement.querySelector('.progress-bar');
            const progressBarText = templateElement.querySelector('.progress-bar-text');
            const pixelCountSpan = templateElement.querySelector('.pixel-count');

            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressBarText) setText(progressBarText, `${percent}% | ${t.status}`);
            if (pixelCountSpan) setText(pixelCountSpan, `${completed} / ${total}`);

            if (t.status === 'Finished.') {
                progressBar.classList.add('finished');
                progressBar.classList.remove('stopped');
            } else if (!t.running) {
                progressBar.classList.add('stopped');
                progressBar.classList.remove('finished');
            } else {
                progressBar.classList.remove('stopped', 'finished');
            }
        }
    } catch (error) {
        console.error('Failed to update template statuses:', error);
    }
};

export const resetTemplateForm = () => {
    if (templateForm) templateForm.reset();
    if (templateFormTitle) templateFormTitle.textContent = 'Add Template';
    if (submitTemplate) submitTemplate.innerHTML = '<img src="icons/addTemplate.svg">Add Template';
    
    delete templateForm.dataset.editId;
    currentTemplate = { width: 0, height: 0, data: [] };
    
    const details = $('details');
    const previewCanvas = $('previewCanvas');
    if (details) details.style.display = 'none';
    if (previewCanvas) previewCanvas.style.display = 'none';
};

export const loadUserSelectList = () => {
    if (!userSelectList) return;
    
    clearElement(userSelectList);
    
    loadUsers((users) => {
        if (Object.keys(users).length === 0) {
            userSelectList.innerHTML = '<span>No users added. Please add a user first.</span>';
            return;
        }
        
        for (const id of Object.keys(users)) {
            const userDiv = createElement('div', 'user-select-item', '');
            const checkbox = createElement('input', '', '');
            checkbox.type = 'checkbox';
            checkbox.id = `user_${id}`;
            checkbox.name = 'user_checkbox';
            checkbox.value = id;
            
            const label = createElement('label', '', `${sanitizeInput(users[id].name)} (#${id})`);
            label.htmlFor = `user_${id}`;
            
            userDiv.appendChild(checkbox);
            userDiv.appendChild(label);
            userSelectList.appendChild(userDiv);
        }
    });
};

const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!validateFileUpload(file, ['image/png'])) {
        return;
    }
    
    if (templateName) {
        templateName.value = file.name.replace(/\.[^/.]+$/, '');
    }
    
    processImageFile(file, (template) => {
        currentTemplate = template;
        drawTemplate(template, templateCanvas);
        
        if (size) setText(size, `${template.width}x${template.height}px`);
        if (ink) setText(ink, template.ink);
        if (templateCanvas) templateCanvas.style.display = 'block';
        if (previewCanvas) previewCanvas.style.display = 'none';
        if (details) details.style.display = 'block';
        
        // Update color grid for image-specific colors
        if (template.uniqueColors && template.uniqueColors.length > 0) {
            // This would need to be imported from color-ordering module
            // updateColorGridForImage(template.uniqueColors);
        }
    });
};

const handlePreviewCanvas = async () => {
    const txVal = parseInt(tx.value, 10);
    const tyVal = parseInt(ty.value, 10);
    const pxVal = parseInt(px.value, 10);
    const pyVal = parseInt(py.value, 10);
    
    if (isNaN(txVal) || isNaN(tyVal) || isNaN(pxVal) || isNaN(pyVal) || currentTemplate.width === 0) {
        showMessage('Error', 'Please convert an image and enter valid coordinates before previewing.');
        return;
    }
    
    try {
        await fetchCanvas(txVal, tyVal, pxVal, pyVal, currentTemplate.width, currentTemplate.height, previewBorder);
    } catch (error) {
        console.error('Failed to fetch canvas preview:', error);
    }
};
