import { prisma } from '../config/database'
import { SessionManager } from '../config/redis'
import { logger } from '../utils/logger'
import * as crypto from 'crypto'

export interface SessionInfo {
  sessionId: string
  userId: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  lastActivity: Date
  isActive: boolean
}

export interface SessionSecurityResult {
  isValid: boolean
  shouldRenew: boolean
  isHijacked: boolean
  message: string
}

export interface ConcurrentSessionResult {
  allowed: boolean
  activeSessionsCount: number
  maxSessions: number
  message: string
}

/**
 * Session Security Service
 * Handles secure session management, hijacking detection, and concurrent session limits
 */
export class SessionSecurityService {
  private static readonly SESSION_TIMEOUT_MINUTES = 30
  private static readonly MAX_SESSION_LIFETIME_HOURS = 24
  private static readonly MAX_CONCURRENT_SESSIONS = 5
  private static readonly SESSION_RENEWAL_THRESHOLD_MINUTES = 10
  private static readonly HIJACK_DETECTION_THRESHOLD = 3 // Number of different IPs/UAs before flagging

  /**
   * Create a secure session with enhanced security features
   */
  static async createSecureSession(
    userId: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    try {
      // Check concurrent session limits
      const concurrentCheck = await this.checkConcurrentSessions(userId)
      if (!concurrentCheck.allowed) {
        throw new Error(concurrentCheck.message)
      }

      // Generate secure session ID
      const sessionId = this.generateSecureSessionId()
      
      // Calculate expiration times
      const now = new Date()
      const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MINUTES * 60 * 1000)
      const maxLifetime = new Date(now.getTime() + this.MAX_SESSION_LIFETIME_HOURS * 60 * 60 * 1000)

      // Create session data
      const sessionData = {
        userId,
        ipAddress,
        userAgent,
        createdAt: now.toISOString(),
        lastActivity: now.toISOString(),
        maxLifetime: maxLifetime.toISOString(),
        isActive: true,
        renewalCount: 0,
        securityFlags: {
          ipAddresses: ipAddress ? [ipAddress] : [],
          userAgents: userAgent ? [userAgent] : []
        }
      }

      // Store session in Redis
      await SessionManager.createSession(sessionId, sessionData)

      logger.info(`Secure session created for user: ${userId}, session: ${sessionId}`)

      return { sessionId, expiresAt }
    } catch (error) {
      logger.error('Create secure session error:', error)
      throw error
    }
  }

  /**
   * Validate session security and detect potential hijacking
   */
  static async validateSessionSecurity(
    sessionId: string,
    currentIP?: string,
    currentUserAgent?: string
  ): Promise<SessionSecurityResult> {
    try {
      const session = await SessionManager.getSession(sessionId)
      
      if (!session) {
        return {
          isValid: false,
          shouldRenew: false,
          isHijacked: false,
          message: 'Session not found or expired'
        }
      }

      const sessionData = typeof session === 'string' ? JSON.parse(session) : session
      const now = new Date()
      const lastActivity = new Date(sessionData.lastActivity)
      const maxLifetime = new Date(sessionData.maxLifetime)

      // Check if session has exceeded maximum lifetime
      if (now > maxLifetime) {
        await this.invalidateSession(sessionId)
        return {
          isValid: false,
          shouldRenew: false,
          isHijacked: false,
          message: 'Session has exceeded maximum lifetime'
        }
      }

      // Check for session timeout
      const timeoutThreshold = new Date(lastActivity.getTime() + this.SESSION_TIMEOUT_MINUTES * 60 * 1000)
      if (now > timeoutThreshold) {
        await this.invalidateSession(sessionId)
        return {
          isValid: false,
          shouldRenew: false,
          isHijacked: false,
          message: 'Session has timed out due to inactivity'
        }
      }

      // Detect potential session hijacking
      const hijackingDetected = await this.detectSessionHijacking(sessionData, currentIP, currentUserAgent)
      
      if (hijackingDetected) {
        await this.invalidateSession(sessionId)
        logger.warn(`Potential session hijacking detected for session: ${sessionId}`)
        
        return {
          isValid: false,
          shouldRenew: false,
          isHijacked: true,
          message: 'Session invalidated due to suspicious activity'
        }
      }

      // Check if session should be renewed
      const renewalThreshold = new Date(lastActivity.getTime() + this.SESSION_RENEWAL_THRESHOLD_MINUTES * 60 * 1000)
      const shouldRenew = now > renewalThreshold

      // Update last activity
      await this.updateSessionActivity(sessionId, currentIP, currentUserAgent)

      return {
        isValid: true,
        shouldRenew,
        isHijacked: false,
        message: 'Session is valid'
      }
    } catch (error) {
      logger.error('Validate session security error:', error)
      return {
        isValid: false,
        shouldRenew: false,
        isHijacked: false,
        message: 'Session validation failed'
      }
    }
  }

  /**
   * Renew session with new expiration time
   */
  static async renewSession(sessionId: string): Promise<{ success: boolean; expiresAt?: Date }> {
    try {
      const session = await SessionManager.getSession(sessionId)
      
      if (!session) {
        return { success: false }
      }

      const sessionData = typeof session === 'string' ? JSON.parse(session) : session
      const now = new Date()
      const maxLifetime = new Date(sessionData.maxLifetime)

      // Don't renew if max lifetime is exceeded
      if (now > maxLifetime) {
        await this.invalidateSession(sessionId)
        return { success: false }
      }

      // Update session data
      sessionData.lastActivity = now.toISOString()
      sessionData.renewalCount = (sessionData.renewalCount || 0) + 1

      // Store updated session
      await SessionManager.updateSession(sessionId, sessionData)

      const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MINUTES * 60 * 1000)

      logger.info(`Session renewed: ${sessionId}`)

      return { success: true, expiresAt }
    } catch (error) {
      logger.error('Renew session error:', error)
      return { success: false }
    }
  }

  /**
   * Check concurrent session limits
   */
  static async checkConcurrentSessions(userId: string): Promise<ConcurrentSessionResult> {
    try {
      const activeSessions = await this.getUserActiveSessions(userId)
      const activeCount = activeSessions.length

      if (activeCount >= this.MAX_CONCURRENT_SESSIONS) {
        // Optionally, remove oldest session to make room
        const oldestSession = activeSessions.sort((a, b) => 
          new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
        )[0]

        if (oldestSession) {
          await this.invalidateSession(oldestSession.sessionId)
          logger.info(`Oldest session removed for user ${userId} due to concurrent limit`)
        }

        return {
          allowed: true, // Allow after removing oldest
          activeSessionsCount: activeCount - 1,
          maxSessions: this.MAX_CONCURRENT_SESSIONS,
          message: 'Oldest session was terminated to allow new login'
        }
      }

      return {
        allowed: true,
        activeSessionsCount: activeCount,
        maxSessions: this.MAX_CONCURRENT_SESSIONS,
        message: 'Concurrent session limit not exceeded'
      }
    } catch (error) {
      logger.error('Check concurrent sessions error:', error)
      return {
        allowed: true, // Allow on error to not block users
        activeSessionsCount: 0,
        maxSessions: this.MAX_CONCURRENT_SESSIONS,
        message: 'Unable to check concurrent sessions'
      }
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await SessionManager.getUserSessions(userId)
      const activeSessions: SessionInfo[] = []

      for (const [sessionId, sessionData] of Object.entries(sessions)) {
        const data = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData
        
        if (data.isActive) {
          activeSessions.push({
            sessionId,
            userId: data.userId,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            createdAt: new Date(data.createdAt),
            lastActivity: new Date(data.lastActivity),
            isActive: data.isActive
          })
        }
      }

      return activeSessions
    } catch (error) {
      logger.error('Get user active sessions error:', error)
      return []
    }
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    try {
      await SessionManager.deleteSession(sessionId)
      logger.info(`Session invalidated: ${sessionId}`)
    } catch (error) {
      logger.error('Invalidate session error:', error)
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  static async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const sessions = await this.getUserActiveSessions(userId)
      let invalidatedCount = 0

      for (const session of sessions) {
        if (session.sessionId !== exceptSessionId) {
          await this.invalidateSession(session.sessionId)
          invalidatedCount++
        }
      }

      logger.info(`Invalidated ${invalidatedCount} sessions for user: ${userId}`)
      return invalidatedCount
    } catch (error) {
      logger.error('Invalidate all user sessions error:', error)
      return 0
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      // This would typically be implemented as a background job
      // For now, we'll rely on Redis TTL for automatic cleanup
      logger.info('Session cleanup completed (handled by Redis TTL)')
      return 0
    } catch (error) {
      logger.error('Cleanup expired sessions error:', error)
      return 0
    }
  }

  /**
   * Generate secure session ID
   */
  private static generateSecureSessionId(): string {
    // Generate a cryptographically secure random session ID
    const timestamp = Date.now().toString(36)
    const randomBytes = crypto.randomBytes(32).toString('hex')
    return `${timestamp}_${randomBytes}`
  }

  /**
   * Detect potential session hijacking
   */
  private static async detectSessionHijacking(
    sessionData: any,
    currentIP?: string,
    currentUserAgent?: string
  ): Promise<boolean> {
    try {
      const securityFlags = sessionData.securityFlags || { ipAddresses: [], userAgents: [] }

      // Check IP address changes
      if (currentIP && sessionData.ipAddress && currentIP !== sessionData.ipAddress) {
        // Add to IP history
        if (!securityFlags.ipAddresses.includes(currentIP)) {
          securityFlags.ipAddresses.push(currentIP)
        }

        // Flag if too many different IPs
        if (securityFlags.ipAddresses.length > this.HIJACK_DETECTION_THRESHOLD) {
          return true
        }
      }

      // Check User-Agent changes (less strict as browsers can update)
      if (currentUserAgent && sessionData.userAgent && currentUserAgent !== sessionData.userAgent) {
        // Add to UA history
        if (!securityFlags.userAgents.includes(currentUserAgent)) {
          securityFlags.userAgents.push(currentUserAgent)
        }

        // Flag if too many different UAs combined with IP changes
        if (securityFlags.userAgents.length > this.HIJACK_DETECTION_THRESHOLD && 
            securityFlags.ipAddresses.length > 1) {
          return true
        }
      }

      return false
    } catch (error) {
      logger.error('Detect session hijacking error:', error)
      return false
    }
  }

  /**
   * Update session activity and security tracking
   */
  private static async updateSessionActivity(
    sessionId: string,
    currentIP?: string,
    currentUserAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionManager.getSession(sessionId)
      
      if (!session) {
        return
      }

      const sessionData = typeof session === 'string' ? JSON.parse(session) : session
      const now = new Date()

      // Update activity timestamp
      sessionData.lastActivity = now.toISOString()

      // Update security tracking
      if (currentIP && currentIP !== sessionData.ipAddress) {
        sessionData.securityFlags = sessionData.securityFlags || { ipAddresses: [], userAgents: [] }
        if (!sessionData.securityFlags.ipAddresses.includes(currentIP)) {
          sessionData.securityFlags.ipAddresses.push(currentIP)
        }
      }

      if (currentUserAgent && currentUserAgent !== sessionData.userAgent) {
        sessionData.securityFlags = sessionData.securityFlags || { ipAddresses: [], userAgents: [] }
        if (!sessionData.securityFlags.userAgents.includes(currentUserAgent)) {
          sessionData.securityFlags.userAgents.push(currentUserAgent)
        }
      }

      // Update session in Redis
      await SessionManager.updateSession(sessionId, sessionData)
    } catch (error) {
      logger.error('Update session activity error:', error)
    }
  }
}