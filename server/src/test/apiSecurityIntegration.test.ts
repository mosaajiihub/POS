import request from 'supertest'
import express from 'express'
import { apiSecurityMiddleware, securityContextMiddleware } from '../middleware/apiSecurityMiddleware'
import { attackDetectionMiddleware } from '../middleware/attackDetection'
import { validateRequest, limitRequestSize, validateContentType } from '../middleware/inputValidation'

describe('API Security Gateway Integration', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    
    // Setup middleware stack similar to main application
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    
    // Security middleware stack
    app.use('/api/', securityContextMiddleware())
    app.use('/api/', attackDetectionMiddleware({
      enableSQLInjectionDetection: true,
      enableXSSDetection: true,
      enableCSRFProtection: true,
      enableSuspiciousActivityDetection: true,
      enableBruteForceProtection: true,
      logSecurityEvents: false, // Disable logging for tests
      blockSuspiciousRequests: true,
      maxSuspiciousScore: 75
    }))
    app.use('/api/', apiSecurityMiddleware({
      enableLogging: false, // Disable logging for tests
      enableVersionValidation: true,
      enableSignatureVerification: false
    }))

    // Test routes
    app.post('/api/v1/test', 
      limitRequestSize(1024 * 1024),
      validateContentType(['application/json']),
      validateRequest({ sanitize: true }),
      (req, res) => {
        res.json({ 
          success: true, 
          data: req.body,
          securityContext: {
            threatsDetected: req.securityThreats?.length || 0,
            suspiciousScore: req.suspiciousScore || 0
          }
        })
      }
    )

    app.get('/api/v1/test', (req, res) => {
      res.json({ success: true, query: req.query })
    })

    app.post('/api/v99/test', (req, res) => {
      res.json({ success: true }) // Should be blocked by version validation
    })
  })

  describe('Input Validation Integration', () => {
    it('should sanitize and allow clean requests', async () => {
      const response = await request(app)
        .post('/api/v1/test')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          description: 'This is a clean description'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('John Doe')
      expect(response.body.securityContext.threatsDetected).toBe(0)
    })

    it('should block SQL injection attempts', async () => {
      await request(app)
        .post('/api/v1/test')
        .send({
          username: "admin'; DROP TABLE users; --",
          password: 'password'
        })
        .expect(403)
    })

    it('should block XSS attempts', async () => {
      await request(app)
        .post('/api/v1/test')
        .send({
          comment: '<script>alert("XSS")</script>',
          title: 'Normal title'
        })
        .expect(403)
    })

    it('should detect CSRF missing token', async () => {
      const response = await request(app)
        .post('/api/v1/test')
        .send({ data: 'test' })
        .expect(200) // Not blocked, but threat detected

      expect(response.body.securityContext.threatsDetected).toBeGreaterThan(0)
    })
  })

  describe('API Version Validation', () => {
    it('should allow supported API versions', async () => {
      await request(app)
        .get('/api/v1/test?search=normal')
        .expect(200)
    })

    it('should block unsupported API versions', async () => {
      await request(app)
        .post('/api/v99/test')
        .send({ data: 'test' })
        .expect(400)
    })
  })

  describe('Request Size Limits', () => {
    it('should block oversized requests', async () => {
      const largeData = {
        data: 'A'.repeat(2 * 1024 * 1024) // 2MB of data
      }

      await request(app)
        .post('/api/v1/test')
        .send(largeData)
        .expect(413)
    })
  })

  describe('Content Type Validation', () => {
    it('should block unsupported content types', async () => {
      await request(app)
        .post('/api/v1/test')
        .set('Content-Type', 'text/plain')
        .send('plain text data')
        .expect(415)
    })
  })

  describe('Suspicious Activity Detection', () => {
    it('should detect directory traversal attempts', async () => {
      await request(app)
        .get('/api/v1/test?path=../../../etc/passwd')
        .expect(403)
    })

    it('should detect suspicious user agents', async () => {
      const response = await request(app)
        .get('/api/v1/test')
        .set('User-Agent', 'bot')
        .expect(200)

      expect(response.body).toBeDefined()
    })
  })

  describe('Security Headers', () => {
    it('should include security context in requests', async () => {
      const response = await request(app)
        .post('/api/v1/test')
        .send({ name: 'test' })
        .expect(200)

      expect(response.body.securityContext).toBeDefined()
      expect(response.body.securityContext.threatsDetected).toBeDefined()
      expect(response.body.securityContext.suspiciousScore).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/api/v1/test')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)
    })
  })

  describe('Multiple Threat Detection', () => {
    it('should detect and block multiple threats in single request', async () => {
      await request(app)
        .post('/api/v1/test')
        .send({
          username: "admin'; DROP TABLE users; --", // SQL injection
          comment: '<script>alert("XSS")</script>', // XSS
          description: 'Normal text'
        })
        .expect(403)
    })
  })
})