import { USERS_FILE, MS } from '../config/constants.js';
import { loadJSON, saveJSON } from '../utils/file-ops.js';
import { WPlacer } from '../core/wplacer-client.js';
import { log, logUserError } from '../utils/logger.js';

class UserService {
    constructor() {
        this.users = loadJSON(USERS_FILE);
        this.activeBrowserUsers = new Set();
    }

    getAll() {
        return { ...this.users };
    }

    get(id) {
        return this.users[id];
    }

    async add(cookies, expirationDate) {
        if (!cookies || !cookies.j) {
            throw new Error('Invalid cookies provided');
        }

        const wplacer = new WPlacer({});
        const userInfo = await wplacer.login(cookies);
        
        this.users[userInfo.id] = {
            name: userInfo.name,
            cookies: cookies,
            expirationDate: expirationDate,
        };
        
        this.save();
        return userInfo;
    }

    delete(userId) {
        if (!userId || !this.users[userId]) {
            throw new Error('User not found');
        }

        const deletedName = this.users[userId].name;
        delete this.users[userId];
        this.save();
        
        log('SYSTEM', 'Users', `🗑️ Deleted user ${deletedName}#${userId}.`);
        return { id: userId, name: deletedName };
    }

    async validateCookie(userId) {
        if (!this.users[userId] || this.activeBrowserUsers.has(userId)) {
            throw new Error('User not found or busy');
        }

        this.activeBrowserUsers.add(userId);
        const wplacer = new WPlacer({});
        
        try {
            const userInfo = await wplacer.login(this.users[userId].cookies);
            return userInfo;
        } catch (error) {
            logUserError(error, userId, this.users[userId].name, 'validate cookie');
            throw error;
        } finally {
            this.activeBrowserUsers.delete(userId);
        }
    }

    async validateAllCookies() {
        const userIds = Object.keys(this.users);
        const results = {};
        const USER_TIMEOUT_MS = MS.THIRTY_SEC;

        const withTimeout = (promise, ms, label) =>
            Promise.race([
                promise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`${label} timeout`)), ms)
                )
            ]);

        const checkUser = async (id) => {
            if (this.activeBrowserUsers.has(id)) {
                results[id] = { success: false, error: 'User is busy.' };
                return;
            }

            this.activeBrowserUsers.add(id);
            const wplacer = new WPlacer({});
            
            try {
                const userInfo = await wplacer.login(this.users[id].cookies);
                results[id] = { success: true, data: userInfo };
            } catch (error) {
                logUserError(error, id, this.users[id].name, 'bulk check');
                results[id] = { success: false, error: error.message };
            } finally {
                this.activeBrowserUsers.delete(id);
            }
        };

        for (const uid of userIds) {
            try {
                await withTimeout(checkUser(uid), USER_TIMEOUT_MS, `user ${uid}`);
            } catch (err) {
                results[uid] = { success: false, error: err.message };
            }
        }

        return results;
    }

    isUserBusy(userId) {
        return this.activeBrowserUsers.has(userId);
    }

    markUserBusy(userId) {
        this.activeBrowserUsers.add(userId);
    }

    markUserFree(userId) {
        this.activeBrowserUsers.delete(userId);
    }

    save() {
        saveJSON(USERS_FILE, this.users);
    }

    updateSuspension(userId, suspendedUntil) {
        if (this.users[userId]) {
            this.users[userId].suspendedUntil = suspendedUntil;
            this.save();
        }
    }

    isSuspended(userId) {
        const user = this.users[userId];
        return user && user.suspendedUntil && Date.now() < user.suspendedUntil;
    }
}

export const userService = new UserService();