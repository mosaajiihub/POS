import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { CustomerService } from '../services/customerService'
import { logger } from '../utils/logger'

/**
 * Customer Management Controller
 * Handles HTTP requests for customer management operations
 */
export class CustomerController {
  /**
   * Get all customers with filtering and pagination
   */
  static async getCustomers(req: Request, res: Response) {
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
        search,
        isActive,
        hasLoyaltyPoints,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        hasLoyaltyPoints: hasLoyaltyPoints === 'true',
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await CustomerService.getCustomers(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_CUSTOMERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        customers: result.customers,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get customers controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomer(req: Request, res: Response) {
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

      const { customerId } = req.params

      const result = await CustomerService.getCustomer(customerId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        customer: result.customer
      })
    } catch (error) {
      logger.error('Get customer controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new customer
   */
  static async createCustomer(req: Request, res: Response) {
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
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        creditLimit
      } = req.body

      const result = await CustomerService.createCustomer({
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        creditLimit
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_CUSTOMER_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        customer: result.customer
      })
    } catch (error) {
      logger.error('Create customer controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(req: Request, res: Response) {
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

      const { customerId } = req.params
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        creditLimit,
        loyaltyPoints,
        isActive
      } = req.body

      const result = await CustomerService.updateCustomer(customerId, {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        creditLimit,
        loyaltyPoints,
        isActive
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_CUSTOMER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        customer: result.customer
      })
    } catch (error) {
      logger.error('Update customer controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete customer
   */
  static async deleteCustomer(req: Request, res: Response) {
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

      const { customerId } = req.params

      const result = await CustomerService.deleteCustomer(customerId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_CUSTOMER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete customer controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get active customers (for dropdowns)
   */
  static async getActiveCustomers(req: Request, res: Response) {
    try {
      const result = await CustomerService.getActiveCustomers()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_ACTIVE_CUSTOMERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        customers: result.customers,
        total: result.total
      })
    } catch (error) {
      logger.error('Get active customers controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get customer purchase history
   */
  static async getCustomerPurchaseHistory(req: Request, res: Response) {
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

      const { customerId } = req.params
      const { page = 1, limit = 20 } = req.query

      const result = await CustomerService.getCustomerPurchaseHistory(
        customerId,
        parseInt(page as string),
        parseInt(limit as string)
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_PURCHASE_HISTORY_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        sales: result.sales,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get customer purchase history controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get customer analytics
   */
  static async getCustomerAnalytics(req: Request, res: Response) {
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

      const { customerId } = req.params

      const result = await CustomerService.getCustomerAnalytics(customerId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_CUSTOMER_ANALYTICS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        analytics: result.analytics
      })
    } catch (error) {
      logger.error('Get customer analytics controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update customer loyalty points
   */
  static async updateLoyaltyPoints(req: Request, res: Response) {
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

      const { customerId } = req.params
      const { pointsChange, reason } = req.body

      const result = await CustomerService.updateLoyaltyPoints(customerId, pointsChange, reason)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_LOYALTY_POINTS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        customer: result.customer
      })
    } catch (error) {
      logger.error('Update loyalty points controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Search customers
   */
  static async searchCustomers(req: Request, res: Response) {
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

      const { query, limit = 10 } = req.query

      const result = await CustomerService.searchCustomers(
        query as string,
        parseInt(limit as string)
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'SEARCH_CUSTOMERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        customers: result.customers
      })
    } catch (error) {
      logger.error('Search customers controller error:', error)
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
 * Validation rules for customer endpoints
 */
export const customerValidation = {
  getCustomers: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('isActive')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isActive must be true or false'),
    query('hasLoyaltyPoints')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('hasLoyaltyPoints must be true or false'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getCustomer: [
    param('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required')
  ],

  createCustomer: [
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name is required and must be less than 100 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name is required and must be less than 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone number must be less than 20 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address must be less than 500 characters'),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City must be less than 100 characters'),
    body('postalCode')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Postal code must be less than 20 characters'),
    body('creditLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number')
  ],

  updateCustomer: [
    param('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required'),
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be less than 100 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be less than 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone number must be less than 20 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address must be less than 500 characters'),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('City must be less than 100 characters'),
    body('postalCode')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Postal code must be less than 20 characters'),
    body('creditLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number'),
    body('loyaltyPoints')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Loyalty points must be a positive integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],

  deleteCustomer: [
    param('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required')
  ],

  getCustomerPurchaseHistory: [
    param('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getCustomerAnalytics: [
    param('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required')
  ],

  updateLoyaltyPoints: [
    param('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required'),
    body('pointsChange')
      .isInt()
      .withMessage('Points change must be an integer'),
    body('reason')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Reason is required and must be less than 200 characters')
  ],

  searchCustomers: [
    query('query')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query is required and must be less than 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ]
}