import { Request, Response, NextFunction } from 'express'
import { ipReputationService, IPReputationData } from '../services/ipReputationService'
import { logger } from '../utils/logger'
import { AuditService } from '../services/auditService'

export interface IPAccessControlConfig {
  enableWhitelist: boolean
  enableBlacklist: boolean
  enableGeolocationBlocking: boolean
  enableThreatIntelligence: boolean
  blockedCountries?: string[]
  allowedCountries?: string[]
  minimumReputationScore?: number
  logAllRequests?: boolean
  autoBlockSuspiciousIPs?: boolean
}

export interface IPAccessResult {
  allowed: boolean
  reason: string
  action: 'allow' | 'block' | 'monitor'
  reputation?: IPReputationData
  ruleType?: 'whitelist' | 'blacklist' | 'geolocation' | 'reputation' | 'access_rule'
}

/**
 * IP Access Control Middleware
 * Integrates with IP reputation service to control access based on IP reputation
 */
export class IPAccessControlMiddleware {
  private readonly defaultConfig: IPAccessControlConfig = {
    enableWhitelist: true,
    enableBlacklist: true,
    enableGeolocationBlocking: false,
    enableThreatIntelligence: true,
    minimumReputationScore: 30,
    logAllRequests: false,
    autoBlockSuspiciousIPs: false
  }

