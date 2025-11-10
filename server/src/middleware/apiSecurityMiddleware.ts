import { Request, Response, NextFunction } from 'express'
import { APISecurityService } from '../services/apiSecurityService'
import { logger } from '../utils/logger'

/**
 * API Security Monitoring Middleware
 * Provides comprehensive API request/response logging and security monitoring
 */

export interface APISecurityOptions {
  enableLogging?: boolean
  enableSignatureVerification?: boolean
  enableVersionValidation?: boolean
  logRequestBody?: boolean
  logResponseBody?: boolean
  maxLogSize?: number
}

/**
 * Main API security middleware
 */
export function apiSecurityMiddleware(options: APISecurityOptions = {}) {
  const {
    enableLogging = true,
    enableSignatureVerification = false,
    enableVersionValidation = true,
    logRequestBody = false,
    logResponseBody = false,
    maxLogSize = 1024 * 1024 // 1MB
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()

    try {
      // Validate API version if enabled
      if (enableVersionValidation) {
        const versionValid = APISecurityService.validateAPIVersion(req, res)
        if (!versionValid) {
          return // Response already sent by validateAPIVersion
        }
      }

      // Verify request signature if enabled
      if (enableSignatureVerification) {
        const signatureValid = await APISecurityService.verifyRequestSignature(req)
        if (!signatureValid) {
          return res.status(401).json({
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Request signature is invalid or missing'
            }
          })
        }
      }

      // Store original response methods to capture response data
      const originalSend = res.send
      const originalJson = res.json
      let responseBody: any = null

      // Override response methods to capture data
      res.send = function(data) {
        responseBody = data
        return originalSend.call(this, data)
      }

      res.json = function(data) {
        responseBody = data
        return originalJson.call(this, data)
      }

      // Continue with request processing
      next()

      // Log API request after response is sent
      if (enableLogging) {
        res.on('finish', async () => {
          try {
            const responseTime = Date.now() - startTime
            
            // Check if response body should be logged and size limits
            let loggedResponseBody = null
            if (logResponseBody && responseBody) {
              const responseBodyString = JSON.stringify(responseBody)
              if (responseBodyString.length <= maxLogSize) {
                loggedResponseBody = responseBody
              }
            }

            await APISecurityService.logAPIRequest(req, res, responseTime, loggedResponseBody)
          } catch (error) {
            logger.error('API security logging error:', error)
          }
        })
      }

    } catch (error) {
      logger.error('API security middleware error:', error)
      return res.status(500).json({
        error: {
          code: 'SECURITY_MIDDLEWARE_ERROR',
          message: 'An error occurred in security middleware'
        }
      })
    }
  }
}

/**
 * Request signature middleware
 * Validates request signatures for API security
 */
export function requestSignatureMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signatureValid = await APISecurityService.verifyRequestSignature(req)
      
      if (!signatureValid) {
        logger.warn('Invalid request signature', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })

        return res.status(401).json({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Request signature is invalid or missing',
            details: {
              requiredHeaders: ['x-signature', 'x-timestamp', 'x-nonce'],
              signatureAlgorithm: 'HMAC-SHA256'
            }
          }
        })
      }

      next()
    } catch (error) {
      logger.error('Request signature middleware error:', error)
      return res.status(500).json({
        error: {
          code: 'SIGNATURE_VERIFICATION_ERROR',
          message: 'An error occurred while verifying request signature'
        }
      })
    }
  }
}

/**
 * API version validation middleware
 */
export function apiVersionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const versionValid = APISecurityService.validateAPIVersion(req, res)
      
      if (versionValid) {
        next()
      }
      // If version is invalid, response is already sent by validateAPIVersion
    } catch (error) {
      logger.error('API version middleware error:', error)
      return res.status(500).json({
        error: {
          code: 'VERSION_VALIDATION_ERROR',
          message: 'An error occurred while validating API version'
        }
      })
    }
  }
}

/**
 * Security context middleware
 * Adds security context information to the request
 */
export function securityContextMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Add security context to request
      req.securityContext = {
        requestId: generateRequestId(),
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        deviceFingerprint: generateDeviceFingerprint(req),
        geoLocation: await getGeoLocation(req.ip),
        threatLevel: 'LOW' as any
      }

      next()
    } catch (error) {
      logger.error('Security context middleware error:', error)
      next() // Continue even if security context fails
    }
  }
}

/**
 * API rate limiting with security monitoring
 */
export function securityRateLimitMiddleware(options: {
  windowMs?: number
  maxRequests?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:${req.ip}:${req.path}`
      
      // In a real implementation, use Redis for distributed rate limiting
      // For now, simulate rate limiting logic
      const currentCount = 0 // Get from Redis
      const resetTime = new Date(Date.now() + windowMs)

      if (currentCount >= maxRequests) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          currentCount,
          maxRequests
        })

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests)
        res.setHeader('X-RateLimit-Remaining', 0)
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000))

        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: Math.ceil(windowMs / 1000)
          }
        })
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', maxRequests - currentCount - 1)
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000))

      next()
    } catch (error) {
      logger.error('Security rate limit middleware error:', error)
      next() // Continue on error to avoid breaking the application
    }
  }
}

/**
 * API endpoint security testing middleware
 * Runs automated security tests on endpoints
 */
export function securityTestingMiddleware(options: {
  enableTesting?: boolean
  testInterval?: number
  testOnFirstRequest?: boolean
}) {
  const {
    enableTesting = false,
    testInterval = 24 * 60 * 60 * 1000, // 24 hours
    testOnFirstRequest = false
  } = options

  const testedEndpoints = new Set<string>()
  const lastTestTimes = new Map<string, number>()

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!enableTesting) {
        return next()
      }

      const endpointKey = `${req.method}:${req.path}`
      const now = Date.now()
      const lastTestTime = lastTestTimes.get(endpointKey) || 0

      // Check if endpoint should be tested
      const shouldTest = testOnFirstRequest && !testedEndpoints.has(endpointKey) ||
                        (now - lastTestTime) > testInterval

      if (shouldTest) {
        // Run security tests asynchronously (don't block the request)
        setImmediate(async () => {
          try {
            await APISecurityService.runSecurityTests(req.path, req.method)
            testedEndpoints.add(endpointKey)
            lastTestTimes.set(endpointKey, now)
            
            logger.info('Security test completed for endpoint', {
              method: req.method,
              path: req.path
            })
          } catch (error) {
            logger.error('Automated security test error:', error)
          }
        })
      }

      next()
    } catch (error) {
      logger.error('Security testing middleware error:', error)
      next() // Continue on error
    }
  }
}

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateDeviceFingerprint(req: Request): string {
  const crypto = require('crypto')
  const userAgent = req.headers['user-agent'] || ''
  const acceptLanguage = req.headers['accept-language'] || ''
  const acceptEncoding = req.headers['accept-encoding'] || ''
  
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

async function getGeoLocation(ip: string): Promise<any> {
  // In a real implementation, use a GeoIP service
  return null
}

// Extend Request interface for security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        requestId: string
        timestamp: Date
        ipAddress: string
        userAgent?: string
        deviceFingerprint: string
        geoLocation?: any
        threatLevel: string
      }
    }
  }
}

export default {
  apiSecurityMiddleware,
  requestSignatureMiddleware,
  apiVersionMiddleware,
  securityContextMiddleware,
  securityRateLimitMiddleware,
  securityTestingMiddleware
}