import { APISecurityService } from '../services/apiSecurityService'
import { Request, Response } from 'express'

describe('APISecurityService', () => {
  describe('generateRequestSignature', () => {
    it('should generate consistent signatures for same input', () => {
      const method = 'POST'
      const path = '/api/test'
      const body = { test: 'data' }
      const timestamp = 1640995200000
      const nonce = 'test-nonce'

      const signature1 = APISecurityService.generateRequestSignature(method, path, body, timestamp, nonce)
      const signature2 = APISecurityService.generateRequestSignature(method, path, body, timestamp, nonce)

      expect(signature1).toBe(signature2)
      expect(signature1).toHaveLength(64) // SHA256 hex string length
    })

    it('should generate different signatures for different inputs', () => {
      const timestamp = 1640995200000
      const nonce = 'test-nonce'

      const signature1 = APISecurityService.generateRequestSignature('GET', '/api/test1', {}, timestamp, nonce)
      const signature2 = APISecurityService.generateRequestSignature('POST', '/api/test2', {}, timestamp, nonce)

      expect(signature1).not.toBe(signature2)
    })
  })

  describe('verifyRequestSignature', () => {
    it('should verify valid signatures', async () => {
      const mockReq = {
        method: 'POST',
        path: '/api/test',
        body: { test: 'data' },
        headers: {
          'x-timestamp': Date.now().toString(),
          'x-nonce': 'test-nonce'
        }
      } as Partial<Request>

      // Generate signature for the request
      const timestamp = parseInt(mockReq.headers!['x-timestamp'] as string)
      const nonce = mockReq.headers!['x-nonce'] as string
      const signature = APISecurityService.generateRequestSignature(
        mockReq.method!,
        mockReq.path!,
        mockReq.body,
        timestamp,
        nonce
      )

      mockReq.headers!['x-signature'] = signature

      const isValid = await APISecurityService.verifyRequestSignature(mockReq as Request)
      expect(isValid).toBe(true)
    })

    it('should reject invalid signatures', async () => {
      const mockReq = {
        method: 'POST',
        path: '/api/test',
        body: { test: 'data' },
        headers: {
          'x-signature': 'invalid-signature',
          'x-timestamp': Date.now().toString(),
          'x-nonce': 'test-nonce'
        }
      } as Partial<Request>

      const isValid = await APISecurityService.verifyRequestSignature(mockReq as Request)
      expect(isValid).toBe(false)
    })

    it('should reject expired signatures', async () => {
      const mockReq = {
        method: 'POST',
        path: '/api/test',
        body: { test: 'data' },
        headers: {
          'x-timestamp': (Date.now() - 10 * 60 * 1000).toString(), // 10 minutes ago
          'x-nonce': 'test-nonce'
        }
      } as Partial<Request>

      // Generate signature for the request
      const timestamp = parseInt(mockReq.headers!['x-timestamp'] as string)
      const nonce = mockReq.headers!['x-nonce'] as string
      const signature = APISecurityService.generateRequestSignature(
        mockReq.method!,
        mockReq.path!,
        mockReq.body,
        timestamp,
        nonce
      )

      mockReq.headers!['x-signature'] = signature

      const isValid = await APISecurityService.verifyRequestSignature(mockReq as Request)
      expect(isValid).toBe(false)
    })
  })

  describe('validateAPIVersion', () => {
    it('should validate supported API versions', () => {
      const mockReq = { path: '/api/v2/test' } as Request
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      } as Partial<Response>

      const isValid = APISecurityService.validateAPIVersion(mockReq, mockRes as Response)
      expect(isValid).toBe(true)
    })

    it('should reject unsupported API versions', () => {
      const mockReq = { path: '/api/v99/test' } as Request
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      } as Partial<Response>

      const isValid = APISecurityService.validateAPIVersion(mockReq, mockRes as Response)
      expect(isValid).toBe(false)
      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should handle deprecated versions with warnings', () => {
      const mockReq = { path: '/api/v1/test' } as Request
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      } as Partial<Response>

      const isValid = APISecurityService.validateAPIVersion(mockReq, mockRes as Response)
      expect(isValid).toBe(true)
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Deprecated', 'true')
    })
  })

  describe('runSecurityTests', () => {
    it('should run security tests and return results', async () => {
      const result = await APISecurityService.runSecurityTests('/api/test', 'GET')

      expect(result).toHaveProperty('testId')
      expect(result).toHaveProperty('endpoint', '/api/test')
      expect(result).toHaveProperty('method', 'GET')
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('vulnerabilities')
      expect(result).toHaveProperty('riskScore')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('timestamp')

      expect(Array.isArray(result.vulnerabilities)).toBe(true)
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(typeof result.riskScore).toBe('number')
      expect(result.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.riskScore).toBeLessThanOrEqual(100)
    })
  })
})