import { User, UserRole, UserStatus } from '@prisma/client'
import { prisma } from '../config/database'
import { SessionManager, OTPManager } from '../config/redis'
import { PasswordUtils, TokenUtils, TokenPair } from '../utils/auth'
import { logger } from '../utils/logger'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
}

export interface AuthResult {
  success: boolean
  message: string
  user?: Omit<User, 'passwordHash'>
  tokens?: TokenPair
  sessionId?: string
}

export interface OTPResult {
  success: boolean
  message: string
  otpInfo?: {
    expiresAt: string
    attemptsRemaining: number
  }
}

/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      const { email, password } = credentials

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user) {
        logger.warn(`Login attempt with non-existent email: ${email}`)
        return {
          success: false,
          message: 'Invalid email or password'
        }
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.verifyPassword(password, user.passwordHash)
      if (!isPasswordValid) {
        logger.warn(`Invalid password attempt for user: ${user.id}`)
        return {
          success: false,
          message: 'Invalid email or password'
        }
      }

      // Check user status
      if (user.status !== UserStatus.ACTIVE) {
        logger.warn(`Login attempt by inactive user: ${user.id}, status: ${user.status}`)
        return {
          success: false,
          message: `Account is ${user.status.toLowerCase()}. Please contact administrator.`
        }
      }

      // Check payment verification for non-admin users
      if (user.role !== UserRole.ADMIN && !user.paymentVerified) {
        logger.warn(`Login attempt by user without payment verification: ${user.id}`)
        return {
          success: false,
          message: 'Payment verification required. Please contact administrator.'
        }
      }

      // Generate tokens
      const tokens = TokenUtils.generateTokenPair(user)

      // Create session
      const sessionId = await SessionManager.createSession(user.id, {
        ipAddress,
        userAgent,
        loginAt: new Date().toISOString()
      })

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user

      logger.info(`User logged in successfully: ${user.id}`)

      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        tokens,
        sessionId
      }
    } catch (error) {
      logger.error('Login error:', error)
      return {
        success: false,
        message: 'An error occurred during login'
      }
    }
  }

  /**
   * Register a new user (admin only)
   */
  static async register(userData: RegisterUserData, adminUserId: string): Promise<AuthResult> {
    try {
      const { email, password, firstName, lastName, role = UserRole.CASHIER } = userData

      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== UserRole.ADMIN) {
        return {
          success: false,
          message: 'Insufficient permissions to create user'
        }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        }
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(password)
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message
        }
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(password)

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          role,
          status: UserStatus.PENDING, // User starts as pending until payment verification
          paymentVerified: false
        }
      })

      // Remove sensitive data
      const { passwordHash: _, ...userWithoutPassword } = newUser

      logger.info(`New user registered: ${newUser.id} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'User registered successfully. Payment verification required for activation.',
        user: userWithoutPassword
      }
    } catch (error) {
      logger.error('Registration error:', error)
      return {
        success: false,
        message: 'An error occurred during registration'
      }
    }
  }

  /**
   * Generate and send OTP for user activation
   */
  static async generateOTP(userId: string, adminUserId: string): Promise<OTPResult> {
    try {
      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== UserRole.ADMIN) {
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

      // Get OTP info for response
      const otpInfo = await OTPManager.getOTPInfo(userId)

      logger.info(`OTP generated for user: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'OTP generated successfully',
        otpInfo: {
          expiresAt: otpInfo.expiresAt!,
          attemptsRemaining: 3 - (otpInfo.attempts || 0)
        }
      }
    } catch (error) {
      logger.error('OTP generation error:', error)
      return {
        success: false,
        message: 'An error occurred while generating OTP'
      }
    }
  }

  /**
   * Verify OTP and activate user
   */
  static async verifyOTP(userId: string, otp: string): Promise<AuthResult> {
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

      // Verify OTP
      const otpResult = await OTPManager.verifyOTP(userId, otp)

      if (!otpResult.valid) {
        return {
          success: false,
          message: otpResult.message
        }
      }

      // Activate user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          otpCode: null,
          otpExpiry: null
        }
      })

      // Generate tokens for immediate login
      const tokens = TokenUtils.generateTokenPair(updatedUser)

      // Create session
      const sessionId = await SessionManager.createSession(updatedUser.id, {
        activatedAt: new Date().toISOString()
      })

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser

      logger.info(`User activated successfully: ${userId}`)

      return {
        success: true,
        message: 'Account activated successfully',
        user: userWithoutPassword,
        tokens,
        sessionId
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
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = TokenUtils.verifyRefreshToken(refreshToken)
      if (!decoded) {
        return {
          success: false,
          message: 'Invalid or expired refresh token'
        }
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check user status
      if (user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          message: 'Account is not active'
        }
      }

      // Generate new tokens
      const tokens = TokenUtils.generateTokenPair(user)

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user

      return {
        success: true,
        message: 'Token refreshed successfully',
        user: userWithoutPassword,
        tokens
      }
    } catch (error) {
      logger.error('Token refresh error:', error)
      return {
        success: false,
        message: 'An error occurred during token refresh'
      }
    }
  }

  /**
   * Logout user and invalidate session
   */
  static async logout(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const deleted = await SessionManager.deleteSession(sessionId)
      
      if (deleted) {
        logger.info(`User logged out, session deleted: ${sessionId}`)
        return {
          success: true,
          message: 'Logged out successfully'
        }
      } else {
        return {
          success: false,
          message: 'Session not found'
        }
      }
    } catch (error) {
      logger.error('Logout error:', error)
      return {
        success: false,
        message: 'An error occurred during logout'
      }
    }
  }

  /**
   * Logout user from all devices
   */
  static async logoutAll(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const deletedCount = await SessionManager.deleteUserSessions(userId)
      
      logger.info(`User logged out from all devices: ${userId}, sessions deleted: ${deletedCount}`)
      
      return {
        success: true,
        message: `Logged out from ${deletedCount} devices`
      }
    } catch (error) {
      logger.error('Logout all error:', error)
      return {
        success: false,
        message: 'An error occurred during logout'
      }
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
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

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        }
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword)
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message
        }
      }

      // Hash new password
      const newPasswordHash = await PasswordUtils.hashPassword(newPassword)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      })

      // Logout from all devices for security
      await SessionManager.deleteUserSessions(userId)

      logger.info(`Password changed for user: ${userId}`)

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.'
      }
    } catch (error) {
      logger.error('Change password error:', error)
      return {
        success: false,
        message: 'An error occurred while changing password'
      }
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<AuthResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user

      return {
        success: true,
        message: 'Profile retrieved successfully',
        user: userWithoutPassword
      }
    } catch (error) {
      logger.error('Get profile error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving profile'
      }
    }
  }
}