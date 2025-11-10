import express from 'express'
import { SecurityDashboardController } from '../controllers/securityDashboardController'
import { requireAuth, requireManager } from '../middleware/auth'

const router = express.Router()

/**
 * Get comprehensive dashboard metrics
 * @route GET /api/security-dashboard/metrics
 * @access Manager, Admin
 */
router.get('/metrics', requireManager, SecurityDashboardController.getDashboardMetrics)

/**
 * Get security KPIs
 * @route GET /api/security-dashboard/kpis
 * @access Manager, Admin
 */
router.get('/kpis', requireManager, SecurityDashboardController.getSecurityKPIs)

/**
 * Get real-time alerts
 * @route GET /api/security-dashboard/alerts/realtime
 * @access Manager, Admin
 */
router.get('/alerts/realtime', requireManager, SecurityDashboardController.getRealTimeAlerts)

/**
 * Get threat intelligence
 * @route GET /api/security-dashboard/threat-intelligence
 * @access Manager, Admin
 */
router.get('/threat-intelligence', requireManager, SecurityDashboardController.getThreatIntelligence)

/**
 * Get event correlations
 * @route GET /api/security-dashboard/correlations
 * @access Manager, Admin
 */
router.get('/correlations', requireManager, SecurityDashboardController.getEventCorrelations)

export default router
