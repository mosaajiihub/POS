import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { SessionManager } from '../config/redis'

export interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: any
  timestamp: Date
  resolved: boolean
}

export interface FailedLoginAttempt {
  id: string
  email: string
  ipAddress: string
  userAgent?: string
  timestamp: Date
  reason: string
}

export interface SecurityAlert {
  id: string
  type: string
  message: string
  severity: SecuritySeverity
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

export interface SessionInfo {
  sessionId: string
  userId: string
  userEmail: string
  ipAddress: string
  userAgent?: string
  createdAt: Date
  lastActivity: Date
  isActive: boolean
}

export interface SecurityMetrics {
  totalFailedLogins: number
  uniqueFailedLoginIPs: number
  suspiciousActivities: number
  activeSessions: number
  securityAlerts: number
  unresolvedAlerts: number
  topFailedLoginIPs: { ip: string; count: number }[]
  recentSecurityEvents: SecurityEvent[]
}

export enum SecurityEventType {
  FAILED_LOGIN = 'FAILED_LOGIN',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DATA_BREACH_ATTEMPT = 'DATA_BREACH_ATTEMPT',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
  BRUTE_FORCE_ATTACK = 'BRUTE_FORCE_ATTACK'
}

export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Security Monitoring Service
 * Handles security event monitoring, alerting, and session management
 */
export class SecurityMonitoringService {
  private static readonly MAX_FAILED_ATTEMPTS = 5
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
  private static readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10

  /**
   * Record a failed login attempt
   */
  static async recordFailedLogin(
    email: string,
    ipAddress: string,
    userAgent?: string,
    reason: string = 'Invalid credentials'
  ): Promise<void> {
    try {
      // Store failed attempt in memory/cache for rate limiting
      const key = `failed_login:${ipAddress}:${email}`
      const attempts = await this.getFailedAttempts(key)
      
      await this.incrementFailedAttempts(key, attempts + 1)

      // Log the failed attempt
      await AuditService.createAuditLog({
        userId: 'anonymous',
        action: 'FAILED_LOGIN',
        newValues: {
          email,
          ipAddress,
          userAgent,
          reason,
          attemptCount: attempts + 1
        },
        ipAddress,
        userAgent
      })

      // Check if this triggers a security event
      if (attempts + 1 >= this.MAX_FAILED_ATTEMPTS) {
        await this.createSecurityEvent({
          type: SecurityEventType.MULTIPLE_FAILED_ATTEMPTS,
          severity: SecuritySeverity.HIGH,
          ipAddress,
          details: {
            email,
            attemptCount: attempts + 1,
            timeWindow: '15 minutes'
          }
        })

        // Create security alert
        await this.createSecurityAlert({
          type: 'BRUTE_FORCE_DETECTED',
          message: `Multiple failed login attempts detected for ${email} from IP ${ipAddress}`,
          severity: SecuritySeverity.HIGH
        })
      }

      logger.warn(`Failed login attempt: ${email} from ${ipAddress} (attempt ${attempts + 1})`)
    } catch (error) {
      logger.error('Failed to record failed login:', error)
    }
  }

  /**
   * Check if IP/email combination is locked out
   */
  static async isLockedOut(email: string, ipAddress: string): Promise<boolean> {
    try {
      const key = `failed_login:${ipAddress}:${email}`
      const attempts = await this.getFailedAttempts(key)
      return attempts >= this.MAX_FAILED_ATTEMPTS
    } catch (error) {
      logger.error('Failed to check lockout status:', error)
      return false
    }
  }

  /**
   * Clear failed login attempts (on successful login)
   */
  static async clearFailedAttempts(email: string, ipAddress: string): Promise<void> {
    try {
      const key = `failed_login:${ipAddress}:${email}`
      await this.resetFailedAttempts(key)
    } catch (error) {
      logger.error('Failed to clear failed attempts:', error)
    }
  }

