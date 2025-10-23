import { Router } from 'express'
import { UserController, userValidation } from '../controllers/userController'
import { 
  requireAuth, 
  requireAdmin, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * User Management Routes
 */

// Get all users with filtering and pagination
router.get('/',
  requireAuth,
  requirePermission('users', 'read'),
  userValidation.getUsers,
  UserController.getUsers
)

// Get user by ID
router.get('/:userId',
  requireAuth,
  requirePermission('users', 'read'),
  userValidation.getUserById,
  UserController.getUser
)

// Create new user
router.post('/',
  requireAuth,
  requirePermission('users', 'create'),
  userValidation.createUser,
  auditLog('CREATE_USER', 'users'),
  UserController.createUser
)

// Update user
router.put('/:userId',
  requireAuth,
  requirePermission('users', 'update'),
  userValidation.updateUser,
  auditLog('UPDATE_USER', 'users'),
  UserController.updateUser
)

// Delete user
router.delete('/:userId',
  requireAuth,
  requirePermission('users', 'delete'),
  userValidation.deleteUser,
  auditLog('DELETE_USER', 'users'),
  UserController.deleteUser
)

// Get user with payment information
router.get('/:userId/payments',
  requireAuth,
  requirePermission('users', 'read'),
  userValidation.getUserById,
  UserController.getUserWithPayments
)

// Activate user after payment verification
router.post('/:userId/activate',
  requireAuth,
  requirePermission('users', 'activate'),
  userValidation.activateUser,
  auditLog('ACTIVATE_USER', 'users'),
  UserController.activateUser
)

// Get user statistics
router.get('/system/stats',
  requireAuth,
  requirePermission('users', 'read'),
  UserController.getUserStats
)

export default router