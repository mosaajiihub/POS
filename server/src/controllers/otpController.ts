import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { OTPService } from '../services/otpService'
import { logger } from '../utils/logger'

/**
 * OTP Controller
 * Handles HTTP requests for OTP operations
 */
export class OTPController {
  /**
   * Generate and deliver OTP
   */
  static async generateOTP(req: Request, res: Response) {
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

      const { userId, deliveryMethod, email, phoneNumber } = req.body
      const adminUserId = req.user!.userId

      const result = await OTPService.generateAndDeliverOTP(
        userId,
        adminUserId,
        {
          method: deliveryMethod,
          email,
          phoneNumber
        }
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'OTP_GENERATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        otp: result.otp, // Only returned in development
        expiresAt: result.expiresAt,
        deliveryResults: result.deliveryResults
      })
    } catch (error) {
      logger.error('Generate OTP controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(req: Request, res: Response) {
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

      const { userId, otp } = req.body

      const result = await OTPService.verifyOTP(userId, otp)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'OTP_VERIFICATION_FAILED',
            message: result.message,
            attemptsRemaining: result.attemptsRemaining
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Verify OTP controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get OTP status
   */
  static async getOTPStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params

      if (!userId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        })
      }

      const result = await OTPService.getOTPStatus(userId)

      res.status(200).json({
        message: 'OTP status retrieved successfully',
        status: result
      })
    } catch (error) {
      logger.error('Get OTP status controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Resend OTP
   */
  static async resendOTP(req: Request, res: Response) {
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

      const { userId, deliveryMethod, email, phoneNumber } = req.body
      const adminUserId = req.user!.userId

      const result = await OTPService.resendOTP(
        userId,
        adminUserId,
        {
          method: deliveryMethod,
          email,
          phoneNumber
        }
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'OTP_RESEND_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        expiresAt: result.expiresAt,
        deliveryResults: result.deliveryResults
      })
    } catch (error) {
      logger.error('Resend OTP controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Cancel OTP
   */
  static async cancelOTP(req: Request, res: Response) {
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

      const { userId } = req.body
      const adminUserId = req.user!.userId

      const result = await OTPService.cancelOTP(userId, adminUserId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'OTP_CANCEL_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Cancel OTP controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Cleanup expired OTPs (admin utility)
   */
  static async cleanupExpired(req: Request, res: Response) {
    try {
      await OTPService.cleanupExpired()

      res.status(200).json({
        message: 'Expired OTPs cleaned up successfully'
      })
    } catch (error) {
      logger.error('Cleanup expired controller error:', error)
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
 * Validation rules for OTP endpoints
 */
export const otpValidation = {
  generateOTP: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('deliveryMethod')
      .isIn(['email', 'sms', 'both'])
      .withMessage('Delivery method must be email, sms, or both'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required when using email delivery'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number is required when using SMS delivery')
  ],

  verifyOTP: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('otp')
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 characters')
  ],

  resendOTP: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('deliveryMethod')
      .isIn(['email', 'sms', 'both'])
      .withMessage('Delivery method must be email, sms, or both'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required when using email delivery'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number is required when using SMS delivery')
  ],

  cancelOTP: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ]
}