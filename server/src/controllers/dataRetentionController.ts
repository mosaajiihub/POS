import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { DataRetentionService, DataCategory, DeletionMethod } from '../services/dataRetentionService'
import { logger } from '../utils/logger'

/**
 * Data Retention Controller
 * Handles HTTP requests for data retention and deletion operations
 */
export class DataRetentionController {
  /**
   * Initialize default retention policies
   */
  static async initializeDefaultPolicies(req: Request, res: Response) {
    try {
      const policies = await DataRetentionService.initializeDefaultPolicies()

      res.status(200).json({
        message: 'Default retention policies initialized successfully',
        data: policies
      })
    } catch (error) {
      logger.error('Initialize default policies controller error:', error)
      res.status(500).json({
        error: {
          code: 'INITIALIZATION_ERROR',
          message: error.message || 'Failed to initialize retention policies'
        }
      })
    }
  }

  /**
   * Create retention policy
   */
  static async createRetentionPolicy(req: Request, res: Response) {
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

      const { name, description, dataCategory, retentionPeriod, deletionMethod, isActive } = req.body

      const policy = await DataRetentionService.createRetentionPolicy({
        name,
        description,
        dataCategory,
        retentionPeriod,
        deletionMethod,
        isActive
      })

      res.status(201).json({
        message: 'Retention policy created successfully',
        data: policy
      })
    } catch (error) {
      logger.error('Create retention policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'POLICY_ERROR',
          message: error.message || 'Failed to create retention policy'
        }
      })
    }
  }

  /**
   * Get retention policies
   */
  static async getRetentionPolicies(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        })
      }

      const { activeOnly } = req.query

      const policies = await DataRetentionService.getRetentionPolicies(activeOnly === 'true')

      res.status(200).json({
        message: 'Retention policies retrieved successfully',
        data: policies
      })
    } catch (error) {
      logger.error('Get retention policies controller error:', error)
      res.status(500).json({
        error: {
          code: 'POLICY_ERROR',
          message: error.message || 'Failed to retrieve retention policies'
        }
      })
    }
  }

  /**
   * Apply retention policy
   */
  static async applyRetentionPolicy(req: Request, res: Response) {
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

      const { dataCategory } = req.body

      const lifecycleStatuses = await DataRetentionService.applyRetentionPolicy(dataCategory)

      res.status(200).json({
        message: 'Retention policy applied successfully',
        data: lifecycleStatuses
      })
    } catch (error) {
      logger.error('Apply retention policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'POLICY_ERROR',
          message: error.message || 'Failed to apply retention policy'
        }
      })
    }
  }

  /**
   * Execute scheduled deletions
   */
  static async executeDeletions(req: Request, res: Response) {
    try {
      const jobs = await DataRetentionService.executeDeletions()

      res.status(200).json({
        message: 'Deletion jobs executed successfully',
        data: jobs
      })
    } catch (error) {
      logger.error('Execute deletions controller error:', error)
      res.status(500).json({
        error: {
          code: 'DELETION_ERROR',
          message: error.message || 'Failed to execute deletions'
        }
      })
    }
  }

  /**
   * Securely delete data
   */
  static async secureDelete(req: Request, res: Response) {
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

      const { dataId, dataCategory, deletionMethod } = req.body

      const result = await DataRetentionService.secureDelete(dataId, dataCategory, deletionMethod)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETION_ERROR',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        data: { dataId, deletionMethod }
      })
    } catch (error) {
      logger.error('Secure delete controller error:', error)
      res.status(500).json({
        error: {
          code: 'DELETION_ERROR',
          message: error.message || 'Failed to delete data'
        }
      })
    }
  }

  /**
   * Configure data residency
   */
  static async configureDataResidency(req: Request, res: Response) {
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

      const { region, dataTypes, restrictions, complianceRequirements } = req.body

      await DataRetentionService.configureDataResidency({
        region,
        dataTypes,
        restrictions,
        complianceRequirements
      })

      res.status(200).json({
        message: 'Data residency configured successfully',
        data: { region }
      })
    } catch (error) {
      logger.error('Configure data residency controller error:', error)
      res.status(500).json({
        error: {
          code: 'RESIDENCY_ERROR',
          message: error.message || 'Failed to configure data residency'
        }
      })
    }
  }

  /**
   * Generate retention report
   */
  static async generateRetentionReport(req: Request, res: Response) {
    try {
      const report = await DataRetentionService.generateRetentionReport()

      res.status(200).json({
        message: 'Retention report generated successfully',
        data: report
      })
    } catch (error) {
      logger.error('Generate retention report controller error:', error)
      res.status(500).json({
        error: {
          code: 'REPORT_ERROR',
          message: error.message || 'Failed to generate retention report'
        }
      })
    }
  }
}

/**
 * Validation rules for data retention endpoints
 */
export const dataRetentionValidation = {
  createRetentionPolicy: [
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name is required and must be less than 100 characters'),
    body('description')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description is required and must be less than 500 characters'),
    body('dataCategory')
      .isIn(['USER_DATA', 'TRANSACTION_DATA', 'AUDIT_LOGS', 'PAYMENT_DATA', 'CUSTOMER_DATA', 'INVOICE_DATA', 'BACKUP_DATA'])
      .withMessage('Invalid data category'),
    body('retentionPeriod')
      .isInt({ min: 1 })
      .withMessage('Retention period must be a positive integer (days)'),
    body('deletionMethod')
      .isIn(['SOFT_DELETE', 'HARD_DELETE', 'ANONYMIZE', 'ARCHIVE'])
      .withMessage('Invalid deletion method'),
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],

  getRetentionPolicies: [
    query('activeOnly')
      .optional()
      .isBoolean()
      .withMessage('activeOnly must be a boolean')
  ],

  applyRetentionPolicy: [
    body('dataCategory')
      .isIn(['USER_DATA', 'TRANSACTION_DATA', 'AUDIT_LOGS', 'PAYMENT_DATA', 'CUSTOMER_DATA', 'INVOICE_DATA', 'BACKUP_DATA'])
      .withMessage('Invalid data category')
  ],

  secureDelete: [
    body('dataId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Data ID is required'),
    body('dataCategory')
      .isIn(['USER_DATA', 'TRANSACTION_DATA', 'AUDIT_LOGS', 'PAYMENT_DATA', 'CUSTOMER_DATA', 'INVOICE_DATA', 'BACKUP_DATA'])
      .withMessage('Invalid data category'),
    body('deletionMethod')
      .isIn(['SOFT_DELETE', 'HARD_DELETE', 'ANONYMIZE', 'ARCHIVE'])
      .withMessage('Invalid deletion method')
  ],

  configureDataResidency: [
    body('region')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Region is required'),
    body('dataTypes')
      .isArray()
      .withMessage('Data types must be an array'),
    body('restrictions')
      .isArray()
      .withMessage('Restrictions must be an array'),
    body('complianceRequirements')
      .isArray()
      .withMessage('Compliance requirements must be an array')
  ]
}
