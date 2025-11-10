import { User } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import axios from 'axios'

export interface PasswordStrengthResult {
  score: number // 0-100
  strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  feedback: string[]
  isValid: boolean
}

export interface PasswordBreachResult {
  isBreached: boolean
  breachCount?: number
  message: string
}

export interface PasswordPolicyResult {
  isValid: boolean
  violations: string[]
  message: string
}

export interface PasswordHistoryResult {
  isReused: boolean
  message: string
}

/**
 * Password Security Service
 * Handles password strength validation, breach detection, and history tracking
 */
export class PasswordSecurityService {
  private static readonly MIN_LENGTH = 8
  private static readonly MAX_LENGTH = 128
  private static readonly HISTORY_LIMIT = 5
  private static readonly HAVEIBEENPWNED_API = 'https://api.pwnedpasswords.com/range'

  /**
   * Validate password strength and policy compliance
   */
  static async validatePassword(password: string, userId?: string): Promise<{
    strength: PasswordStrengthResult
    policy: PasswordPolicyResult
    breach: PasswordBreachResult
    history?: PasswordHistoryResult
  }> {
    try {
      // Run all validations in parallel
      const [strength, policy, breach, history] = await Promise.all([
        this.checkPasswordStrength(password),
        this.checkPasswordPolicy(password),
        this.checkPasswordBreach(password),
        userId ? this.checkPasswordHistory(password, userId) : Promise.resolve(null)
      ])

      return {
        strength,
        policy,
        breach,
        history: history || undefined
      }
    } catch (error) {
      logger.error('Password validation error:', error)
      throw new Error('Password validation failed')
    }
  }

  /**
   * Check password strength and provide scoring
   */
  static async checkPasswordStrength(password: string): Promise<PasswordStrengthResult> {
    const feedback: string[] = []
    let score = 0

    // Length check (0-25 points)
    if (password.length >= 8) score += 10
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 5
    else if (password.length < 8) {
      feedback.push('Password should be at least 8 characters long')
    }

    // Character variety (0-40 points)
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (hasLowercase) score += 5
    else feedback.push('Include lowercase letters')

    if (hasUppercase) score += 5
    else feedback.push('Include uppercase letters')

    if (hasNumbers) score += 10
    else feedback.push('Include numbers')

    if (hasSpecialChars) score += 20
    else feedback.push('Include special characters (!@#$%^&*)')

    // Pattern checks (0-20 points)
    const hasNoRepeatingChars = !/(.)\1{2,}/.test(password)
    const hasNoSequentialChars = !this.hasSequentialChars(password)
    const hasNoCommonPatterns = !this.hasCommonPatterns(password)

    if (hasNoRepeatingChars) score += 5
    else feedback.push('Avoid repeating characters (e.g., aaa, 111)')

    if (hasNoSequentialChars) score += 5
    else feedback.push('Avoid sequential characters (e.g., abc, 123)')

    if (hasNoCommonPatterns) score += 10
    else feedback.push('Avoid common patterns (e.g., qwerty, password)')

    // Dictionary check (0-15 points)
    const isNotCommonPassword = !this.isCommonPassword(password.toLowerCase())
    if (isNotCommonPassword) score += 15
    else feedback.push('Avoid common passwords')

    // Determine strength level
    let strength: PasswordStrengthResult['strength']
    if (score >= 80) strength = 'Strong'
    else if (score >= 60) strength = 'Good'
    else if (score >= 40) strength = 'Fair'
    else if (score >= 20) strength = 'Weak'
    else strength = 'Very Weak'

    const isValid = score >= 60 && feedback.length === 0

    return {
      score,
      strength,
      feedback,
      isValid
    }
  }

  /**
   * Check password against policy requirements
   */
  static async checkPasswordPolicy(password: string): Promise<PasswordPolicyResult> {
    const violations: string[] = []

    // Length requirements
    if (password.length < this.MIN_LENGTH) {
      violations.push(`Password must be at least ${this.MIN_LENGTH} characters long`)
    }
    if (password.length > this.MAX_LENGTH) {
      violations.push(`Password must not exceed ${this.MAX_LENGTH} characters`)
    }

    // Character requirements
    if (!/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter')
    }
    if (!/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter')
    }
    if (!/\d/.test(password)) {
      violations.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      violations.push('Password must contain at least one special character')
    }

    // Forbidden patterns
    if (/(.)\1{2,}/.test(password)) {
      violations.push('Password must not contain repeating characters')
    }

    // Common password check
    if (this.isCommonPassword(password.toLowerCase())) {
      violations.push('Password is too common, please choose a different one')
    }

    const isValid = violations.length === 0

    return {
      isValid,
      violations,
      message: isValid ? 'Password meets all policy requirements' : 'Password violates policy requirements'
    }
  }

