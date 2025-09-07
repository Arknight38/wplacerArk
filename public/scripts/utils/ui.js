/**
 * UI utility functions
 */
import { $, addClass, removeClass, hideElement, showElement } from './dom.js';

let confirmCallback = null;

export const showMessage = (title, content) => {
    const messageBoxTitle = $('messageBoxTitle');
    const messageBoxContent = $('messageBoxContent');
    const messageBoxCancel = $('messageBoxCancel');
    const messageBoxConfirm = $('messageBoxConfirm');
    const messageBoxOverlay = $('messageBoxOverlay');

    if (messageBoxTitle) messageBoxTitle.innerHTML = title;
    if (messageBoxContent) messageBoxContent.innerHTML = content;
    if (messageBoxCancel) addClass(messageBoxCancel, 'hidden');
    if (messageBoxConfirm) messageBoxConfirm.textContent = 'OK';
    if (messageBoxOverlay) removeClass(messageBoxOverlay, 'hidden');
    
    confirmCallback = null;
};

export const showConfirmation = (title, content, onConfirm) => {
    const messageBoxTitle = $('messageBoxTitle');
    const messageBoxContent = $('messageBoxContent');
    const messageBoxCancel = $('messageBoxCancel');
    const messageBoxConfirm = $('messageBoxConfirm');
    const messageBoxOverlay = $('messageBoxOverlay');

    if (messageBoxTitle) messageBoxTitle.innerHTML = title;
    if (messageBoxContent) messageBoxContent.innerHTML = content;
    if (messageBoxCancel) removeClass(messageBoxCancel, 'hidden');
    if (messageBoxConfirm) messageBoxConfirm.textContent = 'Confirm';
    if (messageBoxOverlay) removeClass(messageBoxOverlay, 'hidden');
    
    confirmCallback = onConfirm;
};

export const closeMessageBox = () => {
    const messageBoxOverlay = $('messageBoxOverlay');
    if (messageBoxOverlay) addClass(messageBoxOverlay, 'hidden');
    confirmCallback = null;
};

export const showLoading = (element, text = 'Loading...') => {
    if (element) {
        element.disabled = true;
        const originalText = element.innerHTML;
        element.innerHTML = text;
        element.dataset.originalText = originalText;
    }
};

export const hideLoading = (element) => {
    if (element && element.dataset.originalText) {
        element.disabled = false;
        element.innerHTML = element.dataset.originalText;
        delete element.dataset.originalText;
    }
};

export const setButtonState = (button, state) => {
    if (!button) return;
    
    const states = {
        loading: () => {
            button.disabled = true;
            button.classList.add('loading');
        },
        success: () => {
            button.disabled = false;
            button.classList.remove('loading');
            button.classList.add('success');
            setTimeout(() => button.classList.remove('success'), 2000);
        },
        error: () => {
            button.disabled = false;
            button.classList.remove('loading');
            button.classList.add('error');
            setTimeout(() => button.classList.remove('error'), 2000);
        },
        normal: () => {
            button.disabled = false;
            button.classList.remove('loading', 'success', 'error');
        }
    };
    
    if (states[state]) states[state]();
};

// Initialize message box event listeners
export const initializeMessageBox = () => {
    const messageBoxConfirm = $('messageBoxConfirm');
    const messageBoxCancel = $('messageBoxCancel');

    if (messageBoxConfirm) {
        messageBoxConfirm.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeMessageBox();
        });
    }

    if (messageBoxCancel) {
        messageBoxCancel.addEventListener('click', () => {
            closeMessageBox();
        });
    }
};
