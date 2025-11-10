import { Router } from 'express'
import { CustomerController, customerValidation } from '../controllers/customerController'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

/**
 * Customer Management Routes
 */

// GET /api/customers - Get all customers with filtering and pagination
router.get(
  '/',
  customerValidation.getCustomers,
  CustomerController.getCustomers
)

// GET /api/customers/active - Get active customers (for dropdowns)
router.get(
  '/active',
  CustomerController.getActiveCustomers
)

// GET /api/customers/search - Search customers
router.get(
  '/search',
  customerValidation.searchCustomers,
  CustomerController.searchCustomers
)

// GET /api/customers/:customerId - Get customer by ID
router.get(
  '/:customerId',
  customerValidation.getCustomer,
  CustomerController.getCustomer
)

// POST /api/customers - Create new customer
router.post(
  '/',
  customerValidation.createCustomer,
  CustomerController.createCustomer
)

// PUT /api/customers/:customerId - Update customer
router.put(
  '/:customerId',
  customerValidation.updateCustomer,
  CustomerController.updateCustomer
)

// DELETE /api/customers/:customerId - Delete customer
router.delete(
  '/:customerId',
  customerValidation.deleteCustomer,
  CustomerController.deleteCustomer
)

// GET /api/customers/:customerId/purchase-history - Get customer purchase history
router.get(
  '/:customerId/purchase-history',
  customerValidation.getCustomerPurchaseHistory,
  CustomerController.getCustomerPurchaseHistory
)

// GET /api/customers/:customerId/analytics - Get customer analytics
router.get(
  '/:customerId/analytics',
  customerValidation.getCustomerAnalytics,
  CustomerController.getCustomerAnalytics
)

// PUT /api/customers/:customerId/loyalty-points - Update customer loyalty points
router.put(
  '/:customerId/loyalty-points',
  customerValidation.updateLoyaltyPoints,
  CustomerController.updateLoyaltyPoints
)

export default router