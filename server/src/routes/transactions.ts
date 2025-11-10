import { Router } from 'express'
import { TransactionController, transactionValidation } from '../controllers/transactionController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private (Cashier, Manager, Admin)
 */
router.post(
  '/',
  transactionValidation.createTransaction,
  TransactionController.createTransaction
)

/**
 * @route   GET /api/transactions
 * @desc    Get transactions with filtering and pagination
 * @access  Private (Manager, Admin)
 */
router.get(
  '/',
  transactionValidation.getTransactions,
  TransactionController.getTransactions
)

/**
 * @route   GET /api/transactions/:transactionId
 * @desc    Get transaction by ID
 * @access  Private (Cashier, Manager, Admin)
 */
router.get(
  '/:transactionId',
  TransactionController.getTransaction
)

/**
 * @route   POST /api/transactions/:transactionId/void
 * @desc    Void a transaction
 * @access  Private (Manager, Admin)
 */
router.post(
  '/:transactionId/void',
  transactionValidation.voidTransaction,
  TransactionController.voidTransaction
)

/**
 * @route   POST /api/transactions/:transactionId/refund
 * @desc    Process a refund for a transaction
 * @access  Private (Manager, Admin)
 */
router.post(
  '/:transactionId/refund',
  transactionValidation.processRefund,
  TransactionController.processRefund
)

export default router