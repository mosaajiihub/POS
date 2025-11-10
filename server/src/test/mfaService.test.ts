import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MFAService } from '../services/mfaService'
import { PasswordSecurityService } from '../services/passwordSecurityService'
import { BruteForceProtectionService } from '../services/bruteForceProtectionService'
import { prisma } from '../config/database'

describe('MFA Service', () => {
  let testUserId: string

  beforeEach(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'mfa-test@example.com',
        firstName: 'MFA',
        lastName: 'Test',
        passwordHash: 'hashedpassword',
        role: 'CASHIER',
        status: 'ACTIVE',
        paymentVerified: true
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test user
    await prisma.user.delete({
      where: { id: testUserId }
    }).catch(() => {}) // Ignore errors if user doesn't exist
  })

  it('should setup MFA for a user', async () => {
    const result = await MFAService.setupMFA(testUserId)
    
    expect(result.success).toBe(true)
    expect(result.secret).toBeDefined()
    expect(result.qrCodeUrl).toBeDefined()
    expect(result.backupCodes).toBeDefined()
    expect(result.backupCodes?.length).toBe(10)
  })

  it('should get MFA status', async () => {
    const status = await MFAService.getMFAStatus(testUserId)
    
    expect(status.enabled).toBe(false)
    expect(status.setupAt).toBeUndefined()
    expect(status.lastUsed).toBeUndefined()
  })
})

describe('Password Security Service', () => {
  it('should validate password strength', async () => {
    const weakPassword = '123'
    const strongPassword = 'MyStr0ng!P@ssw0rd'
    
    const weakResult = await PasswordSecurityService.checkPasswordStrength(weakPassword)
    const strongResult = await PasswordSecurityService.checkPasswordStrength(strongPassword)
    
    expect(weakResult.strength).toBe('Very Weak')
    expect(weakResult.isValid).toBe(false)
    expect(strongResult.strength).toBe('Strong')
    expect(strongResult.isValid).toBe(true)
  })

  it('should check password policy', async () => {
    const invalidPassword = '123'
    const validPassword = 'MyStr0ng!P@ssw0rd'
    
    const invalidResult = await PasswordSecurityService.checkPasswordPolicy(invalidPassword)
    const validResult = await PasswordSecurityService.checkPasswordPolicy(validPassword)
    
    expect(invalidResult.isValid).toBe(false)
    expect(invalidResult.violations.length).toBeGreaterThan(0)
    expect(validResult.isValid).toBe(true)
    expect(validResult.violations.length).toBe(0)
  })

  it('should generate strong password', () => {
    const password = PasswordSecurityService.generateStrongPassword(16)
    
    expect(password.length).toBe(16)
    expect(/[a-z]/.test(password)).toBe(true)
    expect(/[A-Z]/.test(password)).toBe(true)
    expect(/\d/.test(password)).toBe(true)
    expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true)
  })
})

describe('Brute Force Protection Service', () => {
  let testUserId: string

  beforeEach(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'brute-force-test@example.com',
        firstName: 'BruteForce',
        lastName: 'Test',
        passwordHash: 'hashedpassword',
        role: 'CASHIER',
        status: 'ACTIVE',
        paymentVerified: true
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up test user
    await prisma.user.delete({
      where: { id: testUserId }
    }).catch(() => {}) // Ignore errors if user doesn't exist
  })

  it('should check user lockout status', async () => {
    const result = await BruteForceProtectionService.checkUserLockout(testUserId)
    
    expect(result.isBlocked).toBe(false)
    expect(result.attemptsRemaining).toBe(5)
  })

  it('should record failed login attempt', async () => {
    const result = await BruteForceProtectionService.recordFailedAttempt(testUserId, '127.0.0.1')
    
    expect(result.success).toBe(false)
    expect(result.attemptsRemaining).toBe(4)
  })

  it('should check IP blocking', async () => {
    const result = await BruteForceProtectionService.checkIPBlock('127.0.0.1')
    
    expect(result.isBlocked).toBe(false)
  })
})