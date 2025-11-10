import { createClient, RedisClientType } from 'redis'
import { logger } from '../utils/logger'

let redisClient: RedisClientType

export async function connectRedis(): Promise<RedisClientType> {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 60000,
        lazyConnect: true,
      },
    })

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err)
    })

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected')
    })

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready')
    })

    redisClient.on('end', () => {
      logger.info('Redis Client Disconnected')
    })

    await redisClient.connect()
    return redisClient
  } catch (error) {
    logger.error('Redis connection failed:', error)
    throw error
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.')
  }
  return redisClient
}

// Session management utilities
export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:'
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:'
  private static readonly SESSION_EXPIRY = 24 * 60 * 60 // 24 hours in seconds

  static async createSession(userId: string, sessionData: any): Promise<string> {
    const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`
    
    const session = {
      sessionId,
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true,
      ...sessionData
    }
    
    await redisClient.setEx(sessionKey, this.SESSION_EXPIRY, JSON.stringify(session))
    
    // Track user sessions
    await redisClient.sAdd(userSessionsKey, sessionId)
    await redisClient.expire(userSessionsKey, this.SESSION_EXPIRY)
    
    return sessionId
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const sessionData = await redisClient.get(sessionKey)
    
    if (!sessionData) {
      return null
    }
    
    return JSON.parse(sessionData)
  }

  static async updateSession(sessionId: string, sessionData: any): Promise<boolean> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const existingSession = await this.getSession(sessionId)
    
    if (!existingSession) {
      return false
    }
    
    const updatedSession = { 
      ...existingSession, 
      ...sessionData,
      lastActivity: new Date().toISOString()
    }
    await redisClient.setEx(sessionKey, this.SESSION_EXPIRY, JSON.stringify(updatedSession))
    return true
  }

  static async getUserSessions(userId: string): Promise<Record<string, any>> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`
    const sessionIds = await redisClient.sMembers(userSessionsKey)
    const sessions: Record<string, any> = {}
    
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId)
      if (session) {
        sessions[sessionId] = session
      } else {
        // Clean up invalid session ID
        await redisClient.sRem(userSessionsKey, sessionId)
      }
    }
    
    return sessions
  }

  static async exists(key: string): Promise<boolean> {
    const result = await redisClient.exists(key)
    return result === 1
  }

  static async getTTL(key: string): Promise<number> {
    return await redisClient.ttl(key)
  }

  static async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
    await redisClient.setEx(key, expirySeconds, value)
  }

  static async getCounter(key: string): Promise<number> {
    const value = await redisClient.get(key)
    return value ? parseInt(value) : 0
  }

  static async incrementCounter(key: string, expirySeconds: number): Promise<number> {
    const result = await redisClient.incr(key)
    if (result === 1) {
      // First increment, set expiry
      await redisClient.expire(key, expirySeconds)
    }
    return result
  }

  static async delete(key: string): Promise<boolean> {
    const result = await redisClient.del(key)
    return result === 1
    
    return true
  }

  static async updateSessionActivity(sessionId: string): Promise<boolean> {
    return this.updateSession(sessionId, { lastActivity: new Date().toISOString() })
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const session = await this.getSession(sessionId)
    
    if (session) {
      // Remove from user sessions set
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.userId}`
      await redisClient.sRem(userSessionsKey, sessionId)
    }
    
    const result = await redisClient.del(sessionKey)
    return result > 0
  }

  static async destroySession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId)
    if (session) {
      await this.updateSession(sessionId, { isActive: false })
    }
    return this.deleteSession(sessionId)
  }

  static async deleteUserSessions(userId: string): Promise<number> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`
    const sessionIds = await redisClient.sMembers(userSessionsKey)
    
    if (sessionIds.length === 0) {
      return 0
    }
    
    // Delete all session keys
    const sessionKeys = sessionIds.map(id => `${this.SESSION_PREFIX}${id}`)
    const deletedCount = await redisClient.del(sessionKeys)
    
    // Clear user sessions set
    await redisClient.del(userSessionsKey)
    
    return deletedCount
  }

  static async getUserSessions(userId: string): Promise<any[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`
    const sessionIds = await redisClient.sMembers(userSessionsKey)
    
    if (sessionIds.length === 0) {
      return []
    }
    
    const sessions = []
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId)
      if (session) {
        sessions.push(session)
      }
    }
    
    return sessions
  }

  static async getAllActiveSessions(): Promise<any[]> {
    const pattern = `${this.SESSION_PREFIX}*`
    const keys = await redisClient.keys(pattern)
    
    const sessions = []
    for (const key of keys) {
      const sessionData = await redisClient.get(key)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.isActive) {
          sessions.push(session)
        }
      }
    }
    
    return sessions
  }

  static async getActiveSessionsCount(): Promise<number> {
    const pattern = `${this.SESSION_PREFIX}*`
    const keys = await redisClient.keys(pattern)
    
    let activeCount = 0
    for (const key of keys) {
      const sessionData = await redisClient.get(key)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.isActive) {
          activeCount++
        }
      }
    }
    
    return activeCount
  }

  static async cleanupExpiredSessions(): Promise<number> {
    const pattern = `${this.SESSION_PREFIX}*`
    const keys = await redisClient.keys(pattern)
    
    let cleanedCount = 0
    for (const key of keys) {
      const ttl = await redisClient.ttl(key)
      if (ttl === -1 || ttl === -2) { // Key expired or doesn't exist
        await redisClient.del(key)
        cleanedCount++
      }
    }
    
    return cleanedCount
  }
}

// OTP management utilities
export class OTPManager {
  private static readonly OTP_PREFIX = 'otp:'
  private static readonly OTP_EXPIRY = 15 * 60 // 15 minutes in seconds
  private static readonly OTP_ATTEMPT_PREFIX = 'otp_attempts:'
  private static readonly MAX_ATTEMPTS = 3
  private static readonly ATTEMPT_WINDOW = 60 * 60 // 1 hour in seconds

  static generateOTP(): string {
    // Generate 6-digit alphanumeric OTP
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let otp = ''
    for (let i = 0; i < 6; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return otp
  }

  static async storeOTP(userId: string, otp: string): Promise<void> {
    const otpKey = `${this.OTP_PREFIX}${userId}`
    
    await redisClient.setEx(otpKey, this.OTP_EXPIRY, JSON.stringify({
      otp,
      createdAt: new Date().toISOString(),
      attempts: 0
    }))
  }

  static async verifyOTP(userId: string, providedOTP: string): Promise<{ valid: boolean; message: string }> {
    const otpKey = `${this.OTP_PREFIX}${userId}`
    const attemptKey = `${this.OTP_ATTEMPT_PREFIX}${userId}`
    
    // Check attempt limit
    const attempts = await redisClient.get(attemptKey)
    const attemptCount = attempts ? parseInt(attempts) : 0
    
    if (attemptCount >= this.MAX_ATTEMPTS) {
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' }
    }
    
    // Get stored OTP
    const storedData = await redisClient.get(otpKey)
    if (!storedData) {
      return { valid: false, message: 'OTP expired or not found. Please request a new OTP.' }
    }
    
    const { otp: storedOTP } = JSON.parse(storedData)
    
    if (providedOTP !== storedOTP) {
      // Increment attempt counter
      await redisClient.setEx(attemptKey, this.ATTEMPT_WINDOW, (attemptCount + 1).toString())
      return { valid: false, message: 'Invalid OTP. Please try again.' }
    }
    
    // OTP is valid, clean up
    await redisClient.del(otpKey)
    await redisClient.del(attemptKey)
    
    return { valid: true, message: 'OTP verified successfully.' }
  }

  static async deleteOTP(userId: string): Promise<void> {
    const otpKey = `${this.OTP_PREFIX}${userId}`
    const attemptKey = `${this.OTP_ATTEMPT_PREFIX}${userId}`
    
    await redisClient.del(otpKey)
    await redisClient.del(attemptKey)
  }

  static async getOTPInfo(userId: string): Promise<{ exists: boolean; expiresAt?: string; attempts?: number }> {
    const otpKey = `${this.OTP_PREFIX}${userId}`
    const attemptKey = `${this.OTP_ATTEMPT_PREFIX}${userId}`
    
    const [storedData, attempts, ttl] = await Promise.all([
      redisClient.get(otpKey),
      redisClient.get(attemptKey),
      redisClient.ttl(otpKey)
    ])
    
    if (!storedData) {
      return { exists: false }
    }
    
    const expiresAt = new Date(Date.now() + (ttl * 1000)).toISOString()
    const attemptCount = attempts ? parseInt(attempts) : 0
    
    return {
      exists: true,
      expiresAt,
      attempts: attemptCount
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    logger.info('Redis client disconnected')
  }
}