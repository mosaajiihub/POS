import { Request, Response } from 'express'
import { body, param, validationResult } from 'express-validator'
import { ABACService } from '../services/abacService'
import { logger } from '../utils/logger'

/**
 * ABAC Controller
 * Handles HTTP requests for attribute-based access control operations
 */
export class ABACController {
  /**
   * Evaluate access request
   */
  static async evaluateAccess(req: Request, res: Response) {
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

      const context = req.body

      const result = await ABACService.evaluateAccess(context)

      res.status(200).json({
        decision: result.decision,
        matchedPolicies: result.matchedPolicies,
        reason: result.reason,
        evaluatedConditions: result.evaluatedConditions
      })
    } catch (error) {
      logger.error('Evaluate access controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Register new policy
   */
  static async registerPolicy(req: Request, res: Response) {
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

      const policyData = req.body

      const policy = await ABACService.registerPolicy(policyData)

      res.status(201).json({
        message: 'Policy registered successfully',
        policy
      })
    } catch (error) {
      logger.error('Register policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update policy
   */
  static async updatePolicy(req: Request, res: Response) {
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

      const { policyId } = req.params
      const updates = req.body

      const policy = await ABACService.updatePolicy(policyId, updates)

      if (!policy) {
        return res.status(404).json({
          error: {
            code: 'POLICY_NOT_FOUND',
            message: 'Policy not found'
          }
        })
      }

      res.status(200).json({
        message: 'Policy updated successfully',
        policy
      })
    } catch (error) {
      logger.error('Update policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete policy
   */
  static async deletePolicy(req: Request, res: Response) {
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

      const { policyId } = req.params

      const deleted = await ABACService.deletePolicy(policyId)

      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'POLICY_NOT_FOUND',
            message: 'Policy not found'
          }
        })
      }

      res.status(200).json({
        message: 'Policy deleted successfully'
      })
    } catch (error) {
      logger.error('Delete policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get all policies
   */
  static async getAllPolicies(req: Request, res: Response) {
    try {
      const policies = await ABACService.getAllPolicies()

      res.status(200).json({
        message: 'Policies retrieved successfully',
        policies,
        total: policies.length
      })
    } catch (error) {
      logger.error('Get all policies controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get policy by ID
   */
  static async getPolicy(req: Request, res: Response) {
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

      const { policyId } = req.params

      const policy = await ABACService.getPolicy(policyId)

      if (!policy) {
        return res.status(404).json({
          error: {
            code: 'POLICY_NOT_FOUND',
            message: 'Policy not found'
          }
        })
      }

      res.status(200).json({
        message: 'Policy retrieved successfully',
        policy
      })
    } catch (error) {
      logger.error('Get policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Test policy against context
   */
  static async testPolicy(req: Request, res: Response) {
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

      const { policyId } = req.params
      const context = req.body

      const result = await ABACService.testPolicy(policyId, context)

      res.status(200).json({
        decision: result.decision,
        matchedPolicies: result.matchedPolicies,
        reason: result.reason,
        evaluatedConditions: result.evaluatedConditions
      })
    } catch (error) {
      logger.error('Test policy controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Initialize ABAC system
   */
  static async initialize(req: Request, res: Response) {
    try {
      await ABACService.initialize()

      res.status(200).json({
        message: 'ABAC system initialized successfully'
      })
    } catch (error) {
      logger.error('Initialize ABAC controller error:', error)
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
 * Validation rules for ABAC endpoints
 */
export const abacValidation = {
  evaluateAccess: [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('resource').isString().notEmpty().withMessage('Resource is required'),
    body('action').isString().notEmpty().withMessage('Action is required'),
    body('resourceAttributes').optional().isObject().withMessage('Resource attributes must be an object'),
    body('userAttributes').optional().isObject().withMessage('User attributes must be an object'),
    body('environment').optional().isObject().withMessage('Environment must be an object')
  ],

  registerPolicy: [
    body('name').isString().notEmpty().withMessage('Policy name is required'),
    body('resource').isString().notEmpty().withMessage('Resource is required'),
    body('action').isString().notEmpty().withMessage('Action is required'),
    body('effect').isIn(['ALLOW', 'DENY']).withMessage('Effect must be ALLOW or DENY'),
    body('conditions').isArray().notEmpty().withMessage('Conditions array is required'),
    body('priority').isInt({ min: 0 }).withMessage('Priority must be a positive integer'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],

  updatePolicy: [
    param('policyId').isString().notEmpty().withMessage('Policy ID is required'),
    body('name').optional().isString().withMessage('Policy name must be a string'),
    body('resource').optional().isString().withMessage('Resource must be a string'),
    body('action').optional().isString().withMessage('Action must be a string'),
    body('effect').optional().isIn(['ALLOW', 'DENY']).withMessage('Effect must be ALLOW or DENY'),
    body('conditions').optional().isArray().withMessage('Conditions must be an array'),
    body('priority').optional().isInt({ min: 0 }).withMessage('Priority must be a positive integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],

  policyId: [
    param('policyId').isString().notEmpty().withMessage('Policy ID is required')
  ],

  testPolicy: [
    param('policyId').isString().notEmpty().withMessage('Policy ID is required'),
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('resource').isString().notEmpty().withMessage('Resource is required'),
    body('action').isString().notEmpty().withMessage('Action is required'),
    body('resourceAttributes').optional().isObject().withMessage('Resource attributes must be an object'),
    body('userAttributes').optional().isObject().withMessage('User attributes must be an object'),
    body('environment').optional().isObject().withMessage('Environment must be an object')
  ]
}
