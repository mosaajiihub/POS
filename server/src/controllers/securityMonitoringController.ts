import { Request, Response } from 'express'
import { SecurityMonitoringService } from '../services/securityMonitoringService'
import { logger } from '../utils/logger'

/**
 * Security Monitoring Controller
 * Handles security monitoring, alerting, and session management endpoints
 */
export class SecurityMonitoringController {
  /**
   * Get security metrics for dashboard
   */
  static async getSecurityMetrics(req: Request, res: Response) {
    try {
      const { days = 7 } = req.query
      const metrics = await SecurityMonitoringService.getSecurityMetrics(parseInt(days as string))

      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      logger.error('Get security metrics error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security metrics'
        }
      })
    }
  }

  /**
   * Get active sessions
   */
  static async getActiveSessions(req: Request, res: Response) {
    try {
      const sessions = await SecurityMonitoringService.getActiveSessions()

      res.json({
        success: true,
        data: {
          sessions,
          total: sessions.length
        }
      })
    } catch (error) {
      logger.error('Get active sessions error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving active sessions'
        }
      })
    }
  }

  /**
   * Terminate a session
   */
  static async terminateSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      const success = await SecurityMonitoringService.terminateSession(sessionId, req.user.userId)

      if (!success) {
        return res.status(404).json({
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or already terminated'
          }
        })
      }

      res.json({
        success: true,
        message: 'Session terminated successfully'
      })
    } catch (error) {
      logger.error('Terminate session error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while terminating session'
        }
      })
    }
  }

  /**
   * Block IP address
   */
  static async blockIPAddress(req: Request, res: Response) {
    try {
      const { ipAddress, reason, duration } = req.body

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      if (!ipAddress || !reason) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'IP address and reason are required'
          }
        })
      }

      const success = await SecurityMonitoringService.blockIPAddress(
        ipAddress,
        reason,
        req.user.userId,
        duration ? parseInt(duration) : undefined
      )

      if (!success) {
        return res.status(400).json({
          error: {
            code: 'BLOCK_FAILED',
            message: 'Failed to block IP address'
          }
        })
      }

      res.json({
        success: true,
        message: 'IP address blocked successfully'
      })
    } catch (error) {
      logger.error('Block IP address error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while blocking IP address'
        }
      })
    }
  }

  /**
   * Check if IP is locked out
   */
  static async checkLockoutStatus(req: Request, res: Response) {
    try {
      const { email, ipAddress } = req.query

      if (!email || !ipAddress) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Email and IP address are required'
          }
        })
      }

      const isLockedOut = await SecurityMonitoringService.isLockedOut(
        email as string,
        ipAddress as string
      )

      res.json({
        success: true,
        data: {
          isLockedOut,
          email,
          ipAddress
        }
      })
    } catch (error) {
      logger.error('Check lockout status error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while checking lockout status'
        }
      })
    }
  }

  /**
   * Clear failed login attempts
   */
  static async clearFailedAttempts(req: Request, res: Response) {
    try {
      const { email, ipAddress } = req.body

      if (!email || !ipAddress) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Email and IP address are required'
          }
        })
      }

      await SecurityMonitoringService.clearFailedAttempts(email, ipAddress)

      res.json({
        success: true,
        message: 'Failed login attempts cleared successfully'
      })
    } catch (error) {
      logger.error('Clear failed attempts error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while clearing failed attempts'
        }
      })
    }
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(req: Request, res: Response) {
    try {
      const { 
        type, 
        severity, 
        userId, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query

      // This would typically query a dedicated security events table
      // For now, we'll use the audit logs with security event actions
      const filters: any = {
        action: { startsWith: 'SECURITY_EVENT_' }
      }

      if (type) {
        filters.action = { contains: type }
      }

      if (userId) {
        filters.userId = userId
      }

      if (startDate || endDate) {
        filters.createdAt = {}
        if (startDate) {
          filters.createdAt.gte = new Date(startDate as string)
        }
        if (endDate) {
          filters.createdAt.lte = new Date(endDate as string)
        }
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

      const [events, total] = await Promise.all([
        // In a real implementation, query security events table
        [],
        0
      ])

      res.json({
        success: true,
        data: {
          events,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      })
    } catch (error) {
      logger.error('Get security events error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security events'
        }
      })
    }
  }

  /**
   * Get security alerts
   */
  static async getSecurityAlerts(req: Request, res: Response) {
    try {
      const { 
        severity, 
        acknowledged, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query

      // This would typically query a dedicated security alerts table
      // For now, we'll use the audit logs with security alert actions
      const filters: any = {
        action: 'SECURITY_ALERT_CREATED'
      }

      if (startDate || endDate) {
        filters.createdAt = {}
        if (startDate) {
          filters.createdAt.gte = new Date(startDate as string)
        }
        if (endDate) {
          filters.createdAt.lte = new Date(endDate as string)
        }
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

      const [alerts, total] = await Promise.all([
        // In a real implementation, query security alerts table
        [],
        0
      ])

      res.json({
        success: true,
        data: {
          alerts,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      })
    } catch (error) {
      logger.error('Get security alerts error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security alerts'
        }
      })
    }
  }

  /**
   * Acknowledge security alert
   */
  static async acknowledgeAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      // In a real implementation, update the alert in the database
      // For now, just log the acknowledgment
      logger.info(`Security alert ${alertId} acknowledged by ${req.user.userId}`)

      res.json({
        success: true,
        message: 'Security alert acknowledged successfully'
      })
    } catch (error) {
      logger.error('Acknowledge alert error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while acknowledging alert'
        }
      })
    }
  }

  /**
   * Get failed login attempts
   */
  static async getFailedLoginAttempts(req: Request, res: Response) {
    try {
      const { 
        ipAddress, 
        email, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query

      const filters: any = {
        action: 'FAILED_LOGIN'
      }

      if (ipAddress) {
        filters.ipAddress = ipAddress
      }

      if (email) {
        filters.newValues = {
          path: ['email'],
          equals: email
        }
      }

      if (startDate || endDate) {
        filters.createdAt = {}
        if (startDate) {
          filters.createdAt.gte = new Date(startDate as string)
        }
        if (endDate) {
          filters.createdAt.lte = new Date(endDate as string)
        }
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

      const [attempts, total] = await Promise.all([
        // Query audit logs for failed login attempts
        [],
        0
      ])

      res.json({
        success: true,
        data: {
          attempts,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      })
    } catch (error) {
      logger.error('Get failed login attempts error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving failed login attempts'
        }
      })
    }
  }

  /**
   * Test alert generation (for testing purposes)
   */
  static async testAlert(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      const { severity = 'MEDIUM', type = 'TEST_ALERT', message } = req.body

      // Import SecurityAlertingService
      const { SecurityAlertingService } = await import('../services/securityAlertingService')
      const { AlertSeverity, AlertType } = await import('../config/securityMonitoring')

      await SecurityAlertingService.createAlert({
        type: type as AlertType,
        severity: severity as AlertSeverity,
        title: 'Test Security Alert',
        message: message || 'This is a test security alert generated for testing purposes',
        details: {
          generatedBy: req.user.userId,
          timestamp: new Date().toISOString(),
          testMode: true
        },
        affectedResources: ['test-resource']
      })

      res.json({
        success: true,
        message: 'Test alert generated successfully'
      })
    } catch (error) {
      logger.error('Test alert error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating test alert'
        }
      })
    }
  }

  /**
   * Get monitoring status
   */
  static async getMonitoringStatus(req: Request, res: Response) {
    try {
      const { getSecurityMonitoringConfig } = await import('../config/securityMonitoring')
      const config = getSecurityMonitoringConfig()

      res.json({
        success: true,
        data: {
          status: 'active',
          config: {
            thresholds: config.thresholds,
            notifications: {
              email: config.notifications.email.enabled,
              sms: config.notifications.sms.enabled,
              webhook: config.notifications.webhook.enabled
            },
            intervals: config.intervals,
            retention: config.retention
          },
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Get monitoring status error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving monitoring status'
        }
      })
    }
  }
}