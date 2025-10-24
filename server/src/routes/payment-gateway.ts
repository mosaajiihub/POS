import { Router } from 'express'
import { PaymentGatewayController, paymentGatewayValidation } from '../controllers/paymentGatewayController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

/**
 * Payment Gateway Routes
 */

// POST /api/payment-gateway/invoices/:invoiceId/payment-links - Create payment link for invoice
router.post(
  '/invoices/:invoiceId/payment-links',
  authenticateToken,
  paymentGatewayValidation.createPaymentLink,
  PaymentGatewayController.createPaymentLink
)

// GET /api/payment-gateway/payment-links/:linkId/status - Get payment link status
router.get(
  '/payment-links/:linkId/status',
  authenticateToken,
  paymentGatewayValidation.getPaymentLinkStatus,
  PaymentGatewayController.getPaymentLinkStatus
)

// POST /api/payment-gateway/payment-links/:linkId/cancel - Cancel payment link
router.post(
  '/payment-links/:linkId/cancel',
  authenticateToken,
  paymentGatewayValidation.cancelPaymentLink,
  PaymentGatewayController.cancelPaymentLink
)

// POST /api/payment-gateway/webhook - Handle payment gateway webhook (no auth required)
router.post(
  '/webhook',
  PaymentGatewayController.handleWebhook
)

export default router