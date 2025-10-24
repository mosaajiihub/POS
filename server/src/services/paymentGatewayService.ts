import { logger } from '../utils/logger'
import { prisma } from '../config/database'

export interface PaymentGatewayConfig {
  provider: 'stripe' | 'paypal' | 'square'
  apiKey: string
  webhookSecret?: string
  environment: 'sandbox' | 'production'
}

export interface PaymentLinkData {
  invoiceId: string
  amount: number
  currency: string
  description: string
  customerEmail?: string
  successUrl?: string
  cancelUrl?: string
  expiresAt?: Date
}

export interface PaymentLinkResult {
  success: boolean
  message: string
  paymentLink?: {
    id: string
    url: string
    expiresAt?: Date
    status: 'active' | 'expired' | 'completed' | 'cancelled'
  }
}

export interface WebhookEvent {
  id: string
  type: string
  data: any
  created: number
}

export interface PaymentGatewayResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Payment Gateway Integration Service
 * Handles payment gateway integrations for online invoice payments
 */
export class PaymentGatewayService {
  private static config: PaymentGatewayConfig | null = null

  /**
   * Initialize payment gateway configuration
   */
  static initialize(config: PaymentGatewayConfig): void {
    this.config = config
    logger.info(`Payment gateway initialized: ${config.provider} (${config.environment})`)
  }

  /**
   * Create payment link for invoice
   */
  static async createPaymentLink(linkData: PaymentLinkData): Promise<PaymentLinkResult> {
    try {
      if (!this.config) {
        return {
          success: false,
          message: 'Payment gateway not configured'
        }
      }

      // Validate invoice exists
      const invoice = await prisma.invoice.findUnique({
        where: { id: linkData.invoiceId },
        include: {
          customer: true,
          payments: true
        }
      })

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      // Check if invoice is already paid
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const remainingAmount = Number(invoice.totalAmount) - totalPaid

      if (remainingAmount <= 0) {
        return {
          success: false,
          message: 'Invoice is already fully paid'
        }
      }

      // Create payment link based on provider
      let paymentLinkResult: any

      switch (this.config.provider) {
        case 'stripe':
          paymentLinkResult = await this.createStripePaymentLink(linkData, invoice)
          break
        case 'paypal':
          paymentLinkResult = await this.createPayPalPaymentLink(linkData, invoice)
          break
        case 'square':
          paymentLinkResult = await this.createSquarePaymentLink(linkData, invoice)
          break
        default:
          return {
            success: false,
            message: `Unsupported payment provider: ${this.config.provider}`
          }
      }

      if (!paymentLinkResult.success) {
        return paymentLinkResult
      }

      // Store payment link in database
      const paymentLink = await prisma.paymentLink.create({
        data: {
          id: paymentLinkResult.id,
          invoiceId: linkData.invoiceId,
          provider: this.config.provider,
          url: paymentLinkResult.url,
          amount: linkData.amount,
          currency: linkData.currency,
          status: 'active',
          expiresAt: linkData.expiresAt,
          metadata: {
            gatewayId: paymentLinkResult.gatewayId,
            customerEmail: linkData.customerEmail
          }
        }
      })

      logger.info(`Payment link created for invoice ${linkData.invoiceId}: ${paymentLink.url}`)

      return {
        success: true,
        message: 'Payment link created successfully',
        paymentLink: {
          id: paymentLink.id,
          url: paymentLink.url,
          expiresAt: paymentLink.expiresAt,
          status: paymentLink.status as any
        }
      }
    } catch (error) {
      logger.error('Create payment link error:', error)
      return {
        success: false,
        message: 'An error occurred while creating payment link'
      }
    }
  }

  /**
   * Handle webhook events from payment gateway
   */
  static async handleWebhook(event: WebhookEvent): Promise<PaymentGatewayResult> {
    try {
      if (!this.config) {
        return {
          success: false,
          message: 'Payment gateway not configured'
        }
      }

      logger.info(`Processing webhook event: ${event.type}`)

      switch (this.config.provider) {
        case 'stripe':
          return await this.handleStripeWebhook(event)
        case 'paypal':
          return await this.handlePayPalWebhook(event)
        case 'square':
          return await this.handleSquareWebhook(event)
        default:
          return {
            success: false,
            message: `Unsupported payment provider: ${this.config.provider}`
          }
      }
    } catch (error) {
      logger.error('Handle webhook error:', error)
      return {
        success: false,
        message: 'An error occurred while processing webhook'
      }
    }
  }