  /**
   * Check password against HaveIBeenPwned database
   */
  static async checkPasswordBreach(password: string): Promise<PasswordBreachResult> {
    try {
      // Create SHA-1 hash of password
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
      const prefix = hash.substring(0, 5)
      const suffix = hash.substring(5)

      // Query HaveIBeenPwned API
      const response = await axios.get(`${this.HAVEIBEENPWNED_API}/${prefix}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mosaajii-POS-Security-Check'
        }
      })

      // Parse response to find matching hash
      const hashes = response.data.split('\n')
      for (const line of hashes) {
        const [hashSuffix, count] = line.split(':')
        if (hashSuffix === suffix) {
          return {
            isBreached: true,
            breachCount: parseInt(count),
            message: `This password has been found in ${count} data breaches. Please choose a different password.`
          }
        }
      }

      return {
        isBreached: false,
        message: 'Password has not been found in known data breaches'
      }
    } catch (error) {
      logger.warn('Password breach check failed:', error)
      // Don't block password change if API is unavailable
      return {
        isBreached: false,
        message: 'Unable to check password against breach database (service unavailable)'
      }
    }
  }

  /**
   * Check password against user's password history
   */
  static async checkPasswordHistory(password: string, userId: string): Promise<PasswordHistoryResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.passwordHistory) {
        return {
          isReused: false,
          message: 'Password is not in history'
        }
      }

      const passwordHistory = JSON.parse(user.passwordHistory)
      
      // Check against previous passwords
      for (const oldHash of passwordHistory) {
        const isMatch = await bcrypt.compare(password, oldHash)
        if (isMatch) {
          return {
            isReused: true,
            message: `Password has been used recently. Please choose a different password.`
          }
        }
      }

      return {
        isReused: false,
        message: 'Password is not in history'
      }
    } catch (error) {
      logger.error('Password history check error:', error)
      return {
        isReused: false,
        message: 'Unable to check password history'
      }
    }
  }

  /**
   * Update password history when password is changed
   */
  static async updatePasswordHistory(userId: string, newPasswordHash: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('User not found')
      }

      let passwordHistory: string[] = []
      
      if (user.passwordHistory) {
        try {
          passwordHistory = JSON.parse(user.passwordHistory)
        } catch (error) {
          logger.warn('Invalid password history format, resetting:', error)
          passwordHistory = []
        }
      }

      // Add current password to history
      if (user.passwordHash) {
        passwordHistory.unshift(user.passwordHash)
      }

      // Keep only the last N passwords
      passwordHistory = passwordHistory.slice(0, this.HISTORY_LIMIT)

      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordHistory: JSON.stringify(passwordHistory),
          passwordChangedAt: new Date()
        }
      })

      logger.info(`Password history updated for user: ${userId}`)
    } catch (error) {
      logger.error('Update password history error:', error)
      throw error
    }
  }

  /**
   * Generate a strong password suggestion
   */
  static generateStrongPassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = lowercase + uppercase + numbers + symbols
    let password = ''

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Check for sequential characters
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ]

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3)
        if (password.toLowerCase().includes(subseq) || 
            password.toLowerCase().includes(subseq.split('').reverse().join(''))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check for common patterns
   */
  private static hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /password/i,
      /123456/,
      /qwerty/i,
      /admin/i,
      /login/i,
      /welcome/i,
      /letmein/i,
      /monkey/i,
      /dragon/i,
      /master/i
    ]

    return commonPatterns.some(pattern => pattern.test(password))
  }

  /**
   * Check if password is in common passwords list
   */
  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'shadow', 'superman', 'michael',
      'football', 'baseball', 'liverpool', 'jordan', 'princess',
      'sunshine', 'iloveyou', 'lovely', 'babygirl', 'family'
    ]

    return commonPasswords.includes(password)
  }
}