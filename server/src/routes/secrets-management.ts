import express from 'express';
import * as secretsManagementController from '../controllers/secretsManagementController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Secret Storage
router.post('/secrets', secretsManagementController.storeSecret);
router.get('/secrets/:secretId', secretsManagementController.retrieveSecret);
router.delete('/secrets/:secretId', secretsManagementController.deleteSecret);

// Secret Rotation
router.post('/secrets/:secretId/rotate', secretsManagementController.rotateSecret);
router.get('/secrets/rotation/check', secretsManagementController.checkRotation);
router.post('/secrets/rotation/auto', secretsManagementController.autoRotate);

// Audit Logging
router.get('/secrets/:secretId/logs', secretsManagementController.getAccessLogs);

// Secret Scanning
router.post('/secrets/scan', secretsManagementController.scanForLeaks);

export default router;
