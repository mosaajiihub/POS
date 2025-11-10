import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { MFAService } from '../services/mfaService'
import { logger } from '../utils/logger'

/**
 * Multi-Factor Authentication Controller
 * Handles HTTP requests for MFA operations
 */
export class MFAController {
  /**
   * Setup MFA for the authenticated user
   */
  static async setupMFA(req: Request, res: Response) {
    try {
      const userId = req.user!.userId

      const result = await MFAService.setupMFA(userId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'MFA_SETUP_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        setup: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl,
          backupCodes: result.backupCodes
        }
      })
    } catch (error) {
      logger.error('MFA setup controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Verify MFA setup with TOTP token
   */
  static async verifyMFASetup(req: Request, res: Response) {
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

      const { token } = req.body
      const userId = req.user!.userId

      const result = await MFAService.verifyMFASetup(userId, token)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'MFA_VERIFICATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('MFA setup verification controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMFA(req: Request, res: Response) {
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

      const { userId, token } = req.body

      const result = await MFAService.verifyMFA(userId, token)

      if (!result.success) {
        return res.status(401).json({
          error: {
            code: 'MFA_VERIFICATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        isBackupCode: result.isBackupCode
      })
    } catch (error) {
      logger.error('MFA verification controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Disable MFA for the authenticated user
   */
  static async disableMFA(req: Request, res: Response) {
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

      const { currentPassword } = req.body
      const userId = req.user!.userId

      const result = await MFAService.disableMFA(userId, currentPassword)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'MFA_DISABLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('MFA disable controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateBackupCodes(req: Request, res: Response) {
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

      const { currentPassword } = req.body
      const userId = req.user!.userId

      const result = await MFAService.generateNewBackupCodes(userId, currentPassword)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'BACKUP_CODES_GENERATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        backupCodes: result.backupCodes
      })
    } catch (error) {
      logger.error('Generate backup codes controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get MFA status for the authenticated user
   */
  static async getMFAStatus(req: Request, res: Response) {
    try {
      const userId = req.user!.userId

      const status = await MFAService.getMFAStatus(userId)

      res.status(200).json({
        message: 'MFA status retrieved successfully',
        status
      })
    } catch (error) {
      logger.error('Get MFA status controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Reset MFA for a user (admin only)
   */
  static async resetMFA(req: Request, res: Response) {
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

      const { userId } = req.body
      const adminUserId = req.user!.userId

      const result = await MFAService.resetMFA(userId, adminUserId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'MFA_RESET_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('MFA reset controller error:', error)
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
 * Validation rules for MFA endpoints
 */
export const mfaValidation = {
  verifySetup: [
    body('token')
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage('MFA token must be exactly 6 digits')
  ],

  verifyMFA: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('token')
      .isString()
      .isLength({ min: 6, max: 8 })
      .withMessage('MFA token must be 6-8 characters')
  ],

  disableMFA: [
    body('currentPassword')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Current password is required')
  ],

  generateBackupCodes: [
    body('currentPassword')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Current password is required')
  ],

  resetMFA: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ]
}