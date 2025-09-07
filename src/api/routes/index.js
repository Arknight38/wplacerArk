import express from 'express';
import userRoutes from './users.js';
import templateRoutes from './templates.js';
import settingsRoutes from './settings.js';
import colorRoutes from './colors.js';
import systemRoutes from './system.js';

const router = express.Router();

// Mount all route modules
router.use('/users', userRoutes);
router.use('/templates', templateRoutes);
router.use('/settings', settingsRoutes);
router.use('/colors', colorRoutes);
router.use('/system', systemRoutes);

export default router;