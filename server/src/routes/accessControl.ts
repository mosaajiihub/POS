import { Router } from 'express'
import { AccessControlController, accessControlValidation } from '../controllers/accessControlController'
import { requireAuth, requirePermission } from '../middleware/auth'

const router = Router()

/**
 * Access Control Routes
 * All routes require authentication and appropriate permissions
 */

// Check single permission
router.post(
  '/users/:userId/check-permission',
  requireAuth,
  accessControlValidation.checkPermission,
  AccessControlController.checkPermission
)

// Check multiple permissions
router.post(
  '/users/:userId/check-permissions',
  requireAuth,
  accessControlValidation.checkMultiplePermissions,
  AccessControlController.checkMultiplePermissions
)

// Get effective permissions
router.get(
  '/users/:userId/effective-permissions',
  requireAuth,
  accessControlValidation.getUserId,
  AccessControlController.getEffectivePermissions
)

// Get permission inheritance
router.get(
  '/users/:userId/permission-inheritance',
  requireAuth,
  accessControlValidation.getUserId,
  AccessControlController.getPermissionInheritance
)

// Get UI component permissions
router.post(
  '/users/:userId/ui-permissions',
  requireAuth,
  accessControlValidation.getUIComponentPermissions,
  AccessControlController.getUIComponentPermissions
)

// Assign role dynamically
router.post(
  '/roles/assign',
  requirePermission('roles', 'assign'),
  accessControlValidation.assignRoleDynamic,
  AccessControlController.assignRoleDynamic
)

// Remove role dynamically
router.post(
  '/roles/remove',
  requirePermission('roles', 'assign'),
  accessControlValidation.removeRoleDynamic,
  AccessControlController.removeRoleDynamic
)

// Get permission delegation chain
router.get(
  '/users/:userId/permission-delegation',
  requireAuth,
  accessControlValidation.getPermissionDelegation,
  AccessControlController.getPermissionDelegation
)

// Bulk check permissions
router.post(
  '/users/:userId/bulk-check-permissions',
  requireAuth,
  accessControlValidation.bulkCheckPermissions,
  AccessControlController.bulkCheckPermissions
)

export default router
