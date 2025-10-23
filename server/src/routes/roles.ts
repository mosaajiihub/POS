import { Router } from 'express'
import { RoleController, roleValidation } from '../controllers/roleController'
import { 
  requireAuth, 
  requireAdmin, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Role Management Routes
 */

// Get all roles
router.get('/',
  requireAuth,
  requirePermission('roles', 'read'),
  RoleController.getRoles
)

// Get role by ID
router.get('/:roleId',
  requireAuth,
  requirePermission('roles', 'read'),
  roleValidation.getRoleById,
  RoleController.getRole
)

// Create new role
router.post('/',
  requireAuth,
  requirePermission('roles', 'create'),
  roleValidation.createRole,
  auditLog('CREATE_ROLE', 'roles'),
  RoleController.createRole
)

// Update role
router.put('/:roleId',
  requireAuth,
  requirePermission('roles', 'update'),
  roleValidation.updateRole,
  auditLog('UPDATE_ROLE', 'roles'),
  RoleController.updateRole
)

// Delete role
router.delete('/:roleId',
  requireAuth,
  requirePermission('roles', 'delete'),
  roleValidation.deleteRole,
  auditLog('DELETE_ROLE', 'roles'),
  RoleController.deleteRole
)

// Get all permissions
router.get('/system/permissions',
  requireAuth,
  requirePermission('roles', 'read'),
  RoleController.getPermissions
)

// Assign role to user
router.post('/assign',
  requireAuth,
  requirePermission('roles', 'assign'),
  roleValidation.assignRole,
  auditLog('ASSIGN_ROLE', 'user_role_assignments'),
  RoleController.assignRoleToUser
)

// Remove role from user
router.post('/remove',
  requireAuth,
  requirePermission('roles', 'assign'),
  roleValidation.removeRole,
  auditLog('REMOVE_ROLE', 'user_role_assignments'),
  RoleController.removeRoleFromUser
)

// Get user roles and permissions
router.get('/user/:userId',
  requireAuth,
  requirePermission('users', 'read'),
  roleValidation.getUserRoles,
  RoleController.getUserRolesAndPermissions
)

// Initialize system roles and permissions (admin only)
router.post('/system/initialize',
  requireAdmin,
  auditLog('INITIALIZE_SYSTEM_ROLES', 'roles'),
  RoleController.initializeSystem
)

export default router