  /**
   * Detect suspicious login activity
   */
  static async detectSuspiciousLogin(
    userId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Get user's recent login history
      const recentLogins = await prisma.auditLog.findMany({
        where: {
          userId,
          action: 'LOGIN',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      // Check for suspicious patterns
      const uniqueIPs = new Set(recentLogins.map(log => log.ipAddress).filter(Boolean))
      const uniqueUserAgents = new Set(recentLogins.map(log => log.userAgent).filter(Boolean))

      // Flag as suspicious if:
      // 1. Login from new IP address
      // 2. Unusual number of different IPs in short time
      // 3. Different user agent pattern
      
      const isNewIP = !recentLogins.some(log => log.ipAddress === ipAddress)
      const tooManyIPs = uniqueIPs.size > 3
      const isNewUserAgent = userAgent && !recentLogins.some(log => 
        log.userAgent && log.userAgent.includes(userAgent.split(' ')[0])
      )

      const isSuspicious = isNewIP || tooManyIPs || isNewUserAgent

      if (isSuspicious) {
        await this.createSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_LOGIN,
          severity: SecuritySeverity.MEDIUM,
          userId,
          ipAddress,
          details: {
            reasons: {
              newIP: isNewIP,
              tooManyIPs,
              newUserAgent: isNewUserAgent
            },
            recentIPCount: uniqueIPs.size,
            userAgent
          }
        })

        logger.warn(`Suspicious login detected for user ${userId} from ${ipAddress}`)
      }

      return isSuspicious
    } catch (error) {
      logger.error('Failed to detect suspicious login:', error)
      return false
    }
  }

  /**
   * Monitor session activity
   */
  static async monitorSessionActivity(sessionId: string, userId: string): Promise<void> {
    try {
      // Update session last activity
      await SessionManager.updateSessionActivity(sessionId)

      // Check for session anomalies
      const session = await SessionManager.getSession(sessionId)
      if (!session) {
        return
      }

      // Detect potential session hijacking
      const recentSessions = await SessionManager.getUserSessions(userId)
      const concurrentSessions = recentSessions.filter(s => s.isActive).length

      if (concurrentSessions > 3) {
        await this.createSecurityEvent({
          type: SecurityEventType.UNUSUAL_ACTIVITY,
          severity: SecuritySeverity.MEDIUM,
          userId,
          details: {
            concurrentSessions,
            sessionId,
            reason: 'Multiple concurrent sessions detected'
          }
        })
      }
    } catch (error) {
      logger.error('Failed to monitor session activity:', error)
    }
  }

  /**
   * Create security event
   */
  static async createSecurityEvent(event: {
    type: SecurityEventType
    severity: SecuritySeverity
    userId?: string
    ipAddress?: string
    userAgent?: string
    details: any
  }): Promise<void> {
    try {
      // In a real implementation, store in dedicated security events table
      await AuditService.createAuditLog({
        userId: event.userId || 'system',
        action: `SECURITY_EVENT_${event.type}`,
        newValues: {
          eventType: event.type,
          severity: event.severity,
          details: event.details
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      })

      logger.warn(`Security event created: ${event.type} (${event.severity})`, event.details)
    } catch (error) {
      logger.error('Failed to create security event:', error)
    }
  }

  /**
   * Create security alert
   */
  static async createSecurityAlert(alert: {
    type: string
    message: string
    severity: SecuritySeverity
  }): Promise<void> {
    try {
      // In a real implementation, store in dedicated alerts table
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_ALERT_CREATED',
        newValues: {
          alertType: alert.type,
          message: alert.message,
          severity: alert.severity,
          timestamp: new Date().toISOString()
        }
      })

      // Send notifications based on severity
      if (alert.severity === SecuritySeverity.CRITICAL || alert.severity === SecuritySeverity.HIGH) {
        // In a real implementation, send email/SMS notifications to administrators
        logger.error(`CRITICAL SECURITY ALERT: ${alert.message}`)
      }
    } catch (error) {
      logger.error('Failed to create security alert:', error)
    }
  }

  /**
   * Get security metrics for dashboard
   */
  static async getSecurityMetrics(days: number = 7): Promise<SecurityMetrics> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // Get failed login attempts
      const failedLogins = await prisma.auditLog.findMany({
        where: {
          action: 'FAILED_LOGIN',
          createdAt: { gte: startDate }
        }
      })

