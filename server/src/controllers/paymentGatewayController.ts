import { Request, Response } from 'express'
import { body, param, validationResult } from 'express-validator'
import { PaymentGatewayService } from '../services/paymentGatewayService'
import { logger } from '../utils/logger'

/**
 * Payment Gateway Controller
 * Handles HTTP requests for payment gateway operations
 */
export class PaymentGatewayController {
  /**
   * Create payment link for invoice
   */
  static async createPaymentLink(req: Request, res: Response) {
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

      const { invoiceId } = req.params
      const {
        amount,
        currency = 'USD',
        description,
        customerEmail,
        successUrl,
        cancelUrl,
        expiresAt
      } = req.body

      const result = await PaymentGatewayService.createPaymentLink({
        invoiceId,
        amount,
        currency,
        description,
        customerEmail,
        successUrl,
        cancelUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_PAYMENT_LINK_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        paymentLink: result.paymentLink
      })
    } catch (error) {
      logger.error('Create payment link controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payment link status
   */
  static async getPaymentLinkStatus(req: Request, res: Response) {
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

      const { linkId } = req.params

      const result = await PaymentGatewayService.getPaymentLinkStatus(linkId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'PAYMENT_LINK_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        paymentLink: result.paymentLink
      })
    } catch (error) {
      logger.error('Get payment link status controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Cancel payment link
   */
  static async cancelPaymentLink(req: Request, res: Response) {
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

      const { linkId } = req.params

      const result = await PaymentGatewayService.cancelPaymentLink(linkId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CANCEL_PAYMENT_LINK_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Cancel payment link controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Handle payment gateway webhook
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const webhookEvent = req.body

      const result = await PaymentGatewayService.handleWebhook(webhookEvent)

      if (!result.success) {
        logger.error('Webhook processing failed:', result.message)
        return res.status(400).json({
          error: {
            code: 'WEBHOOK_PROCESSING_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: 'Webhook processed successfully'
      })
    } catch (error) {
      logger.error('Handle webhook controller error:', error)
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
 * Validation rules for payment gateway endpoints
 */
export const paymentGatewayValidation = {
  createPaymentLink: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than zero'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-character code'),
    body('description')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description is required and must be less than 500 characters'),
    body('customerEmail')
      .optional()
      .isEmail()
      .withMessage('Customer email must be valid'),
    body('successUrl')
      .optional()
      .isURL()
      .withMessage('Success URL must be valid'),
    body('cancelUrl')
      .optional()
      .isURL()
      .withMessage('Cancel URL must be valid'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expires at must be a valid ISO date')
  ],

  getPaymentLinkStatus: [
    param('linkId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Link ID is required')
  ],

  cancelPaymentLink: [
    param('linkId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Link ID is required')
  ]
}