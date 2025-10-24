import express from 'express'
import { SecurityMonitoringController } from '../controllers/securityMonitoringController'
import { requireAuth, requireAdmin, requireManager } from '../middleware/auth'
import { auditSecurity } from '../middleware/auditMiddleware'

const router = express.Router()

/**
 * @route GET /api/security-monitoring/metrics
 * @desc Get security metrics for dashboard
 * @access Admin, Manager
 */
router.get('/metrics', requireManager, SecurityMonitoringController.getSecurityMetrics)

/**
 * @route GET /api/security-monitoring/sessions
 * @desc Get active sessions
 * @access Admin only
 */
router.get('/sessions', requireAdmin, SecurityMonitoringController.getActiveSessions)

/**
 * @route DELETE /api/security-monitoring/sessions/:sessionId
 * @desc Terminate a session
 * @access Admin only
 */
router.delete('/sessions/:sessionId', 
  requireAdmin, 
  auditSecurity('SESSION_TERMINATE', 'sessions'),
  SecurityMonitoringController.terminateSession
)

/**
 * @route POST /api/security-monitoring/block-ip
 * @desc Block IP address
 * @access Admin only
 */
router.post('/block-ip', 
  requireAdmin, 
  auditSecurity('IP_BLOCK', 'security'),
  SecurityMonitoringController.blockIPAddress
)

/**
 * @route GET /api/security-monitoring/lockout-status
 * @desc Check if IP/email combination is locked out
 * @access Admin, Manager
 */
router.get('/lockout-status', requireManager, SecurityMonitoringController.checkLockoutStatus)

/**
 * @route POST /api/security-monitoring/clear-attempts
 * @desc Clear failed login attempts
 * @access Admin only
 */
router.post('/clear-attempts', 
  requireAdmin, 
  auditSecurity('CLEAR_FAILED_ATTEMPTS', 'security'),
  SecurityMonitoringController.clearFailedAttempts
)

/**
 * @route GET /api/security-monitoring/events
 * @desc Get security events
 * @access Admin, Manager
 */
router.get('/events', requireManager, SecurityMonitoringController.getSecurityEvents)

/**
 * @route GET /api/security-monitoring/alerts
 * @desc Get security alerts
 * @access Admin, Manager
 */
router.get('/alerts', requireManager, SecurityMonitoringController.getSecurityAlerts)

/**
 * @route POST /api/security-monitoring/alerts/:alertId/acknowledge
 * @desc Acknowledge security alert
 * @access Admin, Manager
 */
router.post('/alerts/:alertId/acknowledge', 
  requireManager, 
  auditSecurity('ALERT_ACKNOWLEDGE', 'security_alerts'),
  SecurityMonitoringController.acknowledgeAlert
)

/**
 * @route GET /api/security-monitoring/failed-logins
 * @desc Get failed login attempts
 * @access Admin, Manager
 */
router.get('/failed-logins', requireManager, SecurityMonitoringController.getFailedLoginAttempts)

export default router