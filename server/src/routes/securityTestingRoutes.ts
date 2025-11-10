import { Router } from 'express'
import { SASTController } from '../controllers/sastController'
import { DASTController } from '../controllers/dastController'
import { PenetrationTestingController } from '../controllers/penetrationTestingController'
import { SecurityTestingIntegrationController } from '../controllers/securityTestingIntegrationController'
import { authenticateToken, requirePermission } from '../middleware/auth'

const router = Router()

// SAST Routes
router.post('/sast/scan', authenticateToken, requirePermission('security:test'), SASTController.runScan)
router.get('/sast/scan/:scanId', authenticateToken, requirePermission('security:view'), SASTController.getScanResults)
router.post('/sast/issues/:issueId/false-positive', authenticateToken, requirePermission('security:manage'), SASTController.markFalsePositive)
router.post('/sast/rules', authenticateToken, requirePermission('security:manage'), SASTController.addCustomRule)
router.get('/sast/rules', authenticateToken, requirePermission('security:view'), SASTController.getDefaultRules)
router.get('/sast/config', authenticateToken, requirePermission('security:view'), SASTController.getDefaultConfiguration)

// DAST Routes
router.post('/dast/scan', authenticateToken, requirePermission('security:test'), DASTController.runScan)
router.get('/dast/scan/:scanId', authenticateToken, requirePermission('security:view'), DASTController.getScanResults)
router.get('/dast/tests', authenticateToken, requirePermission('security:view'), DASTController.getDefaultTests)
router.post('/dast/vulnerabilities/:vulnerabilityId/verify', authenticateToken, requirePermission('security:test'), DASTController.verifyVulnerability)

// Penetration Testing Routes
router.post('/pentest/run', authenticateToken, requirePermission('security:test'), PenetrationTestingController.runPenTest)
router.get('/pentest/:testId', authenticateToken, requirePermission('security:view'), PenetrationTestingController.getTestResults)
router.get('/pentest/history', authenticateToken, requirePermission('security:view'), PenetrationTestingController.getTestHistory)

// Security Testing Integration Routes
router.post('/integration/test-suite', authenticateToken, requirePermission('security:test'), SecurityTestingIntegrationController.runTestSuite)
router.get('/integration/report/:reportId', authenticateToken, requirePermission('security:view'), SecurityTestingIntegrationController.getSecurityReport)
router.get('/integration/report/:reportId/export', authenticateToken, requirePermission('security:view'), SecurityTestingIntegrationController.exportReport)
router.get('/integration/dashboard', authenticateToken, requirePermission('security:view'), SecurityTestingIntegrationController.getSecurityDashboard)
router.get('/integration/metrics', authenticateToken, requirePermission('security:view'), SecurityTestingIntegrationController.getSecurityMetrics)
router.get('/integration/compliance', authenticateToken, requirePermission('security:view'), SecurityTestingIntegrationController.getComplianceStatus)

export default router
