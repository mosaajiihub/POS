import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema, ZodError } from 'zod'
import { validationResult, ValidationChain } from 'express-validator'
import { logger } from '../utils/logger'
import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'

/**
 * Input validation and sanitization middleware
 * Implements comprehensive input validation for API security
 */

export interface ValidationOptions {
  schema?: ZodSchema
  sanitize?: boolean
  maxSize?: number
  allowedContentTypes?: string[]
  customValidators?: ValidationChain[]
}

export interface SanitizationRule {
  field: string
  type: 'html' | 'sql' | 'xss' | 'trim' | 'escape'
  options?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  sanitizedData?: any
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

/**
 * Schema-based request validation middleware
 */
export function validateRequest(options: ValidationOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schema, sanitize = true, maxSize, allowedContentTypes, customValidators } = options

      // Check request size limits
      if (maxSize && req.headers['content-length']) {
        const contentLength = parseInt(req.headers['content-length'])
        if (contentLength > maxSize) {
          return res.status(413).json({
            error: {
              code: 'REQUEST_TOO_LARGE',
              message: `Request size ${contentLength} exceeds maximum allowed size ${maxSize}`
            }
          })
        }
      }

      // Check content type validation
      if (allowedContentTypes && req.headers['content-type']) {
        const contentType = req.headers['content-type'].split(';')[0]
        if (!allowedContentTypes.includes(contentType)) {
          return res.status(415).json({
            error: {
              code: 'UNSUPPORTED_MEDIA_TYPE',
              message: `Content type ${contentType} is not supported`
            }
          })
        }
      }

      // Run express-validator custom validators if provided
      if (customValidators && customValidators.length > 0) {
        await Promise.all(customValidators.map(validator => validator.run(req)))
        
        const expressValidatorErrors = validationResult(req)
        if (!expressValidatorErrors.isEmpty()) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input validation failed',
              details: expressValidatorErrors.array()
            }
          })
        }
      }

      // Sanitize input data if enabled
      if (sanitize) {
        req.body = sanitizeInput(req.body)
        req.query = sanitizeInput(req.query)
        req.params = sanitizeInput(req.params)
      }

      // Run Zod schema validation if provided
      if (schema) {
        try {
          const validatedData = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
          })
          
          // Replace request data with validated data
          req.body = validatedData.body || req.body
          req.query = validatedData.query || req.query
          req.params = validatedData.params || req.params
        } catch (error) {
          if (error instanceof ZodError) {
            const validationErrors = error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
              value: err.input
            }))

            return res.status(400).json({
              error: {
                code: 'SCHEMA_VALIDATION_ERROR',
                message: 'Request data does not match required schema',
                details: validationErrors
              }
            })
          }
          throw error
        }
      }

      // Log security validation event
      logger.info('Input validation passed', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      })

      next()
    } catch (error) {
      logger.error('Input validation middleware error:', error)
      return res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed'
        }
      })
    }
  }
}

/**
 * Input sanitization function
 */
export function sanitizeInput(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    // Trim whitespace
    let sanitized = data.trim()
    
    // HTML sanitization to prevent XSS
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    })
    
    // Escape HTML entities
    sanitized = validator.escape(sanitized)
    
    return sanitized
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item))
  }

  if (typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeInput(key)
      sanitized[sanitizedKey] = sanitizeInput(value)
    }
    return sanitized
  }

  return data
}

/**
 * SQL injection detection and prevention
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /('|(\\')|(;)|(--)|(\s*(or|and)\s*\d+\s*=\s*\d+))/i,
    /(UNION\s+(ALL\s+)?SELECT)/i,
    /(((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;)))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ]

  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * XSS attack detection
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
    /<[^>]*\s+on\w+\s*=\s*["\'][^"\']*["\'][^>]*>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /livescript:/gi
  ]

  return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * File upload security validation
 */
export interface FileValidationOptions {
  maxSize?: number
  allowedMimeTypes?: string[]
  allowedExtensions?: string[]
  scanForMalware?: boolean
}

export function validateFileUpload(options: FileValidationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { maxSize = 10 * 1024 * 1024, allowedMimeTypes, allowedExtensions } = options

      if (!req.file && !req.files) {
        return next()
      }

      const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file]

      for (const file of files) {
        if (!file) continue

        // Check file size
        if (file.size > maxSize) {
          return res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File ${file.originalname} exceeds maximum size of ${maxSize} bytes`
            }
          })
        }

        // Check MIME type
        if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
          return res.status(415).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File type ${file.mimetype} is not allowed`
            }
          })
        }

        // Check file extension
        if (allowedExtensions) {
          const fileExtension = file.originalname.split('.').pop()?.toLowerCase()
          if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            return res.status(415).json({
              error: {
                code: 'INVALID_FILE_EXTENSION',
                message: `File extension .${fileExtension} is not allowed`
              }
            })
          }
        }

        // Basic malware detection (check for suspicious patterns)
        if (file.buffer) {
          const suspiciousPatterns = [
            /PK\x03\x04.*\.exe/i, // Executable in ZIP
            /MZ\x90\x00/i, // PE executable header
            /<script/gi, // Script tags in uploads
            /javascript:/gi // JavaScript protocol
          ]

          const fileContent = file.buffer.toString('binary')
          const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(fileContent))
          
          if (isSuspicious) {
            logger.warn('Suspicious file upload detected', {
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              ip: req.ip
            })

            return res.status(400).json({
              error: {
                code: 'SUSPICIOUS_FILE',
                message: 'File contains suspicious content and cannot be uploaded'
              }
            })
          }
        }
      }

      // Log successful file validation
      logger.info('File upload validation passed', {
        fileCount: files.length,
        files: files.map(f => ({ name: f?.originalname, size: f?.size, type: f?.mimetype })),
        ip: req.ip
      })

      next()
    } catch (error) {
      logger.error('File validation error:', error)
      return res.status(500).json({
        error: {
          code: 'FILE_VALIDATION_ERROR',
          message: 'File validation failed'
        }
      })
    }
  }
}

/**
 * Request size limiting middleware
 */
export function limitRequestSize(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length']
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds maximum allowed size of ${maxSize} bytes`
        }
      })
    }

    next()
  }
}

/**
 * Content type validation middleware
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type']
    
    if (!contentType) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CONTENT_TYPE',
          message: 'Content-Type header is required'
        }
      })
    }

    const baseContentType = contentType.split(';')[0].trim()
    
    if (!allowedTypes.includes(baseContentType)) {
      return res.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content type ${baseContentType} is not supported. Allowed types: ${allowedTypes.join(', ')}`
        }
      })
    }

    next()
  }
}

/**
 * Common validation schemas using Zod
 */
export const commonSchemas = {
  // Pagination schema
  pagination: z.object({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
      search: z.string().optional().transform(val => val?.trim())
    }).optional()
  }),

  // ID parameter schema
  idParam: z.object({
    params: z.object({
      id: z.string().min(1, 'ID is required')
    })
  }),

  // Email validation schema
  email: z.string().email('Invalid email format').toLowerCase(),

  // Password validation schema
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Phone number validation schema
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),

  // URL validation schema
  url: z.string().url('Invalid URL format'),

  // Date validation schema
  date: z.string().datetime('Invalid date format'),

  // Currency amount schema
  currency: z.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places')
}

export default {
  validateRequest,
  sanitizeInput,
  detectSQLInjection,
  detectXSS,
  validateFileUpload,
  limitRequestSize,
  validateContentType,
  commonSchemas
}