import { Payment, PaymentStatus, User } from '@prisma/client'
import { prisma } from '../config/database'
import { NotificationService } from './notificationService'
import { logger } from '../utils/logger'

export interface PaymentData {
  userId: string
  amount: number
  currency?: string
  paymentMethod: string
  transactionId?: string
  description?: string
  metadata?: any
}

export interface PaymentVerificationData {
  paymentId: string
  adminUserId: string
  action: 'verify' | 'reject'
  reason?: string
  metadata?: any
}

export interface PaymentResult {
  success: boolean
  message: string
  payment?: Payment & {
    user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>
  }
}

export interface PaymentListResult {
  success: boolean
  message: string
  payments?: (Payment & {
    user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>
  })[]
  total?: number
  page?: number
  limit?: number
}

export interface PaymentFilters {
  status?: PaymentStatus
  userId?: string
  paymentMethod?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

/**
 * Payment Verification Service
 * Handles payment tracking, verification, and admin approval workflow
 */
export class PaymentService {
  /**
   * Record a new payment
   */
  static async recordPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const { userId, amount, currency = 'USD', paymentMethod, transactionId, description, metadata } = paymentData

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check for duplicate transaction ID
      if (transactionId) {
        const existingPayment = await prisma.payment.findUnique({
          where: { transactionId }
        })

        if (existingPayment) {
          return {
            success: false,
            message: 'Payment with this transaction ID already exists'
          }
        }
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency,
          paymentMethod,
          transactionId,
          description,
          metadata,
          status: PaymentStatus.PENDING
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      })

      // Record payment history
      await this.recordPaymentHistory(payment.id, 'PAYMENT_RECORDED', null, PaymentStatus.PENDING, userId)

      // Send notification to admins about new payment
      await this.notifyAdminsNewPayment(payment)

      logger.info(`Payment recorded: ${payment.id} for user: ${userId}`)

