import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { SessionManager } from '../config/redis'

export interface BruteForceResult {
  isBlocked: boolean
  attemptsRemaining: number
  lockoutDuration?: number // in minutes
  message: string
}

export interface LoginAttemptResult {
  success: boolean
  shouldBlock: boolean
  attemptsRemaining: number
  lockoutUntil?: Date
}

export interface IPBlockResult {
  isBlocked: boolean
  blockDuration?: number // in minutes
  reason: string
}

/**
 * Brute Force Protection Service
 * Handles login attempt monitoring, progressive lockouts, and IP-based protection
 */
export class BruteForceProtectionService {
  // User-based protection settings
  private static readonly MAX_LOGIN_ATTEMPTS = 5
  private static readonly LOCKOUT_DURATION_MINUTES = 15
  private static readonly PROGRESSIVE_LOCKOUT_MULTIPLIER = 2
  private static readonly MAX_LOCKOUT_DURATION_HOURS = 24

  // IP-based protection settings
  private static readonly IP_MAX_ATTEMPTS_PER_HOUR = 20
  private static readonly IP_MAX_ATTEMPTS_PER_DAY = 100
  private static readonly IP_BLOCK_DURATION_MINUTES = 60

  // CAPTCHA settings
  private static readonly CAPTCHA_THRESHOLD = 3

