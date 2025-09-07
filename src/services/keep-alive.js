import { WPlacer } from '../core/wplacer-client.js';
import { log, logUserError } from '../utils/logger.js';
import { sleep } from '../utils/time.js';

export class KeepAliveService {
    constructor(userService, templateService) {
        this.userService = userService;
        this.templateService = templateService;
    }

    async runKeepAlive() {
        log('SYSTEM', 'KeepAlive', 'Starting hourly keep-alive check...');

        const trulyActiveUserIds = new Set();
        const templates = this.templateService.getAllTemplates();
        
        for (const templateId in templates) {
            const manager = templates[templateId];
            if (manager.running && manager.status !== 'Monitoring for changes.') {
                manager.userIds.forEach((id) => trulyActiveUserIds.add(id));
            }
        }

        const users = this.userService.getAll();
        const allUserIds = Object.keys(users);
        const usersToCheck = allUserIds.filter((id) => !trulyActiveUserIds.has(id));

        if (usersToCheck.length === 0) {
            log('SYSTEM', 'KeepAlive', 'No idle or anti-grief users to check. All users are in active painting cycles.');
            return;
        }

        log('SYSTEM', 'KeepAlive', `Found ${usersToCheck.length} idle or anti-grief users to check out of ${allUserIds.length} total users.`);

        let successCount = 0;
        let failCount = 0;

        for (const id of usersToCheck) {
            if (users[id].suspendedUntil && Date.now() < users[id].suspendedUntil) {
                log(id, users[id].name, 'Keep-alive check skipped (account suspended).');
                continue;
            }

            const wplacer = new WPlacer({});
            try {
                // The login method performs a /me request, which is what we need
                await wplacer.login(users[id].cookies);
                log(id, users[id].name, 'Keep-alive check successful.');
                successCount++;
            } catch (error) {
                logUserError(error, id, users[id].name, 'keep-alive check');
                failCount++;
            }
            
            await sleep(2000); // Stagger requests to avoid rate-limiting
        }

        log('SYSTEM', 'KeepAlive', `Keep-alive check finished. Successful: ${successCount}, Failed: ${failCount}.`);
    }
}