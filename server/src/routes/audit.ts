import express from 'express'
import { AuditController } from '../controllers/auditController'
import { requireAuth, requireAdmin, requireManager } from '../middleware/auth'

const router = express.Router()

/**
 * @route GET /api/audit/logs
 * @desc Get audit logs with filtering and pagination
 * @access Admin, Manager
 */
router.get('/logs', requireManager, AuditController.getAuditLogs)

/**
 * @route GET /api/audit/security
 * @desc Get security-related audit logs
 * @access Admin only
 */
router.get('/security', requireAdmin, AuditController.getSecurityLogs)

/**
 * @route GET /api/audit/users/:userId
 * @desc Get audit logs for specific user
 * @access Admin, Manager
 */
router.get('/users/:userId', requireManager, AuditController.getUserActivity)

/**
 * @route GET /api/audit/statistics
 * @desc Get audit statistics for dashboard
 * @access Admin, Manager
 */
router.get('/statistics', requireManager, AuditController.getAuditStatistics)

/**
 * @route GET /api/audit/export
 * @desc Export audit logs
 * @access Admin only
 */
router.get('/export', requireAdmin, AuditController.exportAuditLogs)

/**
 * @route GET /api/audit/retention
 * @desc Get data retention settings
 * @access Admin only
 */
router.get('/retention', requireAdmin, AuditController.getRetentionSettings)

/**
 * @route PUT /api/audit/retention
 * @desc Update data retention settings
 * @access Admin only
 */
router.put('/retention', requireAdmin, AuditController.updateRetentionSettings)

/**
 * @route POST /api/audit/cleanup
 * @desc Cleanup old audit logs
 * @access Admin only
 */
router.post('/cleanup', requireAdmin, AuditController.cleanupOldLogs)

export default router