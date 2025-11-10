import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { PCIDssComplianceService } from '../services/pciDssComplianceService'
import { logger } from '../utils/logger'

/**
 * PCI DSS Compliance Controller
 * Handles HTTP requests for PCI DSS compliance operations
 */
export class PCIDssComplianceController {
  /**
   * Tokenize card data
   */
  static async tokenizeCard(req: Request, res: Response) {
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

      const { cardNumber, cardholderName, expiryDate, cvv } = req.body
      const userId = req.user?.userId

      const tokenizedCard = await PCIDssComplianceService.tokenizeCardData(
        { cardNumber, cardholderName, expiryDate, cvv },
        userId
      )

      res.status(200).json({
        message: 'Card tokenized successfully',
        data: {
          token: tokenizedCard.token,
          lastFourDigits: tokenizedCard.lastFourDigits,
          cardType: tokenizedCard.cardType,
          expiryDate: tokenizedCard.expiryDate
        }
      })
    } catch (error) {
      logger.error('Tokenize card controller error:', error)
      res.status(500).json({
        error: {
          code: 'TOKENIZATION_ERROR',
          message: error.message || 'Failed to tokenize card'
        }
      })
    }
  }

  /**
   * Process secure payment
   */
  static async processPayment(req: Request, res: Response) {
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

      const { token, amount, currency } = req.body
      const userId = req.user?.userId

      const result = await PCIDssComplianceService.processSecurePayment(
        token,
        amount,
        currency,
        userId
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PAYMENT_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        data: {
          transactionId: result.transactionId
        }
      })
    } catch (error) {
      logger.error('Process payment controller error:', error)
      res.status(500).json({
        error: {
          code: 'PAYMENT_ERROR',
          message: 'Payment processing error'
        }
      })
    }
  }

  /**
   * Generate PCI DSS compliance report
   */
  static async getComplianceReport(req: Request, res: Response) {
    try {
      const report = await PCIDssComplianceService.generateComplianceReport()

      res.status(200).json({
        message: 'Compliance report generated successfully',
        data: report
      })
    } catch (error) {
      logger.error('Get compliance report controller error:', error)
      res.status(500).json({
        error: {
          code: 'REPORT_ERROR',
          message: 'Failed to generate compliance report'
        }
      })
    }
  }

  /**
   * Validate network segmentation
   */
  static async validateNetworkSegmentation(req: Request, res: Response) {
    try {
      const result = await PCIDssComplianceService.validateNetworkSegmentation()

      res.status(200).json({
        message: 'Network segmentation validation completed',
        data: result
      })
    } catch (error) {
      logger.error('Validate network segmentation controller error:', error)
      res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate network segmentation'
        }
      })
    }
  }
}

/**
 * Validation rules for PCI DSS compliance endpoints
 */
export const pciDssValidation = {
  tokenizeCard: [
    body('cardNumber')
      .isString()
      .matches(/^\d{13,19}$/)
      .withMessage('Card number must be 13-19 digits'),
    body('cardholderName')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Cardholder name is required'),
    body('expiryDate')
      .isString()
      .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
      .withMessage('Expiry date must be in MM/YY format'),
    body('cvv')
      .optional()
      .isString()
      .matches(/^\d{3,4}$/)
      .withMessage('CVV must be 3-4 digits')
  ],

  processPayment: [
    body('token')
      .isString()
      .matches(/^tok_[a-f0-9]{32}$/)
      .withMessage('Invalid payment token'),
    body('amount')
      .isNumeric()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('currency')
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-letter code')
  ]
}
