import { Request, Response, NextFunction } from 'express'
import { attackDetectionMiddleware, generateCSRFToken, validateCSRFToken } from '../middleware/attackDetection'

describe('Attack Detection Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; test)',
        'content-type': 'application/json'
      },
      body: {},
      query: {},
      params: {},
      connection: {
        remoteAddress: '127.0.0.1'
      } as any
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200
    }

    mockNext = jest.fn()
  })

  describe('SQL Injection Detection', () => {
    it('should detect SQL injection in request body', async () => {
      mockReq.body = {
        username: "admin'; DROP TABLE users; --",
        password: 'password'
      }

      const middleware = attackDetectionMiddleware({
        enableSQLInjectionDetection: true,
        blockSuspiciousRequests: true,
        maxSuspiciousScore: 50
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'SUSPICIOUS_ACTIVITY_DETECTED',
          message: 'Request blocked due to suspicious activity patterns'
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should detect SQL injection in query parameters', async () => {
      mockReq.query = {
        search: "' OR '1'='1"
      }

      const middleware = attackDetectionMiddleware({
        enableSQLInjectionDetection: true,
        blockSuspiciousRequests: true,
        maxSuspiciousScore: 50
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow clean requests', async () => {
      mockReq.body = {
        username: 'admin',
        password: 'password123'
      }

      const middleware = attackDetectionMiddleware({
        enableSQLInjectionDetection: true,
        blockSuspiciousRequests: true
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('XSS Detection', () => {
    it('should detect XSS in request body', async () => {
      mockReq.body = {
        comment: '<script>alert("XSS")</script>',
        title: 'Normal title'
      }

      const middleware = attackDetectionMiddleware({
        enableXSSDetection: true,
        blockSuspiciousRequests: true,
        maxSuspiciousScore: 40
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should detect XSS in query parameters', async () => {
      mockReq.query = {
        search: '<img src="x" onerror="alert(1)">'
      }

      const middleware = attackDetectionMiddleware({
        enableXSSDetection: true,
        blockSuspiciousRequests: true,
        maxSuspiciousScore: 40
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('CSRF Protection', () => {
    it('should detect missing CSRF token in POST request', async () => {
      mockReq.method = 'POST'
      mockReq.body = { data: 'test' }

      const middleware = attackDetectionMiddleware({
        enableCSRFProtection: true,
        blockSuspiciousRequests: false, // Don't block, just detect
        logSecurityEvents: false
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.securityThreats).toBeDefined()
      expect(mockReq.securityThreats?.length).toBeGreaterThan(0)
      expect(mockReq.securityThreats?.[0].type).toBe('CSRF')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow requests with valid CSRF token', async () => {
      const sessionId = 'test-session-123'
      const token = generateCSRFToken(sessionId)

      mockReq.method = 'POST'
      mockReq.headers = {
        ...mockReq.headers,
        'x-csrf-token': token,
        'x-session-id': sessionId
      }
      mockReq.body = { data: 'test' }

      const middleware = attackDetectionMiddleware({
        enableCSRFProtection: true,
        blockSuspiciousRequests: false
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.securityThreats?.length || 0).toBe(0)
    })
  })

  describe('Brute Force Detection', () => {
    it('should detect rapid successive login attempts', async () => {
      mockReq.path = '/api/auth/login'
      mockReq.method = 'POST'

      const middleware = attackDetectionMiddleware({
        enableBruteForceProtection: true,
        blockSuspiciousRequests: false
      })

      // Simulate rapid requests
      for (let i = 0; i < 6; i++) {
        await middleware(mockReq as Request, mockRes as Response, mockNext)
      }

      expect(mockReq.securityThreats).toBeDefined()
      const bruteForceThreat = mockReq.securityThreats?.find(t => t.type === 'BRUTE_FORCE')
      expect(bruteForceThreat).toBeDefined()
    })
  })

  describe('Suspicious Activity Detection', () => {
    it('should detect suspicious user agent', async () => {
      mockReq.headers = {
        'user-agent': 'bot'
      }

      const middleware = attackDetectionMiddleware({
        enableSuspiciousActivityDetection: true,
        blockSuspiciousRequests: false
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.securityThreats).toBeDefined()
      const suspiciousThreat = mockReq.securityThreats?.find(t => t.type === 'SUSPICIOUS_PATTERN')
      expect(suspiciousThreat).toBeDefined()
    })

    it('should detect directory traversal attempts', async () => {
      mockReq.url = '/api/files?path=../../../etc/passwd'

      const middleware = attackDetectionMiddleware({
        enableSuspiciousActivityDetection: true,
        blockSuspiciousRequests: false
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.securityThreats).toBeDefined()
      const maliciousThreat = mockReq.securityThreats?.find(t => 
        t.type === 'SUSPICIOUS_PATTERN' && t.description.includes('Malicious payload')
      )
      expect(maliciousThreat).toBeDefined()
    })

    it('should detect large request sizes', async () => {
      mockReq.headers = {
        ...mockReq.headers,
        'content-length': '6000000' // 6MB
      }

      const middleware = attackDetectionMiddleware({
        enableSuspiciousActivityDetection: true,
        blockSuspiciousRequests: false
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.securityThreats).toBeDefined()
      const largeThreat = mockReq.securityThreats?.find(t => 
        t.type === 'SUSPICIOUS_PATTERN' && t.description.includes('large request')
      )
      expect(largeThreat).toBeDefined()
    })
  })

  describe('IP Blocking', () => {
    it('should block requests from previously blocked IPs', async () => {
      const maliciousIP = '192.168.1.100'
      mockReq.ip = maliciousIP

      // First request with high suspicious score to trigger blocking
      mockReq.body = {
        username: "admin'; DROP TABLE users; --"
      }

      const middleware = attackDetectionMiddleware({
        enableSQLInjectionDetection: true,
        blockSuspiciousRequests: true,
        maxSuspiciousScore: 50
      })

      // First request should be blocked and IP marked as suspicious
      await middleware(mockReq as Request, mockRes as Response, mockNext)
      expect(mockRes.status).toHaveBeenCalledWith(403)

      // Reset mocks for second request
      mockRes.status = jest.fn().mockReturnThis()
      mockRes.json = jest.fn().mockReturnThis()
      mockNext = jest.fn()

      // Second request from same IP should be blocked immediately
      mockReq.body = { username: 'normal' } // Clean request
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'IP_BLOCKED',
          message: 'Access denied due to suspicious activity'
        }
      })
    })
  })

  describe('CSRF Token Management', () => {
    it('should generate valid CSRF tokens', () => {
      const sessionId = 'test-session-123'
      const token = generateCSRFToken(sessionId)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes hex = 64 characters
    })

    it('should validate CSRF tokens correctly', () => {
      const sessionId = 'test-session-123'
      const token = generateCSRFToken(sessionId)

      // Valid token should pass
      expect(validateCSRFToken(sessionId, token)).toBe(true)

      // Invalid token should fail
      expect(validateCSRFToken(sessionId, 'invalid-token')).toBe(false)

      // Token should be marked as used after validation
      expect(validateCSRFToken(sessionId, token)).toBe(false)
    })

    it('should reject expired CSRF tokens', (done) => {
      const sessionId = 'test-session-123'
      
      // Mock Date.now to simulate token expiration
      const originalNow = Date.now
      Date.now = jest.fn(() => originalNow())

      const token = generateCSRFToken(sessionId)

      // Fast forward time by 2 hours
      Date.now = jest.fn(() => originalNow() + 2 * 60 * 60 * 1000)

      expect(validateCSRFToken(sessionId, token)).toBe(false)

      // Restore original Date.now
      Date.now = originalNow
      done()
    })
  })

  describe('Configuration Options', () => {
    it('should respect disabled detection options', async () => {
      mockReq.body = {
        username: "admin'; DROP TABLE users; --"
      }

      const middleware = attackDetectionMiddleware({
        enableSQLInjectionDetection: false, // Disabled
        enableXSSDetection: false,
        enableCSRFProtection: false,
        enableSuspiciousActivityDetection: false,
        enableBruteForceProtection: false
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should respect custom suspicious score threshold', async () => {
      mockReq.body = {
        comment: '<script>alert("XSS")</script>' // XSS adds 40 points
      }

      const middleware = attackDetectionMiddleware({
        enableXSSDetection: true,
        blockSuspiciousRequests: true,
        maxSuspiciousScore: 50 // Higher threshold
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Should not be blocked because score (40) is below threshold (50)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should continue processing on middleware errors', async () => {
      // Mock a scenario that could cause an error
      mockReq.ip = undefined as any

      const middleware = attackDetectionMiddleware({
        enableSQLInjectionDetection: true
      })

      await middleware(mockReq as Request, mockRes as Response, mockNext)

      // Should call next() even if there's an error
      expect(mockNext).toHaveBeenCalled()
    })
  })
})