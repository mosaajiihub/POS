import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { StockService } from '../services/stockService'
import { logger } from '../utils/logger'
import { MovementType } from '@prisma/client'

/**
 * Stock Management Controller
 * Handles HTTP requests for stock tracking and management operations
 */
export class StockController {
  /**
   * Get stock movements with filtering
   */
  static async getStockMovements(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const {
        productId,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query

      const filters = {
        productId: productId as string,
        type: type as MovementType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await StockService.getStockMovements(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_MOVEMENTS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        movements: result.movements,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get stock movements controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Adjust stock level for a product
   */
  static async adjustStock(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { productId } = req.params
      const { newStockLevel, reason } = req.body
      const userId = (req as any).user?.id || 'system'

      const result = await StockService.adjustStock(productId, newStockLevel, reason, userId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'ADJUST_STOCK_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        stockMovement: result.stockMovement
      })
    } catch (error) {
      logger.error('Adjust stock controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update stock (generic stock movement)
   */
  static async updateStock(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { productId, quantity, type, reason } = req.body
      const userId = (req as any).user?.id || 'system'

      const result = await StockService.updateStock({
        productId,
        quantity,
        type,
        reason,
        userId
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_STOCK_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        stockMovement: result.stockMovement
      })
    } catch (error) {
      logger.error('Update stock controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get low stock alerts
   */
  static async getLowStockAlerts(req: Request, res: Response) {
    try {
      const result = await StockService.getLowStockAlerts()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_ALERTS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        alerts: result.alerts
      })
    } catch (error) {
      logger.error('Get low stock alerts controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Generate stock report
   */
  static async generateStockReport(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { days = 30 } = req.query
      const result = await StockService.generateStockReport(parseInt(days as string))

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GENERATE_REPORT_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        report: result.report
      })
    } catch (error) {
      logger.error('Generate stock report controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update stock thresholds for a product
   */
  static async updateStockThresholds(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { productId } = req.params
      const { minStockLevel } = req.body

      const result = await StockService.updateStockThresholds(productId, minStockLevel)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_THRESHOLDS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Update stock thresholds controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Process sale and update stock
   */
  static async processSale(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { saleItems } = req.body

      const result = await StockService.processSale(saleItems)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PROCESS_SALE_FAILED',
            message: result.message,
            insufficientStock: result.insufficientStock
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Process sale controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }
}

/**
 * Validation rules for stock endpoints
 */
export const stockValidation = {
  getStockMovements: [
    query('productId')
      .optional()
      .isString()
      .withMessage('Product ID must be a string'),
    query('type')
      .optional()
      .isIn(['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE'])
      .withMessage('Invalid movement type'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  adjustStock: [
    param('productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required'),
    body('newStockLevel')
      .isInt({ min: 0 })
      .withMessage('New stock level must be a non-negative integer'),
    body('reason')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason is required and must be less than 500 characters')
  ],

  updateStock: [
    body('productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('type')
      .isIn(['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE'])
      .withMessage('Invalid movement type'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters')
  ],

  generateStockReport: [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],

  updateStockThresholds: [
    param('productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required'),
    body('minStockLevel')
      .isInt({ min: 0 })
      .withMessage('Minimum stock level must be a non-negative integer')
  ],

  processSale: [
    body('saleItems')
      .isArray({ min: 1 })
      .withMessage('Sale items must be a non-empty array'),
    body('saleItems.*.productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required for each sale item'),
    body('saleItems.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer for each sale item')
  ]
}