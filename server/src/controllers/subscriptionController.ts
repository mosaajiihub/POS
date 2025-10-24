import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { SubscriptionService } from '../services/subscriptionService'
import { logger } from '../utils/logger'

/**
 * Subscription Management Controller
 * Handles HTTP requests for subscription operations
 */
export class SubscriptionController {
  /**
   * Get all subscriptions with filtering and pagination
   */
  static async getSubscriptions(req: Request, res: Response) {
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
        customerId,
        status,
        interval,
        planName,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        customerId: customerId as string,
        status: status as string,
        interval: interval as string,
        planName: planName as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await SubscriptionService.getSubscriptions(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_SUBSCRIPTIONS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        subscriptions: result.subscriptions,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get subscriptions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get subscription by ID
   */
  static async getSubscription(req: Request, res: Response) {
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

      const { subscriptionId } = req.params

      const result = await SubscriptionService.getSubscription(subscriptionId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        subscription: result.subscription
      })
    } catch (error) {
      logger.error('Get subscription controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new subscription
   */
  static async createSubscription(req: Request, res: Response) {
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
        customerId,
        planName,
        planDescription,
        amount,
        currency,
        interval,
        startDate,
        trialEndDate,
        metadata
      } = req.body

      const result = await SubscriptionService.createSubscription({
        customerId,
        planName,
        planDescription,
        amount,
        currency,
        interval,
        startDate: startDate ? new Date(startDate) : undefined,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : undefined,
        metadata
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_SUBSCRIPTION_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        subscription: result.subscription
      })
    } catch (error) {
      logger.error('Create subscription controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(req: Request, res: Response) {
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

      const { subscriptionId } = req.params
      const {
        planName,
        planDescription,
        amount,
        currency,
        interval,
        status,
        endDate,
        cancellationReason,
        metadata
      } = req.body

      const updateData: any = {
        planName,
        planDescription,
        amount,
        currency,
        interval,
        status,
        cancellationReason,
        metadata
      }

      if (endDate) {
        updateData.endDate = new Date(endDate)
      }

      const result = await SubscriptionService.updateSubscription(subscriptionId, updateData)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_SUBSCRIPTION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        subscription: result.subscription
      })
    } catch (error) {
      logger.error('Update subscription controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(req: Request, res: Response) {
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

      const { subscriptionId } = req.params
      const { reason } = req.body

      const result = await SubscriptionService.cancelSubscription(subscriptionId, reason)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CANCEL_SUBSCRIPTION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        subscription: result.subscription
      })
    } catch (error) {
      logger.error('Cancel subscription controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Process billing cycle
   */
  static async processBillingCycle(req: Request, res: Response) {
    try {
      const result = await SubscriptionService.processBillingCycle()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PROCESS_BILLING_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        processed: result.processed,
        failed: result.failed,
        details: result.details
      })
    } catch (error) {
      logger.error('Process billing cycle controller error:', error)
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
 * Validation rules for subscription endpoints
 */
export const subscriptionValidation = {
  getSubscriptions: [
    query('customerId')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID must be a valid string'),
    query('status')
      .optional()
      .isIn(['active', 'paused', 'cancelled', 'expired'])
      .withMessage('Invalid subscription status'),
    query('interval')
      .optional()
      .isIn(['monthly', 'quarterly', 'yearly'])
      .withMessage('Invalid billing interval'),
    query('planName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Plan name must be less than 100 characters'),
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

  getSubscription: [
    param('subscriptionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Subscription ID is required')
  ],

  createSubscription: [
    body('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required'),
    body('planName')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Plan name is required and must be less than 200 characters'),
    body('planDescription')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Plan description must be less than 1000 characters'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than zero'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-character code'),
    body('interval')
      .isIn(['monthly', 'quarterly', 'yearly'])
      .withMessage('Interval must be monthly, quarterly, or yearly'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    body('trialEndDate')
      .optional()
      .isISO8601()
      .withMessage('Trial end date must be a valid ISO date'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  updateSubscription: [
    param('subscriptionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Subscription ID is required'),
    body('planName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Plan name must be less than 200 characters'),
    body('planDescription')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Plan description must be less than 1000 characters'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than zero'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-character code'),
    body('interval')
      .optional()
      .isIn(['monthly', 'quarterly', 'yearly'])
      .withMessage('Interval must be monthly, quarterly, or yearly'),
    body('status')
      .optional()
      .isIn(['active', 'paused', 'cancelled', 'expired'])
      .withMessage('Invalid subscription status'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    body('cancellationReason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason must be less than 500 characters'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],

  cancelSubscription: [
    param('subscriptionId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Subscription ID is required'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters')
  ]
}