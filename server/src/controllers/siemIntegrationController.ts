import { Request, Response } from 'express'
import { SIEMIntegrationService } from '../services/siemIntegrationService'
import { logger } from '../utils/logger'

/**
 * SIEM Integration Controller
 * Handles SIEM integration and security analytics endpoints
 */
export class SIEMIntegrationController {
  /**
   * Get security analytics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const { timeRange = 24 } = req.query
      const analytics = await SIEMIntegrationService.generateAnalytics(parseInt(timeRange as string))

      res.json({
        success: true,
        data: analytics
      })
    } catch (error) {
      logger.error('Get analytics error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving analytics'
        }
      })
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(req: Request, res: Response) {
    try {
      const { reportType, startDate, endDate } = req.body

      if (!reportType || !startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Report type, start date, and end date are required'
          }
        })
      }

      const validReportTypes = ['PCI_DSS', 'GDPR', 'SOC2', 'HIPAA', 'ISO27001']
      if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REPORT_TYPE',
            message: `Report type must be one of: ${validReportTypes.join(', ')}`
          }
        })
      }

      const report = await SIEMIntegrationService.generateComplianceReport(
        reportType,
        new Date(startDate),
        new Date(endDate)
      )

      res.json({
        success: true,
        data: { report }
      })
    } catch (error) {
      logger.error('Generate compliance report error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating compliance report'
        }
      })
    }
  }

  /**
   * Get audit trail
   */
  static async getAuditTrail(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Start date and end date are required'
          }
        })
      }

      const auditTrail = await SIEMIntegrationService.getAuditTrail(
        new Date(startDate as string),
        new Date(endDate as string)
      )

      res.json({
        success: true,
        data: { auditTrail, count: auditTrail.length }
      })
    } catch (error) {
      logger.error('Get audit trail error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving audit trail'
        }
      })
    }
  }

  /**
   * Export security metrics
   */
  static async exportMetrics(req: Request, res: Response) {
    try {
      const { format = 'json' } = req.query

      if (!['json', 'csv', 'pdf'].includes(format as string)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be one of: json, csv, pdf'
          }
        })
      }

      const metrics = await SIEMIntegrationService.exportMetrics(format as any)

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=security-metrics.csv')
        res.send(metrics)
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'attachment; filename=security-metrics.pdf')
        res.json(metrics) // In production, send actual PDF
      } else {
        res.json({
          success: true,
          data: metrics
        })
      }
    } catch (error) {
      logger.error('Export metrics error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while exporting metrics'
        }
      })
    }
  }

  /**
   * Send event to SIEM
   */
  static async sendEvent(req: Request, res: Response) {
    try {
      const event = req.body

      if (!event) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Event data is required'
          }
        })
      }

      await SIEMIntegrationService.sendEvent(event)

      res.json({
        success: true,
        message: 'Event sent to SIEM successfully'
      })
    } catch (error) {
      logger.error('Send SIEM event error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while sending event to SIEM'
        }
      })
    }
  }
}
