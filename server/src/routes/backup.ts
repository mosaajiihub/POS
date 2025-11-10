import { Router } from 'express'
import { BackupController } from '../controllers/backupController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Backup routes
router.post('/backups', authenticateToken, BackupController.createBackup)
router.get('/backups', authenticateToken, BackupController.listBackups)
router.get('/backups/:backupId', authenticateToken, BackupController.getBackup)
router.post('/backups/:backupId/verify', authenticateToken, BackupController.verifyBackup)
router.delete('/backups/:backupId', authenticateToken, BackupController.deleteBackup)

// Backup alerts
router.get('/backups/alerts', authenticateToken, BackupController.getAlerts)
router.post('/backups/alerts/:alertId/acknowledge', authenticateToken, BackupController.acknowledgeAlert)

// Offsite backup routes
router.post('/backups/:backupId/offsite', authenticateToken, BackupController.uploadOffsite)
router.get('/offsite-backups', authenticateToken, BackupController.listOffsiteBackups)

// Disaster recovery routes
router.post('/disaster-recovery/plans', authenticateToken, BackupController.createRecoveryPlan)
router.get('/disaster-recovery/plans', authenticateToken, BackupController.listRecoveryPlans)
router.post('/disaster-recovery/plans/:planId/execute', authenticateToken, BackupController.executeRecoveryPlan)
router.post('/disaster-recovery/plans/:planId/test', authenticateToken, BackupController.testRecoveryPlan)
router.get('/disaster-recovery/executions/:executionId', authenticateToken, BackupController.getExecution)
router.get('/disaster-recovery/tests', authenticateToken, BackupController.getTestResults)

export default router
