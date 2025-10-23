import { Request, Response } from 'express'
import { body, param, validationResult } from 'express-validator'
import { RoleService } from '../services/roleService'
import { logger } from '../utils/logger'

/**
 * Role Management Controller
 * Handles HTTP requests for role and permission operations
 */
export class RoleController {
  /**
   * Get all roles
   */
  static async getRoles(req: Request, res: Response) {
    try {
      const result = await RoleService.getRoles()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_ROLES_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        roles: result.roles,
        total: result.total
      })
    } catch (error) {
      logger.error('Get roles controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get role by ID
   */
  static async getRole(req: Request, res: Response) {
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

      const { roleId } = req.params

      const result = await RoleService.getRole(roleId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'ROLE_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        role: result.role
      })
    } catch (error) {
      logger.error('Get role controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new role
   */
  static async createRole(req: Request, res: Response) {
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

      const { name, displayName, description, permissions } = req.body
      const creatorId = req.user!.userId

      const result = await RoleService.createRole(
        { name, displayName, description, permissions },
        creatorId
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_ROLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        role: result.role
      })
    } catch (error) {
      logger.error('Create role controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update role
   */
  static async updateRole(req: Request, res: Response) {
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

      const { roleId } = req.params
      const { name, displayName, description, isActive, permissions } = req.body
      const updaterId = req.user!.userId

      const result = await RoleService.updateRole(
        roleId,
        { name, displayName, description, isActive, permissions },
        updaterId
      )

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_ROLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        role: result.role
      })
    } catch (error) {
      logger.error('Update role controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete role
   */
  static async deleteRole(req: Request, res: Response) {
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

      const { roleId } = req.params
      const deleterId = req.user!.userId

      const result = await RoleService.deleteRole(roleId, deleterId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_ROLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete role controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get all permissions
   */
  static async getPermissions(req: Request, res: Response) {
    try {
      const result = await RoleService.getPermissions()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_PERMISSIONS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        permissions: result.permissions,
        total: result.total
      })
    } catch (error) {
      logger.error('Get permissions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(req: Request, res: Response) {
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

      const { userId, roleId } = req.body
      const assignerId = req.user!.userId

      const result = await RoleService.assignRoleToUser(userId, roleId, assignerId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'ASSIGN_ROLE_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        assignment: result.assignment
      })
    } catch (error) {
      logger.error('Assign role to user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(req: Request, res: Response) {
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

      const { userId, roleId } = req.body
      const removerId = req.user!.userId

      const result = await RoleService.removeRoleFromUser(userId, roleId, removerId)

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
      logger.error('Remove role from user controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get user roles and permissions
   */
  static async getUserRolesAndPermissions(req: Request, res: Response) {
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

      const result = await RoleService.getUserRolesAndPermissions(userId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_USER_ROLES_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        roles: result.roles,
        permissions: result.permissions
      })
    } catch (error) {
      logger.error('Get user roles and permissions controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Initialize system roles and permissions
   */
  static async initializeSystem(req: Request, res: Response) {
    try {
      await RoleService.initializeSystemRoles()

      res.status(200).json({
        message: 'System roles and permissions initialized successfully'
      })
    } catch (error) {
      logger.error('Initialize system controller error:', error)
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
 * Validation rules for role endpoints
 */
export const roleValidation = {
  getRoleById: [
    param('roleId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Role ID is required')
  ],

  createRole: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Role name is required and must contain only letters, numbers, underscores, and hyphens'),
    body('displayName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name is required and must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
  ],

  updateRole: [
    param('roleId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Role ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Role name must contain only letters, numbers, underscores, and hyphens'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
  ],

  deleteRole: [
    param('roleId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Role ID is required')
  ],

  assignRole: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('roleId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Role ID is required')
  ],

  removeRole: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('roleId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Role ID is required')
  ],

  getUserRoles: [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required')
  ]
}