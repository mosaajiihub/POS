import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { SupplierService } from '../services/supplierService'
import { logger } from '../utils/logger'

/**
 * Supplier Management Controller
 * Handles HTTP requests for supplier management operations
 */
export class SupplierController {
  /**
   * Get all suppliers with filtering and pagination
   */
  static async getSuppliers(req: Request, res: Response) {
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
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await SupplierService.getSuppliers(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_SUPPLIERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        suppliers: result.suppliers,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get suppliers controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get supplier by ID
   */
  static async getSupplier(req: Request, res: Response) {
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

      const { supplierId } = req.params

      const result = await SupplierService.getSupplier(supplierId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'SUPPLIER_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        supplier: result.supplier
      })
    } catch (error) {
      logger.error('Get supplier controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new supplier
   */
  static async createSupplier(req: Request, res: Response) {
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
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentTerms
      } = req.body

      const result = await SupplierService.createSupplier({
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentTerms
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_SUPPLIER_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        supplier: result.supplier
      })
    } catch (error) {
      logger.error('Create supplier controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update supplier
   */
  static async updateSupplier(req: Request, res: Response) {
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

      const { supplierId } = req.params
      const {
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentTerms,
        isActive
      } = req.body

      const result = await SupplierService.updateSupplier(supplierId, {
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentTerms,
        isActive
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_SUPPLIER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        supplier: result.supplier
      })
    } catch (error) {
      logger.error('Update supplier controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete supplier
   */
  static async deleteSupplier(req: Request, res: Response) {
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

      const { supplierId } = req.params

      const result = await SupplierService.deleteSupplier(supplierId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_SUPPLIER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete supplier controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get active suppliers (for dropdowns)
   */
  static async getActiveSuppliers(req: Request, res: Response) {
    try {
      const result = await SupplierService.getActiveSuppliers()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_ACTIVE_SUPPLIERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        suppliers: result.suppliers,
        total: result.total
      })
    } catch (error) {
      logger.error('Get active suppliers controller error:', error)
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
 * Validation rules for supplier endpoints
 */
export const supplierValidation = {
  getSuppliers: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('isActive')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isActive must be true or false'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getSupplier: [
    param('supplierId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Supplier ID is required')
  ],

  createSupplier: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Supplier name is required and must be less than 200 characters'),
    body('contactPerson')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Contact person must be less than 100 characters'),
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
    body('paymentTerms')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Payment terms must be less than 200 characters')
  ],

  updateSupplier: [
    param('supplierId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Supplier ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Supplier name must be less than 200 characters'),
    body('contactPerson')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Contact person must be less than 100 characters'),
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
    body('paymentTerms')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Payment terms must be less than 200 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],

  deleteSupplier: [
    param('supplierId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Supplier ID is required')
  ]
}