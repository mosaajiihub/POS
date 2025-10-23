import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { ExpenseService, ExpenseFilters } from '../services/expenseService'
import { logger } from '../utils/logger'

/**
 * Expense Controller
 * Handles expense management endpoints
 */
export class ExpenseController {
  /**
   * Create new expense
   */
  static async createExpense(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        description,
        amount,
        category,
        vendor,
        receiptUrl,
        expenseDate
      } = req.body

      const result = await ExpenseService.createExpense({
        description,
        amount: parseFloat(amount),
        category,
        vendor,
        receiptUrl,
        expenseDate: new Date(expenseDate)
      })

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.status(201).json(result)
    } catch (error) {
      logger.error('Create expense controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Update expense
   */
  static async updateExpense(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { expenseId } = req.params
      const updateData = { ...req.body }

      // Convert amount to number if provided
      if (updateData.amount) {
        updateData.amount = parseFloat(updateData.amount)
      }

      // Convert expenseDate to Date if provided
      if (updateData.expenseDate) {
        updateData.expenseDate = new Date(updateData.expenseDate)
      }

      const result = await ExpenseService.updateExpense(expenseId, updateData)

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Update expense controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get expense by ID
   */
  static async getExpense(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { expenseId } = req.params

      const result = await ExpenseService.getExpense(expenseId)

      if (!result.success) {
        return res.status(404).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get expense controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get expenses with filtering and pagination
   */
  static async getExpenses(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const {
        category,
        vendor,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        page,
        limit
      } = req.query

      const filters: ExpenseFilters = {
        ...(category && { category: category as string }),
        ...(vendor && { vendor: vendor as string }),
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(minAmount && { minAmount: parseFloat(minAmount as string) }),
        ...(maxAmount && { maxAmount: parseFloat(maxAmount as string) }),
        ...(search && { search: search as string }),
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) })
      }

      const result = await ExpenseService.getExpenses(filters)

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get expenses controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Delete expense
   */
  static async deleteExpense(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { expenseId } = req.params

      const result = await ExpenseService.deleteExpense(expenseId)

      if (!result.success) {
        return res.status(404).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Delete expense controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get expense categories
   */
  static async getExpenseCategories(req: Request, res: Response) {
    try {
      const result = await ExpenseService.getExpenseCategories()

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get expense categories controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Get expense vendors
   */
  static async getExpenseVendors(req: Request, res: Response) {
    try {
      const result = await ExpenseService.getExpenseVendors()

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Get expense vendors controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  /**
   * Generate expense report
   */
  static async generateExpenseReport(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { startDate, endDate } = req.query

      const result = await ExpenseService.generateExpenseReport(
        new Date(startDate as string),
        new Date(endDate as string)
      )

      if (!result.success) {
        return res.status(400).json(result)
      }

      res.json(result)
    } catch (error) {
      logger.error('Generate expense report controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }
}

/**
 * Validation middleware for expense endpoints
 */
export const expenseValidation = {
  createExpense: [
    body('description')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Description must be between 1 and 255 characters'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be between 1 and 100 characters'),
    body('vendor')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Vendor must be less than 100 characters'),
    body('receiptUrl')
      .optional()
      .isURL()
      .withMessage('Receipt URL must be a valid URL'),
    body('expenseDate')
      .isISO8601()
      .withMessage('Expense date must be a valid ISO 8601 date')
  ],

  updateExpense: [
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Description must be between 1 and 255 characters'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be between 1 and 100 characters'),
    body('vendor')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Vendor must be less than 100 characters'),
    body('receiptUrl')
      .optional()
      .isURL()
      .withMessage('Receipt URL must be a valid URL'),
    body('expenseDate')
      .optional()
      .isISO8601()
      .withMessage('Expense date must be a valid ISO 8601 date')
  ],

  getExpense: [
    query('expenseId')
      .isUUID()
      .withMessage('Expense ID must be a valid UUID')
  ],

  getExpenses: [
    query('category')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Category filter cannot be empty'),
    query('vendor')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Vendor filter cannot be empty'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('minAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum amount must be a non-negative number'),
    query('maxAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum amount must be a non-negative number'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search query cannot be empty'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  deleteExpense: [
    query('expenseId')
      .isUUID()
      .withMessage('Expense ID must be a valid UUID')
  ],

  generateExpenseReport: [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        const startDate = new Date(req.query?.startDate as string)
        const end = new Date(endDate)
        if (end <= startDate) {
          throw new Error('End date must be after start date')
        }
        return true
      })
  ]
}