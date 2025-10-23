import { Router } from 'express'
import { CategoryController, categoryValidation } from '../controllers/categoryController'
import { 
  requireAuth, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Category Management Routes
 */

// Get all categories with filtering and pagination
router.get('/',
  requireAuth,
  requirePermission('categories', 'read'),
  categoryValidation.getCategories,
  CategoryController.getCategories
)

// Get category by ID
router.get('/:categoryId',
  requireAuth,
  requirePermission('categories', 'read'),
  categoryValidation.getCategory,
  CategoryController.getCategory
)

// Create new category
router.post('/',
  requireAuth,
  requirePermission('categories', 'create'),
  categoryValidation.createCategory,
  auditLog('CREATE_CATEGORY', 'categories'),
  CategoryController.createCategory
)

// Update category
router.put('/:categoryId',
  requireAuth,
  requirePermission('categories', 'update'),
  categoryValidation.updateCategory,
  auditLog('UPDATE_CATEGORY', 'categories'),
  CategoryController.updateCategory
)

// Delete category
router.delete('/:categoryId',
  requireAuth,
  requirePermission('categories', 'delete'),
  categoryValidation.deleteCategory,
  auditLog('DELETE_CATEGORY', 'categories'),
  CategoryController.deleteCategory
)

// Get active categories (for dropdowns)
router.get('/system/active',
  requireAuth,
  requirePermission('categories', 'read'),
  CategoryController.getActiveCategories
)

export default router