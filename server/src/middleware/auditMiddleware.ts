import { Request, Response, NextFunction } from 'express'
import { AuditService } from '../services/auditService'
import { logger } from '../utils/logger'

/**
 * Enhanced audit middleware for comprehensive activity logging
 */
export function auditMiddleware(options: {
  action?: string
  tableName?: string
  includeBody?: boolean
  includeQuery?: boolean
  skipSuccessfulGets?: boolean
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()
    
    // Store original response methods
    const originalSend = res.send
    const originalJson = res.json
    
    let responseData: any = null
    let statusCode = 200

    // Override response methods to capture data
    res.send = function(data) {
      responseData = data
      statusCode = res.statusCode
      return originalSend.call(this, data)
    }

    res.json = function(data) {
      responseData = data
      statusCode = res.statusCode
      return originalJson.call(this, data)
    }

    // Continue with the request
    next()

    // Log after response is sent
    res.on('finish', async () => {
      try {
        // Skip logging for successful GET requests if configured
        if (options.skipSuccessfulGets && req.method === 'GET' && statusCode < 400) {
          return
        }

        // Skip if no authenticated user
        if (!req.user) {
          return
        }

        const duration = Date.now() - startTime
        const action = options.action || `${req.method}_${req.route?.path || req.path}`
        
        // Prepare audit data
        const auditData = {
          tableName: options.tableName,
          recordId: req.params.id || req.params.userId || req.params.productId,
          metadata: {
            method: req.method,
            endpoint: req.originalUrl,
            statusCode,
            duration,
            query: options.includeQuery ? req.query : undefined,
            body: options.includeBody && req.method !== 'GET' ? req.body : undefined,
            responseSize: responseData ? JSON.stringify(responseData).length : 0
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          sessionId: req.sessionId
        }

        // Determine if this was a successful operation
        const isSuccess = statusCode < 400
        const actionSuffix = isSuccess ? '_SUCCESS' : '_FAILED'
        
        await AuditService.logUserAction(
          req.user.userId,
          `${action}${actionSuffix}`,
          auditData
        )

        // Log security-relevant events
        if (statusCode === 401 || statusCode === 403) {
          await AuditService.logUserAction(
            req.user.userId,
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            {
              ...auditData,
              newValues: {
                attemptedResource: req.originalUrl,
                reason: statusCode === 401 ? 'Authentication failed' : 'Insufficient permissions'
              }
            }
          )
        }

      } catch (error) {
        logger.error('Audit middleware error:', error)
        // Don't throw error to avoid breaking the response
      }
    })
  }
}

/**
 * Audit middleware for CRUD operations
 */
export function auditCRUD(tableName: string) {
  return auditMiddleware({
    tableName,
    includeBody: true,
    includeQuery: true,
    skipSuccessfulGets: true
  })
}

/**
 * Audit middleware for authentication operations
 */
export function auditAuth(action: string) {
  return auditMiddleware({
    action,
    includeBody: false, // Don't log sensitive auth data
    includeQuery: false
  })
}

/**
 * Audit middleware for security-sensitive operations
 */
export function auditSecurity(action: string, tableName?: string) {
  return auditMiddleware({
    action,
    tableName,
    includeBody: true,
    includeQuery: true
  })
}

/**
 * Manual audit logging helper
 */
export async function logAuditEvent(
  req: Request,
  action: string,
  details: {
    tableName?: string
    recordId?: string
    oldValues?: any
    newValues?: any
    success?: boolean
  }
) {
  if (!req.user) {
    return
  }

  try {
    await AuditService.logUserAction(
      req.user.userId,
      action,
      {
        tableName: details.tableName,
        recordId: details.recordId,
        oldValues: details.oldValues,
        newValues: details.newValues,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        sessionId: req.sessionId,
        endpoint: req.originalUrl,
        method: req.method
      }
    )
  } catch (error) {
    logger.error('Manual audit logging error:', error)
  }
}

/**
 * Audit middleware for data changes with before/after values
 */
export function auditDataChange(tableName: string, getRecordId: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let oldValues: any = null
    const recordId = getRecordId(req)

    // For updates, fetch the current state before modification
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // This would need to be customized based on your data access patterns
        // For now, we'll just note that old values should be captured
        oldValues = { note: 'Old values should be captured before update' }
      } catch (error) {
        logger.error('Failed to capture old values for audit:', error)
      }
    }

    // Store old values in request for later use
    req.auditOldValues = oldValues

    next()

    // Log after response
    res.on('finish', async () => {
      if (!req.user || res.statusCode >= 400) {
        return
      }

      try {
        let action = ''
        let newValues: any = null

        switch (req.method) {
          case 'POST':
            action = 'CREATE'
            newValues = req.body
            break
          case 'PUT':
          case 'PATCH':
            action = 'UPDATE'
            newValues = req.body
            break
          case 'DELETE':
            action = 'DELETE'
            oldValues = req.auditOldValues
            break
          default:
            return // Don't audit other methods
        }

        await AuditService.logUserAction(
          req.user.userId,
          `${tableName.toUpperCase()}_${action}`,
          {
            tableName,
            recordId,
            oldValues: req.auditOldValues,
            newValues,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            sessionId: req.sessionId,
            endpoint: req.originalUrl,
            method: req.method
          }
        )
      } catch (error) {
        logger.error('Data change audit error:', error)
      }
    })
  }
}

// Extend Request interface for audit data
declare global {
  namespace Express {
    interface Request {
      auditOldValues?: any
    }
  }
}