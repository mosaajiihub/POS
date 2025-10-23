import { Router } from 'express'
import { PaymentController, paymentValidation } from '../controllers/paymentController'
import { 
  requireAuth, 
  requireAdmin, 
  requireManager,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Payment Management Routes
 */

// Record new payment (admin only)
router.post('/record',
  requireAdmin,
  paymentValidation.recordPayment,
  auditLog('RECORD_PAYMENT', 'payments'),
  PaymentController.recordPayment
)

// Verify or reject payment (admin only)
router.post('/verify',
  requireAdmin,
  paymentValidation.verifyPayment,
  auditLog('VERIFY_PAYMENT', 'payments'),
  PaymentController.verifyPayment
)

// Get payment by ID (admin/manager)
router.get('/:paymentId',
  requireManager,
  PaymentController.getPayment
)

// Get payments with filtering (admin/manager)
router.get('/',
  requireManager,
  paymentValidation.getPayments,
  PaymentController.getPayments
)

// Get payment history (admin/manager)
router.get('/:paymentId/history',
  requireManager,
  PaymentController.getPaymentHistory
)

// Get payment statistics (admin/manager)
router.get('/stats/summary',
  requireManager,
  paymentValidation.getPaymentStats,
  PaymentController.getPaymentStats
)

export default router