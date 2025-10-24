import { Subscription, Customer, Invoice } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { InvoiceService } from './invoiceService'
import { PaymentGatewayService } from './paymentGatewayService'
import { NotificationService } from './notificationService'

export interface CreateSubscriptionData {
  customerId: string
  planName: string
  planDescription?: string
  amount: number
  currency?: string
  interval: 'monthly' | 'quarterly' | 'yearly'
  startDate?: Date
  trialEndDate?: Date
  metadata?: any
}

export interface UpdateSubscriptionData {
  planName?: string
  planDescription?: string
  amount?: number
  currency?: string
  interval?: 'monthly' | 'quarterly' | 'yearly'
  status?: 'active' | 'paused' | 'cancelled' | 'expired'
  endDate?: Date
  cancellationReason?: string
  metadata?: any
}

export interface SubscriptionResult {
  success: boolean
  message: string
  subscription?: Subscription & {
    customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'email'>
    _count?: {
      invoices: number
    }
  }
}

export interface SubscriptionListResult {
  success: boolean
  message: string
  subscriptions?: Array<Subscription & {
    customer: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'email'>
    _count: {
      invoices: number
    }
  }>
  total?: number
  page?: number
  limit?: number
}

export interface SubscriptionFilters {
  customerId?: string
  status?: string
  interval?: string
  planName?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

export interface BillingCycleResult {
  success: boolean
  message: string
  processed?: number
  failed?: number
  details?: Array<{
    subscriptionId: string
    status: 'success' | 'failed'
    invoiceId?: string
    error?: string
  }>
}

/**
 * Subscription Billing Service
 * Handles subscription management and automated billing
 */
export class SubscriptionService {
  /**
   * Create a new subscription
   */
  static async createSubscription(subscriptionData: CreateSubscriptionData): Promise<SubscriptionResult> {
    try {
      const {
        customerId,
        planName,
        planDescription,
        amount,
        currency = 'USD',
        interval,
        startDate = new Date(),
        trialEndDate,
        metadata
      } = subscriptionData

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, firstName: true, lastName: true, email: true }
      })

      if (!customer) {
        return {
          success: false,
          message: 'Customer not found'
        }
      }

      // Validate subscription data
      if (amount <= 0) {
        return {
          success: false,
          message: 'Subscription amount must be greater than zero'
        }
      }

      if (!['monthly', 'quarterly', 'yearly'].includes(interval)) {
        return {
          success: false,
          message: 'Invalid billing interval. Must be monthly, quarterly, or yearly'
        }
      }

