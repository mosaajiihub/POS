import { Router } from 'express'
import { FinancialDashboardController, financialDashboardValidation } from '../controllers/financialDashboardController'
import { 
  requireAuth, 
  requirePermission
} from '../middleware/auth'

const router = Router()

/**
 * Financial Dashboard Routes
 */

// Get comprehensive financial dashboard data
router.get('/overview',
  requireAuth,
  requirePermission('financial_dashboard', 'read'),
  financialDashboardValidation.getDashboardData,
  FinancialDashboardController.getDashboardData
)

export default router