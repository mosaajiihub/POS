import { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../config/redis'
import { logger } from '../utils/logger'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: Request) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (req: Request, res: Response) => void
}

export interface EndpointRateLimitRule {
  endpoint: string
  method?: string
  windowMs: number
  maxRequests: number
  priority: number
}

export interface ProgressivePenalty {
  violations: number
  penaltyMultiplier: number
  penaltyDuration: number
}

export class MultiTierRateLimiter {
  private redis = getRedisClient()
  private readonly IP_RATE_LIMIT_PREFIX = 'rate_limit:ip:'
  private readonly USER_RATE_LIMIT_PREFIX = 'rate_limit:user:'
  private readonly ENDPOINT_RATE_LIMIT_PREFIX = 'rate_limit:endpoint:'
  private readonly PENALTY_PREFIX = 'penalty:'
  private readonly VIOLATION_PREFIX = 'violations:'

  // Default configurations
  private readonly defaultIPConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }

  private readonly defaultUserConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  }
}  privat
e readonly endpointRules: EndpointRateLimitRule[] = [
    // Authentication endpoints - stricter limits
    { endpoint: '/api/auth/login', method: 'POST', windowMs: 15 * 60 * 1000, maxRequests: 5, priority: 1 },
    { endpoint: '/api/auth/register', method: 'POST', windowMs: 60 * 60 * 1000, maxRequests: 3, priority: 1 },
    { endpoint: '/api/auth/forgot-password', method: 'POST', windowMs: 60 * 60 * 1000, maxRequests: 3, priority: 1 },
    { endpoint: '/api/otp/send', method: 'POST', windowMs: 5 * 60 * 1000, maxRequests: 3, priority: 1 },
    { endpoint: '/api/otp/verify', method: 'POST', windowMs: 15 * 60 * 1000, maxRequests: 10, priority: 1 },
    
    // Payment endpoints - moderate limits
    { endpoint: '/api/payments', method: 'POST', windowMs: 60 * 1000, maxRequests: 10, priority: 2 },
    { endpoint: '/api/payment-gateway', method: 'POST', windowMs: 60 * 1000, maxRequests: 20, priority: 2 },
    
    // Data modification endpoints - moderate limits
    { endpoint: '/api/products', method: 'POST', windowMs: 60 * 1000, maxRequests: 50, priority: 3 },
    { endpoint: '/api/products', method: 'PUT', windowMs: 60 * 1000, maxRequests: 100, priority: 3 },
    { endpoint: '/api/products', method: 'DELETE', windowMs: 60 * 1000, maxRequests: 20, priority: 3 },
    
    // Read endpoints - higher limits
    { endpoint: '/api/products', method: 'GET', windowMs: 60 * 1000, maxRequests: 200, priority: 4 },
    { endpoint: '/api/analytics', method: 'GET', windowMs: 60 * 1000, maxRequests: 100, priority: 4 },
    { endpoint: '/api/reports', method: 'GET', windowMs: 60 * 1000, maxRequests: 50, priority: 4 }
  ]

  private readonly progressivePenalties: ProgressivePenalty[] = [
    { violations: 1, penaltyMultiplier: 2, penaltyDuration: 5 * 60 * 1000 }, // 5 minutes
    { violations: 3, penaltyMultiplier: 4, penaltyDuration: 15 * 60 * 1000 }, // 15 minutes
    { violations: 5, penaltyMultiplier: 8, penaltyDuration: 60 * 60 * 1000 }, // 1 hour
    { violations: 10, penaltyMultiplier: 16, penaltyDuration: 24 * 60 * 60 * 1000 } // 24 hours
  ]

  /**
   * Create IP-based rate limiting middleware
   */
  createIPRateLimit(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const finalConfig = { ...this.defaultIPConfig, ...config }
    
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientIP = this.getClientIP(req)
        const key = `${this.IP_RATE_LIMIT_PREFIX}${clientIP}`
        
        const result = await this.checkRateLimit(key, finalConfig, req)
        
        if (!result.allowed) {
          await this.handleViolation(clientIP, 'ip')
          
          res.status(429).json({
            error: 'Too many requests from this IP address',
            retryAfter: result.retryAfter,
            limit: finalConfig.maxRequests,
            windowMs: finalConfig.windowMs
          })
          return
        }

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + finalConfig.windowMs).toISOString()
        })

        next()
      } catch (error) {
        logger.error('IP rate limiting error:', error)
        next() // Continue on error to avoid blocking legitimate requests
      }
    }
  }  /*
*
   * Create user-based rate limiting middleware
   */
  createUserRateLimit(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const finalConfig = { ...this.defaultUserConfig, ...config }
    
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = this.getUserId(req)
        if (!userId) {
          return next() // Skip if no user ID available
        }

        const key = `${this.USER_RATE_LIMIT_PREFIX}${userId}`
        
        const result = await this.checkRateLimit(key, finalConfig, req)
        
        if (!result.allowed) {
          await this.handleViolation(userId, 'user')
          
          res.status(429).json({
            error: 'Too many requests for this user',
            retryAfter: result.retryAfter,
            limit: finalConfig.maxRequests,
            windowMs: finalConfig.windowMs
          })
          return
        }

        // Add rate limit headers
        res.set({
          'X-RateLimit-User-Limit': finalConfig.maxRequests.toString(),
          'X-RateLimit-User-Remaining': result.remaining.toString(),
          'X-RateLimit-User-Reset': new Date(Date.now() + finalConfig.windowMs).toISOString()
        })

        next()
      } catch (error) {
        logger.error('User rate limiting error:', error)
        next() // Continue on error to avoid blocking legitimate requests
      }
    }
  }

  /**
   * Create endpoint-specific rate limiting middleware
   */
  createEndpointRateLimit(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = this.findEndpointRule(req.path, req.method)
        if (!rule) {
          return next() // No specific rule for this endpoint
        }

        const clientIP = this.getClientIP(req)
        const key = `${this.ENDPOINT_RATE_LIMIT_PREFIX}${rule.endpoint}:${rule.method}:${clientIP}`
        
        const config: RateLimitConfig = {
          windowMs: rule.windowMs,
          maxRequests: rule.maxRequests
        }

        const result = await this.checkRateLimit(key, config, req)
        
        if (!result.allowed) {
          await this.handleViolation(clientIP, 'endpoint', rule.endpoint)
          
          res.status(429).json({
            error: `Too many requests to ${rule.endpoint}`,
            retryAfter: result.retryAfter,
            limit: rule.maxRequests,
            windowMs: rule.windowMs,
            endpoint: rule.endpoint
          })
          return
        }

        // Add endpoint-specific rate limit headers
        res.set({
          'X-RateLimit-Endpoint-Limit': rule.maxRequests.toString(),
          'X-RateLimit-Endpoint-Remaining': result.remaining.toString(),
          'X-RateLimit-Endpoint-Reset': new Date(Date.now() + rule.windowMs).toISOString()
        })

        next()
      } catch (error) {
        logger.error('Endpoint rate limiting error:', error)
        next() // Continue on error to avoid blocking legitimate requests
      }
    }
  }  /**

   * Check rate limit for a given key
   */
  private async checkRateLimit(key: string, config: RateLimitConfig, req: Request): Promise<{
    allowed: boolean
    remaining: number
    retryAfter?: number
  }> {
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    // Apply progressive penalty if exists
    const penalty = await this.getActivePenalty(key)
    const effectiveLimit = penalty ? Math.floor(config.maxRequests / penalty.multiplier) : config.maxRequests
    
    // Use Redis sorted set to track requests in the time window
    const pipeline = this.redis.multi()
    
    // Remove expired entries
    pipeline.zRemRangeByScore(key, 0, windowStart)
    
    // Count current requests in window
    pipeline.zCard(key)
    
    // Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` })
    
    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000))
    
    const results = await pipeline.exec()
    const currentCount = results?.[1]?.[1] as number || 0
    
    const allowed = currentCount < effectiveLimit
    const remaining = Math.max(0, effectiveLimit - currentCount - 1)
    
    if (!allowed) {
      // Remove the request we just added since it's not allowed
      await this.redis.zRem(key, `${now}-${Math.random()}`)
      
      const retryAfter = Math.ceil(config.windowMs / 1000)
      return { allowed: false, remaining: 0, retryAfter }
    }

    return { allowed: true, remaining }
  }

  /**
   * Handle rate limit violation and apply progressive penalties
   */
  private async handleViolation(identifier: string, type: 'ip' | 'user' | 'endpoint', endpoint?: string): Promise<void> {
    const violationKey = `${this.VIOLATION_PREFIX}${type}:${identifier}${endpoint ? `:${endpoint}` : ''}`
    
    // Increment violation count
    const violations = await this.redis.incr(violationKey)
    await this.redis.expire(violationKey, 24 * 60 * 60) // Expire violations after 24 hours
    
    // Find applicable penalty
    const penalty = this.progressivePenalties
      .reverse()
      .find(p => violations >= p.violations)
    
    if (penalty) {
      const penaltyKey = `${this.PENALTY_PREFIX}${type}:${identifier}${endpoint ? `:${endpoint}` : ''}`
      await this.redis.setEx(
        penaltyKey,
        Math.ceil(penalty.penaltyDuration / 1000),
        JSON.stringify({
          multiplier: penalty.penaltyMultiplier,
          violations,
          appliedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + penalty.penaltyDuration).toISOString()
        })
      )
      
      logger.warn(`Progressive penalty applied`, {
        identifier,
        type,
        endpoint,
        violations,
        penaltyMultiplier: penalty.penaltyMultiplier,
        penaltyDuration: penalty.penaltyDuration
      })
    }

    // Log the violation
    logger.warn(`Rate limit violation`, {
      identifier,
      type,
      endpoint,
      violations,
      timestamp: new Date().toISOString()
    })
  } 
 /**
   * Get active penalty for a key
   */
  private async getActivePenalty(key: string): Promise<{ multiplier: number } | null> {
    const penaltyKey = key.replace(/^rate_limit:/, this.PENALTY_PREFIX)
    const penaltyData = await this.redis.get(penaltyKey)
    
    if (!penaltyData) {
      return null
    }

    try {
      const penalty = JSON.parse(penaltyData)
      return { multiplier: penalty.multiplier }
    } catch (error) {
      logger.error('Error parsing penalty data:', error)
      return null
    }
  }

  /**
   * Find endpoint rule for a given path and method
   */
  private findEndpointRule(path: string, method: string): EndpointRateLimitRule | null {
    return this.endpointRules
      .filter(rule => {
        const pathMatches = path.startsWith(rule.endpoint)
        const methodMatches = !rule.method || rule.method.toLowerCase() === method.toLowerCase()
        return pathMatches && methodMatches
      })
      .sort((a, b) => a.priority - b.priority)[0] || null
  }

  /**
   * Extract client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim()
  }

  /**
   * Extract user ID from request
   */
  private getUserId(req: Request): string | null {
    // Try to get user ID from various sources
    const user = (req as any).user
    if (user?.id) return user.id.toString()
    if (user?.userId) return user.userId.toString()
    
    // Try to get from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) {
      try {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.decode(token) as any
        if (decoded?.id) return decoded.id.toString()
        if (decoded?.userId) return decoded.userId.toString()
      } catch (error) {
        // Ignore JWT decode errors
      }
    }
    
    return null
  }  /
