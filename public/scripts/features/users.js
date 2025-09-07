/**
 * User management functionality
 */
import { $, createElement, setText } from '../utils/dom.js';
import { api, loadUsers } from '../utils/api.js';
import { showMessage, showConfirmation, showLoading, hideLoading } from '../utils/ui.js';
import { validateUserData, sanitizeInput } from '../utils/validation.js';

const userForm = $('userForm');
const jcookie = $('jcookie');
const scookie = $('scookie');
const userList = $('userList');
const checkUserStatus = $('checkUserStatus');
const totalCharges = $('totalCharges');
const totalMaxCharges = $('totalMaxCharges');
const totalDroplets = $('totalDroplets');
const totalPPH = $('totalPPH');
const manageUsersTitle = $('manageUsersTitle');

export const initializeUserManagement = () => {
    if (userForm) {
        userForm.addEventListener('submit', handleUserSubmit);
    }
    
    if (checkUserStatus) {
        checkUserStatus.addEventListener('click', handleCheckUserStatus);
    }
};

const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    let jValue = jcookie.value.trim();

    if (!jValue) {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                jcookie.value = text;
                jValue = text.trim();
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            showMessage('Clipboard Error', 'Could not read from clipboard. Please paste the cookie manually.');
            return;
        }
    }

    if (!validateUserData(jValue)) {
        return;
    }

    try {
        showLoading(submitUser, 'Adding User...');
        
        const response = await api.post('/user', { 
            cookies: { 
                s: sanitizeInput(scookie.value), 
                j: sanitizeInput(jValue) 
            } 
        });
        
        showMessage('Success', `Logged in as ${response.name} (#${response.id})!`);
        userForm.reset();
        loadUsersList();
        
    } catch (error) {
        console.error('Failed to add user:', error);
    } finally {
        hideLoading(submitUser);
    }
};

const handleCheckUserStatus = async () => {
    if (!checkUserStatus) return;
    
    showLoading(checkUserStatus, 'Checking...');
    
    const userElements = Array.from(document.querySelectorAll('.user'));
    userElements.forEach((userEl) => {
        const infoSpans = userEl.querySelectorAll('.user-info > span');
        infoSpans.forEach((span) => (span.style.color = 'var(--warning-color)'));
    });

    let totalCurrent = 0;
    let totalMax = 0;
    let totalDropletsCount = 0;
    let successfulAccounts = 0;

    try {
        const statuses = await api.post('/users/status');

        for (const userEl of userElements) {
            const id = userEl.id.split('-')[1];
            const status = statuses[id];

            const infoSpans = userEl.querySelectorAll('.user-info > span');
            const currentChargesEl = userEl.querySelector('.user-stats b:nth-of-type(1)');
            const maxChargesEl = userEl.querySelector('.user-stats b:nth-of-type(2)');
            const currentLevelEl = userEl.querySelector('.user-stats b:nth-of-type(3)');
            const dropletsEl = userEl.querySelector('.user-stats b:nth-of-type(4)');
            const levelProgressEl = userEl.querySelector('.level-progress');

            if (status && status.success) {
                const userInfo = status.data;
                const charges = Math.floor(userInfo.charges.count);
                const max = userInfo.charges.max;
                const level = Math.floor(userInfo.level);
                const progress = Math.round((userInfo.level % 1) * 100);

                if (currentChargesEl) currentChargesEl.textContent = charges;
                if (maxChargesEl) maxChargesEl.textContent = max;
                if (currentLevelEl) currentLevelEl.textContent = level;
                if (dropletsEl) dropletsEl.textContent = userInfo.droplets.toLocaleString();
                if (levelProgressEl) levelProgressEl.textContent = `(${progress}%)`;
                
                totalCurrent += charges;
                totalMax += max;
                totalDropletsCount += userInfo.droplets;
                successfulAccounts++;

                infoSpans.forEach((span) => (span.style.color = 'var(--success-color)'));
            } else {
                if (currentChargesEl) currentChargesEl.textContent = 'ERR';
                if (maxChargesEl) maxChargesEl.textContent = 'ERR';
                if (currentLevelEl) currentLevelEl.textContent = '?';
                if (dropletsEl) dropletsEl.textContent = 'ERR';
                if (levelProgressEl) levelProgressEl.textContent = '(?%)';
                infoSpans.forEach((span) => (span.style.color = 'var(--error-color)'));
            }
        }
    } catch (error) {
        console.error('Failed to check user status:', error);
        userElements.forEach((userEl) => {
            const infoSpans = userEl.querySelectorAll('.user-info > span');
            infoSpans.forEach((span) => (span.style.color = 'var(--error-color)'));
        });
    }

    if (totalCharges) setText(totalCharges, totalCurrent);
    if (totalMaxCharges) setText(totalMaxCharges, totalMax);
    if (totalDroplets) setText(totalDroplets, totalDropletsCount.toLocaleString());
    const pph = successfulAccounts * 120; // 1 pixel per 30s = 2 per min = 120 per hour
    if (totalPPH) setText(totalPPH, pph.toLocaleString());

    hideLoading(checkUserStatus);
};