  /**
   * Check if user account is locked due to failed attempts
   */
  static async checkUserLockout(userId: string): Promise<BruteForceResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          isBlocked: false,
          attemptsRemaining: this.MAX_LOGIN_ATTEMPTS,
          message: 'User not found'
        }
      }

      // Check if user is currently locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const lockoutDuration = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
        )

        return {
          isBlocked: true,
          attemptsRemaining: 0,
          lockoutDuration,
          message: `Account is locked. Try again in ${lockoutDuration} minutes.`
        }
      }

      // If lockout has expired, reset failed attempts
      if (user.lockedUntil && user.lockedUntil <= new Date()) {
        await this.resetUserLockout(userId)
        return {
          isBlocked: false,
          attemptsRemaining: this.MAX_LOGIN_ATTEMPTS,
          message: 'Account lockout has expired'
        }
      }

      const attemptsRemaining = Math.max(0, this.MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts)

      return {
        isBlocked: false,
        attemptsRemaining,
        message: attemptsRemaining > 0 
          ? `${attemptsRemaining} attempts remaining`
          : 'Maximum attempts reached'
      }
    } catch (error) {
      logger.error('Check user lockout error:', error)
      return {
        isBlocked: false,
        attemptsRemaining: this.MAX_LOGIN_ATTEMPTS,
        message: 'Unable to check lockout status'
      }
    }
  }

  /**
   * Record failed login attempt and apply lockout if necessary
   */
  static async recordFailedAttempt(userId: string, ipAddress?: string): Promise<LoginAttemptResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          shouldBlock: false,
          attemptsRemaining: 0
        }
      }

      const newFailedAttempts = user.failedLoginAttempts + 1
      let lockoutUntil: Date | null = null
      let shouldBlock = false

      // Check if we should lock the account
      if (newFailedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        shouldBlock = true
        
        // Calculate progressive lockout duration
        const previousLockouts = await this.getPreviousLockoutCount(userId)
        const lockoutMultiplier = Math.pow(this.PROGRESSIVE_LOCKOUT_MULTIPLIER, previousLockouts)
        const lockoutMinutes = Math.min(
          this.LOCKOUT_DURATION_MINUTES * lockoutMultiplier,
          this.MAX_LOCKOUT_DURATION_HOURS * 60
        )
        
        lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000)
      }

      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lastFailedLogin: new Date(),
          lockedUntil: lockoutUntil
        }
      })

      // Record IP-based attempt if IP is provided
      if (ipAddress) {
        await this.recordIPAttempt(ipAddress, false)
      }

      const attemptsRemaining = Math.max(0, this.MAX_LOGIN_ATTEMPTS - newFailedAttempts)

      logger.warn(`Failed login attempt for user ${userId}, attempts: ${newFailedAttempts}`)

      return {
        success: false,
        shouldBlock,
        attemptsRemaining,
        lockoutUntil: lockoutUntil || undefined
      }
    } catch (error) {
      logger.error('Record failed attempt error:', error)
      return {
        success: false,
        shouldBlock: false,
        attemptsRemaining: 0
      }
    }
  }

  /**
   * Record successful login and reset failed attempts
   */
  static async recordSuccessfulLogin(userId: string, ipAddress?: string): Promise<void> {
    try {
      // Reset user failed attempts
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date()
        }
      })

      // Record successful IP attempt
      if (ipAddress) {
        await this.recordIPAttempt(ipAddress, true)
      }

      logger.info(`Successful login for user ${userId}, failed attempts reset`)
    } catch (error) {
      logger.error('Record successful login error:', error)
    }
  }

  /**
   * Check IP-based blocking
   */
  static async checkIPBlock(ipAddress: string): Promise<IPBlockResult> {
    try {
      const hourlyKey = `ip_attempts_hourly:${ipAddress}`
      const dailyKey = `ip_attempts_daily:${ipAddress}`
      const blockKey = `ip_blocked:${ipAddress}`

      // Check if IP is currently blocked
      const isBlocked = await SessionManager.exists(blockKey)
      if (isBlocked) {
        const ttl = await SessionManager.getTTL(blockKey)
        const blockDuration = Math.ceil(ttl / 60)
        
        return {
          isBlocked: true,
          blockDuration,
          reason: `IP address is blocked. Try again in ${blockDuration} minutes.`
        }
      }

      // Check hourly and daily limits
      const [hourlyAttempts, dailyAttempts] = await Promise.all([
        SessionManager.getCounter(hourlyKey),
        SessionManager.getCounter(dailyKey)
      ])

      if (hourlyAttempts >= this.IP_MAX_ATTEMPTS_PER_HOUR) {
        // Block IP for specified duration
        await SessionManager.setWithExpiry(
          blockKey, 
          'blocked_hourly_limit', 
          this.IP_BLOCK_DURATION_MINUTES * 60
        )
        
        return {
          isBlocked: true,
          blockDuration: this.IP_BLOCK_DURATION_MINUTES,
          reason: 'Too many attempts from this IP address in the last hour'
        }
      }

      if (dailyAttempts >= this.IP_MAX_ATTEMPTS_PER_DAY) {
        // Block IP for longer duration
        await SessionManager.setWithExpiry(
          blockKey, 
          'blocked_daily_limit', 
          this.IP_BLOCK_DURATION_MINUTES * 4 * 60 // 4 hours
        )
        
        return {
          isBlocked: true,
          blockDuration: this.IP_BLOCK_DURATION_MINUTES * 4,
          reason: 'Too many attempts from this IP address today'
        }
      }

      return {
        isBlocked: false,
        reason: 'IP address is not blocked'
      }
    } catch (error) {
      logger.error('Check IP block error:', error)
      return {
        isBlocked: false,
        reason: 'Unable to check IP block status'
      }
    }
  }

  /**
   * Check if CAPTCHA should be required
   */
  static async shouldRequireCaptcha(userId?: string, ipAddress?: string): Promise<boolean> {
    try {
      // Check user-based CAPTCHA requirement
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        })
        
        if (user && user.failedLoginAttempts >= this.CAPTCHA_THRESHOLD) {
          return true
        }
      }

      // Check IP-based CAPTCHA requirement
      if (ipAddress) {
        const hourlyKey = `ip_attempts_hourly:${ipAddress}`
        const hourlyAttempts = await SessionManager.getCounter(hourlyKey)
        
        if (hourlyAttempts >= this.CAPTCHA_THRESHOLD) {
          return true
        }
      }

      return false
    } catch (error) {
      logger.error('Should require CAPTCHA error:', error)
      return false
    }
  }

  /**
   * Verify CAPTCHA token (placeholder for actual CAPTCHA integration)
   */
  static async verifyCaptcha(captchaToken: string, ipAddress?: string): Promise<boolean> {
    try {
      // This is a placeholder implementation
      // In production, integrate with services like Google reCAPTCHA, hCaptcha, etc.
      
      if (!captchaToken || captchaToken.length < 10) {
        return false
      }

      // Simulate CAPTCHA verification
      // Replace with actual CAPTCHA service API call
      logger.info(`CAPTCHA verification attempted for IP: ${ipAddress}`)
      
      // For demo purposes, accept any token longer than 10 characters
      return captchaToken.length >= 10
    } catch (error) {
      logger.error('CAPTCHA verification error:', error)
      return false
    }
  }

  /**
   * Reset user lockout (admin function)
   */
  static async resetUserLockout(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastFailedLogin: null
        }
      })

      logger.info(`User lockout reset for user: ${userId}`)

      return {
        success: true,
        message: 'User lockout has been reset'
      }
    } catch (error) {
      logger.error('Reset user lockout error:', error)
      return {
        success: false,
        message: 'Failed to reset user lockout'
      }
    }
  }

  /**
   * Unblock IP address (admin function)
   */
  static async unblockIP(ipAddress: string): Promise<{ success: boolean; message: string }> {
    try {
      const keys = [
        `ip_attempts_hourly:${ipAddress}`,
        `ip_attempts_daily:${ipAddress}`,
        `ip_blocked:${ipAddress}`
      ]

      await Promise.all(keys.map(key => SessionManager.delete(key)))

      logger.info(`IP address unblocked: ${ipAddress}`)

      return {
        success: true,
        message: 'IP address has been unblocked'
      }
    } catch (error) {
      logger.error('Unblock IP error:', error)
      return {
        success: false,
        message: 'Failed to unblock IP address'
      }
    }
  }

  /**
   * Get security statistics
   */
  static async getSecurityStats(): Promise<{
    lockedUsers: number
    blockedIPs: number
    recentFailedAttempts: number
  }> {
    try {
      const [lockedUsers, recentFailedAttempts] = await Promise.all([
        prisma.user.count({
          where: {
            lockedUntil: {
              gt: new Date()
            }
          }
        }),
        prisma.user.count({
          where: {
            lastFailedLogin: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ])

      // Note: Getting blocked IPs count would require Redis scan operation
      // For now, return 0 as placeholder
      const blockedIPs = 0

      return {
        lockedUsers,
        blockedIPs,
        recentFailedAttempts
      }
    } catch (error) {
      logger.error('Get security stats error:', error)
      return {
        lockedUsers: 0,
        blockedIPs: 0,
        recentFailedAttempts: 0
      }
    }
  }

  /**
   * Record IP attempt (helper method)
   */
  private static async recordIPAttempt(ipAddress: string, isSuccessful: boolean): Promise<void> {
    try {
      const hourlyKey = `ip_attempts_hourly:${ipAddress}`
      const dailyKey = `ip_attempts_daily:${ipAddress}`

      if (!isSuccessful) {
        // Increment counters for failed attempts
        await Promise.all([
          SessionManager.incrementCounter(hourlyKey, 60 * 60), // 1 hour expiry
          SessionManager.incrementCounter(dailyKey, 24 * 60 * 60) // 24 hours expiry
        ])
      }
      // For successful attempts, we don't increment counters but could reset them
      // This allows for some failed attempts mixed with successful ones
    } catch (error) {
      logger.error('Record IP attempt error:', error)
    }
  }

  /**
   * Get previous lockout count for progressive lockout calculation
   */
  private static async getPreviousLockoutCount(userId: string): Promise<number> {
    try {
      // This is a simplified implementation
      // In a more sophisticated system, you might track lockout history
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      // For now, return 0 for first lockout, 1 for subsequent
      // This could be enhanced to track actual lockout history
      return user?.lockedUntil ? 1 : 0
    } catch (error) {
      logger.error('Get previous lockout count error:', error)
      return 0
    }
  }
}