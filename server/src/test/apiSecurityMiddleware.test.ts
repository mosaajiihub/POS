import { Request, Response, NextFunction } from 'express'
import { apiSecurityMiddleware } from '../middleware/apiSecurityMiddleware'

describe('API Security Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn().mockReturnThis(),
      on: jest.fn(),
      statusCode: 200,
      getHeaders: jest.fn().mockReturnValue({})
    }

    mockNext = jest.fn()
  })

  it('should call next() for valid requests', async () => {
    const middleware = apiSecurityMiddleware({
      enableLogging: false,
      enableVersionValidation: false,
      enableSignatureVerification: false
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should reject invalid API versions when validation is enabled', async () => {
    mockReq.path = '/api/v99/test'
    
    const middleware = apiSecurityMiddleware({
      enableVersionValidation: true,
      enableSignatureVerification: false,
      enableLogging: false
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    // Should not call next() for invalid version
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should accept valid API versions', async () => {
    mockReq.path = '/api/v2/test'
    
    const middleware = apiSecurityMiddleware({
      enableVersionValidation: true,
      enableSignatureVerification: false,
      enableLogging: false
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should handle middleware errors gracefully', async () => {
    // Mock an error in the middleware
    mockReq.path = undefined as any
    
    const middleware = apiSecurityMiddleware({
      enableVersionValidation: true,
      enableSignatureVerification: false,
      enableLogging: false
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    // Should return error response
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'SECURITY_MIDDLEWARE_ERROR',
        message: 'An error occurred in security middleware'
      }
    })
  })
})