      // Calculate next billing date
      const nextBillingDate = this.calculateNextBillingDate(startDate, interval)

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          customerId,
          planName: planName.trim(),
          planDescription: planDescription?.trim(),
          amount,
          currency,
          interval,
          startDate,
          nextBillingDate,
          trialEndDate,
          metadata,
          status: 'active'
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { invoices: true }
          }
        }
      })

      // Create initial invoice if not in trial period
      if (!trialEndDate || trialEndDate <= new Date()) {
        await this.createSubscriptionInvoice(subscription.id, startDate)
      }

      logger.info(`Subscription created: ${subscription.id} for customer ${customerId}`)

      return {
        success: true,
        message: 'Subscription created successfully',
        subscription
      }
    } catch (error) {
      logger.error('Create subscription error:', error)
      return {
        success: false,
        message: 'An error occurred while creating subscription'
      }
    }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(subscriptionId: string, updateData: UpdateSubscriptionData): Promise<SubscriptionResult> {
    try {
      // Find existing subscription
      const existingSubscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      })

      if (!existingSubscription) {
        return {
          success: false,
          message: 'Subscription not found'
        }
      }

      // Validate update data
      if (updateData.amount !== undefined && updateData.amount <= 0) {
        return {
          success: false,
          message: 'Subscription amount must be greater than zero'
        }
      }

      if (updateData.interval && !['monthly', 'quarterly', 'yearly'].includes(updateData.interval)) {
        return {
          success: false,
          message: 'Invalid billing interval. Must be monthly, quarterly, or yearly'
        }
      }

      // Build update payload
      const updatePayload: any = {}

      if (updateData.planName !== undefined) updatePayload.planName = updateData.planName.trim()
      if (updateData.planDescription !== undefined) updatePayload.planDescription = updateData.planDescription?.trim()
      if (updateData.amount !== undefined) updatePayload.amount = updateData.amount
      if (updateData.currency !== undefined) updatePayload.currency = updateData.currency
      if (updateData.interval !== undefined) {
        updatePayload.interval = updateData.interval
        // Recalculate next billing date if interval changed
        updatePayload.nextBillingDate = this.calculateNextBillingDate(
          existingSubscription.lastBillingDate || existingSubscription.startDate,
          updateData.interval
        )
      }
      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status
        if (updateData.status === 'cancelled') {
          updatePayload.cancelledAt = new Date()
          updatePayload.cancellationReason = updateData.cancellationReason
        }
        if (updateData.status === 'expired') {
          updatePayload.endDate = updateData.endDate || new Date()
        }
      }
      if (updateData.endDate !== undefined) updatePayload.endDate = updateData.endDate
      if (updateData.metadata !== undefined) updatePayload.metadata = updateData.metadata

      // Update subscription
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: updatePayload,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { invoices: true }
          }
        }
      })

      logger.info(`Subscription updated: ${subscriptionId}`)

      return {
        success: true,
        message: 'Subscription updated successfully',
        subscription: updatedSubscription
      }
    } catch (error) {
      logger.error('Update subscription error:', error)
      return {
        success: false,
        message: 'An error occurred while updating subscription'
      }
    }
  }

  /**
   * Get subscription by ID
   */
  static async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { invoices: true }
          }
        }
      })

      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found'
        }
      }

      return {
        success: true,
        message: 'Subscription retrieved successfully',
        subscription
      }
    } catch (error) {
      logger.error('Get subscription error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving subscription'
      }
    }
  }

  /**
   * Get subscriptions with filtering and pagination
   */
  static async getSubscriptions(filters: SubscriptionFilters = {}): Promise<SubscriptionListResult> {
    try {
      const {
        customerId,
        status,
        interval,
        planName,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (customerId) where.customerId = customerId
      if (status) where.status = status
      if (interval) where.interval = interval
      if (planName) {
        where.planName = {
          contains: planName,
          mode: 'insensitive'
        }
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      // Get subscriptions and total count
      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            _count: {
              select: { invoices: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.subscription.count({ where })
      ])

      return {
        success: true,
        message: 'Subscriptions retrieved successfully',
        subscriptions,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get subscriptions error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving subscriptions'
      }
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string, reason?: string): Promise<SubscriptionResult> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      })

      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found'
        }
      }

      if (subscription.status === 'cancelled') {
        return {
          success: false,
          message: 'Subscription is already cancelled'
        }
      }

      // Cancel subscription
      const cancelledSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { invoices: true }
          }
        }
      })

      // Send cancellation notification
      if (subscription.customer.email) {
        const customerName = `${subscription.customer.firstName} ${subscription.customer.lastName}`
        await NotificationService.sendEmail({
          to: subscription.customer.email,
          subject: 'Subscription Cancelled - Mosaajii POS',
          html: this.generateCancellationEmailHTML(customerName, subscription, reason)
        })
      }

      logger.info(`Subscription cancelled: ${subscriptionId}`)

      return {
        success: true,
        message: 'Subscription cancelled successfully',
        subscription: cancelledSubscription
      }
    } catch (error) {
      logger.error('Cancel subscription error:', error)
      return {
        success: false,
        message: 'An error occurred while cancelling subscription'
      }
    }
  }

  /**
   * Process billing cycle for all active subscriptions
   */
  static async processBillingCycle(): Promise<BillingCycleResult> {
    try {
      const today = new Date()
      
      // Find subscriptions due for billing
      const subscriptionsDue = await prisma.subscription.findMany({
        where: {
          status: 'active',
          nextBillingDate: {
            lte: today
          },
          OR: [
            { trialEndDate: null },
            { trialEndDate: { lte: today } }
          ]
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      })

      let processed = 0
      let failed = 0
      const details: Array<{
        subscriptionId: string
        status: 'success' | 'failed'
        invoiceId?: string
        error?: string
      }> = []

      for (const subscription of subscriptionsDue) {
        try {
          // Create subscription invoice
          const invoiceResult = await this.createSubscriptionInvoice(subscription.id, subscription.nextBillingDate)
          
          if (invoiceResult.success) {
            // Update subscription billing dates
            const nextBillingDate = this.calculateNextBillingDate(subscription.nextBillingDate, subscription.interval)
            
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                lastBillingDate: subscription.nextBillingDate,
                nextBillingDate
              }
            })

            processed++
            details.push({
              subscriptionId: subscription.id,
              status: 'success',
              invoiceId: invoiceResult.invoiceId
            })

            logger.info(`Billing processed for subscription: ${subscription.id}`)
          } else {
            failed++
            details.push({
              subscriptionId: subscription.id,
              status: 'failed',
              error: invoiceResult.message
            })

            logger.error(`Billing failed for subscription: ${subscription.id} - ${invoiceResult.message}`)
          }
        } catch (error) {
          failed++
          details.push({
            subscriptionId: subscription.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })

          logger.error(`Billing error for subscription: ${subscription.id}`, error)
        }
      }

      return {
        success: true,
        message: `Billing cycle processed: ${processed} successful, ${failed} failed`,
        processed,
        failed,
        details
      }
    } catch (error) {
      logger.error('Process billing cycle error:', error)
      return {
        success: false,
        message: 'An error occurred while processing billing cycle',
        processed: 0,
        failed: 0
      }
    }
  }

  /**
   * Create subscription invoice
   */
  private static async createSubscriptionInvoice(subscriptionId: string, billingDate: Date): Promise<{
    success: boolean
    message: string
    invoiceId?: string
  }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          customer: true
        }
      })

      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found'
        }
      }

      // Calculate billing period
      const billingPeriodStart = billingDate
      const billingPeriodEnd = this.calculateNextBillingDate(billingDate, subscription.interval)
      billingPeriodEnd.setDate(billingPeriodEnd.getDate() - 1) // End date is one day before next billing

      // Calculate due date (typically 7 days from invoice date)
      const dueDate = new Date(billingDate)
      dueDate.setDate(dueDate.getDate() + 7)

      // Create invoice
      const invoiceResult = await InvoiceService.createInvoice({
        customerId: subscription.customerId,
        items: [{
          description: `${subscription.planName} - ${billingPeriodStart.toLocaleDateString()} to ${billingPeriodEnd.toLocaleDateString()}`,
          quantity: 1,
          unitPrice: Number(subscription.amount),
          taxRate: 0
        }],
        dueDate,
        notes: `Subscription billing for ${subscription.planName}`,
        terms: 'Subscription payment due within 7 days',
        isRecurring: false // Individual invoices are not recurring, the subscription handles the recurrence
      })

      if (!invoiceResult.success || !invoiceResult.invoice) {
        return {
          success: false,
          message: invoiceResult.message
        }
      }

      // Link invoice to subscription
      await prisma.subscriptionInvoice.create({
        data: {
          subscriptionId,
          invoiceId: invoiceResult.invoice.id,
          billingPeriodStart,
          billingPeriodEnd
        }
      })

      // Create payment link for the invoice
      try {
        const paymentLinkResult = await PaymentGatewayService.createPaymentLink({
          invoiceId: invoiceResult.invoice.id,
          amount: Number(subscription.amount),
          currency: subscription.currency,
          description: `Payment for ${subscription.planName}`,
          customerEmail: subscription.customer.email || undefined,
          expiresAt: dueDate
        })

        if (paymentLinkResult.success && paymentLinkResult.paymentLink) {
          // Send invoice with payment link
          const customerName = `${subscription.customer.firstName} ${subscription.customer.lastName}`
          await NotificationService.sendEmail({
            to: subscription.customer.email!,
            subject: `Invoice for ${subscription.planName} - Mosaajii POS`,
            html: this.generateInvoiceEmailHTML(
              customerName,
              invoiceResult.invoice,
              subscription,
              paymentLinkResult.paymentLink.url
            )
          })
        }
      } catch (error) {
        logger.warn(`Failed to create payment link for subscription invoice: ${invoiceResult.invoice.id}`, error)
      }

      return {
        success: true,
        message: 'Subscription invoice created successfully',
        invoiceId: invoiceResult.invoice.id
      }
    } catch (error) {
      logger.error('Create subscription invoice error:', error)
      return {
        success: false,
        message: 'An error occurred while creating subscription invoice'
      }
    }
  }

  /**
   * Calculate next billing date based on interval
   */
  private static calculateNextBillingDate(fromDate: Date, interval: string): Date {
    const nextDate = new Date(fromDate)
    
    switch (interval) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
      default:
        throw new Error(`Invalid billing interval: ${interval}`)
    }
    
    return nextDate
  }

  /**
   * Generate email templates
   */
  private static generateCancellationEmailHTML(customerName: string, subscription: any, reason?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Subscription Cancelled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .subscription-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Cancelled</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your subscription has been cancelled as requested.</p>
            <div class="subscription-details">
                <h3>Subscription Details:</h3>
                <p><strong>Plan:</strong> ${subscription.planName}</p>
                <p><strong>Amount:</strong> ${subscription.currency} ${subscription.amount}</p>
                <p><strong>Billing Interval:</strong> ${subscription.interval}</p>
                <p><strong>Cancelled Date:</strong> ${subscription.cancelledAt?.toLocaleDateString()}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p>Thank you for using our service. If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
    `
  }

  private static generateInvoiceEmailHTML(customerName: string, invoice: any, subscription: any, paymentUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice for ${subscription.planName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .invoice-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .pay-button { background-color: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invoice for ${subscription.planName}</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your subscription invoice is ready for payment.</p>
            <div class="invoice-details">
                <h3>Invoice Details:</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Plan:</strong> ${subscription.planName}</p>
                <p><strong>Amount:</strong> ${invoice.currency || subscription.currency} ${invoice.totalAmount}</p>
                <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
            </div>
            <div style="text-align: center;">
                <a href="${paymentUrl}" class="pay-button">Pay Now</a>
            </div>
            <p>Thank you for your continued subscription!</p>
        </div>
    </div>
</body>
</html>
    `
  }
}