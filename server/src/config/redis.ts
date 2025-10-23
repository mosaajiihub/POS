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
  private static readonly SESSION_EXPIRY = 24 * 60 * 60 // 24 hours in seconds

  static async createSession(userId: string, sessionData: any): Promise<string> {
    const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    
    await redisClient.setEx(sessionKey, this.SESSION_EXPIRY, JSON.stringify({
      userId,
      createdAt: new Date().toISOString(),
      ...sessionData
    }))
    
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
    
    const updatedSession = { ...existingSession, ...sessionData }
    await redisClient.setEx(sessionKey, this.SESSION_EXPIRY, JSON.stringify(updatedSession))
    
    return true
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`
    const result = await redisClient.del(sessionKey)
    
    return result > 0
  }

  static async deleteUserSessions(userId: string): Promise<number> {
    const pattern = `${this.SESSION_PREFIX}${userId}_*`
    const keys = await redisClient.keys(pattern)
    
    if (keys.length === 0) {
      return 0
    }
    
    return await redisClient.del(keys)
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