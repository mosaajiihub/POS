import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { CategoryService } from '../services/categoryService'
import { logger } from '../utils/logger'

/**
 * Category Management Controller
 * Handles HTTP requests for category management operations
 */
export class CategoryController {
  /**
   * Get all categories with filtering and pagination
   */
  static async getCategories(req: Request, res: Response) {
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

      const result = await CategoryService.getCategories(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_CATEGORIES_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        categories: result.categories,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get categories controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get category by ID
   */
  static async getCategory(req: Request, res: Response) {
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

      const { categoryId } = req.params

      const result = await CategoryService.getCategory(categoryId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        category: result.category
      })
    } catch (error) {
      logger.error('Get category controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new category
   */
  static async createCategory(req: Request, res: Response) {
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

      const { name, description } = req.body

      const result = await CategoryService.createCategory({
        name,
        description
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_CATEGORY_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        category: result.category
      })
    } catch (error) {
      logger.error('Create category controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update category
   */
  static async updateCategory(req: Request, res: Response) {
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

      const { categoryId } = req.params
      const { name, description, isActive } = req.body

      const result = await CategoryService.updateCategory(categoryId, {
        name,
        description,
        isActive
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_CATEGORY_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        category: result.category
      })
    } catch (error) {
      logger.error('Update category controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete category
   */
  static async deleteCategory(req: Request, res: Response) {
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

      const { categoryId } = req.params

      const result = await CategoryService.deleteCategory(categoryId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_CATEGORY_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete category controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get active categories (for dropdowns)
   */
  static async getActiveCategories(req: Request, res: Response) {
    try {
      const result = await CategoryService.getActiveCategories()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_ACTIVE_CATEGORIES_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        categories: result.categories,
        total: result.total
      })
    } catch (error) {
      logger.error('Get active categories controller error:', error)
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
 * Validation rules for category endpoints
 */
export const categoryValidation = {
  getCategories: [
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

  getCategory: [
    param('categoryId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Category ID is required')
  ],

  createCategory: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category name is required and must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters')
  ],

  updateCategory: [
    param('categoryId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Category ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],

  deleteCategory: [
    param('categoryId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Category ID is required')
  ]
}