export const loadUsersList = () => {
    if (!userList) return;
    
    userList.innerHTML = '';
    if (userForm) userForm.reset();
    
    setText(totalCharges, '?');
    setText(totalMaxCharges, '?');
    setText(totalDroplets, '?');
    setText(totalPPH, '?');
    
    loadUsers((users) => {
        const userCount = Object.keys(users).length;
        if (manageUsersTitle) {
            manageUsersTitle.textContent = `Existing Users (${userCount})`;
        }
        
        for (const id of Object.keys(users)) {
            const userElement = createUserElement(users[id], id);
            userList.appendChild(userElement);
        }
    });
};

const createUserElement = (user, id) => {
    const userElement = createElement('div', 'user', '');
    userElement.id = `user-${id}`;

    userElement.innerHTML = `
        <div class="user-info">
            <span>${sanitizeInput(user.name)}</span>
            <span>(#${id})</span>
            <div class="user-stats">
                Charges: <b>?</b>/<b>?</b> | Level <b>?</b> <span class="level-progress">(?%)</span><br>
                Droplets: <b>?</b>
            </div>
        </div>
        <div class="user-actions">
            <button class="delete-btn" title="Delete User"><img src="icons/remove.svg"></button>
            <button class="info-btn" title="Get User Info"><img src="icons/code.svg"></button>
        </div>`;

    const deleteBtn = userElement.querySelector('.delete-btn');
    const infoBtn = userElement.querySelector('.info-btn');

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            showConfirmation(
                'Delete User',
                `Are you sure you want to delete ${sanitizeInput(user.name)} (#${id})? This will also remove them from all templates.`,
                async () => {
                    try {
                        await api.delete(`/user/${id}`);
                        showMessage('Success', 'User deleted.');
                        loadUsersList();
                    } catch (error) {
                        console.error('Failed to delete user:', error);
                    }
                }
            );
        });
    }

    if (infoBtn) {
        infoBtn.addEventListener('click', async () => {
            try {
                const response = await api.get(`/user/status/${id}`);
                const info = `
                    <b>User Name:</b> <span style="color: #f97a1f;">${sanitizeInput(response.name)}</span><br>
                    <b>Charges:</b> <span style="color: #f97a1f;">${Math.floor(response.charges.count)}</span>/<span style="color: #f97a1f;">${response.charges.max}</span><br>
                    <b>Droplets:</b> <span style="color: #f97a1f;">${response.droplets}</span><br>
                    <b>Favorite Locations:</b> <span style="color: #f97a1f;">${response.favoriteLocations.length}</span>/<span style="color: #f97a1f;">${response.maxFavoriteLocations}</span><br>
                    <b>Flag Equipped:</b> <span style="color: #f97a1f;">${response.equippedFlag ? 'Yes' : 'No'}</span><br>
                    <b>Discord:</b> <span style="color: #f97a1f;">${sanitizeInput(response.discord)}</span><br>
                    <b>Country:</b> <span style="color: #f97a1f;">${sanitizeInput(response.country)}</span><br>
                    <b>Pixels Painted:</b> <span style="color: #f97a1f;">${response.pixelsPainted}</span><br>
                    <b>Extra Colors:</b> <span style="color: #f97a1f;">${response.extraColorsBitmap}</span><br>
                    <b>Alliance ID:</b> <span style="color: #f97a1f;">${response.allianceId}</span><br>
                    <b>Alliance Role:</b> <span style="color: #f97a1f;">${response.allianceRole}</span><br>
                    <br>Would you like to copy the <b>Raw Json</b> to your clipboard?
                `;

                showConfirmation('User Info', info, () => {
                    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
                });
            } catch (error) {
                console.error('Failed to get user info:', error);
            }
        });
    }

    return userElement;
};
