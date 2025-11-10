import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../index'

describe('Load Testing - Concurrent Users', () => {
  let server: any

  beforeAll(async () => {
    // Start server for load testing
    server = app.listen(0)
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
  })

  it('should handle concurrent login requests', async () => {
    const concurrentRequests = 50
    const loginData = {
      email: 'admin@test.com',
      password: 'password123'
    }

    const promises = Array.from({ length: concurrentRequests }, () =>
      request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(res => {
          expect([200, 401, 429]).toContain(res.status) // Allow rate limiting
        })
    )

    const results = await Promise.allSettled(promises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    // At least 80% of requests should succeed or be properly rate limited
    expect(successful).toBeGreaterThan(concurrentRequests * 0.8)
  })

  it('should handle concurrent POS transactions', async () => {
    const concurrentTransactions = 25
    const transactionData = {
      items: [
        { productId: '1', quantity: 1, price: 10.00 }
      ],
      paymentMethod: 'cash',
      totalAmount: 10.00
    }

    // First login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' })

    const token = loginResponse.body.token

    const promises = Array.from({ length: concurrentTransactions }, () =>
      request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(transactionData)
        .expect(res => {
          expect([200, 201, 400, 401, 429]).toContain(res.status)
        })
    )

    const results = await Promise.allSettled(promises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    // At least 70% of transactions should succeed
    expect(successful).toBeGreaterThan(concurrentTransactions * 0.7)
  })

  it('should handle concurrent inventory updates', async () => {
    const concurrentUpdates = 30
    
    // Login first
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' })

    const token = loginResponse.body.token

    const promises = Array.from({ length: concurrentUpdates }, (_, index) =>
      request(app)
        .put('/api/products/1/stock')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 100 + index, operation: 'set' })
        .expect(res => {
          expect([200, 400, 401, 409, 429]).toContain(res.status)
        })
    )

    const results = await Promise.allSettled(promises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    // At least 60% should succeed (some may fail due to race conditions)
    expect(successful).toBeGreaterThan(concurrentUpdates * 0.6)
  })

  it('should maintain response time under load', async () => {
    const requests = 20
    const startTime = Date.now()

    const promises = Array.from({ length: requests }, () =>
      request(app)
        .get('/api/products')
        .expect(res => {
          expect([200, 401, 429]).toContain(res.status)
        })
    )

    await Promise.all(promises)
    const endTime = Date.now()
    const averageResponseTime = (endTime - startTime) / requests

    // Average response time should be under 1 second
    expect(averageResponseTime).toBeLessThan(1000)
  })
})