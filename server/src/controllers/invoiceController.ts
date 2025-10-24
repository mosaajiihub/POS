import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { InvoiceService } from '../services/invoiceService'
import { logger } from '../utils/logger'

/**
 * Invoice Management Controller
 * Handles HTTP requests for invoice management operations
 */
export class InvoiceController {
  /**
   * Get all invoices with filtering and pagination
   */
  static async getInvoices(req: Request, res: Response) {
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
        status,
        customerId,
        dateFrom,
        dateTo,
        isOverdue,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        search: search as string,
        status: status as any,
        customerId: customerId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        isOverdue: isOverdue === 'true',
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await InvoiceService.getInvoices(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_INVOICES_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        invoices: result.invoices,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get invoices controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(req: Request, res: Response) {
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

      const { invoiceId } = req.params

      const result = await InvoiceService.getInvoice(invoiceId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'INVOICE_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        invoice: result.invoice
      })
    } catch (error) {
      logger.error('Get invoice controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new invoice
   */
  static async createInvoice(req: Request, res: Response) {
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
        customerId,
        items,
        dueDate,
        notes,
        terms,
        discountAmount,
        isRecurring,
        recurringInterval
      } = req.body

      const result = await InvoiceService.createInvoice({
        customerId,
        items,
        dueDate: new Date(dueDate),
        notes,
        terms,
        discountAmount,
        isRecurring,
        recurringInterval
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_INVOICE_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        invoice: result.invoice
      })
    } catch (error) {
      logger.error('Create invoice controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update invoice
   */
  static async updateInvoice(req: Request, res: Response) {
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

      const { invoiceId } = req.params
      const {
        customerId,
        items,
        dueDate,
        notes,
        terms,
        discountAmount,
        status,
        isRecurring,
        recurringInterval
      } = req.body

      const updateData: any = {
        customerId,
        items,
        notes,
        terms,
        discountAmount,
        status,
        isRecurring,
        recurringInterval
      }

      if (dueDate) {
        updateData.dueDate = new Date(dueDate)
      }

      const result = await InvoiceService.updateInvoice(invoiceId, updateData)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_INVOICE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        invoice: result.invoice
      })
    } catch (error) {
      logger.error('Update invoice controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(req: Request, res: Response) {
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

      const { invoiceId } = req.params

      const result = await InvoiceService.deleteInvoice(invoiceId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_INVOICE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete invoice controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Record payment for invoice
   */
  static async recordPayment(req: Request, res: Response) {
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

      const { invoiceId } = req.params
      const { amount, paymentMethod, reference, notes, paymentDate } = req.body

      const paymentData = {
        amount,
        paymentMethod,
        reference,
        notes,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined
      }

      const result = await InvoiceService.recordPayment(invoiceId, paymentData)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'RECORD_PAYMENT_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        invoice: result.invoice
      })
    } catch (error) {
      logger.error('Record payment controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(req: Request, res: Response) {
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

      const { invoiceId } = req.params

      const result = await InvoiceService.sendPaymentReminder(invoiceId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'SEND_REMINDER_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Send payment reminder controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices(req: Request, res: Response) {
    try {
      const result = await InvoiceService.getOverdueInvoices()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_OVERDUE_INVOICES_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        invoices: result.invoices,
        total: result.total
      })
    } catch (error) {
      logger.error('Get overdue invoices controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Generate recurring invoices
   */
  static async generateRecurringInvoices(req: Request, res: Response) {
    try {
      const result = await InvoiceService.generateRecurringInvoices()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GENERATE_RECURRING_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        generated: result.generated
      })
    } catch (error) {
      logger.error('Generate recurring invoices controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get invoice analytics
   */
  static async getInvoiceAnalytics(req: Request, res: Response) {
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

      const { dateFrom, dateTo } = req.query

      const result = await InvoiceService.getInvoiceAnalytics(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_ANALYTICS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        analytics: result.analytics
      })
    } catch (error) {
      logger.error('Get invoice analytics controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Send automated payment reminders
   */
  static async sendAutomatedReminders(req: Request, res: Response) {
    try {
      const result = await InvoiceService.sendAutomatedReminders()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'SEND_AUTOMATED_REMINDERS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        remindersSent: result.remindersSent
      })
    } catch (error) {
      logger.error('Send automated reminders controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(req: Request, res: Response) {
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

      const { invoiceId } = req.params

      const result = await InvoiceService.updateInvoiceStatus(invoiceId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_STATUS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        status: result.status
      })
    } catch (error) {
      logger.error('Update invoice status controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Bulk update all invoice statuses
   */
  static async updateAllInvoiceStatuses(req: Request, res: Response) {
    try {
      const result = await InvoiceService.updateAllInvoiceStatuses()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'BULK_UPDATE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        updated: result.updated
      })
    } catch (error) {
      logger.error('Bulk update invoice statuses controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payment reconciliation report
   */
  static async getPaymentReconciliation(req: Request, res: Response) {
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

      const { dateFrom, dateTo } = req.query

      const result = await InvoiceService.getPaymentReconciliation(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_RECONCILIATION_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        reconciliation: result.reconciliation
      })
    } catch (error) {
      logger.error('Get payment reconciliation controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create payment link for invoice
   */
  static async createPaymentLink(req: Request, res: Response) {
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

      const { invoiceId } = req.params
      const {
        amount,
        currency = 'USD',
        description,
        customerEmail,
        successUrl,
        cancelUrl,
        expiresAt
      } = req.body

      const result = await InvoiceService.createPaymentLink(invoiceId, {
        amount,
        currency,
        description,
        customerEmail,
        successUrl,
        cancelUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_PAYMENT_LINK_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        paymentLink: result.paymentLink
      })
    } catch (error) {
      logger.error('Create payment link controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get payment links for invoice
   */
  static async getPaymentLinks(req: Request, res: Response) {
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

      const { invoiceId } = req.params

      const result = await InvoiceService.getPaymentLinks(invoiceId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_PAYMENT_LINKS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        paymentLinks: result.paymentLinks
      })
    } catch (error) {
      logger.error('Get payment links controller error:', error)
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
 * Validation rules for invoice endpoints
 */
export const invoiceValidation = {
  getInvoices: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('status')
      .optional()
      .isIn(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'])
      .withMessage('Invalid invoice status'),
    query('customerId')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID must be a valid string'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO date'),
    query('isOverdue')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isOverdue must be true or false'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getInvoice: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required')
  ],

  createInvoice: [
    body('customerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID is required'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items array is required and must have at least one item'),
    body('items.*.description')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Item description is required and must be less than 500 characters'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Item quantity must be a positive integer'),
    body('items.*.unitPrice')
      .isFloat({ min: 0 })
      .withMessage('Item unit price must be a positive number'),
    body('items.*.taxRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Tax rate must be between 0 and 100'),
    body('items.*.productId')
      .optional()
      .isString()
      .withMessage('Product ID must be a string'),
    body('dueDate')
      .isISO8601()
      .withMessage('Due date is required and must be a valid ISO date'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    body('terms')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Terms must be less than 1000 characters'),
    body('discountAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Discount amount must be a positive number'),
    body('isRecurring')
      .optional()
      .isBoolean()
      .withMessage('isRecurring must be a boolean'),
    body('recurringInterval')
      .optional()
      .isIn(['monthly', 'quarterly', 'yearly'])
      .withMessage('Recurring interval must be monthly, quarterly, or yearly')
  ],

  updateInvoice: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required'),
    body('customerId')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Customer ID must be a valid string'),
    body('items')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Items array must have at least one item'),
    body('items.*.description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Item description must be less than 500 characters'),
    body('items.*.quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Item quantity must be a positive integer'),
    body('items.*.unitPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Item unit price must be a positive number'),
    body('items.*.taxRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Tax rate must be between 0 and 100'),
    body('items.*.productId')
      .optional()
      .isString()
      .withMessage('Product ID must be a string'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO date'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters'),
    body('terms')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Terms must be less than 1000 characters'),
    body('discountAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Discount amount must be a positive number'),
    body('status')
      .optional()
      .isIn(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'])
      .withMessage('Invalid invoice status'),
    body('isRecurring')
      .optional()
      .isBoolean()
      .withMessage('isRecurring must be a boolean'),
    body('recurringInterval')
      .optional()
      .isIn(['monthly', 'quarterly', 'yearly'])
      .withMessage('Recurring interval must be monthly, quarterly, or yearly')
  ],

  deleteInvoice: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required')
  ],

  recordPayment: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Payment amount must be greater than zero'),
    body('paymentMethod')
      .isIn(['CASH', 'CARD', 'DIGITAL', 'CREDIT'])
      .withMessage('Invalid payment method'),
    body('reference')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Reference must be less than 100 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters'),
    body('paymentDate')
      .optional()
      .isISO8601()
      .withMessage('Payment date must be a valid ISO date')
  ],

  sendPaymentReminder: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required')
  ],

  getInvoiceAnalytics: [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO date')
  ],

  updateInvoiceStatus: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required')
  ],

  getPaymentReconciliation: [
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO date')
  ],

  createPaymentLink: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than zero'),
    body('currency')
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-character code'),
    body('description')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description is required and must be less than 500 characters'),
    body('customerEmail')
      .optional()
      .isEmail()
      .withMessage('Customer email must be valid'),
    body('successUrl')
      .optional()
      .isURL()
      .withMessage('Success URL must be valid'),
    body('cancelUrl')
      .optional()
      .isURL()
      .withMessage('Cancel URL must be valid'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expires at must be a valid ISO date')
  ],

  getPaymentLinks: [
    param('invoiceId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Invoice ID is required')
  ]
}