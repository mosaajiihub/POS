import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { TransactionService } from '../services/transactionService'
import { logger } from '../utils/logger'

/**
 * Transaction Controller
 * Handles HTTP requests for POS transaction operations
 */
export class TransactionController {
  /**
   * Create a new transaction
   */
  static async createTransaction(req: Request, res: Response) {
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

      const { customerId, items, paymentMethod, cashReceived } = req.body
      const cashierId = req.user!.userId

      const result = await TransactionService.createTransaction({
        customerId,
        cashierId,
        items,
        paymentMethod,
        cashReceived
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'TRANSACTION_CREATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        transaction: result.transaction
      })
    } catch (error) {
      logger.error('Create transaction controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(req: Request, res: Response) {
    try {
      const { transactionId } = req.params

      if (!transactionId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Transaction ID is required'
          }
        })
      }

      const result = await TransactionService.getTransaction(transactionId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        transaction: result.transaction
      })
    } catch (error) {
      logger.error('Get transaction controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get transactions with filtering and pagination
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        })
      }

      const {
        startDate,
        endDate,
        customerId,
        status,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        customerId: customerId as string,
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await TransactionService.getTransactions(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'TRANSACTIONS_FETCH_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        transactions: result.transactions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
        }
      })
    } catch (error) {
      logger.error('Get transactions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Void a transaction
   */
  static async voidTransaction(req: Request, res: Response) {
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

      const { transactionId } = req.params
      const { reason } = req.body
      const voidedBy = req.user!.userId

      const result = await TransactionService.voidTransaction({
        transactionId,
        reason,
        voidedBy
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'TRANSACTION_VOID_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        transaction: result.transaction
      })
    } catch (error) {
      logger.error('Void transaction controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Process a refund for a transaction
   */
  static async processRefund(req: Request, res: Response) {
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

      const { transactionId } = req.params
      const { items, reason } = req.body
      const processedBy = req.user!.userId

      const result = await TransactionService.processRefund({
        transactionId,
        items,
        reason,
        processedBy
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'REFUND_PROCESSING_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        refund: result.refund,
        transaction: result.transaction
      })
    } catch (error) {
      logger.error('Process refund controller error:', error)
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
 * Validation rules for transaction endpoints
 */
export const transactionValidation = {
  createTransaction: [
    body('customerId')
      .optional()
      .isString()
      .withMessage('Customer ID must be a string'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items array is required and must not be empty'),
    body('items.*.productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required for each item'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('items.*.unitPrice')
      .isFloat({ min: 0 })
      .withMessage('Unit price must be a positive number'),
    body('paymentMethod')
      .isObject()
      .withMessage('Payment method is required'),
    body('paymentMethod.type')
      .isIn(['cash', 'card', 'digital'])
      .withMessage('Payment method type must be cash, card, or digital'),
    body('cashReceived')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cash received must be a positive number')
  ],

  getTransactions: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    query('customerId')
      .optional()
      .isString()
      .withMessage('Customer ID must be a string'),
    query('status')
      .optional()
      .isString()
      .withMessage('Status must be a string'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  voidTransaction: [
    body('reason')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason is required and must be less than 500 characters')
  ],

  processRefund: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items array is required and must not be empty'),
    body('items.*.productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required for each item'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('items.*.refundAmount')
      .isFloat({ min: 0 })
      .withMessage('Refund amount must be a positive number'),
    body('reason')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason is required and must be less than 500 characters')
  ]
}