      return {
        success: true,
        message: 'Payment recorded successfully',
        payment
      }
    } catch (error) {
      logger.error('Record payment error:', error)
      return {
        success: false,
        message: 'An error occurred while recording payment'
      }
    }
  }

  /**
   * Verify or reject a payment (admin only)
   */
  static async verifyPayment(verificationData: PaymentVerificationData): Promise<PaymentResult> {
    try {
      const { paymentId, adminUserId, action, reason, metadata } = verificationData

      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== 'ADMIN') {
        return {
          success: false,
          message: 'Insufficient permissions to verify payment'
        }
      }

      // Find payment
      const existingPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      })

      if (!existingPayment) {
        return {
          success: false,
          message: 'Payment not found'
        }
      }

      // Check if payment can be verified/rejected
      if (existingPayment.status === PaymentStatus.VERIFIED) {
        return {
          success: false,
          message: 'Payment is already verified'
        }
      }

      if (existingPayment.status === PaymentStatus.REJECTED) {
        return {
          success: false,
          message: 'Payment is already rejected'
        }
      }

      const oldStatus = existingPayment.status
      let updateData: any = {
        updatedAt: new Date()
      }

      if (action === 'verify') {
        updateData = {
          ...updateData,
          status: PaymentStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: adminUserId,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null
        }
      } else if (action === 'reject') {
        updateData = {
          ...updateData,
          status: PaymentStatus.REJECTED,
          rejectedAt: new Date(),
          rejectedBy: adminUserId,
          rejectionReason: reason,
          verifiedAt: null,
          verifiedBy: null
        }
      }

      // Update payment
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: updateData,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      })

      // Record payment history
      await this.recordPaymentHistory(
        paymentId,
        action === 'verify' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
        oldStatus,
        updatedPayment.status,
        adminUserId,
        reason,
        metadata
      )

      // Update user payment verification status if verified
      if (action === 'verify') {
        await prisma.user.update({
          where: { id: existingPayment.userId },
          data: { paymentVerified: true }
        })

        // Send verification success email
        const userName = `${existingPayment.user.firstName} ${existingPayment.user.lastName}`
        await NotificationService.sendEmail({
          to: existingPayment.user.email,
          subject: 'Payment Verified - Mosaajii POS',
          html: this.generatePaymentVerifiedEmailHTML(userName, updatedPayment)
        })
      } else {
        // Send rejection email
        const userName = `${existingPayment.user.firstName} ${existingPayment.user.lastName}`
        await NotificationService.sendEmail({
          to: existingPayment.user.email,
          subject: 'Payment Update - Mosaajii POS',
          html: this.generatePaymentRejectedEmailHTML(userName, updatedPayment, reason)
        })
      }

      logger.info(`Payment ${action}ed: ${paymentId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: `Payment ${action}ed successfully`,
        payment: updatedPayment
      }
    } catch (error) {
      logger.error('Verify payment error:', error)
      return {
        success: false,
        message: 'An error occurred while verifying payment'
      }
    }
  }

  /**
   * Get payment by ID
   */
  static async getPayment(paymentId: string): Promise<PaymentResult> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      })

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found'
        }
      }

      return {
        success: true,
        message: 'Payment retrieved successfully',
        payment
      }
    } catch (error) {
      logger.error('Get payment error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payment'
      }
    }
  }

  /**
   * Get payments with filtering and pagination
   */
  static async getPayments(filters: PaymentFilters = {}): Promise<PaymentListResult> {
    try {
      const {
        status,
        userId,
        paymentMethod,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (status) {
        where.status = status
      }

      if (userId) {
        where.userId = userId
      }

      if (paymentMethod) {
        where.paymentMethod = paymentMethod
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) {
          where.createdAt.gte = dateFrom
        }
        if (dateTo) {
          where.createdAt.lte = dateTo
        }
      }

      // Get payments and total count
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.payment.count({ where })
      ])

      return {
        success: true,
        message: 'Payments retrieved successfully',
        payments,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get payments error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payments'
      }
    }
  }

  /**
   * Get payment history for a payment
   */
  static async getPaymentHistory(paymentId: string) {
    try {
      const history = await prisma.paymentHistory.findMany({
        where: { paymentId },
        include: {
          performer: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return {
        success: true,
        message: 'Payment history retrieved successfully',
        history
      }
    } catch (error) {
      logger.error('Get payment history error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payment history'
      }
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(dateFrom?: Date, dateTo?: Date) {
    try {
      const where: any = {}

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) {
          where.createdAt.gte = dateFrom
        }
        if (dateTo) {
          where.createdAt.lte = dateTo
        }
      }

      const [
        totalPayments,
        pendingPayments,
        verifiedPayments,
        rejectedPayments,
        totalAmount,
        verifiedAmount
      ] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
        prisma.payment.count({ where: { ...where, status: PaymentStatus.VERIFIED } }),
        prisma.payment.count({ where: { ...where, status: PaymentStatus.REJECTED } }),
        prisma.payment.aggregate({
          where,
          _sum: { amount: true }
        }),
        prisma.payment.aggregate({
          where: { ...where, status: PaymentStatus.VERIFIED },
          _sum: { amount: true }
        })
      ])

      return {
        success: true,
        message: 'Payment statistics retrieved successfully',
        stats: {
          totalPayments,
          pendingPayments,
          verifiedPayments,
          rejectedPayments,
          totalAmount: totalAmount._sum.amount || 0,
          verifiedAmount: verifiedAmount._sum.amount || 0
        }
      }
    } catch (error) {
      logger.error('Get payment stats error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payment statistics'
      }
    }
  }

  /**
   * Record payment history
   */
  private static async recordPaymentHistory(
    paymentId: string,
    action: string,
    oldStatus: PaymentStatus | null,
    newStatus: PaymentStatus,
    performedBy: string,
    reason?: string,
    metadata?: any
  ) {
    try {
      await prisma.paymentHistory.create({
        data: {
          paymentId,
          action,
          oldStatus,
          newStatus,
          performedBy,
          reason,
          metadata
        }
      })
    } catch (error) {
      logger.error('Record payment history error:', error)
    }
  }

  /**
   * Notify admins about new payment
   */
  private static async notifyAdminsNewPayment(payment: Payment & { user: any }) {
    try {
      // Get all admin users
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, firstName: true, lastName: true }
      })

      const userName = `${payment.user.firstName} ${payment.user.lastName}`
      const subject = 'New Payment Pending Verification - Mosaajii POS'

      // Send notification to each admin
      for (const admin of admins) {
        await NotificationService.sendEmail({
          to: admin.email,
          subject,
          html: this.generateNewPaymentNotificationHTML(admin.firstName, userName, payment)
        })
      }
    } catch (error) {
      logger.error('Notify admins new payment error:', error)
    }
  }

  /**
   * Generate email HTML templates
   */
  private static generatePaymentVerifiedEmailHTML(userName: string, payment: Payment): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Verified</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0; color: #155724; }
        .payment-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Payment Verified!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <div class="success">
                <strong>Great news!</strong> Your payment has been verified and approved.
            </div>
            <div class="payment-details">
                <h3>Payment Details:</h3>
                <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
                <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
                <p><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</p>
                <p><strong>Verified At:</strong> ${payment.verifiedAt?.toLocaleString()}</p>
            </div>
            <p>You can now proceed with account activation. An administrator will send you an access code shortly.</p>
        </div>
    </div>
</body>
</html>
    `
  }

  private static generatePaymentRejectedEmailHTML(userName: string, payment: Payment, reason?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Update</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .payment-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Update Required</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <div class="warning">
                We need to discuss your payment. Please contact your administrator for more information.
            </div>
            <div class="payment-details">
                <h3>Payment Details:</h3>
                <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
                <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
                <p><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</p>
                ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
            </div>
            <p>Please contact your administrator to resolve this matter.</p>
        </div>
    </div>
</body>
</html>
    `
  }

  private static generateNewPaymentNotificationHTML(adminName: string, userName: string, payment: Payment): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Payment Pending Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .payment-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .action-needed { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Payment Pending Verification</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${adminName}</strong>,</p>
            <p>A new payment has been recorded and requires your verification.</p>
            <div class="payment-details">
                <h3>Payment Details:</h3>
                <p><strong>User:</strong> ${userName}</p>
                <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
                <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
                <p><strong>Transaction ID:</strong> ${payment.transactionId || 'N/A'}</p>
                <p><strong>Description:</strong> ${payment.description || 'N/A'}</p>
                <p><strong>Submitted At:</strong> ${payment.createdAt.toLocaleString()}</p>
            </div>
            <div class="action-needed">
                <strong>Action Required:</strong> Please log in to the admin panel to verify or reject this payment.
            </div>
        </div>
    </div>
</body>
</html>
    `
  }
}