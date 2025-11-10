import { Request, Response } from 'express'
import { IncidentResponseService, IncidentStatus } from '../services/incidentResponseService'
import { logger } from '../utils/logger'

/**
 * Incident Response Controller
 * Handles incident response automation endpoints
 */
export class IncidentResponseController {
  /**
   * Get all incidents
   */
  static async getAllIncidents(req: Request, res: Response) {
    try {
      const { status, severity, classification } = req.query

      const filters: any = {}
      if (status) filters.status = status
      if (severity) filters.severity = severity
      if (classification) filters.classification = classification

      const incidents = await IncidentResponseService.getAllIncidents(filters)

      res.json({
        success: true,
        data: { incidents, count: incidents.length }
      })
    } catch (error) {
      logger.error('Get all incidents error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving incidents'
        }
      })
    }
  }

  /**
   * Get incident by ID
   */
  static async getIncident(req: Request, res: Response) {
    try {
      const { incidentId } = req.params

      const incident = await IncidentResponseService.getIncident(incidentId)

      if (!incident) {
        return res.status(404).json({
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found'
          }
        })
      }

      res.json({
        success: true,
        data: { incident }
      })
    } catch (error) {
      logger.error('Get incident error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving incident'
        }
      })
    }
  }

  /**
   * Create incident from security event
   */
  static async createIncident(req: Request, res: Response) {
    try {
      const securityEvent = req.body

      if (!securityEvent) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Security event data is required'
          }
        })
      }

      const incident = await IncidentResponseService.detectIncident(securityEvent)

      if (!incident) {
        return res.json({
          success: true,
          message: 'Event not significant enough to create incident'
        })
      }

      res.status(201).json({
        success: true,
        data: { incident }
      })
    } catch (error) {
      logger.error('Create incident error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating incident'
        }
      })
    }
  }

  /**
   * Update incident status
   */
  static async updateIncidentStatus(req: Request, res: Response) {
    try {
      const { incidentId } = req.params
      const { status } = req.body

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      if (!status) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Status is required'
          }
        })
      }

      const validStatuses = Object.values(IncidentStatus)
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${validStatuses.join(', ')}`
          }
        })
      }

      const success = await IncidentResponseService.updateIncidentStatus(
        incidentId,
        status,
        req.user.userId
      )

      if (!success) {
        return res.status(404).json({
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found'
          }
        })
      }

      res.json({
        success: true,
        message: 'Incident status updated successfully'
      })
    } catch (error) {
      logger.error('Update incident status error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating incident status'
        }
      })
    }
  }

  /**
   * Trigger automated response for incident
   */
  static async triggerResponse(req: Request, res: Response) {
    try {
      const { incidentId } = req.params

      const incident = await IncidentResponseService.getIncident(incidentId)

      if (!incident) {
        return res.status(404).json({
          error: {
            code: 'INCIDENT_NOT_FOUND',
            message: 'Incident not found'
          }
        })
      }

      await IncidentResponseService.triggerAutomatedResponse(incident)

      res.json({
        success: true,
        message: 'Automated response triggered successfully'
      })
    } catch (error) {
      logger.error('Trigger response error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while triggering response'
        }
      })
    }
  }
}
