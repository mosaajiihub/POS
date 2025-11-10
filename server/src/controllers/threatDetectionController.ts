import { Request, Response } from 'express'
import { ThreatDetectionService } from '../services/threatDetectionService'
import { logger } from '../utils/logger'

/**
 * Threat Detection Controller
 * Handles automated threat detection endpoints
 */
export class ThreatDetectionController {
  /**
   * Detect statistical anomalies
   */
  static async detectAnomalies(req: Request, res: Response) {
    try {
      const { timeRange = 24 } = req.query
      const anomalies = await ThreatDetectionService.detectStatisticalAnomalies(parseInt(timeRange as string))

      res.json({
        success: true,
        data: { anomalies, count: anomalies.length }
      })
    } catch (error) {
      logger.error('Detect anomalies error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while detecting anomalies'
        }
      })
    }
  }

  /**
   * Analyze user behavior
   */
  static async analyzeBehavior(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const currentActivity = req.body

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'User ID is required'
          }
        })
      }

      const anomaly = await ThreatDetectionService.analyzeBehavior(userId, currentActivity)

      res.json({
        success: true,
        data: {
          anomalyDetected: anomaly !== null,
          anomaly
        }
      })
    } catch (error) {
      logger.error('Analyze behavior error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while analyzing behavior'
        }
      })
    }
  }

  /**
   * Perform threat hunting
   */
  static async performThreatHunting(req: Request, res: Response) {
    try {
      const { huntType } = req.params

      if (!huntType) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Hunt type is required'
          }
        })
      }

      const validHuntTypes = ['credential_stuffing', 'privilege_escalation', 'data_exfiltration', 'lateral_movement']
      if (!validHuntTypes.includes(huntType)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_HUNT_TYPE',
            message: `Hunt type must be one of: ${validHuntTypes.join(', ')}`
          }
        })
      }

      const result = await ThreatDetectionService.performThreatHunting(huntType)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Perform threat hunting error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while performing threat hunting'
        }
      })
    }
  }

  /**
   * Detect signature-based threats
   */
  static async detectSignatureThreats(req: Request, res: Response) {
    try {
      const { input } = req.body
      const context = {
        userId: req.user?.userId || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }

      if (!input) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Input is required'
          }
        })
      }

      const threats = await ThreatDetectionService.detectSignatureBasedThreats(input, context)

      res.json({
        success: true,
        data: {
          threatsDetected: threats.length > 0,
          threats
        }
      })
    } catch (error) {
      logger.error('Detect signature threats error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while detecting threats'
        }
      })
    }
  }
}
