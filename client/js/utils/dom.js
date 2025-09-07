/**
 * DOM Utilities - Helper functions for DOM manipulation
 */

/**
 * Get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null
 */
export const $ = (id) => document.getElementById(id);

/**
 * Get elements by class name
 * @param {string} className - Class name
 * @param {HTMLElement} parent - Parent element (optional)
 * @returns {HTMLCollection} Elements
 */
export const getByClass = (className, parent = document) => {
    return parent.getElementsByClassName(className);
};

/**
 * Get elements by selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional)
 * @returns {NodeList} Elements
 */
export const querySelectorAll = (selector, parent = document) => {
    return parent.querySelectorAll(selector);
};

/**
 * Get element by selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional)
 * @returns {HTMLElement|null} Element or null
 */
export const querySelector = (selector, parent = document) => {
    return parent.querySelector(selector);
};

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Element content
 * @returns {HTMLElement} Created element
 */
export const createElement = (tag, attributes = {}, content = '') => {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.keys(attributes).forEach(key => {
        if (key === 'className') {
            element.className = attributes[key];
        } else if (key === 'innerHTML') {
            element.innerHTML = attributes[key];
        } else if (key === 'textContent') {
            element.textContent = attributes[key];
        } else {
            element.setAttribute(key, attributes[key]);
        }
    });
    
    // Set content
    if (content) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        }
    }
    
    return element;
};

/**
 * Add event listener with automatic cleanup
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 * @returns {Function} Cleanup function
 */
export const addEventListener = (element, event, handler, options = {}) => {
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => {
        element.removeEventListener(event, handler, options);
    };
};

/**
 * Show element
 * @param {HTMLElement} element - Element to show
 * @param {string} display - Display style (default: 'block')
 */
export const show = (element, display = 'block') => {
    if (element) {
        element.style.display = display;
    }
};

/**
 * Hide element
 * @param {HTMLElement} element - Element to hide
 */
export const hide = (element) => {
    if (element) {
        element.style.display = 'none';
    }
};

/**
 * Toggle element visibility
 * @param {HTMLElement} element - Element to toggle
 * @param {string} display - Display style when showing (default: 'block')
 */
export const toggle = (element, display = 'block') => {
    if (element) {
        element.style.display = element.style.display === 'none' ? display : 'none';
    }
};

/**
 * Add class to element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to add
 */
export const addClass = (element, className) => {
    if (element) {
        element.classList.add(className);
    }
};

/**
 * Remove class from element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to remove
 */
export const removeClass = (element, className) => {
    if (element) {
        element.classList.remove(className);
    }
};

/**
 * Toggle class on element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 */
export const toggleClass = (element, className) => {
    if (element) {
        element.classList.toggle(className);
    }
};

/**
 * Check if element has class
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean} True if element has class
 */
export const hasClass = (element, className) => {
    return element ? element.classList.contains(className) : false;
};

/**
 * Set element text content
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content
 */
export const setText = (element, text) => {
    if (element) {
        element.textContent = text;
    }
};

/**
 * Set element HTML content
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content
 */
export const setHTML = (element, html) => {
    if (element) {
        element.innerHTML = html;
    }
};

/**
 * Get element value
 * @param {HTMLElement} element - Target element
 * @returns {string} Element value
 */
export const getValue = (element) => {
    return element ? element.value : '';
};

/**
 * Set element value
 * @param {HTMLElement} element - Target element
 * @param {string} value - Value to set
 */
export const setValue = (element, value) => {
    if (element) {
        element.value = value;
    }
};

/**
 * Clear element value
 * @param {HTMLElement} element - Target element
 */
export const clearValue = (element) => {
    if (element) {
        element.value = '';
    }
};

/**
 * Disable element
 * @param {HTMLElement} element - Target element
 */
export const disable = (element) => {
    if (element) {
        element.disabled = true;
    }
};

/**
 * Enable element
 * @param {HTMLElement} element - Target element
 */
export const enable = (element) => {
    if (element) {
        element.disabled = false;
    }
};

/**
 * Remove element from DOM
 * @param {HTMLElement} element - Element to remove
 */
export const remove = (element) => {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
};

/**
 * Append child to element
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element
 */
export const appendChild = (parent, child) => {
    if (parent && child) {
        parent.appendChild(child);
    }
};

/**
 * Insert element before another element
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} newElement - Element to insert
 * @param {HTMLElement} referenceElement - Reference element
 */
export const insertBefore = (parent, newElement, referenceElement) => {
    if (parent && newElement && referenceElement) {
        parent.insertBefore(newElement, referenceElement);
    }
};

/**
 * Replace element with another element
 * @param {HTMLElement} oldElement - Element to replace
 * @param {HTMLElement} newElement - New element
 */
export const replaceWith = (oldElement, newElement) => {
    if (oldElement && newElement && oldElement.parentNode) {
        oldElement.parentNode.replaceChild(newElement, oldElement);
    }
};
