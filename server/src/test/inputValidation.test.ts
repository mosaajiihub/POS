import { Request, Response, NextFunction } from 'express'
import { 
  validateRequest, 
  sanitizeInput, 
  detectSQLInjection, 
  detectXSS,
  validateFileUpload,
  limitRequestSize,
  validateContentType,
  commonSchemas
} from '../middleware/inputValidation'
import { z } from 'zod'

describe('Input Validation Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'content-type': 'application/json',
        'content-length': '100'
      },
      body: {},
      query: {},
      params: {}
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    mockNext = jest.fn()
  })

  describe('Schema Validation', () => {
    it('should validate request data against Zod schema', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          age: z.number().min(0)
        })
      })

      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      }

      const middleware = validateRequest({ schema })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject invalid data against Zod schema', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          age: z.number().min(0)
        })
      })

      mockReq.body = {
        name: '',
        email: 'invalid-email',
        age: -5
      }

      const middleware = validateRequest({ schema })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SCHEMA_VALIDATION_ERROR',
            message: 'Request data does not match required schema'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Request Size Validation', () => {
    it('should reject requests exceeding size limit', async () => {
      mockReq.headers = {
        'content-length': '2000000' // 2MB
      }

      const middleware = validateRequest({ maxSize: 1024 * 1024 }) // 1MB limit
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(413)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'REQUEST_TOO_LARGE'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow requests within size limit', async () => {
      mockReq.headers = {
        'content-length': '500000' // 500KB
      }

      const middleware = validateRequest({ maxSize: 1024 * 1024 }) // 1MB limit
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('Content Type Validation', () => {
    it('should reject unsupported content types', async () => {
      mockReq.headers = {
        'content-type': 'text/plain'
      }

      const middleware = validateRequest({ 
        allowedContentTypes: ['application/json', 'application/xml'] 
      })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(415)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNSUPPORTED_MEDIA_TYPE'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow supported content types', async () => {
      mockReq.headers = {
        'content-type': 'application/json; charset=utf-8'
      }

      const middleware = validateRequest({ 
        allowedContentTypes: ['application/json'] 
      })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize string inputs', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello World'
      const sanitized = sanitizeInput(maliciousInput)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('Hello World')
    })

    it('should sanitize object inputs recursively', () => {
      const maliciousObject = {
        name: '<script>alert("XSS")</script>John',
        description: 'Normal text',
        nested: {
          value: '<img src="x" onerror="alert(1)">'
        }
      }

      const sanitized = sanitizeInput(maliciousObject)

      expect(sanitized.name).not.toContain('<script>')
      expect(sanitized.description).toBe('Normal text')
      expect(sanitized.nested.value).not.toContain('<img')
    })

    it('should sanitize array inputs', () => {
      const maliciousArray = [
        '<script>alert("XSS")</script>',
        'Normal text',
        { value: '<iframe src="javascript:alert(1)"></iframe>' }
      ]

      const sanitized = sanitizeInput(maliciousArray)

      expect(sanitized[0]).not.toContain('<script>')
      expect(sanitized[1]).toBe('Normal text')
      expect(sanitized[2].value).not.toContain('<iframe')
    })

    it('should handle null and undefined values', () => {
      expect(sanitizeInput(null)).toBe(null)
      expect(sanitizeInput(undefined)).toBe(undefined)
      expect(sanitizeInput('')).toBe('')
    })
  })

  describe('SQL Injection Detection', () => {
    it('should detect classic SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --",
        "1' OR 1=1 --"
      ]

      sqlInjections.forEach(injection => {
        expect(detectSQLInjection(injection)).toBe(true)
      })
    })

    it('should detect advanced SQL injection patterns', () => {
      const advancedInjections = [
        "WAITFOR DELAY '00:00:05'",
        "BENCHMARK(5000000,MD5(1))",
        "LOAD_FILE('/etc/passwd')",
        "SELECT * FROM INFORMATION_SCHEMA.TABLES"
      ]

      advancedInjections.forEach(injection => {
        expect(detectSQLInjection(injection)).toBe(true)
      })
    })

    it('should not flag normal text as SQL injection', () => {
      const normalInputs = [
        "John's Restaurant",
        "Price: $19.99",
        "Email: user@example.com",
        "Description: This is a normal description"
      ]

      normalInputs.forEach(input => {
        expect(detectSQLInjection(input)).toBe(false)
      })
    })
  })

  describe('XSS Detection', () => {
    it('should detect script-based XSS', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<script src="malicious.js"></script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(1)">'
      ]

      xssPayloads.forEach(payload => {
        expect(detectXSS(payload)).toBe(true)
      })
    })

    it('should detect event handler XSS', () => {
      const eventHandlers = [
        '<div onclick="alert(1)">Click me</div>',
        '<input onmouseover="alert(1)">',
        '<body onload="maliciousFunction()">',
        '<a href="#" onmouseover="alert(1)">Link</a>'
      ]

      eventHandlers.forEach(handler => {
        expect(detectXSS(handler)).toBe(true)
      })
    })

    it('should detect advanced XSS patterns', () => {
      const advancedXSS = [
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)">',
        '<embed src="javascript:alert(1)">',
        'eval("alert(1)")',
        'document.write("<script>alert(1)</script>")'
      ]

      advancedXSS.forEach(xss => {
        expect(detectXSS(xss)).toBe(true)
      })
    })

    it('should not flag normal HTML as XSS', () => {
      const normalHTML = [
        '<p>This is a paragraph</p>',
        '<div class="container">Content</div>',
        '<a href="https://example.com">Link</a>',
        '<img src="image.jpg" alt="Description">'
      ]

      normalHTML.forEach(html => {
        expect(detectXSS(html)).toBe(false)
      })
    })
  })

  describe('File Upload Validation', () => {
    it('should validate file size limits', async () => {
      const largeFile = {
        originalname: 'large-file.jpg',
        size: 15 * 1024 * 1024, // 15MB
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      }

      mockReq.file = largeFile as any

      const middleware = validateFileUpload({ maxSize: 10 * 1024 * 1024 }) // 10MB limit
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(413)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FILE_TOO_LARGE'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should validate MIME types', async () => {
      const invalidFile = {
        originalname: 'script.exe',
        size: 1024,
        mimetype: 'application/x-executable',
        buffer: Buffer.from('fake-executable-data')
      }

      mockReq.file = invalidFile as any

      const middleware = validateFileUpload({ 
        allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'] 
      })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(415)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_FILE_TYPE'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should validate file extensions', async () => {
      const invalidFile = {
        originalname: 'document.exe',
        size: 1024,
        mimetype: 'image/jpeg', // Mimetype doesn't match extension
        buffer: Buffer.from('fake-data')
      }

      mockReq.file = invalidFile as any

      const middleware = validateFileUpload({ 
        allowedExtensions: ['jpg', 'png', 'pdf'] 
      })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(415)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_FILE_EXTENSION'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should detect suspicious file content', async () => {
      const suspiciousFile = {
        originalname: 'image.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
        buffer: Buffer.from('<script>alert("XSS")</script>')
      }

      mockReq.file = suspiciousFile as any

      const middleware = validateFileUpload()
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SUSPICIOUS_FILE'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow valid files', async () => {
      const validFile = {
        originalname: 'document.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        buffer: Buffer.from('valid-pdf-content')
      }

      mockReq.file = validFile as any

      const middleware = validateFileUpload({ 
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['pdf']
      })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('Request Size Limiting Middleware', () => {
    it('should reject oversized requests', async () => {
      mockReq.headers = {
        'content-length': '2000000' // 2MB
      }

      const middleware = limitRequestSize(1024 * 1024) // 1MB limit
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(413)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow requests within size limit', async () => {
      mockReq.headers = {
        'content-length': '500000' // 500KB
      }

      const middleware = limitRequestSize(1024 * 1024) // 1MB limit
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('Content Type Validation Middleware', () => {
    it('should reject missing content type', async () => {
      delete mockReq.headers!['content-type']

      const middleware = validateContentType(['application/json'])
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'MISSING_CONTENT_TYPE'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject unsupported content types', async () => {
      mockReq.headers!['content-type'] = 'text/plain'

      const middleware = validateContentType(['application/json', 'application/xml'])
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(415)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow supported content types', async () => {
      mockReq.headers!['content-type'] = 'application/json; charset=utf-8'

      const middleware = validateContentType(['application/json'])
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('Common Schemas', () => {
    it('should validate pagination schema', () => {
      const validPagination = {
        query: {
          page: '2',
          limit: '10',
          search: 'test query'
        }
      }

      const result = commonSchemas.pagination.safeParse(validPagination)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query?.page).toBe(2)
        expect(result.data.query?.limit).toBe(10)
        expect(result.data.query?.search).toBe('test query')
      }
    })

    it('should validate email schema', () => {
      expect(commonSchemas.email.safeParse('user@example.com').success).toBe(true)
      expect(commonSchemas.email.safeParse('invalid-email').success).toBe(false)
    })

    it('should validate password schema', () => {
      expect(commonSchemas.password.safeParse('StrongPass123!').success).toBe(true)
      expect(commonSchemas.password.safeParse('weak').success).toBe(false)
      expect(commonSchemas.password.safeParse('NoSpecialChar123').success).toBe(false)
    })

    it('should validate currency schema', () => {
      expect(commonSchemas.currency.safeParse(19.99).success).toBe(true)
      expect(commonSchemas.currency.safeParse(-5.00).success).toBe(false)
      expect(commonSchemas.currency.safeParse(19.999).success).toBe(false) // Too many decimals
    })
  })

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock a scenario that could cause an error
      const invalidSchema = null as any

      const middleware = validateRequest({ schema: invalidSchema })
      await middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})