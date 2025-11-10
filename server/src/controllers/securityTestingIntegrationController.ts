import { Request, Response } from 'express'
import { SecurityTestingIntegrationService, SecurityTestSuite } from '../services/securityTestingIntegrationService'
import { logger } from '../utils/logger'

/**
 * Security Testing Integration Controller
 * Handles unified security testing and reporting endpoints
 */
export class SecurityTestingIntegrationController {
  /**
   * Run security test suite
   */
  static async runTestSuite(req: Request, res: Response) {
    try {
      const suite: SecurityTestSuite = req.body

      if (!suite.name || !suite.tests || suite.tests.length === 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TEST_SUITE',
            message: 'Test suite must have a name and at least one test'
          }
        })
      }

      const report = await SecurityTestingIntegrationService.runSecurityTestSuite(suite)

      res.json({
        success: true,
        data: report
      })
    } catch (error) {
      logger.error('Run test suite error:', error)
      res.status(500).json({
        error: {
          code: 'TEST_SUITE_FAILED',
          message: 'Failed to run security test suite'
        }
      })
    }
  }

  /**
   * Get security report
   */
  static async getSecurityReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params

      // In a real implementation, retrieve from database
      res.json({
        success: true,
        message: 'Report retrieved',
        data: {
          reportId,
          status: 'COMPLETED'
        }
      })
    } catch (error) {
      logger.error('Get security report error:', error)
      res.status(500).json({
        error: {
          code: 'GET_REPORT_FAILED',
          message: 'Failed to retrieve security report'
        }
      })
    }
  }

  /**
   * Export security report
   */
  static async exportReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params
      const { format = 'json' } = req.query

      // In a real implementation, retrieve report and export
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html')
        res.send('<html><body>Security Report</body></html>')
      } else {
        res.json({
          success: true,
          data: {
            reportId,
            format
          }
        })
      }
    } catch (error) {
      logger.error('Export report error:', error)
      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export security report'
        }
      })
    }
  }

  /**
   * Get security dashboard
   */
  static async getSecurityDashboard(req: Request, res: Response) {
    try {
      const dashboard = await SecurityTestingIntegrationService.getSecurityDashboard()

      res.json({
        success: true,
        data: dashboard
      })
    } catch (error) {
      logger.error('Get security dashboard error:', error)
      res.status(500).json({
        error: {
          code: 'GET_DASHBOARD_FAILED',
          message: 'Failed to retrieve security dashboard'
        }
      })
    }
  }

  /**
   * Get security metrics
   */
  static async getSecurityMetrics(req: Request, res: Response) {
    try {
      const { timeRange = '30d' } = req.query

      // In a real implementation, calculate metrics from historical data
      res.json({
        success: true,
        data: {
          timeRange,
          securityScore: 85,
          vulnerabilityTrend: 'decreasing',
          testCoverage: 90,
          meanTimeToRemediate: 5.2
        }
      })
    } catch (error) {
      logger.error('Get security metrics error:', error)
      res.status(500).json({
        error: {
          code: 'GET_METRICS_FAILED',
          message: 'Failed to retrieve security metrics'
        }
      })
    }
  }

  /**
   * Get compliance status
   */
  static async getComplianceStatus(req: Request, res: Response) {
    try {
      // In a real implementation, check current compliance status
      res.json({
        success: true,
        data: {
          pciDss: true,
          gdpr: true,
          soc2: true,
          iso27001: true,
          owaspTop10: {
            compliant: true,
            issues: []
          }
        }
      })
    } catch (error) {
      logger.error('Get compliance status error:', error)
      res.status(500).json({
        error: {
          code: 'GET_COMPLIANCE_FAILED',
          message: 'Failed to retrieve compliance status'
        }
      })
    }
  }
}