  /**
   * Get payment link status
   */
  static async getPaymentLinkStatus(linkId: string): Promise<PaymentLinkResult> {
    try {
      const paymentLink = await prisma.paymentLink.findUnique({
        where: { id: linkId },
        include: {
          invoice: {
            include: {
              customer: true
            }
          }
        }
      })

      if (!paymentLink) {
        return {
          success: false,
          message: 'Payment link not found'
        }
      }

      // Check if link has expired
      if (paymentLink.expiresAt && paymentLink.expiresAt < new Date()) {
        await prisma.paymentLink.update({
          where: { id: linkId },
          data: { status: 'expired' }
        })

        return {
          success: true,
          message: 'Payment link status retrieved',
          paymentLink: {
            id: paymentLink.id,
            url: paymentLink.url,
            expiresAt: paymentLink.expiresAt,
            status: 'expired'
          }
        }
      }

      return {
        success: true,
        message: 'Payment link status retrieved',
        paymentLink: {
          id: paymentLink.id,
          url: paymentLink.url,
          expiresAt: paymentLink.expiresAt,
          status: paymentLink.status as any
        }
      }
    } catch (error) {
      logger.error('Get payment link status error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payment link status'
      }
    }
  }

  /**
   * Cancel payment link
   */
  static async cancelPaymentLink(linkId: string): Promise<PaymentGatewayResult> {
    try {
      if (!this.config) {
        return {
          success: false,
          message: 'Payment gateway not configured'
        }
      }

      const paymentLink = await prisma.paymentLink.findUnique({
        where: { id: linkId }
      })

      if (!paymentLink) {
        return {
          success: false,
          message: 'Payment link not found'
        }
      }

      if (paymentLink.status !== 'active') {
        return {
          success: false,
          message: 'Payment link is not active'
        }
      }

      // Cancel payment link with gateway
      let cancelResult: any

      switch (this.config.provider) {
        case 'stripe':
          cancelResult = await this.cancelStripePaymentLink(paymentLink)
          break
        case 'paypal':
          cancelResult = await this.cancelPayPalPaymentLink(paymentLink)
          break
        case 'square':
          cancelResult = await this.cancelSquarePaymentLink(paymentLink)
          break
        default:
          return {
            success: false,
            message: `Unsupported payment provider: ${this.config.provider}`
          }
      }

      if (!cancelResult.success) {
        return cancelResult
      }

      // Update payment link status
      await prisma.paymentLink.update({
        where: { id: linkId },
        data: { status: 'cancelled' }
      })

      logger.info(`Payment link cancelled: ${linkId}`)

      return {
        success: true,
        message: 'Payment link cancelled successfully'
      }
    } catch (error) {
      logger.error('Cancel payment link error:', error)
      return {
        success: false,
        message: 'An error occurred while cancelling payment link'
      }
    }
  }

  /**
   * Stripe payment link implementation
   */
  private static async createStripePaymentLink(linkData: PaymentLinkData, invoice: any): Promise<any> {
    try {
      // Mock Stripe implementation - replace with actual Stripe SDK calls
      const mockStripeResponse = {
        id: `pl_${Date.now()}`,
        url: `https://checkout.stripe.com/pay/${Date.now()}`,
        active: true,
        expires_at: linkData.expiresAt ? Math.floor(linkData.expiresAt.getTime() / 1000) : null
      }

      return {
        success: true,
        id: `stripe_${Date.now()}`,
        gatewayId: mockStripeResponse.id,
        url: mockStripeResponse.url
      }
    } catch (error) {
      logger.error('Create Stripe payment link error:', error)
      return {
        success: false,
        message: 'Failed to create Stripe payment link'
      }
    }
  }

