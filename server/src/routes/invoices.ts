import { Router } from 'express'
import { InvoiceController, invoiceValidation } from '../controllers/invoiceController'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

/**
 * Invoice Management Routes
 */

// GET /api/invoices - Get all invoices with filtering and pagination
router.get(
  '/',
  invoiceValidation.getInvoices,
  InvoiceController.getInvoices
)

// GET /api/invoices/overdue - Get overdue invoices
router.get(
  '/overdue',
  InvoiceController.getOverdueInvoices
)

// GET /api/invoices/analytics - Get invoice analytics
router.get(
  '/analytics',
  invoiceValidation.getInvoiceAnalytics,
  InvoiceController.getInvoiceAnalytics
)

// POST /api/invoices/generate-recurring - Generate recurring invoices
router.post(
  '/generate-recurring',
  InvoiceController.generateRecurringInvoices
)

// GET /api/invoices/:invoiceId - Get invoice by ID
router.get(
  '/:invoiceId',
  invoiceValidation.getInvoice,
  InvoiceController.getInvoice
)

// POST /api/invoices - Create new invoice
router.post(
  '/',
  invoiceValidation.createInvoice,
  InvoiceController.createInvoice
)

// PUT /api/invoices/:invoiceId - Update invoice
router.put(
  '/:invoiceId',
  invoiceValidation.updateInvoice,
  InvoiceController.updateInvoice
)

// DELETE /api/invoices/:invoiceId - Delete invoice
router.delete(
  '/:invoiceId',
  invoiceValidation.deleteInvoice,
  InvoiceController.deleteInvoice
)

// POST /api/invoices/:invoiceId/payments - Record payment for invoice
router.post(
  '/:invoiceId/payments',
  invoiceValidation.recordPayment,
  InvoiceController.recordPayment
)

// POST /api/invoices/:invoiceId/send-reminder - Send payment reminder
router.post(
  '/:invoiceId/send-reminder',
  invoiceValidation.sendPaymentReminder,
  InvoiceController.sendPaymentReminder
)

// POST /api/invoices/send-automated-reminders - Send automated payment reminders
router.post(
  '/send-automated-reminders',
  InvoiceController.sendAutomatedReminders
)

// PUT /api/invoices/:invoiceId/status - Update invoice status
router.put(
  '/:invoiceId/status',
  invoiceValidation.updateInvoiceStatus,
  InvoiceController.updateInvoiceStatus
)

// POST /api/invoices/update-all-statuses - Bulk update all invoice statuses
router.post(
  '/update-all-statuses',
  InvoiceController.updateAllInvoiceStatuses
)

// GET /api/invoices/payment-reconciliation - Get payment reconciliation report
router.get(
  '/payment-reconciliation',
  invoiceValidation.getPaymentReconciliation,
  InvoiceController.getPaymentReconciliation
)

// POST /api/invoices/:invoiceId/payment-links - Create payment link for invoice
router.post(
  '/:invoiceId/payment-links',
  invoiceValidation.createPaymentLink,
  InvoiceController.createPaymentLink
)

// GET /api/invoices/:invoiceId/payment-links - Get payment links for invoice
router.get(
  '/:invoiceId/payment-links',
  invoiceValidation.getPaymentLinks,
  InvoiceController.getPaymentLinks
)

export default router