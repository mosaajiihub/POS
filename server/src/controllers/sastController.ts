import { Request, Response } from 'express'
import { SASTService, SASTConfiguration } from '../services/sastService'
import { logger } from '../utils/logger'

/**
 * SAST Controller
 * Handles static application security testing endpoints
 */
export class SASTController {
  /**
   * Run SAST scan
   */
  static async runScan(req: Request, res: Response) {
    try {
      const config: Partial<SASTConfiguration> = req.body.configuration

      const result = await SASTService.runScan(config)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('SAST scan error:', error)
      res.status(500).json({
        error: {
          code: 'SAST_SCAN_FAILED',
          message: 'Failed to run SAST scan'
        }
      })
    }
  }

  /**
   * Get SAST scan results
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
      logger.error('Get SAST results error:', error)
      res.status(500).json({
        error: {
          code: 'GET_RESULTS_FAILED',
          message: 'Failed to retrieve scan results'
        }
      })
    }
  }

  /**
   * Mark issue as false positive
   */
  static async markFalsePositive(req: Request, res: Response) {
    try {
      const { issueId } = req.params
      const { reason } = req.body

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      const success = await SASTService.markFalsePositive(issueId, req.user.userId, reason)

      if (!success) {
        return res.status(400).json({
          error: {
            code: 'MARK_FALSE_POSITIVE_FAILED',
            message: 'Failed to mark issue as false positive'
          }
        })
      }

      res.json({
        success: true,
        message: 'Issue marked as false positive'
      })
    } catch (error) {
      logger.error('Mark false positive error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred'
        }
      })
    }
  }

  /**
   * Add custom security rule
   */
  static async addCustomRule(req: Request, res: Response) {
    try {
      const rule = req.body

      if (!rule.id || !rule.name || !rule.pattern) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RULE',
            message: 'Rule must have id, name, and pattern'
          }
        })
      }

      const customRule = await SASTService.addCustomRule(rule)

      res.json({
        success: true,
        message: 'Custom rule added',
        data: customRule
      })
    } catch (error) {
      logger.error('Add custom rule error:', error)
      res.status(500).json({
        error: {
          code: 'ADD_RULE_FAILED',
          message: 'Failed to add custom rule'
        }
      })
    }
  }

  /**
   * Get default rules
   */
  static async getDefaultRules(req: Request, res: Response) {
    try {
      const rules = SASTService.getDefaultRules()

      res.json({
        success: true,
        data: rules
      })
    } catch (error) {
      logger.error('Get default rules error:', error)
      res.status(500).json({
        error: {
          code: 'GET_RULES_FAILED',
          message: 'Failed to retrieve default rules'
        }
      })
    }
  }

  /**
   * Get default configuration
   */
  static async getDefaultConfiguration(req: Request, res: Response) {
    try {
      const config = SASTService.getDefaultConfiguration()

      res.json({
        success: true,
        data: config
      })
    } catch (error) {
      logger.error('Get default configuration error:', error)
      res.status(500).json({
        error: {
          code: 'GET_CONFIG_FAILED',
          message: 'Failed to retrieve default configuration'
        }
      })
    }
  }
}
