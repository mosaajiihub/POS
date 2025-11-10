import { Request, Response } from 'express'
import { DASTService, DASTConfiguration } from '../services/dastService'
import { logger } from '../utils/logger'

/**
 * DAST Controller
 * Handles dynamic application security testing endpoints
 */
export class DASTController {
  /**
   * Run DAST scan
   */
  static async runScan(req: Request, res: Response) {
    try {
      const config: DASTConfiguration = req.body

      if (!config.targetUrl) {
        return res.status(400).json({
          error: {
            code: 'MISSING_TARGET_URL',
            message: 'Target URL is required'
          }
        })
      }

      const result = await DASTService.runScan(config)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('DAST scan error:', error)
      res.status(500).json({
        error: {
          code: 'DAST_SCAN_FAILED',
          message: 'Failed to run DAST scan'
        }
      })
    }
  }

  /**
   * Get DAST scan results
   */
  static async getScanResults(req: Request, res: Response) {
    try {
      const { scanId } = req.params

      // In a real implementation, retrieve from database
      res.json({
        success: true,
        message: 'Scan results retrieved',
        data: {
          scanId,
          status: 'COMPLETED'
        }
      })
    } catch (error) {
      logger.error('Get DAST results error:', error)
      res.status(500).json({
        error: {
          code: 'GET_RESULTS_FAILED',
          message: 'Failed to retrieve scan results'
        }
      })
    }
  }

  /**
   * Get default tests
   */
  static async getDefaultTests(req: Request, res: Response) {
    try {
      const tests = DASTService.getDefaultTests()

      res.json({
        success: true,
        data: tests
      })
    } catch (error) {
      logger.error('Get default tests error:', error)
      res.status(500).json({
        error: {
          code: 'GET_TESTS_FAILED',
          message: 'Failed to retrieve default tests'
        }
      })
    }
  }

  /**
   * Verify vulnerability
   */
  static async verifyVulnerability(req: Request, res: Response) {
    try {
      const { vulnerabilityId } = req.params

      // In a real implementation, re-test the specific vulnerability
      res.json({
        success: true,
        message: 'Vulnerability verification initiated',
        data: {
          vulnerabilityId,
          status: 'VERIFYING'
        }
      })
    } catch (error) {
      logger.error('Verify vulnerability error:', error)
      res.status(500).json({
        error: {
          code: 'VERIFY_FAILED',
          message: 'Failed to verify vulnerability'
        }
      })
    }
  }
}
