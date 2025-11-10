import { Router } from 'express'
import { PaymentGatewayController, paymentGatewayValidation } from '../controllers/paymentGatewayController'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * Payment Gateway Routes
 */

// POST /api/payment-gateway/invoices/:invoiceId/payment-links - Create payment link for invoice
router.post(
  '/invoices/:invoiceId/payment-links',
  requireAuth,
  paymentGatewayValidation.createPaymentLink,
  PaymentGatewayController.createPaymentLink
)

// GET /api/payment-gateway/payment-links/:linkId/status - Get payment link status
router.get(
  '/payment-links/:linkId/status',
  requireAuth,
  paymentGatewayValidation.getPaymentLinkStatus,
  PaymentGatewayController.getPaymentLinkStatus
)

// POST /api/payment-gateway/payment-links/:linkId/cancel - Cancel payment link
router.post(
  '/payment-links/:linkId/cancel',
  requireAuth,
  paymentGatewayValidation.cancelPaymentLink,
  PaymentGatewayController.cancelPaymentLink
)

// POST /api/payment-gateway/webhook - Handle payment gateway webhook (no auth required)
router.post(
  '/webhook',
  PaymentGatewayController.handleWebhook
)

export default router