import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { UserRole } from '@prisma/client'
import { AuthService } from '../services/authService'
import { BruteForceProtectionService } from '../services/bruteForceProtectionService'
import { logger } from '../utils/logger'

/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  /**
   * User login (enhanced with MFA and security features)
   */
  static async login(req: Request, res: Response) {
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

      const { email, password, captchaToken } = req.body
      const ipAddress = req.ip
      const userAgent = req.headers['user-agent']

      // Check if CAPTCHA is required
      const requiresCaptcha = await BruteForceProtectionService.shouldRequireCaptcha(undefined, ipAddress)
      if (requiresCaptcha) {
        if (!captchaToken) {
          return res.status(400).json({
            error: {
              code: 'CAPTCHA_REQUIRED',
              message: 'CAPTCHA verification is required'
            }
          })
        }

        const captchaValid = await BruteForceProtectionService.verifyCaptcha(captchaToken, ipAddress)
        if (!captchaValid) {
          return res.status(400).json({
            error: {
              code: 'CAPTCHA_INVALID',
              message: 'Invalid CAPTCHA verification'
            }
          })
        }
      }

      const result = await AuthService.login(
        { email, password },
        ipAddress,
        userAgent
      )

      if (!result.success) {
        const statusCode = result.requiresMFA ? 200 : 401
        const errorCode = result.requiresMFA ? 'MFA_REQUIRED' : 'LOGIN_FAILED'
        
        return res.status(statusCode).json({
          error: {
            code: errorCode,
            message: result.message
          },
          requiresMFA: result.requiresMFA,
          tempUserId: result.tempUserId
        })
      }

      // Set session cookie if session ID is provided
      if (result.sessionId) {
        res.cookie('sessionId', result.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user,
        tokens: result.tokens
      })
    } catch (error) {
      logger.error('Login controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Complete MFA login
   */
  static async completeMFALogin(req: Request, res: Response) {
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

      const { tempUserId, mfaToken } = req.body
      const ipAddress = req.ip
      const userAgent = req.headers['user-agent']

      const result = await AuthService.completeMFALogin(
        tempUserId,
        mfaToken,
        ipAddress,
        userAgent
      )

      if (!result.success) {
        return res.status(401).json({
          error: {
            code: 'MFA_LOGIN_FAILED',
            message: result.message
          }
        })
      }

      // Set session cookie if session ID is provided
      if (result.sessionId) {
        res.cookie('sessionId', result.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user,
        tokens: result.tokens
      })
    } catch (error) {
      logger.error('Complete MFA login controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * User registration (admin only)
   */
  static async register(req: Request, res: Response) {
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

      const { email, password, firstName, lastName, role } = req.body
      const adminUserId = req.user!.userId

      const result = await AuthService.register(
        { email, password, firstName, lastName, role },
        adminUserId
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'REGISTRATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Registration controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Generate OTP for user activation
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

      const { userId } = req.body
      const adminUserId = req.user!.userId

      const result = await AuthService.generateOTP(userId, adminUserId)

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
        otpInfo: result.otpInfo
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
   * Verify OTP and activate user
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

      const result = await AuthService.verifyOTP(userId, otp)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'OTP_VERIFICATION_FAILED',
            message: result.message
          }
        })
      }

      // Set session cookie if session ID is provided
      if (result.sessionId) {
        res.cookie('sessionId', result.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user,
        tokens: result.tokens
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
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response) {
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

      const { refreshToken } = req.body

      const result = await AuthService.refreshToken(refreshToken)

      if (!result.success) {
        return res.status(401).json({
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user,
        tokens: result.tokens
      })
    } catch (error) {
      logger.error('Refresh token controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * User logout
   */
  static async logout(req: Request, res: Response) {
    try {
      const sessionId = req.sessionId || req.cookies.sessionId

      if (sessionId) {
        const result = await AuthService.logout(sessionId)
        
        // Clear session cookie
        res.clearCookie('sessionId')

        if (!result.success) {
          return res.status(400).json({
            error: {
              code: 'LOGOUT_FAILED',
              message: result.message
            }
          })
        }
      }

      res.status(200).json({
        message: 'Logged out successfully'
      })
    } catch (error) {
      logger.error('Logout controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(req: Request, res: Response) {
    try {
      const userId = req.user!.userId

      const result = await AuthService.logoutAll(userId)

      // Clear session cookie
      res.clearCookie('sessionId')

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'LOGOUT_ALL_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Logout all controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response) {
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

      const { currentPassword, newPassword } = req.body
      const userId = req.user!.userId

      const result = await AuthService.changePassword(userId, currentPassword, newPassword)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'PASSWORD_CHANGE_FAILED',
            message: result.message
          }
        })
      }

      // Clear session cookie since user needs to log in again
      res.clearCookie('sessionId')

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Change password controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId

      const result = await AuthService.getUserProfile(userId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Get profile controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Validate token (for client-side token validation)
   */
  static async validateToken(req: Request, res: Response) {
    try {
      // If we reach here, the token is valid (middleware already validated it)
      res.status(200).json({
        message: 'Token is valid',
        user: req.user
      })
    } catch (error) {
      logger.error('Validate token controller error:', error)
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
 * Validation rules for authentication endpoints
 */
export const authValidation = {
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required'),
    body('captchaToken')
      .optional()
      .isString()
      .withMessage('CAPTCHA token must be a string')
  ],

  completeMFALogin: [
    body('tempUserId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Temporary user ID is required'),
    body('mfaToken')
      .isString()
      .isLength({ min: 6, max: 8 })
      .withMessage('MFA token must be 6-8 characters')
  ],

  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be less than 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be less than 50 characters'),
    body('role')
      .optional()
      .isIn(Object.values(UserRole))
      .withMessage('Invalid user role')
  ],

  generateOTP: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
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

  refreshToken: [
    body('refreshToken')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Refresh token is required')
  ],

  changePassword: [
    body('currentPassword')
      .isLength({ min: 1 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
  ]
}