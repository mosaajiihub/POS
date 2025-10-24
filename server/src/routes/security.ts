import express from 'express'
import { SecurityController } from '../controllers/securityController'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { auditSecurity } from '../middleware/auditMiddleware'

const router = express.Router()

/**
 * @route GET /api/security/status
 * @desc Get security status overview
 * @access Admin only
 */
router.get('/status', requireAdmin, SecurityController.getSecurityStatus)

/**
 * @route POST /api/security/backup
 * @desc Create secure backup
 * @access Admin only
 */
router.post('/backup', 
  requireAdmin, 
  auditSecurity('BACKUP_CREATE', 'system'),
  SecurityController.createBackup
)

/**
 * @route POST /api/security/restore
 * @desc Restore from secure backup
 * @access Admin only
 */
router.post('/restore', 
  requireAdmin, 
  auditSecurity('BACKUP_RESTORE', 'system'),
  SecurityController.restoreBackup
)

/**
 * @route GET /api/security/gdpr/export/:userId
 * @desc Export user data for GDPR compliance
 * @access Admin only
 */
router.get('/gdpr/export/:userId', 
  requireAdmin, 
  auditSecurity('GDPR_EXPORT', 'users'),
  SecurityController.exportUserDataGDPR
)

/**
 * @route DELETE /api/security/gdpr/delete/:userId
 * @desc Delete user data for GDPR compliance
 * @access Admin only
 */
router.delete('/gdpr/delete/:userId', 
  requireAdmin, 
  auditSecurity('GDPR_DELETE', 'users'),
  SecurityController.deleteUserDataGDPR
)

/**
 * @route GET /api/security/retention
 * @desc Get data retention policy
 * @access Admin only
 */
router.get('/retention', requireAdmin, SecurityController.getDataRetentionPolicy)

/**
 * @route PUT /api/security/retention
 * @desc Update data retention policy
 * @access Admin only
 */
router.put('/retention', 
  requireAdmin, 
  auditSecurity('RETENTION_POLICY_UPDATE', 'system_settings'),
  SecurityController.updateDataRetentionPolicy
)

/**
 * @route POST /api/security/integrity/validate
 * @desc Validate data integrity
 * @access Admin only
 */
router.post('/integrity/validate', 
  requireAdmin, 
  auditSecurity('DATA_INTEGRITY_CHECK', 'system'),
  SecurityController.validateDataIntegrity
)

/**
 * @route POST /api/security/encrypt/pii/:userId
 * @desc Encrypt user PII data
 * @access Admin only
 */
router.post('/encrypt/pii/:userId', 
  requireAdmin, 
  auditSecurity('PII_ENCRYPTION', 'users'),
  SecurityController.encryptUserPII
)

export default router