  constructor(private config: Partial<IPAccessControlConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config }
  }

  /**
   * Create IP access control middleware
   */
  createMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientIP = this.getClientIP(req)
        const startTime = Date.now()

        // Skip localhost and private IPs in development
        if (this.isLocalOrPrivateIP(clientIP) && process.env.NODE_ENV === 'development') {
          return next()
        }

        // Check IP access
        const accessResult = await this.checkIPAccess(clientIP, req)

        // Log request if enabled
        if (this.config.logAllRequests) {
          await this.logIPAccess(clientIP, req, accessResult)
        }

        // Handle blocked IPs
        if (!accessResult.allowed) {
          await this.handleBlockedIP(clientIP, req, accessResult)
          
          res.status(403).json({
            error: 'Access denied',
            reason: accessResult.reason,
            requestId: `${clientIP}-${startTime}`,
            timestamp: new Date().toISOString()
          })
          return
        }

        // Add IP information to request for downstream middleware
        (req as any).ipInfo = {
          ip: clientIP,
          reputation: accessResult.reputation,
          accessResult
        }

        // Add security headers
        res.set({
          'X-IP-Reputation-Score': accessResult.reputation?.score?.toString() || 'unknown',
          'X-IP-Country': accessResult.reputation?.country || 'unknown',
          'X-Access-Rule-Type': accessResult.ruleType || 'default'
        })

        next()
      } catch (error) {
        logger.error('IP access control error:', error)
        // Continue on error to avoid blocking legitimate requests
        next()
      }
    }
  }

  /**
   * Check IP access based on configured rules
   */
  private async checkIPAccess(ip: string, req: Request): Promise<IPAccessResult> {
    try {
      // Check whitelist/blacklist and access rules first
      const ipAllowanceResult = await ipReputationService.isIPAllowed(ip)
      
      if (!ipAllowanceResult.allowed) {
        return {
          allowed: false,
          reason: ipAllowanceResult.reason || 'IP blocked by access rules',
          action: 'block',
          reputation: ipAllowanceResult.reputation,
          ruleType: 'blacklist'
        }
      }

      // If explicitly whitelisted, allow immediately
      if (ipAllowanceResult.rule && 'addedBy' in ipAllowanceResult.rule) {
        return {
          allowed: true,
          reason: 'IP is whitelisted',
          action: 'allow',
          reputation: ipAllowanceResult.reputation,
          ruleType: 'whitelist'
        }
      }

      // Get IP reputation for additional checks
      const reputation = ipAllowanceResult.reputation || await ipReputationService.getIPReputation(ip)

      // Check geolocation-based blocking
      if (this.config.enableGeolocationBlocking && reputation.country) {
        const geoResult = this.checkGeolocationAccess(reputation)
        if (!geoResult.allowed) {
          return geoResult
        }
      }

      // Check reputation score
      if (this.config.enableThreatIntelligence && this.config.minimumReputationScore) {
        const reputationResult = this.checkReputationScore(reputation)
        if (!reputationResult.allowed) {
          // Auto-block if configured
          if (this.config.autoBlockSuspiciousIPs && reputation.reputation === 'malicious') {
            await this.autoBlockMaliciousIP(ip, reputation)
          }
          return reputationResult
        }
      }

      // Default allow
      return {
        allowed: true,
        reason: 'IP access granted',
        action: 'allow',
        reputation,
        ruleType: 'reputation'
      }
    } catch (error) {
      logger.error('Error checking IP access:', error)
      return {
        allowed: true,
        reason: 'Error checking IP access, default allow',
        action: 'allow'
      }
    }
  }

  /**
   * Check geolocation-based access
   */
  private checkGeolocationAccess(reputation: IPReputationData): IPAccessResult {
    const country = reputation.country

    // Check blocked countries
    if (this.config.blockedCountries && country) {
      const countryCode = this.getCountryCode(country)
      if (this.config.blockedCountries.includes(countryCode)) {
        return {
          allowed: false,
          reason: `Access blocked from country: ${country}`,
          action: 'block',
          reputation,
          ruleType: 'geolocation'
        }
      }
    }

    // Check allowed countries (if specified, only these are allowed)
    if (this.config.allowedCountries && this.config.allowedCountries.length > 0 && country) {
      const countryCode = this.getCountryCode(country)
      if (!this.config.allowedCountries.includes(countryCode)) {
        return {
          allowed: false,
          reason: `Access only allowed from specific countries, ${country} not permitted`,
          action: 'block',
          reputation,
          ruleType: 'geolocation'
        }
      }
    }

    return {
      allowed: true,
      reason: 'Geolocation check passed',
      action: 'allow',
      reputation,
      ruleType: 'geolocation'
    }
  }

  /**
   * Check reputation score
   */
  private checkReputationScore(reputation: IPReputationData): IPAccessResult {
    const minScore = this.config.minimumReputationScore || 30

    if (reputation.score < minScore) {
      let action: 'allow' | 'block' | 'monitor' = 'block'
      
      // Different actions based on reputation level
      if (reputation.reputation === 'malicious') {
        action = 'block'
      } else if (reputation.reputation === 'suspicious') {
        action = this.config.autoBlockSuspiciousIPs ? 'block' : 'monitor'
      } else {
        action = 'monitor'
      }

      return {
        allowed: action !== 'block',
        reason: `IP reputation score (${reputation.score}) below minimum threshold (${minScore})`,
        action,
        reputation,
        ruleType: 'reputation'
      }
    }

    return {
      allowed: true,
      reason: 'Reputation score check passed',
      action: 'allow',
      reputation,
      ruleType: 'reputation'
    }
  }

  /**
   * Auto-block malicious IP
   */
  private async autoBlockMaliciousIP(ip: string, reputation: IPReputationData): Promise<void> {
    try {
      await ipReputationService.addToBlacklist({
        ip,
        reason: `Auto-blocked: malicious IP (score: ${reputation.score}, threats: ${reputation.threatTypes?.join(', ') || 'unknown'})`,
        severity: 'high',
        blockedBy: 'system',
        isActive: true,
        autoBlocked: true,
        threatTypes: reputation.threatTypes,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      })

      logger.warn(`Auto-blocked malicious IP: ${ip} (score: ${reputation.score})`)
    } catch (error) {
      logger.error('Error auto-blocking malicious IP:', error)
    }
  }

  /**
   * Handle blocked IP
   */
  private async handleBlockedIP(ip: string, req: Request, accessResult: IPAccessResult): Promise<void> {
    try {
      // Log the blocked access attempt
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'IP_ACCESS_BLOCKED',
        newValues: {
          ip,
          reason: accessResult.reason,
          ruleType: accessResult.ruleType,
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method,
          reputation: accessResult.reputation
        },
        ipAddress: ip,
        userAgent: req.headers['user-agent'] as string
      })

      logger.warn(`IP access blocked: ${ip} - ${accessResult.reason}`, {
        ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        reputation: accessResult.reputation
      })
    } catch (error) {
      logger.error('Error handling blocked IP:', error)
    }
  }

  /**
   * Log IP access
   */
  private async logIPAccess(ip: string, req: Request, accessResult: IPAccessResult): Promise<void> {
    try {
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'IP_ACCESS_LOG',
        newValues: {
          ip,
          allowed: accessResult.allowed,
          reason: accessResult.reason,
          ruleType: accessResult.ruleType,
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method,
          reputation: accessResult.reputation
        },
        ipAddress: ip,
        userAgent: req.headers['user-agent'] as string
      })
    } catch (error) {
      logger.error('Error logging IP access:', error)
    }
  }

  /**
   * Extract client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.headers['cf-connecting-ip'] as string || // Cloudflare
      req.headers['x-client-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim()
  }

  /**
   * Check if IP is localhost or private
   */
  private isLocalOrPrivateIP(ip: string): boolean {
    if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      return true
    }

    // Check private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fc00:/, // IPv6 private
      /^fe80:/ // IPv6 link-local
    ]

    return privateRanges.some(range => range.test(ip))
  }

  /**
   * Get country code from country name
   */
  private getCountryCode(country: string): string {
    // Simplified country code mapping
    const countryMap: Record<string, string> = {
      'United States': 'US',
      'China': 'CN',
      'Russia': 'RU',
      'Germany': 'DE',
      'United Kingdom': 'GB',
      'France': 'FR',
      'Japan': 'JP',
      'Canada': 'CA',
      'Australia': 'AU',
      'Brazil': 'BR',
      'India': 'IN',
      'South Korea': 'KR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL'
    }

    return countryMap[country] || country.substring(0, 2).toUpperCase()
  }
}

// Convenience functions for common configurations
export const createIPAccessControl = (config?: Partial<IPAccessControlConfig>) => {
  const middleware = new IPAccessControlMiddleware(config)
  return middleware.createMiddleware()
}

// Strict IP access control (blocks suspicious IPs)
export const strictIPAccessControl = createIPAccessControl({
  enableWhitelist: true,
  enableBlacklist: true,
  enableGeolocationBlocking: true,
  enableThreatIntelligence: true,
  minimumReputationScore: 50,
  autoBlockSuspiciousIPs: true,
  logAllRequests: true
})

// Moderate IP access control (monitors but doesn't block suspicious IPs)
export const moderateIPAccessControl = createIPAccessControl({
  enableWhitelist: true,
  enableBlacklist: true,
  enableGeolocationBlocking: false,
  enableThreatIntelligence: true,
  minimumReputationScore: 30,
  autoBlockSuspiciousIPs: false,
  logAllRequests: false
})

// Basic IP access control (only whitelist/blacklist)
export const basicIPAccessControl = createIPAccessControl({
  enableWhitelist: true,
  enableBlacklist: true,
  enableGeolocationBlocking: false,
  enableThreatIntelligence: false,
  logAllRequests: false
})