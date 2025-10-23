import { Request, Response, NextFunction } from 'express'
import { UserRole, UserStatus } from '@prisma/client'
import { TokenUtils, PermissionUtils, JWTPayload } from '../utils/auth'
import { SessionManager } from '../config/redis'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
      sessionId?: string
    }
  }
}

export interface AuthOptions {
  requireAuth?: boolean
  requiredRole?: UserRole
  requiredPermission?: {
    resource: string
    action: string
  }
  allowInactive?: boolean
}

/**
 * Authentication middleware
 * Verifies JWT token and sets user data in request
 */
export function authenticate(options: AuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requireAuth = true, requiredRole, requiredPermission, allowInactive = false } = options

      // Extract token from Authorization header
      const authHeader = req.headers.authorization
      const token = TokenUtils.extractTokenFromHeader(authHeader)

      if (!token) {
        if (requireAuth) {
          return res.status(401).json({
            error: {
              code: 'MISSING_TOKEN',
              message: 'Access token is required'
            }
          })
        }
        return next()
      }

      // Verify token
      const decoded = TokenUtils.verifyAccessToken(token)
      if (!decoded) {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired access token'
          }
        })
      }

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found'
          }
        })
      }

      // Check user status
      if (!allowInactive && !PermissionUtils.isUserActive(user.status)) {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: `Account is ${user.status.toLowerCase()}. Please contact administrator.`
          }
        })
      }

      // Check payment verification for non-admin users
      if (user.role !== UserRole.ADMIN && !user.paymentVerified) {
        return res.status(403).json({
          error: {
            code: 'PAYMENT_NOT_VERIFIED',
            message: 'Payment verification required. Please contact administrator.'
          }
        })
      }

      // Check role requirements
      if (requiredRole && !PermissionUtils.hasRole(user.role, requiredRole)) {
        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: `${requiredRole} role or higher required`
          }
        })
      }

      // Check permission requirements
      if (requiredPermission) {
        const { resource, action } = requiredPermission
        
        // First check legacy role-based permissions for backward compatibility
        const hasLegacyPermission = PermissionUtils.canAccessResource(user.role, resource, action)
        
        // Then check new role-based permission system
        const hasRolePermission = await PermissionUtils.hasPermission(user.id, resource, action)
        
        if (!hasLegacyPermission && !hasRolePermission) {
          return res.status(403).json({
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: `Permission denied for ${resource}:${action}`
            }
          })
        }
      }

      // Update decoded user data with current user info
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      }

      // Extract session ID from custom header if provided
      const sessionId = req.headers['x-session-id'] as string
      if (sessionId) {
        req.sessionId = sessionId
      }

      next()
    } catch (error) {
      logger.error('Authentication middleware error:', error)
      return res.status(500).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error occurred'
        }
      })
    }
  }
}

/**
 * Require authentication middleware
 */
export const requireAuth = authenticate({ requireAuth: true })

/**
 * Optional authentication middleware
 */
export const optionalAuth = authenticate({ requireAuth: false })

/**
 * Admin only middleware
 */
export const requireAdmin = authenticate({ 
  requireAuth: true, 
  requiredRole: UserRole.ADMIN 
})

/**
 * Manager or higher middleware
 */
export const requireManager = authenticate({ 
  requireAuth: true, 
  requiredRole: UserRole.MANAGER 
})

/**
 * Cashier or higher middleware
 */
export const requireCashier = authenticate({ 
  requireAuth: true, 
  requiredRole: UserRole.CASHIER 
})

/**
 * Session validation middleware
 * Validates that the session exists in Redis
 */
export function validateSession() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionId || req.headers['x-session-id'] as string

      if (!sessionId) {
        return res.status(401).json({
          error: {
            code: 'MISSING_SESSION',
            message: 'Session ID is required'
          }
        })
      }

      // Check if session exists
      const session = await SessionManager.getSession(sessionId)
      if (!session) {
        return res.status(401).json({
          error: {
            code: 'INVALID_SESSION',
            message: 'Session not found or expired'
          }
        })
      }

      // Verify session belongs to authenticated user
      if (req.user && session.userId !== req.user.userId) {
        return res.status(401).json({
          error: {
            code: 'SESSION_MISMATCH',
            message: 'Session does not belong to authenticated user'
          }
        })
      }

      req.sessionId = sessionId
      next()
    } catch (error) {
      logger.error('Session validation error:', error)
      return res.status(500).json({
        error: {
          code: 'SESSION_ERROR',
          message: 'Session validation error occurred'
        }
      })
    }
  }
}

/**
 * Permission-based middleware factory
 */
export function requirePermission(resource: string, action: string) {
  return authenticate({
    requireAuth: true,
    requiredPermission: { resource, action }
  })
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function authRateLimit() {
  const attempts = new Map<string, { count: number; resetTime: number }>()
  const MAX_ATTEMPTS = 5
  const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown'
    const now = Date.now()

    // Clean up expired entries
    for (const [ip, data] of attempts.entries()) {
      if (now > data.resetTime) {
        attempts.delete(ip)
      }
    }

    // Get or create attempt record
    let attemptData = attempts.get(key)
    if (!attemptData || now > attemptData.resetTime) {
      attemptData = { count: 0, resetTime: now + WINDOW_MS }
      attempts.set(key, attemptData)
    }

    // Check if limit exceeded
    if (attemptData.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((attemptData.resetTime - now) / 1000 / 60)
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: `Too many authentication attempts. Try again in ${remainingTime} minutes.`
        }
      })
    }

    // Increment attempt count on failed authentication
    const originalSend = res.send
    res.send = function(data) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        attemptData!.count++
      }
      return originalSend.call(this, data)
    }

    next()
  }
}

/**
 * Audit logging middleware
 * Logs user actions for security auditing
 */
export function auditLog(action: string, tableName?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Store audit info for later use
      req.auditInfo = {
        action,
        tableName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }

      // Continue with request
      next()
    } catch (error) {
      logger.error('Audit logging error:', error)
      next() // Don't block request on audit error
    }
  }
}

// Extend Request interface for audit info
declare global {
  namespace Express {
    interface Request {
      auditInfo?: {
        action: string
        tableName?: string
        ipAddress?: string
        userAgent?: string
      }
    }
  }
}