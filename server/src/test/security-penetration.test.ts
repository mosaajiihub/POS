import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../index'

describe('Security Penetration Testing', () => {
  let server: any
  let authToken: string

  beforeAll(async () => {
    server = app.listen(0)
    
    // Get auth token for authenticated tests
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' })
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token
    }
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
  })

  describe('Authentication Security', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousPayloads = [
        { email: "admin@test.com'; DROP TABLE users; --", password: 'password' },
        { email: "admin@test.com' OR '1'='1", password: 'password' },
        { email: "admin@test.com' UNION SELECT * FROM users --", password: 'password' }
      ]

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(payload)

        // Should return 401 or 400, not 500 (which would indicate SQL error)
        expect([400, 401]).toContain(response.status)
        expect(response.body).not.toHaveProperty('sqlMessage')
      }
    })

    it('should prevent brute force attacks with rate limiting', async () => {
      const attempts = 10
      const promises = Array.from({ length: attempts }, () =>
        request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@test.com', password: 'wrongpassword' })
      )

      const results = await Promise.all(promises)
      const rateLimitedResponses = results.filter(r => r.status === 429)
      
      // Should have rate limiting after multiple failed attempts
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })

    it('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        ''
      ]

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', token)

        expect(response.status).toBe(401)
      }
    })
  })

  describe('Input Validation Security', () => {
    it('should prevent XSS in product creation', async () => {
      if (!authToken) return

      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">'
      ]

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: payload,
            description: payload,
            price: 10.00,
            sku: 'TEST-001'
          })

        // Should either reject the input or sanitize it
        if (response.status === 201) {
          expect(response.body.name).not.toContain('<script>')
          expect(response.body.description).not.toContain('<script>')
        } else {
          expect([400, 422]).toContain(response.status)
        }
      }
    })

    it('should validate numeric inputs properly', async () => {
      if (!authToken) return

      const invalidNumericInputs = [
        { price: 'not-a-number' },
        { price: -1 },
        { quantity: 'invalid' },
        { quantity: -5 }
      ]

      for (const input of invalidNumericInputs) {
        const response = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Product',
            sku: 'TEST-001',
            ...input
          })

        expect([400, 422]).toContain(response.status)
      }
    })
  })

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      const adminEndpoints = [
        '/api/users',
        '/api/users/1',
        '/api/admin/settings',
        '/api/admin/reports'
      ]

      for (const endpoint of adminEndpoints) {
        // Test without token
        const responseNoAuth = await request(app).get(endpoint)
        expect(responseNoAuth.status).toBe(401)

        // Test with invalid token
        const responseInvalidAuth = await request(app)
          .get(endpoint)
          .set('Authorization', 'Bearer invalid-token')
        expect(responseInvalidAuth.status).toBe(401)
      }
    })

    it('should prevent privilege escalation', async () => {
      if (!authToken) return

      // Try to modify user roles without proper permissions
      const response = await request(app)
        .put('/api/users/1/role')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })

      // Should either be forbidden or require additional verification
      expect([403, 401, 422]).toContain(response.status)
    })
  })

  describe('Data Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')

      expect(response.body).not.toHaveProperty('stack')
      expect(response.body).not.toHaveProperty('sqlMessage')
      expect(JSON.stringify(response.body)).not.toMatch(/password|secret|key/i)
    })

    it('should handle file upload security', async () => {
      if (!authToken) return

      // Test malicious file types
      const response = await request(app)
        .post('/api/products/1/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', Buffer.from('malicious content'), 'malware.exe')

      expect([400, 415, 422]).toContain(response.status)
    })
  })

  describe('Session Security', () => {
    it('should handle session fixation attacks', async () => {
      // Login with one session
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' })

      if (login1.status !== 200) return

      const token1 = login1.body.token

      // Login again with same credentials
      const login2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' })

      if (login2.status !== 200) return

      const token2 = login2.body.token

      // Tokens should be different (new session created)
      expect(token1).not.toBe(token2)
    })
  })
})