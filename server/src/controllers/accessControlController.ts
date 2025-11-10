import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { AccessControlService } from '../services/accessControlService'
import { logger } from '../utils/logger'

/**
 * Access Control Controller
 * Handles HTTP requests for fine-grained access control operations
 */
export class AccessControlController {
  /**
   * Check if user has specific permission
   */
  static async checkPermission(req: Request, res: Response) {
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
      const { resource, action, context } = req.body

      const result = await AccessControlService.checkPermission(userId, {
        resource,
        action,
        context
      })

      res.status(200).json({
        granted: result.granted,
        reason: result.reason,
        effectivePermissions: result.effectivePermissions
      })
    } catch (error) {
      logger.error('Check permission controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Check multiple permissions
   */
  static async checkMultiplePermissions(req: Request, res: Response) {
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
      const { permissions, requireAll } = req.body

      const result = await AccessControlService.checkMultiplePermissions(
        userId,
        permissions,
        requireAll
      )

      res.status(200).json({
        granted: result.granted,
        reason: result.reason
      })
    } catch (error) {
      logger.error('Check multiple permissions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get effective permissions for user
   */
  static async getEffectivePermissions(req: Request, res: Response) {
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

      const permissions = await AccessControlService.getEffectivePermissions(userId)

      res.status(200).json({
        message: 'Effective permissions retrieved successfully',
        permissions,
        total: permissions.length
      })
    } catch (error) {
      logger.error('Get effective permissions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get permission inheritance tree
   */
  static async getPermissionInheritance(req: Request, res: Response) {
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

      const inheritance = await AccessControlService.getPermissionInheritance(userId)

      res.status(200).json({
        message: 'Permission inheritance retrieved successfully',
        inheritance
      })
    } catch (error) {
      logger.error('Get permission inheritance controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get UI component permissions
   */
  static async getUIComponentPermissions(req: Request, res: Response) {
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
      const { components } = req.body

      const permissions = await AccessControlService.getUIComponentPermissions(
        userId,
        components
      )

      res.status(200).json({
        message: 'UI component permissions retrieved successfully',
        permissions
      })
    } catch (error) {
      logger.error('Get UI component permissions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Assign role dynamically
   */
  static async assignRoleDynamic(req: Request, res: Response) {
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

      const { userId, roleId, expiresAt, conditions, reason } = req.body
      const assignerId = req.user!.userId

      const result = await AccessControlService.assignRoleDynamic(
        userId,
        roleId,
        assignerId,
        { expiresAt, conditions, reason }
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'ASSIGN_ROLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Assign role dynamic controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Remove role dynamically
   */
  static async removeRoleDynamic(req: Request, res: Response) {
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

      const { userId, roleId, reason } = req.body
      const removerId = req.user!.userId

      const result = await AccessControlService.removeRoleDynamic(
        userId,
        roleId,
        removerId,
        reason
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'REMOVE_ROLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Remove role dynamic controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get permission delegation chain
   */
  static async getPermissionDelegation(req: Request, res: Response) {
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
      const { permission } = req.query

      const result = await AccessControlService.getPermissionDelegation(
        userId,
        permission as string
      )

      res.status(200).json({
        message: 'Permission delegation retrieved successfully',
        delegated: result.delegated,
        chain: result.chain
      })
    } catch (error) {
      logger.error('Get permission delegation controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Bulk check permissions
   */
  static async bulkCheckPermissions(req: Request, res: Response) {
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
      const { permissions } = req.body

      const results = await AccessControlService.bulkCheckPermissions(userId, permissions)

      res.status(200).json({
        message: 'Bulk permission check completed',
        results
      })
    } catch (error) {
      logger.error('Bulk check permissions controller error:', error)
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
 * Validation rules for access control endpoints
 */
export const accessControlValidation = {
  checkPermission: [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    body('resource').isString().notEmpty().withMessage('Resource is required'),
    body('action').isString().notEmpty().withMessage('Action is required'),
    body('context').optional().isObject().withMessage('Context must be an object')
  ],

  checkMultiplePermissions: [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    body('permissions').isArray().notEmpty().withMessage('Permissions array is required'),
    body('permissions.*.resource').isString().notEmpty().withMessage('Resource is required'),
    body('permissions.*.action').isString().notEmpty().withMessage('Action is required'),
    body('requireAll').optional().isBoolean().withMessage('RequireAll must be boolean')
  ],

  getUserId: [
    param('userId').isString().notEmpty().withMessage('User ID is required')
  ],

  getUIComponentPermissions: [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    body('components').isArray().notEmpty().withMessage('Components array is required')
  ],

  assignRoleDynamic: [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('roleId').isString().notEmpty().withMessage('Role ID is required'),
    body('expiresAt').optional().isISO8601().withMessage('ExpiresAt must be valid date'),
    body('conditions').optional().isObject().withMessage('Conditions must be an object'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],

  removeRoleDynamic: [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('roleId').isString().notEmpty().withMessage('Role ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],

  getPermissionDelegation: [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('permission').isString().notEmpty().withMessage('Permission is required')
  ],

  bulkCheckPermissions: [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    body('permissions').isArray().notEmpty().withMessage('Permissions array is required')
  ]
}
