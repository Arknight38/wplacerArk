import { log } from '../utils/logger.js';
import { userService } from './user-service.js';

export class QueueProcessor {
    constructor(templateService) {
        this.templateService = templateService;
        this.templateQueue = [];
        this.activeTemplateUsers = new Set();
    }

    addToQueue(templateId) {
        if (!this.templateQueue.includes(templateId)) {
            this.templateQueue.push(templateId);
            const template = this.templateService.getTemplate(templateId);
            if (template) {
                template.status = 'Queued';
                log('SYSTEM', 'wplacer', `[${template.name}] Template queued as its users are busy.`);
            }
        }
    }

    removeFromQueue(templateId) {
        const idx = this.templateQueue.indexOf(templateId);
        if (idx > -1) {
            this.templateQueue.splice(idx, 1);
        }
    }

    isUserBusy(userId) {
        return this.activeTemplateUsers.has(userId);
    }

    markUserActive(userId) {
        this.activeTemplateUsers.add(userId);
    }

    markUserInactive(userId) {
        this.activeTemplateUsers.delete(userId);
    }

    markUsersActive(userIds) {
        userIds.forEach(id => this.activeTemplateUsers.add(id));
    }

    markUsersInactive(userIds) {
        userIds.forEach(id => this.activeTemplateUsers.delete(id));
    }

    areUsersAvailable(userIds) {
        return !userIds.some(id => this.activeTemplateUsers.has(id));
    }

    processQueue() {
        for (let i = 0; i < this.templateQueue.length; i++) {
            const templateId = this.templateQueue[i];
            const manager = this.templateService.getTemplate(templateId);
            
            if (!manager) {
                this.templateQueue.splice(i, 1);
                i--;
                continue;
            }

            const busy = manager.userIds.some(id => this.activeTemplateUsers.has(id));
            if (!busy) {
                this.templateQueue.splice(i, 1);
                manager.userIds.forEach(id => this.activeTemplateUsers.add(id));
                manager.start().catch(e => 
                    log(templateId, manager.masterName, 'Error starting queued template', e)
                );
                break;
            }
        }
    }

    startTemplate(templateId) {
        const manager = this.templateService.getTemplate(templateId);
        if (!manager) {
            throw new Error('Template not found');
        }

        if (manager.running) {
            return; // Already running
        }

        const busy = manager.userIds.some(uid => this.activeTemplateUsers.has(uid));
        if (busy) {
            this.addToQueue(templateId);
        } else {
            this.markUsersActive(manager.userIds);
            const users = userService.getAll();
            const activeBrowserUsers = new Set(); // Empty for now
            manager.start(users, activeBrowserUsers, this.activeTemplateUsers).catch(e => 
                log(templateId, manager.masterName, 'Error starting template', e)
            );
        }
    }

    stopTemplate(templateId) {
        const manager = this.templateService.getTemplate(templateId);
        if (!manager) {
            throw new Error('Template not found');
        }

        if (manager.running) {
            log('SYSTEM', 'wplacer', `[${manager.name}] Template stopped by user.`);
            manager.running = false;
        }

        this.removeFromQueue(templateId);
        this.markUsersInactive(manager.userIds);
        this.processQueue(); // Always process queue after stopping
    }

    getQueueStatus() {
        return {
            queueLength: this.templateQueue.length,
            activeUsers: Array.from(this.activeTemplateUsers),
            queuedTemplates: this.templateQueue.map(id => {
                const template = this.templateService.getTemplate(id);
                return {
                    id,
                    name: template?.name || 'Unknown',
                    userIds: template?.userIds || []
                };
            })
        };
    }
}

export let queueProcessor; // Will be initialized with templateService