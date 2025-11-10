import { User } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import * as crypto from 'crypto'

export interface MFASetupResult {
  success: boolean
  message: string
  secret?: string
  qrCodeUrl?: string
  backupCodes?: string[]
}

export interface MFAVerificationResult {
  success: boolean
  message: string
  isBackupCode?: boolean
}

export interface MFAStatusResult {
  enabled: boolean
  setupAt?: Date
  lastUsed?: Date
  backupCodesRemaining?: number
}

/**
 * Multi-Factor Authentication Service
 * Handles TOTP-based MFA setup, verification, and backup codes
 */
export class MFAService {
  private static readonly ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'default-key-change-in-production'
  private static readonly BACKUP_CODES_COUNT = 10
  private static readonly PASSWORD_HISTORY_LIMIT = 5

  /**
   * Set up MFA for a user
   */
  static async setupMFA(userId: string): Promise<MFASetupResult> {
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

      if (user.mfaEnabled) {
        return {
          success: false,
          message: 'MFA is already enabled for this user'
        }
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `${user.firstName} ${user.lastName}`,
        issuer: 'Mosaajii POS',
        length: 32
      })

      // Generate QR code URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      // Encrypt sensitive data
      const encryptedSecret = this.encrypt(secret.base32)
      const encryptedBackupCodes = this.encrypt(JSON.stringify(backupCodes))

      // Store MFA setup (but don't enable yet - user needs to verify first)
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaSecret: encryptedSecret,
          mfaBackupCodes: encryptedBackupCodes
        }
      })

      logger.info(`MFA setup initiated for user: ${userId}`)

      return {
        success: true,
        message: 'MFA setup initiated. Please verify with your authenticator app to complete setup.',
        secret: secret.base32,
        qrCodeUrl,
        backupCodes
      }
    } catch (error) {
      logger.error('MFA setup error:', error)
      return {
        success: false,
        message: 'An error occurred during MFA setup'
      }
    }
  }

  /**
   * Verify MFA setup with TOTP token
   */
  static async verifyMFASetup(userId: string, token: string): Promise<MFAVerificationResult> {
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

      if (user.mfaEnabled) {
        return {
          success: false,
          message: 'MFA is already enabled'
        }
      }

      if (!user.mfaSecret) {
        return {
          success: false,
          message: 'MFA setup not initiated. Please start MFA setup first.'
        }
      }

      // Decrypt secret
      const secret = this.decrypt(user.mfaSecret)

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps (60 seconds) tolerance
      })

      if (!verified) {
        return {
          success: false,
          message: 'Invalid verification code. Please try again.'
        }
      }

      // Enable MFA
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaSetupAt: new Date(),
          mfaLastUsed: new Date()
        }
      })

      logger.info(`MFA enabled for user: ${userId}`)

      return {
        success: true,
        message: 'MFA has been successfully enabled for your account'
      }
    } catch (error) {
      logger.error('MFA setup verification error:', error)
      return {
        success: false,
        message: 'An error occurred during MFA verification'
      }
    }
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMFA(userId: string, token: string): Promise<MFAVerificationResult> {
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

      if (!user.mfaEnabled || !user.mfaSecret) {
        return {
          success: false,
          message: 'MFA is not enabled for this user'
        }
      }

      // First try TOTP verification
      const secret = this.decrypt(user.mfaSecret)
      const totpVerified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2
      })

      if (totpVerified) {
        // Update last used timestamp
        await prisma.user.update({
          where: { id: userId },
          data: { mfaLastUsed: new Date() }
        })

        return {
          success: true,
          message: 'MFA verification successful'
        }
      }

      // If TOTP fails, try backup codes
      if (user.mfaBackupCodes) {
        const backupCodes = JSON.parse(this.decrypt(user.mfaBackupCodes))
        const codeIndex = backupCodes.indexOf(token)

        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1)
          
          // Update backup codes
          await prisma.user.update({
            where: { id: userId },
            data: {
              mfaBackupCodes: this.encrypt(JSON.stringify(backupCodes)),
              mfaLastUsed: new Date()
            }
          })

          logger.info(`Backup code used for MFA verification: ${userId}`)

          return {
            success: true,
            message: 'MFA verification successful using backup code',
            isBackupCode: true
          }
        }
      }

      return {
        success: false,
        message: 'Invalid MFA code or backup code'
      }
    } catch (error) {
      logger.error('MFA verification error:', error)
      return {
        success: false,
        message: 'An error occurred during MFA verification'
      }
    }
  }

  /**
   * Disable MFA for a user
   */
  static async disableMFA(userId: string, currentPassword: string): Promise<{ success: boolean; message: string }> {
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

      if (!user.mfaEnabled) {
        return {
          success: false,
          message: 'MFA is not enabled for this user'
        }
      }

      // Verify current password for security
      const bcrypt = require('bcrypt')
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        }
      }

      // Disable MFA and clear secrets
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
          mfaSetupAt: null,
          mfaLastUsed: null
        }
      })

      logger.info(`MFA disabled for user: ${userId}`)

      return {
        success: true,
        message: 'MFA has been disabled for your account'
      }
    } catch (error) {
      logger.error('MFA disable error:', error)
      return {
        success: false,
        message: 'An error occurred while disabling MFA'
      }
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId: string, currentPassword: string): Promise<MFASetupResult> {
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

      if (!user.mfaEnabled) {
        return {
          success: false,
          message: 'MFA is not enabled for this user'
        }
      }

      // Verify current password for security
      const bcrypt = require('bcrypt')
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect'
        }
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes()
      const encryptedBackupCodes = this.encrypt(JSON.stringify(backupCodes))

      // Update backup codes
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaBackupCodes: encryptedBackupCodes
        }
      })

      logger.info(`New backup codes generated for user: ${userId}`)

      return {
        success: true,
        message: 'New backup codes generated successfully',
        backupCodes
      }
    } catch (error) {
      logger.error('Generate backup codes error:', error)
      return {
        success: false,
        message: 'An error occurred while generating backup codes'
      }
    }
  }

  /**
   * Get MFA status for a user
   */
  static async getMFAStatus(userId: string): Promise<MFAStatusResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return { enabled: false }
      }

      let backupCodesRemaining = 0
      if (user.mfaBackupCodes) {
        try {
          const backupCodes = JSON.parse(this.decrypt(user.mfaBackupCodes))
          backupCodesRemaining = backupCodes.length
        } catch (error) {
          logger.error('Error parsing backup codes:', error)
        }
      }

      return {
        enabled: user.mfaEnabled,
        setupAt: user.mfaSetupAt || undefined,
        lastUsed: user.mfaLastUsed || undefined,
        backupCodesRemaining
      }
    } catch (error) {
      logger.error('Get MFA status error:', error)
      return { enabled: false }
    }
  }

  /**
   * Reset MFA for a user (admin only)
   */
  static async resetMFA(userId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== 'ADMIN') {
        return {
          success: false,
          message: 'Insufficient permissions to reset MFA'
        }
      }

      // Reset MFA for target user
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
          mfaSetupAt: null,
          mfaLastUsed: null
        }
      })

      logger.info(`MFA reset for user: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'MFA has been reset for the user'
      }
    } catch (error) {
      logger.error('MFA reset error:', error)
      return {
        success: false,
        message: 'An error occurred while resetting MFA'
      }
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }

  /**
   * Encrypt sensitive data
   */
  private static encrypt(text: string): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32)
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher(algorithm, key)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  }

  /**
   * Decrypt sensitive data
   */
  private static decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32)
    
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}