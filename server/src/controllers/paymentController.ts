import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { PaymentStatus } from '@prisma/client'
import { PaymentService } from '../services/paymentService'
import { logger } from '../utils/logger'

/**
 * Payment Controller
 * Handles HTTP requests for payment operations
 */
export class PaymentController {
  /**
   * Record a new payment
   */
  static async recordPayment(req: Request, res: Response) {
    try {
      // Check validation errors
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

      const { userId, amount, currency, paymentMethod, transactionId, description, metadata } = req.body

      const result = await PaymentService.recordPayment({
        userId,
        amount,
        currency,
        paymentMethod,
        transactionId,
        description,
        metadata
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PAYMENT_RECORD_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        payment: result.payment
      })
    } catch (error) {
      logger.error('Record payment controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Verify or reject a payment (admin only)
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      // Check validation errors
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

      const { paymentId, action, reason, metadata } = req.body
      const adminUserId = req.user!.userId

      const result = await PaymentService.verifyPayment({
        paymentId,
        adminUserId,
        action,
        reason,
        metadata
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PAYMENT_VERIFICATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        payment: result.payment
      })
    } catch (error) {
      logger.error('Verify payment controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payment by ID
   */
  static async getPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params

      if (!paymentId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment ID is required'
          }
        })
      }

      const result = await PaymentService.getPayment(paymentId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        payment: result.payment
      })
    } catch (error) {
      logger.error('Get payment controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payments with filtering and pagination
   */
  static async getPayments(req: Request, res: Response) {
    try {
      // Check validation errors
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
        status,
        userId,
        paymentMethod,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        status: status as PaymentStatus,
        userId: userId as string,
        paymentMethod: paymentMethod as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await PaymentService.getPayments(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PAYMENTS_FETCH_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        payments: result.payments,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
        }
      })
    } catch (error) {
      logger.error('Get payments controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const { paymentId } = req.params

      if (!paymentId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment ID is required'
          }
        })
      }

      const result = await PaymentService.getPaymentHistory(paymentId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PAYMENT_HISTORY_FETCH_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        history: result.history
      })
    } catch (error) {
      logger.error('Get payment history controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(req: Request, res: Response) {
    try {
      // Check validation errors
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

      const { dateFrom, dateTo } = req.query

      const result = await PaymentService.getPaymentStats(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PAYMENT_STATS_FETCH_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        stats: result.stats
      })
    } catch (error) {
      logger.error('Get payment stats controller error:', error)
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
 * Validation rules for payment endpoints
 */
export const paymentValidation = {
  recordPayment: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('amount')
      .isNumeric()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-letter code'),
    body('paymentMethod')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Payment method is required'),
    body('transactionId')
      .optional()
      .isString()
      .withMessage('Transaction ID must be a string'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  verifyPayment: [
    body('paymentId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Payment ID is required'),
    body('action')
      .isIn(['verify', 'reject'])
      .withMessage('Action must be either verify or reject'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  getPayments: [
    query('status')
      .optional()
      .isIn(Object.values(PaymentStatus))
      .withMessage('Invalid payment status'),
    query('userId')
      .optional()
      .isString()
      .withMessage('User ID must be a string'),
    query('paymentMethod')
      .optional()
      .isString()
      .withMessage('Payment method must be a string'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO date'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getPaymentStats: [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO date')
  ]
}