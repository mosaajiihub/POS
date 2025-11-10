import express from 'express'
import { SIEMIntegrationController } from '../controllers/siemIntegrationController'
import { requireAuth, requireManager } from '../middleware/auth'
import { auditSecurity } from '../middleware/auditMiddleware'

const router = express.Router()

/**
 * Get security analytics
 * @route GET /api/siem/analytics
 * @access Manager, Admin
 */
router.get('/analytics', requireManager, SIEMIntegrationController.getAnalytics)

/**
 * Generate compliance report
 * @route POST /api/siem/compliance-report
 * @access Manager, Admin
 */
router.post(
  '/compliance-report',
  requireManager,
  auditSecurity('COMPLIANCE_REPORT_GENERATE', 'compliance'),
  SIEMIntegrationController.generateComplianceReport
)

/**
 * Get audit trail
 * @route GET /api/siem/audit-trail
 * @access Manager, Admin
 */
router.get('/audit-trail', requireManager, SIEMIntegrationController.getAuditTrail)

/**
 * Export security metrics
 * @route GET /api/siem/export
 * @access Manager, Admin
 */
router.get(
  '/export',
  requireManager,
  auditSecurity('METRICS_EXPORT', 'security'),
  SIEMIntegrationController.exportMetrics
)

/**
 * Send event to SIEM
 * @route POST /api/siem/events
 * @access Manager, Admin
 */
router.post(
  '/events',
  requireManager,
  auditSecurity('SIEM_EVENT_SEND', 'security'),
  SIEMIntegrationController.sendEvent
)

export default router