  private static async handleStripeWebhook(event: WebhookEvent): Promise<PaymentGatewayResult> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleStripePaymentCompleted(event.data)
        case 'payment_intent.succeeded':
          return await this.handleStripePaymentSucceeded(event.data)
        case 'payment_intent.payment_failed':
          return await this.handleStripePaymentFailed(event.data)
        default:
          logger.info(`Unhandled Stripe webhook event: ${event.type}`)
          return { success: true, message: 'Event processed' }
      }
    } catch (error) {
      logger.error('Handle Stripe webhook error:', error)
      return {
        success: false,
        message: 'Failed to process Stripe webhook'
      }
    }
  }

  private static async handleStripePaymentCompleted(data: any): Promise<PaymentGatewayResult> {
    try {
      // Find payment link by gateway ID
      const paymentLink = await prisma.paymentLink.findFirst({
        where: {
          metadata: {
            path: ['gatewayId'],
            equals: data.id
          }
        },
        include: {
          invoice: true
        }
      })

      if (!paymentLink) {
        logger.warn(`Payment link not found for Stripe session: ${data.id}`)
        return { success: true, message: 'Payment link not found' }
      }

      // Record payment for invoice
      await prisma.invoicePayment.create({
        data: {
          invoiceId: paymentLink.invoiceId,
          amount: data.amount_total / 100, // Stripe amounts are in cents
          paymentMethod: 'DIGITAL',
          paymentDate: new Date(),
          reference: data.payment_intent,
          notes: `Online payment via ${paymentLink.provider}`
        }
      })

      // Update payment link status
      await prisma.paymentLink.update({
        where: { id: paymentLink.id },
        data: { status: 'completed' }
      })

      // Update invoice status if fully paid
      const invoice = paymentLink.invoice
      const totalPaid = await prisma.invoicePayment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true }
      })

      const totalPaidAmount = Number(totalPaid._sum.amount || 0)
      const isFullyPaid = totalPaidAmount >= Number(invoice.totalAmount)

      if (isFullyPaid) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            paymentMethod: 'DIGITAL'
          }
        })
      }

      logger.info(`Stripe payment completed for invoice ${invoice.invoiceNumber}`)

      return { success: true, message: 'Payment processed successfully' }
    } catch (error) {
      logger.error('Handle Stripe payment completed error:', error)
      return {
        success: false,
        message: 'Failed to process Stripe payment completion'
      }
    }
  }

  private static async handleStripePaymentSucceeded(data: any): Promise<PaymentGatewayResult> {
    // Similar implementation to payment completed
    return { success: true, message: 'Payment succeeded processed' }
  }

  private static async handleStripePaymentFailed(data: any): Promise<PaymentGatewayResult> {
    // Handle payment failure
    logger.warn(`Stripe payment failed: ${data.id}`)
    return { success: true, message: 'Payment failure processed' }
  }

  private static async cancelStripePaymentLink(paymentLink: any): Promise<any> {
    try {
      // Mock Stripe cancellation - replace with actual Stripe SDK calls
      return { success: true, message: 'Stripe payment link cancelled' }
    } catch (error) {
      logger.error('Cancel Stripe payment link error:', error)
      return {
        success: false,
        message: 'Failed to cancel Stripe payment link'
      }
    }
  }

  /**
   * PayPal payment link implementation (mock)
   */
  private static async createPayPalPaymentLink(linkData: PaymentLinkData, invoice: any): Promise<any> {
    try {
      // Mock PayPal implementation
      return {
        success: true,
        id: `paypal_${Date.now()}`,
        gatewayId: `PAYPAL-${Date.now()}`,
        url: `https://www.paypal.com/checkoutnow?token=${Date.now()}`
      }
    } catch (error) {
      logger.error('Create PayPal payment link error:', error)
      return {
        success: false,
        message: 'Failed to create PayPal payment link'
      }
    }
  }

  private static async handlePayPalWebhook(event: WebhookEvent): Promise<PaymentGatewayResult> {
    // Mock PayPal webhook handling
    return { success: true, message: 'PayPal webhook processed' }
  }

  private static async cancelPayPalPaymentLink(paymentLink: any): Promise<any> {
    // Mock PayPal cancellation
    return { success: true, message: 'PayPal payment link cancelled' }
  }

  /**
   * Square payment link implementation (mock)
   */
  private static async createSquarePaymentLink(linkData: PaymentLinkData, invoice: any): Promise<any> {
    try {
      // Mock Square implementation
      return {
        success: true,
        id: `square_${Date.now()}`,
        gatewayId: `SQ-${Date.now()}`,
        url: `https://squareup.com/checkout/${Date.now()}`
      }
    } catch (error) {
      logger.error('Create Square payment link error:', error)
      return {
        success: false,
        message: 'Failed to create Square payment link'
      }
    }
  }

  private static async handleSquareWebhook(event: WebhookEvent): Promise<PaymentGatewayResult> {
    // Mock Square webhook handling
    return { success: true, message: 'Square webhook processed' }
  }

  private static async cancelSquarePaymentLink(paymentLink: any): Promise<any> {
    // Mock Square cancellation
    return { success: true, message: 'Square payment link cancelled' }
  }
}