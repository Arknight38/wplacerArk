/**
 * Logs viewer functionality
 */
import { $, escapeHtml } from '../utils/dom.js';
import { api } from '../utils/api.js';

let logsWs = null;
let logsMode = 'logs';
let allLogLines = [];
let filterText = '';
let filterType = '';

const logsContainer = $('logsContainer');
const logsSearchInput = $('logsSearchInput');
const logsTypeFilter = $('logsTypeFilter');
const logsExportBtn = $('logsExportBtn');
const showLogsBtn = $('showLogsBtn');
const showErrorsBtn = $('showErrorsBtn');
const clearLogsBtn = $('clearLogsBtn');

export const startLogsViewer = () => {
    logsMode = 'logs';
    if (logsContainer) {
        logsContainer.innerHTML = '<span class="logs-placeholder">Connecting to log stream...</span>';
    }
    connectLogsWs();
};

export const stopLogsViewer = () => {
    if (logsWs) {
        if (typeof logsWs.close === 'function') {
            logsWs.close();
        } else {
            clearInterval(logsWs);
        }
        logsWs = null;
    }
};

const connectLogsWs = async () => {
    if (logsWs) {
        if (typeof logsWs.close === 'function') {
            logsWs.close();
        } else {
            clearInterval(logsWs);
        }
    }
    
    if (logsContainer) {
        logsContainer.innerHTML = '<span class="logs-placeholder">Loading logs...</span>';
    }
    
    try {
        // Use HTTP endpoint instead of WebSocket for now
        const endpoint = logsMode === 'errors' ? '/logs/errors' : '/logs';
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        allLogLines = text.split('\n').filter(line => line.trim());
        
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
        
        renderFilteredLogs();
        
        // Set up polling for updates
        startLogPolling();
        
    } catch (error) {
        console.error('Failed to load logs:', error);
        if (logsContainer) {
            logsContainer.innerHTML = '<span class="logs-placeholder">Failed to load logs. Please try again.</span>';
        }
    }
};

const startLogPolling = () => {
    // Poll for updates every 2 seconds
    if (logsWs) {
        clearInterval(logsWs);
    }
    
    logsWs = setInterval(async () => {
        try {
            const endpoint = logsMode === 'errors' ? '/logs/errors' : '/logs';
            const response = await fetch(endpoint);
            
            if (response.ok) {
                const text = await response.text();
                const newLines = text.split('\n').filter(line => line.trim());
                
                if (newLines.length !== allLogLines.length) {
                    allLogLines = newLines;
                    renderFilteredLogs();
                }
            }
        } catch (error) {
            console.error('Failed to poll logs:', error);
        }
    }, 2000);
};

const getFilteredLogs = () => {
    let filtered = allLogLines;
    const currentFilterType = filterType;
    const currentFilterText = filterText;

    if (currentFilterType) {
        filtered = filtered.filter(line => {
            if (currentFilterType === 'error') return /error|fail|exception|critical|\bERR\b|\bSRV_ERR\b/i.test(line);
            if (currentFilterType === 'warn') return /warn|deprecated|slow|timeout/i.test(line);
            if (currentFilterType === 'success') return /success|started|running|ok|ready|listening|connected/i.test(line);
            if (currentFilterType === 'info') return /info|log|notice|\bOK\b/i.test(line);
            return true;
        });
    }
    
    if (currentFilterText) {
        const f = currentFilterText.toLowerCase();
        filtered = filtered.filter(line => line.toLowerCase().includes(f));
    }
    
    return filtered;
};

const renderFilteredLogs = () => {
    if (!logsContainer) return;
    
    const filtered = getFilteredLogs();
    logsContainer.innerHTML = filtered.map(renderLogLines).join('\n');
    logsContainer.scrollTop = logsContainer.scrollHeight;
};

const renderLogLines = (text) => {
    return text.split(/\r?\n/).filter(Boolean).map(line => {
        let cls = 'log-line';
        if (/error|fail|exception|critical|\bERR\b|\bSRV_ERR\b/i.test(line)) cls += ' error';
        else if (/warn|deprecated|slow|timeout/i.test(line)) cls += ' warn';
        else if (/success|started|running|ok|ready|listening|connected/i.test(line)) cls += ' success';
        else if (/info|log|notice|\bOK\b/i.test(line)) cls += ' info';
        return `<span class="${cls}">${escapeHtml(line)}</span>`;
    }).join('\n');
};

const exportLogs = () => {
    const filtered = getFilteredLogs();
    // Redact user discriminator: (Name#12345678) => (Name#REDACTED)
    const redacted = filtered.map(line => line.replace(/\(([^#()]+)#\d{5,}\)/g, '($1#REDACTED)'));
    const blob = new Blob([redacted.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = logsMode + '-export.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
};

export const initializeLogsViewer = () => {
    if (logsSearchInput) {
        logsSearchInput.addEventListener('input', (e) => {
            filterText = e.target.value;
            renderFilteredLogs();
        });
    }
    
    if (logsTypeFilter) {
        logsTypeFilter.addEventListener('change', (e) => {
            filterType = e.target.value;
            renderFilteredLogs();
        });
    }
    
    if (logsExportBtn) {
        logsExportBtn.addEventListener('click', exportLogs);
    }
    
    if (showLogsBtn) {
        showLogsBtn.addEventListener('click', () => {
            logsMode = 'logs';
            if (logsContainer) {
                logsContainer.innerHTML = '<span class="logs-placeholder">Switching to logs...</span>';
            }
            connectLogsWs();
        });
    }
    
    if (showErrorsBtn) {
        showErrorsBtn.addEventListener('click', () => {
            logsMode = 'errors';
            if (logsContainer) {
                logsContainer.innerHTML = '<span class="logs-placeholder">Switching to errors...</span>';
            }
            connectLogsWs();
        });
    }
    
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            if (logsContainer) {
                logsContainer.innerHTML = '';
            }
        });
    }
};
