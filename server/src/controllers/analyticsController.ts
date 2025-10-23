import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { AnalyticsService, SalesAnalyticsFilters } from '../services/analyticsService'
import { logger } from '../utils/logger'

/**
 * Analytics Controller
 * Handles sales analytics, profit calculations, and reporting endpoints
 */
export class AnalyticsController {
  /**
   * Get sales metrics
   */
  static async getSalesMetrics(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        categoryId,
        productId,
        customerId,
        cashierId,
        paymentMethod,
        groupBy
      } = req.query

      const filters: SalesAnalyticsFilters = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        ...(categoryId && { categoryId: categoryId as string }),
        ...(productId && { productId: productId as string }),
        ...(customerId && { customerId: customerId as string }),
        ...(cashierId && { cashierId: cashierId as string }),
        ...(paymentMethod && { paymentMethod: paymentMethod as string }),
        ...(groupBy && { groupBy: groupBy as 'day' | 'week' | 'month' | 'year' })
      }

      const result = await AnalyticsService.getSalesMetrics(filters)

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get sales metrics controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get product analytics
   */
  static async getProductAnalytics(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        categoryId,
        productId,
        limit
      } = req.query

      const filters: SalesAnalyticsFilters = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        ...(categoryId && { categoryId: categoryId as string }),
        ...(productId && { productId: productId as string })
      }

      const result = await AnalyticsService.getProductAnalytics(filters)

      if (!result.success) {
        return res.status(400).json(result)
      }

      // Apply limit if specified
      if (limit && result.products) {
        result.products = result.products.slice(0, parseInt(limit as string))
      }

      res.json(result)
    } catch (error) {
      logger.error('Get product analytics controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get category analytics
   */
  static async getCategoryAnalytics(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        categoryId,
        limit
      } = req.query

      const filters: SalesAnalyticsFilters = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        ...(categoryId && { categoryId: categoryId as string })
      }

      const result = await AnalyticsService.getCategoryAnalytics(filters)

      if (!result.success) {
        return res.status(400).json(result)
      }

      // Apply limit if specified
      if (limit && result.categories) {
        result.categories = result.categories.slice(0, parseInt(limit as string))
      }

      res.json(result)
    } catch (error) {
      logger.error('Get category analytics controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get time series data
   */
  static async getTimeSeriesData(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        groupBy,
        categoryId,
        productId
      } = req.query

      const filters: SalesAnalyticsFilters = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        groupBy: (groupBy as 'day' | 'week' | 'month' | 'year') || 'day',
        ...(categoryId && { categoryId: categoryId as string }),
        ...(productId && { productId: productId as string })
      }

      const result = await AnalyticsService.getTimeSeriesData(filters)

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get time series data controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get comprehensive profit analysis
   */
  static async getProfitAnalysis(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        categoryId,
        productId
      } = req.query

      const filters: SalesAnalyticsFilters = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        ...(categoryId && { categoryId: categoryId as string }),
        ...(productId && { productId: productId as string })
      }

      const result = await AnalyticsService.getProfitAnalysis(filters)

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get profit analysis controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Export analytics data
   */
  static async exportData(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        type,
        format,
        startDate,
        endDate,
        categoryId,
        productId
      } = req.body

      const filters: SalesAnalyticsFilters = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ...(categoryId && { categoryId }),
        ...(productId && { productId })
      }

      const result = await AnalyticsService.generateExportData(type, filters, format)

      if (!result.success) {
        return res.status(400).json(result)
      }

      // Set appropriate headers for file download
      const contentType = this.getContentType(format)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${result.exportData!.filename}"`)

      // For now, return JSON data. In production, you would generate actual files
      res.json({
        success: true,
        message: 'Export data generated successfully',
        data: result.exportData!.data,
        filename: result.exportData!.filename,
        format: result.exportData!.format
      })
    } catch (error) {
      logger.error('Export data controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get content type for export format
   */
  private static getContentType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf'
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'csv':
        return 'text/csv'
      default:
        return 'application/json'
    }
  }
}

/**
 * Validation middleware for analytics endpoints
 */
export const analyticsValidation = {
  getSalesMetrics: [
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
      }),
    query('categoryId')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    query('productId')
      .optional()
      .isUUID()
      .withMessage('Product ID must be a valid UUID'),
    query('customerId')
      .optional()
      .isUUID()
      .withMessage('Customer ID must be a valid UUID'),
    query('cashierId')
      .optional()
      .isUUID()
      .withMessage('Cashier ID must be a valid UUID'),
    query('paymentMethod')
      .optional()
      .isIn(['CASH', 'CARD', 'DIGITAL', 'CREDIT'])
      .withMessage('Payment method must be one of: CASH, CARD, DIGITAL, CREDIT'),
    query('groupBy')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Group by must be one of: day, week, month, year')
  ],

  getProductAnalytics: [
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
      }),
    query('categoryId')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    query('productId')
      .optional()
      .isUUID()
      .withMessage('Product ID must be a valid UUID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getCategoryAnalytics: [
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
      }),
    query('categoryId')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getTimeSeriesData: [
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
      }),
    query('groupBy')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Group by must be one of: day, week, month, year'),
    query('categoryId')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    query('productId')
      .optional()
      .isUUID()
      .withMessage('Product ID must be a valid UUID')
  ],

  getProfitAnalysis: [
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
      }),
    query('categoryId')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    query('productId')
      .optional()
      .isUUID()
      .withMessage('Product ID must be a valid UUID')
  ],

  exportData: [
    body('type')
      .isIn(['sales', 'products', 'categories', 'profit'])
      .withMessage('Type must be one of: sales, products, categories, profit'),
    body('format')
      .isIn(['pdf', 'excel', 'csv'])
      .withMessage('Format must be one of: pdf, excel, csv'),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        const startDate = new Date(req.body?.startDate)
        const end = new Date(endDate)
        if (end <= startDate) {
          throw new Error('End date must be after start date')
        }
        return true
      }),
    body('categoryId')
      .optional()
      .isUUID()
      .withMessage('Category ID must be a valid UUID'),
    body('productId')
      .optional()
      .isUUID()
      .withMessage('Product ID must be a valid UUID')
  ]
}