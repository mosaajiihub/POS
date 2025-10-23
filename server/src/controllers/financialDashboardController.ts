import { Request, Response } from 'express'
import { query, validationResult } from 'express-validator'
import { FinancialDashboardService } from '../services/financialDashboardService'
import { logger } from '../utils/logger'

/**
 * Financial Dashboard Controller
 * Handles comprehensive financial dashboard endpoints
 */
export class FinancialDashboardController {
  /**
   * Get comprehensive financial dashboard data
   */
  static async getDashboardData(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { startDate, endDate } = req.query

      const result = await FinancialDashboardService.getDashboardData({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      })

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get financial dashboard data controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }
}

/**
 * Validation middleware for financial dashboard endpoints
 */
export const financialDashboardValidation = {
  getDashboardData: [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        const startDate = new Date(req.query?.startDate as string)
        const end = new Date(endDate)
        if (end <= startDate) {
          throw new Error('End date must be after start date')
        }
        return true
      })
  ]
}