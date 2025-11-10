import { Request, Response } from 'express'
import { SecurityDashboardService } from '../services/securityDashboardService'
import { logger } from '../utils/logger'

/**
 * Security Dashboard Controller
 * Handles real-time security monitoring dashboard endpoints
 */
export class SecurityDashboardController {
  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(req: Request, res: Response) {
    try {
      const { timeRange = 24 } = req.query
      const metrics = await SecurityDashboardService.getDashboardMetrics(parseInt(timeRange as string))

      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      logger.error('Get dashboard metrics error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving dashboard metrics'
        }
      })
    }
  }

  /**
   * Get security KPIs
   */
  static async getSecurityKPIs(req: Request, res: Response) {
    try {
      const { timeRange = 24 } = req.query
      const startDate = new Date(Date.now() - parseInt(timeRange as string) * 60 * 60 * 1000)
      const previousStartDate = new Date(startDate.getTime() - parseInt(timeRange as string) * 60 * 60 * 1000)

      const kpis = await SecurityDashboardService.calculateSecurityKPIs(startDate, previousStartDate)

      res.json({
        success: true,
        data: { kpis }
      })
    } catch (error) {
      logger.error('Get security KPIs error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security KPIs'
        }
      })
    }
  }

  /**
   * Get real-time alerts
   */
  static async getRealTimeAlerts(req: Request, res: Response) {
    try {
      const alerts = await SecurityDashboardService.getRealTimeAlerts()

      res.json({
        success: true,
        data: { alerts }
      })
    } catch (error) {
      logger.error('Get real-time alerts error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving real-time alerts'
        }
      })
    }
  }

  /**
   * Get threat intelligence
   */
  static async getThreatIntelligence(req: Request, res: Response) {
    try {
      const threatIntel = await SecurityDashboardService.getThreatIntelligence()

      res.json({
        success: true,
        data: { threats: threatIntel }
      })
    } catch (error) {
      logger.error('Get threat intelligence error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving threat intelligence'
        }
      })
    }
  }

  /**
   * Get event correlations
   */
  static async getEventCorrelations(req: Request, res: Response) {
    try {
      const { timeRange = 24 } = req.query
      const startDate = new Date(Date.now() - parseInt(timeRange as string) * 60 * 60 * 1000)

      const correlations = await SecurityDashboardService.correlateSecurityEvents(startDate)

      res.json({
        success: true,
        data: { correlations }
      })
    } catch (error) {
      logger.error('Get event correlations error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving event correlations'
        }
      })
    }
  }
}