      // Get security events
      const securityEvents = await prisma.auditLog.findMany({
        where: {
          action: { startsWith: 'SECURITY_EVENT_' },
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      // Get security alerts
      const securityAlerts = await prisma.auditLog.findMany({
        where: {
          action: 'SECURITY_ALERT_CREATED',
          createdAt: { gte: startDate }
        }
      })

      // Calculate metrics
      const uniqueFailedLoginIPs = new Set(
        failedLogins.map(log => log.ipAddress).filter(Boolean)
      ).size

      const ipCounts = failedLogins.reduce((acc, log) => {
        if (log.ipAddress) {
          acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const topFailedLoginIPs = Object.entries(ipCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }))

      // Get active sessions count
      const activeSessions = await SessionManager.getActiveSessionsCount()

      return {
        totalFailedLogins: failedLogins.length,
        uniqueFailedLoginIPs,
        suspiciousActivities: securityEvents.filter(e => 
          e.action.includes('SUSPICIOUS') || e.action.includes('UNUSUAL')
        ).length,
        activeSessions,
        securityAlerts: securityAlerts.length,
        unresolvedAlerts: securityAlerts.length, // In real implementation, check resolved status
        topFailedLoginIPs,
        recentSecurityEvents: securityEvents.map(event => ({
          id: event.id,
          type: event.action.replace('SECURITY_EVENT_', '') as SecurityEventType,
          severity: event.newValues?.severity || SecuritySeverity.MEDIUM,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.newValues?.details || {},
          timestamp: event.createdAt,
          resolved: false
        }))
      }
    } catch (error) {
      logger.error('Failed to get security metrics:', error)
      throw new Error('Failed to retrieve security metrics')
    }
  }

  /**
   * Get active sessions
   */
  static async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      return await SessionManager.getAllActiveSessions()
    } catch (error) {
      logger.error('Failed to get active sessions:', error)
      return []
    }
  }

  /**
   * Terminate session
   */
  static async terminateSession(sessionId: string, terminatedBy: string): Promise<boolean> {
    try {
      const session = await SessionManager.getSession(sessionId)
      if (!session) {
        return false
      }

      await SessionManager.destroySession(sessionId)

      // Log session termination
      await AuditService.createAuditLog({
        userId: terminatedBy,
        action: 'SESSION_TERMINATED',
        tableName: 'sessions',
        recordId: sessionId,
        newValues: {
          terminatedSessionId: sessionId,
          terminatedUserId: session.userId,
          reason: 'Administrative termination'
        }
      })

      return true
    } catch (error) {
      logger.error('Failed to terminate session:', error)
      return false
    }
  }

  /**
   * Block IP address
   */
  static async blockIPAddress(
    ipAddress: string,
    reason: string,
    blockedBy: string,
    duration?: number
  ): Promise<boolean> {
    try {
      // In a real implementation, add to IP blacklist
      const blockKey = `blocked_ip:${ipAddress}`
      const blockData = {
        ipAddress,
        reason,
        blockedBy,
        blockedAt: new Date().toISOString(),
        expiresAt: duration ? new Date(Date.now() + duration).toISOString() : null
      }

      // Store block information (in Redis or database)
      // await redis.set(blockKey, JSON.stringify(blockData), duration ? 'PX' : undefined, duration)

      // Log IP block
      await AuditService.createAuditLog({
        userId: blockedBy,
        action: 'IP_ADDRESS_BLOCKED',
        newValues: blockData,
        ipAddress
      })

      // Create security alert
      await this.createSecurityAlert({
        type: 'IP_BLOCKED',
        message: `IP address ${ipAddress} has been blocked: ${reason}`,
        severity: SecuritySeverity.HIGH
      })

      logger.warn(`IP address blocked: ${ipAddress} by ${blockedBy} - ${reason}`)
      return true
    } catch (error) {
      logger.error('Failed to block IP address:', error)
      return false
    }
  }

  /**
   * Helper methods for failed attempt tracking
   */
  private static async getFailedAttempts(key: string): Promise<number> {
    // In a real implementation, get from Redis
    // return parseInt(await redis.get(key) || '0')
    return 0 // Placeholder
  }

  private static async incrementFailedAttempts(key: string, count: number): Promise<void> {
    // In a real implementation, set in Redis with expiration
    // await redis.setex(key, this.LOCKOUT_DURATION / 1000, count.toString())
  }

  private static async resetFailedAttempts(key: string): Promise<void> {
    // In a real implementation, delete from Redis
    // await redis.del(key)
  }
}