**
   * Get rate limit statistics
   */
  async getRateLimitStats(identifier: string, type: 'ip' | 'user'): Promise<{
    currentRequests: number
    violations: number
    activePenalty: any | null
  }> {
    const rateLimitKey = type === 'ip' 
      ? `${this.IP_RATE_LIMIT_PREFIX}${identifier}`
      : `${this.USER_RATE_LIMIT_PREFIX}${identifier}`
    
    const violationKey = `${this.VIOLATION_PREFIX}${type}:${identifier}`
    const penaltyKey = `${this.PENALTY_PREFIX}${type}:${identifier}`
    
    const [currentRequests, violations, penaltyData] = await Promise.all([
      this.redis.zCard(rateLimitKey),
      this.redis.get(violationKey),
      this.redis.get(penaltyKey)
    ])
    
    let activePenalty = null
    if (penaltyData) {
      try {
        activePenalty = JSON.parse(penaltyData)
      } catch (error) {
        logger.error('Error parsing penalty data:', error)
      }
    }
    
    return {
      currentRequests: currentRequests || 0,
      violations: violations ? parseInt(violations) : 0,
      activePenalty
    }
  }

  /**
   * Clear rate limit data for an identifier
   */
  async clearRateLimit(identifier: string, type: 'ip' | 'user'): Promise<void> {
    const rateLimitKey = type === 'ip' 
      ? `${this.IP_RATE_LIMIT_PREFIX}${identifier}`
      : `${this.USER_RATE_LIMIT_PREFIX}${identifier}`
    
    const violationKey = `${this.VIOLATION_PREFIX}${type}:${identifier}`
    const penaltyKey = `${this.PENALTY_PREFIX}${type}:${identifier}`
    
    await Promise.all([
      this.redis.del(rateLimitKey),
      this.redis.del(violationKey),
      this.redis.del(penaltyKey)
    ])
    
    logger.info(`Rate limit data cleared for ${type}: ${identifier}`)
  }

  /**
   * Add custom endpoint rule
   */
  addEndpointRule(rule: EndpointRateLimitRule): void {
    this.endpointRules.push(rule)
    this.endpointRules.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Remove endpoint rule
   */
  removeEndpointRule(endpoint: string, method?: string): void {
    const index = this.endpointRules.findIndex(rule => 
      rule.endpoint === endpoint && (!method || rule.method === method)
    )
    if (index !== -1) {
      this.endpointRules.splice(index, 1)
    }
  }
}

// Export singleton instance
export const multiTierRateLimiter = new MultiTierRateLimiter()

// Convenience middleware functions
export const ipRateLimit = (config?: Partial<RateLimitConfig>) => 
  multiTierRateLimiter.createIPRateLimit(config)

export const userRateLimit = (config?: Partial<RateLimitConfig>) => 
  multiTierRateLimiter.createUserRateLimit(config)

export const endpointRateLimit = () => 
  multiTierRateLimiter.createEndpointRateLimit()