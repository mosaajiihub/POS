import { User } from '@prisma/client'
import { prisma } from '../config/database'
import { OTPManager } from '../config/redis'
import { NotificationService } from './notificationService'
import { logger } from '../utils/logger'

export interface OTPDeliveryOptions {
  method: 'email' | 'sms' | 'both'
  email?: string
  phoneNumber?: string
}

export interface OTPGenerationResult {
  success: boolean
  message: string
  otp?: string
  expiresAt?: string
  deliveryResults?: {
    email?: { success: boolean; message: string }
    sms?: { success: boolean; message: string }
  }
}

export interface OTPVerificationResult {
  success: boolean
  message: string
  attemptsRemaining?: number
}

export interface OTPStatusResult {
  exists: boolean
  expiresAt?: string
  attemptsRemaining?: number
  isExpired?: boolean
}

/**
 * Enhanced OTP Service
 * Handles OTP generation, delivery, verification with rate limiting and security controls
 */
export class OTPService {
  private static readonly MAX_OTP_REQUESTS_PER_HOUR = 3
  private static readonly OTP_REQUEST_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

  /**
   * Generate and deliver OTP for user activation
   */
  static async generateAndDeliverOTP(
    userId: string,
    adminUserId: string,
    deliveryOptions: OTPDeliveryOptions
  ): Promise<OTPGenerationResult> {
    try {
      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== 'ADMIN') {
        return {
          success: false,
          message: 'Insufficient permissions to generate OTP'
        }
      }

      // Find target user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check if payment is verified
      if (!user.paymentVerified) {
        return {
          success: false,
          message: 'Payment verification required before OTP generation'
        }
      }

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(userId)
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: rateLimitCheck.message
        }
      }

      // Generate OTP
      const otp = OTPManager.generateOTP()

      // Store OTP in Redis
      await OTPManager.storeOTP(userId, otp)

      // Update user record with OTP info
      await prisma.user.update({
        where: { id: userId },
        data: {
          otpCode: otp,
          otpExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        }
      })

      // Deliver OTP based on options
      const deliveryResults: any = {}
      const userName = `${user.firstName} ${user.lastName}`

      if (deliveryOptions.method === 'email' || deliveryOptions.method === 'both') {
        const email = deliveryOptions.email || user.email
        deliveryResults.email = await NotificationService.sendOTPEmail(email, otp, userName)
      }

      if (deliveryOptions.method === 'sms' || deliveryOptions.method === 'both') {
        if (deliveryOptions.phoneNumber) {
          deliveryResults.sms = await NotificationService.sendOTPSMS(
            deliveryOptions.phoneNumber,
            otp,
            userName
          )
        } else {
          deliveryResults.sms = {
            success: false,
            message: 'Phone number not provided'
          }
        }
      }

      // Update rate limiting counter
      await this.updateRateLimit(userId)

      // Get OTP info for response
      const otpInfo = await OTPManager.getOTPInfo(userId)

      logger.info(`OTP generated and delivered for user: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'OTP generated and delivered successfully',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Only return OTP in development
        expiresAt: otpInfo.expiresAt,
        deliveryResults
      }
    } catch (error) {
      logger.error('OTP generation and delivery error:', error)
      return {
        success: false,
        message: 'An error occurred while generating and delivering OTP'
      }
    }
  }

  /**
   * Verify OTP with enhanced security checks
   */
  static async verifyOTP(userId: string, providedOTP: string): Promise<OTPVerificationResult> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check if user is already active
      if (user.status === 'ACTIVE') {
        return {
          success: false,
          message: 'Account is already activated'
        }
      }

      // Verify OTP using Redis manager
      const otpResult = await OTPManager.verifyOTP(userId, providedOTP)

      if (!otpResult.valid) {
        // Get remaining attempts for user feedback
        const otpInfo = await OTPManager.getOTPInfo(userId)
        const attemptsRemaining = Math.max(0, 3 - (otpInfo.attempts || 0))

        return {
          success: false,
          message: otpResult.message,
          attemptsRemaining
        }
      }

      // OTP is valid, activate user
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          otpCode: null,
          otpExpiry: null
        }
      })

      // Send activation confirmation email
      const userName = `${user.firstName} ${user.lastName}`
      await NotificationService.sendActivationEmail(user.email, userName)

      // Clear rate limiting for this user
      await this.clearRateLimit(userId)

      logger.info(`User activated successfully via OTP: ${userId}`)

      return {
        success: true,
        message: 'OTP verified successfully. Account activated.'
      }
    } catch (error) {
      logger.error('OTP verification error:', error)
      return {
        success: false,
        message: 'An error occurred during OTP verification'
      }
    }
  }

  /**
   * Get OTP status for a user
   */
  static async getOTPStatus(userId: string): Promise<OTPStatusResult> {
    try {
      const otpInfo = await OTPManager.getOTPInfo(userId)

      if (!otpInfo.exists) {
        return { exists: false }
      }

      const now = new Date()
      const expiresAt = new Date(otpInfo.expiresAt!)
      const isExpired = now > expiresAt
      const attemptsRemaining = Math.max(0, 3 - (otpInfo.attempts || 0))

      return {
        exists: true,
        expiresAt: otpInfo.expiresAt,
        attemptsRemaining,
        isExpired
      }
    } catch (error) {
      logger.error('Get OTP status error:', error)
      return { exists: false }
    }
  }

  /**
   * Cancel/delete OTP for a user
   */
  static async cancelOTP(userId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== 'ADMIN') {
        return {
          success: false,
          message: 'Insufficient permissions to cancel OTP'
        }
      }

      // Delete OTP from Redis
      await OTPManager.deleteOTP(userId)

      // Clear OTP from user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          otpCode: null,
          otpExpiry: null
        }
      })

      logger.info(`OTP cancelled for user: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'OTP cancelled successfully'
      }
    } catch (error) {
      logger.error('Cancel OTP error:', error)
      return {
        success: false,
        message: 'An error occurred while cancelling OTP'
      }
    }
  }

  /**
   * Resend OTP with same code (if not expired)
   */
  static async resendOTP(
    userId: string,
    adminUserId: string,
    deliveryOptions: OTPDeliveryOptions
  ): Promise<OTPGenerationResult> {
    try {
      // Check if OTP exists and is not expired
      const otpStatus = await this.getOTPStatus(userId)

      if (!otpStatus.exists || otpStatus.isExpired) {
        // Generate new OTP if none exists or expired
        return await this.generateAndDeliverOTP(userId, adminUserId, deliveryOptions)
      }

      // Get existing OTP from database
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.otpCode) {
        return {
          success: false,
          message: 'No active OTP found'
        }
      }

      // Resend existing OTP
      const deliveryResults: any = {}
      const userName = `${user.firstName} ${user.lastName}`

      if (deliveryOptions.method === 'email' || deliveryOptions.method === 'both') {
        const email = deliveryOptions.email || user.email
        deliveryResults.email = await NotificationService.sendOTPEmail(email, user.otpCode, userName)
      }

      if (deliveryOptions.method === 'sms' || deliveryOptions.method === 'both') {
        if (deliveryOptions.phoneNumber) {
          deliveryResults.sms = await NotificationService.sendOTPSMS(
            deliveryOptions.phoneNumber,
            user.otpCode,
            userName
          )
        } else {
          deliveryResults.sms = {
            success: false,
            message: 'Phone number not provided'
          }
        }
      }

      logger.info(`OTP resent for user: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'OTP resent successfully',
        expiresAt: otpStatus.expiresAt,
        deliveryResults
      }
    } catch (error) {
      logger.error('Resend OTP error:', error)
      return {
        success: false,
        message: 'An error occurred while resending OTP'
      }
    }
  }

  /**
   * Check rate limiting for OTP requests
   */
  private static async checkRateLimit(userId: string): Promise<{ allowed: boolean; message: string }> {
    try {
      const key = `otp_rate_limit:${userId}`
      const now = Date.now()

      // Get existing rate limit data
      const rateLimitData = await prisma.$queryRaw<any[]>`
        SELECT * FROM rate_limits WHERE key = ${key} AND expires_at > NOW()
      `

      if (rateLimitData.length === 0) {
        return { allowed: true, message: 'Rate limit check passed' }
      }

      const record = rateLimitData[0]
      if (record.count >= this.MAX_OTP_REQUESTS_PER_HOUR) {
        const remainingTime = Math.ceil((new Date(record.expires_at).getTime() - now) / 1000 / 60)
        return {
          allowed: false,
          message: `Too many OTP requests. Try again in ${remainingTime} minutes.`
        }
      }

      return { allowed: true, message: 'Rate limit check passed' }
    } catch (error) {
      // If rate limiting fails, allow the request but log the error
      logger.error('Rate limit check error:', error)
      return { allowed: true, message: 'Rate limit check bypassed due to error' }
    }
  }

  /**
   * Update rate limiting counter
   */
  private static async updateRateLimit(userId: string): Promise<void> {
    try {
      const key = `otp_rate_limit:${userId}`
      const expiresAt = new Date(Date.now() + this.OTP_REQUEST_WINDOW)

      // Use upsert to increment counter or create new record
      await prisma.$executeRaw`
        INSERT INTO rate_limits (key, count, expires_at, created_at, updated_at)
        VALUES (${key}, 1, ${expiresAt}, NOW(), NOW())
        ON CONFLICT (key) 
        DO UPDATE SET 
          count = rate_limits.count + 1,
          updated_at = NOW()
        WHERE rate_limits.expires_at > NOW()
      `
    } catch (error) {
      logger.error('Update rate limit error:', error)
    }
  }

  /**
   * Clear rate limiting for user
   */
  private static async clearRateLimit(userId: string): Promise<void> {
    try {
      const key = `otp_rate_limit:${userId}`
      await prisma.$executeRaw`DELETE FROM rate_limits WHERE key = ${key}`
    } catch (error) {
      logger.error('Clear rate limit error:', error)
    }
  }

  /**
   * Clean up expired OTPs and rate limits
   */
  static async cleanupExpired(): Promise<void> {
    try {
      // Clean up expired rate limits
      await prisma.$executeRaw`DELETE FROM rate_limits WHERE expires_at <= NOW()`

      // Clean up expired OTPs from user records
      await prisma.user.updateMany({
        where: {
          otpExpiry: {
            lte: new Date()
          }
        },
        data: {
          otpCode: null,
          otpExpiry: null
        }
      })

      logger.info('Expired OTPs and rate limits cleaned up')
    } catch (error) {
      logger.error('Cleanup expired error:', error)
    }
  }
}