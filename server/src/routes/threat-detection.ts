import express from 'express'
import { ThreatDetectionController } from '../controllers/threatDetectionController'
import { requireAuth, requireManager } from '../middleware/auth'

const router = express.Router()

/**
 * Detect statistical anomalies
 * @route GET /api/threat-detection/anomalies
 * @access Manager, Admin
 */
router.get('/anomalies', requireManager, ThreatDetectionController.detectAnomalies)

/**
 * Analyze user behavior
 * @route POST /api/threat-detection/behavior/:userId
 * @access Manager, Admin
 */
router.post('/behavior/:userId', requireManager, ThreatDetectionController.analyzeBehavior)

/**
 * Perform threat hunting
 * @route GET /api/threat-detection/hunt/:huntType
 * @access Manager, Admin
 */
router.get('/hunt/:huntType', requireManager, ThreatDetectionController.performThreatHunting)

/**
 * Detect signature-based threats
 * @route POST /api/threat-detection/signatures
 * @access Manager, Admin
 */
router.post('/signatures', requireManager, ThreatDetectionController.detectSignatureThreats)

export default router
