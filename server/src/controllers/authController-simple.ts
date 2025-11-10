import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { logger } from '../utils/logger'

/**
 * Simple Authentication Controller for testing
 */
export class AuthController {
  /**
   * User login
   */
  static async login(req: Request, res: Response) {
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

      // Simple mock response for now
      res.json({
        success: true,
        message: 'Login endpoint working',
        data: {
          user: { id: '1', email: req.body.email },
          token: 'mock-token'
        }
      })
    } catch (error) {
      logger.error('Login error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      })
    }
  }

  /**
   * Health check
   */
  static async health(req: Request, res: Response) {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Validation rules
 */
export const authValidation = {
  login: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ]
}