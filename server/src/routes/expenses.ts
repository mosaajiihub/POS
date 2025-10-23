import { Router } from 'express'
import { ExpenseController, expenseValidation } from '../controllers/expenseController'
import { 
  requireAuth, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Expense Management Routes
 */

// Get all expenses with filtering and pagination
router.get('/',
  requireAuth,
  requirePermission('expenses', 'read'),
  expenseValidation.getExpenses,
  ExpenseController.getExpenses
)

// Get expense by ID
router.get('/:expenseId',
  requireAuth,
  requirePermission('expenses', 'read'),
  expenseValidation.getExpense,
  ExpenseController.getExpense
)

// Create new expense
router.post('/',
  requireAuth,
  requirePermission('expenses', 'create'),
  expenseValidation.createExpense,
  auditLog('CREATE_EXPENSE', 'expenses'),
  ExpenseController.createExpense
)

// Update expense
router.put('/:expenseId',
  requireAuth,
  requirePermission('expenses', 'update'),
  expenseValidation.updateExpense,
  auditLog('UPDATE_EXPENSE', 'expenses'),
  ExpenseController.updateExpense
)

// Delete expense
router.delete('/:expenseId',
  requireAuth,
  requirePermission('expenses', 'delete'),
  expenseValidation.deleteExpense,
  auditLog('DELETE_EXPENSE', 'expenses'),
  ExpenseController.deleteExpense
)

// Get expense categories
router.get('/system/categories',
  requireAuth,
  requirePermission('expenses', 'read'),
  ExpenseController.getExpenseCategories
)

// Get expense vendors
router.get('/system/vendors',
  requireAuth,
  requirePermission('expenses', 'read'),
  ExpenseController.getExpenseVendors
)

// Generate expense report
router.get('/reports/summary',
  requireAuth,
  requirePermission('expenses', 'read'),
  expenseValidation.generateExpenseReport,
  ExpenseController.generateExpenseReport
)

export default router