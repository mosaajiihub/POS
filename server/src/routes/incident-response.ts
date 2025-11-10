import express from 'express'
import { IncidentResponseController } from '../controllers/incidentResponseController'
import { requireAuth, requireManager } from '../middleware/auth'
import { auditSecurity } from '../middleware/auditMiddleware'

const router = express.Router()

/**
 * Get all incidents
 * @route GET /api/incident-response/incidents
 * @access Manager, Admin
 */
router.get('/incidents', requireManager, IncidentResponseController.getAllIncidents)

/**
 * Get incident by ID
 * @route GET /api/incident-response/incidents/:incidentId
 * @access Manager, Admin
 */
router.get('/incidents/:incidentId', requireManager, IncidentResponseController.getIncident)

/**
 * Create incident from security event
 * @route POST /api/incident-response/incidents
 * @access Manager, Admin
 */
router.post(
  '/incidents',
  requireManager,
  auditSecurity('INCIDENT_CREATE', 'incidents'),
  IncidentResponseController.createIncident
)

/**
 * Update incident status
 * @route PATCH /api/incident-response/incidents/:incidentId/status
 * @access Manager, Admin
 */
router.patch(
  '/incidents/:incidentId/status',
  requireManager,
  auditSecurity('INCIDENT_STATUS_UPDATE', 'incidents'),
  IncidentResponseController.updateIncidentStatus
)

/**
 * Trigger automated response
 * @route POST /api/incident-response/incidents/:incidentId/response
 * @access Manager, Admin
 */
router.post(
  '/incidents/:incidentId/response',
  requireManager,
  auditSecurity('INCIDENT_RESPONSE_TRIGGER', 'incidents'),
  IncidentResponseController.triggerResponse
)

export default router
