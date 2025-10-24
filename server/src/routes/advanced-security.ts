import express from 'express'
import { AdvancedSecurityController } from '../controllers/advancedSecurityController'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { auditSecurity } from '../middleware/auditMiddleware'

const router = express.Router()

/**
 * @route GET /api/advanced-security/dashboard
 * @desc Get security dashboard data
 * @access Admin only
 */
router.get('/dashboard', requireAdmin, AdvancedSecurityController.getSecurityDashboard)

/**
 * @route POST /api/advanced-security/vulnerability-assessment
 * @desc Perform vulnerability assessment
 * @access Admin only
 */
router.post('/vulnerability-assessment', 
  requireAdmin, 
  auditSecurity('VULNERABILITY_ASSESSMENT', 'security'),
  AdvancedSecurityController.performVulnerabilityAssessment
)

/**
 * @route POST /api/advanced-security/security-scan
 * @desc Perform security scan
 * @access Admin only
 */
router.post('/security-scan', 
  requireAdmin, 
  auditSecurity('SECURITY_SCAN', 'security'),
  AdvancedSecurityController.performSecurityScan
)

/**
 * @route GET /api/advanced-security/threat-intelligence
 * @desc Get threat intelligence data
 * @access Admin only
 */
router.get('/threat-intelligence', requireAdmin, AdvancedSecurityController.getThreatIntelligence)

/**
 * @route POST /api/advanced-security/analyze-request
 * @desc Analyze request for intrusion attempts (testing)
 * @access Admin only
 */
router.post('/analyze-request', 
  requireAdmin, 
  auditSecurity('REQUEST_ANALYSIS', 'security'),
  AdvancedSecurityController.analyzeRequest
)

/**
 * @route GET /api/advanced-security/scan-history
 * @desc Get security scan history
 * @access Admin only
 */
router.get('/scan-history', requireAdmin, AdvancedSecurityController.getSecurityScanHistory)

/**
 * @route GET /api/advanced-security/vulnerabilities/:vulnerabilityId
 * @desc Get vulnerability details
 * @access Admin only
 */
router.get('/vulnerabilities/:vulnerabilityId', requireAdmin, AdvancedSecurityController.getVulnerabilityDetails)

/**
 * @route PUT /api/advanced-security/vulnerabilities/:vulnerabilityId/status
 * @desc Update vulnerability status
 * @access Admin only
 */
router.put('/vulnerabilities/:vulnerabilityId/status', 
  requireAdmin, 
  auditSecurity('VULNERABILITY_STATUS_UPDATE', 'vulnerabilities'),
  AdvancedSecurityController.updateVulnerabilityStatus
)

/**
 * @route GET /api/advanced-security/intrusion-attempts
 * @desc Get intrusion attempts
 * @access Admin only
 */
router.get('/intrusion-attempts', requireAdmin, AdvancedSecurityController.getIntrusionAttempts)

/**
 * @route GET /api/advanced-security/settings
 * @desc Get security settings
 * @access Admin only
 */
router.get('/settings', requireAdmin, AdvancedSecurityController.getSecuritySettings)

/**
 * @route PUT /api/advanced-security/settings
 * @desc Configure security settings
 * @access Admin only
 */
router.put('/settings', 
  requireAdmin, 
  auditSecurity('SECURITY_SETTINGS_UPDATE', 'system_settings'),
  AdvancedSecurityController.configureSecuritySettings
)

export default router