import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserRole, UserStatus } from '@prisma/client'
import { UserService } from '../services/userService'
import { logger } from '../utils/logger'

/**
 * User Management Controller
 * Handles HTTP requests for user management operations
 */
export class UserController {
  /**
   * Get all users with filtering and pagination
   */
  static async getUsers(req: Request, res: Response) {
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
        role,
        status,
        paymentVerified,
        search,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        role: role as UserRole,
        status: status as UserStatus,
        paymentVerified: paymentVerified === 'true' ? true : paymentVerified === 'false' ? false : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await UserService.getUsers(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_USERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        users: result.users,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get users controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get user by ID
   */
  static async getUser(req: Request, res: Response) {
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

      const { userId } = req.params

      const result = await UserService.getUser(userId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Get user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new user
   */
  static async createUser(req: Request, res: Response) {
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

      const { email, password, firstName, lastName, role, sendWelcomeEmail } = req.body
      const adminUserId = req.user!.userId

      const result = await UserService.createUser(
        { email, password, firstName, lastName, role, sendWelcomeEmail },
        adminUserId
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_USER_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Create user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update user
   */
  static async updateUser(req: Request, res: Response) {
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

      const { userId } = req.params
      const { email, firstName, lastName, role, status, paymentVerified } = req.body
      const adminUserId = req.user!.userId

      const result = await UserService.updateUser(
        userId,
        { email, firstName, lastName, role, status, paymentVerified },
        adminUserId
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_USER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Update user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(req: Request, res: Response) {
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

      const { userId } = req.params
      const adminUserId = req.user!.userId

      const result = await UserService.deleteUser(userId, adminUserId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_USER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get user with payment information
   */
  static async getUserWithPayments(req: Request, res: Response) {
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

      const { userId } = req.params

      const result = await UserService.getUserWithPayments(userId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Get user with payments controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Activate user after payment verification
   */
  static async activateUser(req: Request, res: Response) {
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

      const { userId } = req.params
      const adminUserId = req.user!.userId

      const result = await UserService.activateUserAfterPayment(userId, adminUserId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'ACTIVATE_USER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        user: result.user
      })
    } catch (error) {
      logger.error('Activate user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(req: Request, res: Response) {
    try {
      const result = await UserService.getUserStats()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_USER_STATS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        stats: result.stats
      })
    } catch (error) {
      logger.error('Get user stats controller error:', error)
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
 * Validation rules for user endpoints
 */
export const userValidation = {
  getUsers: [
    query('role')
      .optional()
      .isIn(Object.values(UserRole))
      .withMessage('Invalid user role'),
    query('status')
      .optional()
      .isIn(Object.values(UserStatus))
      .withMessage('Invalid user status'),
    query('paymentVerified')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('paymentVerified must be true or false'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getUserById: [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ],

  createUser: [
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
      .withMessage('Invalid user role'),
    body('sendWelcomeEmail')
      .optional()
      .isBoolean()
      .withMessage('sendWelcomeEmail must be a boolean')
  ],

  updateUser: [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be less than 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    body('role')
      .optional()
      .isIn(Object.values(UserRole))
      .withMessage('Invalid user role'),
    body('status')
      .optional()
      .isIn(Object.values(UserStatus))
      .withMessage('Invalid user status'),
    body('paymentVerified')
      .optional()
      .isBoolean()
      .withMessage('paymentVerified must be a boolean')
  ],

  deleteUser: [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ],

  activateUser: [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ]
}