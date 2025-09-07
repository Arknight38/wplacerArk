/**
 * DOM utility functions
 */
export const $ = (id) => document.getElementById(id);

export const createElement = (tag, className = '', innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};

export const showElement = (element) => {
    if (element) element.style.display = 'block';
};

export const hideElement = (element) => {
    if (element) element.style.display = 'none';
};

export const toggleElement = (element) => {
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
};

export const addClass = (element, className) => {
    if (element) element.classList.add(className);
};

export const removeClass = (element, className) => {
    if (element) element.classList.remove(className);
};

export const toggleClass = (element, className) => {
    if (element) element.classList.toggle(className);
};

export const setText = (element, text) => {
    if (element) element.textContent = text;
};

export const setHTML = (element, html) => {
    if (element) element.innerHTML = html;
};

export const clearElement = (element) => {
    if (element) element.innerHTML = '';
};

export const escapeHtml = (str) => {
    return str.replace(/[&<>"']/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return charsToReplace[tag] || tag;
    });
};
