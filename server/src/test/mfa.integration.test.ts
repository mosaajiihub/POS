import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { prisma } from '../config/database'
import mfaRoutes from '../routes/mfa'
import { requireAuth } from '../middleware/auth'

// Mock authentication middleware for testing
const mockAuth = (req: any, res: any, next: any) => {
  req.user = { userId: 'test-user-id' }
  next()
}

const app = express()
app.use(express.json())
app.use('/api/mfa', mockAuth, mfaRoutes)

describe('MFA Integration Tests', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'mfa-integration-test@example.com',
        firstName: 'MFA',
        lastName: 'Integration',
        passwordHash: 'hashedpassword',
        role: 'CASHIER',
        status: 'ACTIVE',
        paymentVerified: true
      }
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({
      where: { id: testUserId }
    }).catch(() => {})
  })

  it('should get MFA status', async () => {
    const response = await request(app)
      .get('/api/mfa/status')
      .expect(200)

    expect(response.body.status.enabled).toBe(false)
  })

  it('should setup MFA', async () => {
    const response = await request(app)
      .post('/api/mfa/setup')
      .expect(200)

    expect(response.body.setup.secret).toBeDefined()
    expect(response.body.setup.qrCodeUrl).toBeDefined()
    expect(response.body.setup.backupCodes).toBeDefined()
  })
})

describe('Password Security Integration', () => {
  it('should validate password strength in real scenarios', async () => {
    const { PasswordSecurityService } = await import('../services/passwordSecurityService')
    
    const testCases = [
      { password: '123', expectedValid: false },
      { password: 'password', expectedValid: false },
      { password: 'Password123!', expectedValid: true },
      { password: 'MyVeryStr0ng!P@ssw0rd2024', expectedValid: true }
    ]

    for (const testCase of testCases) {
      const result = await PasswordSecurityService.validatePassword(testCase.password)
      expect(result.policy.isValid).toBe(testCase.expectedValid)
    }
  })
})