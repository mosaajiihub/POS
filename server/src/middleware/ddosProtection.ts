import { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../config/redis'
import { logger } from '../utils/logger'

export interface DDoSConfig {
  windowMs: number
  requestThreshold: number
  connectionThreshold: number
  suspiciousPatternThreshold: number
  autoBlockDuration: number
  enableTrafficAnalysis: boolean
  enableAnomalyDetection: boolean
}

export interface TrafficPattern {
  timestamp: number
  ip: string
  userAgent: string
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  requestSize: number
}

export interface AnomalyDetection {
  type: 'volume' | 'pattern' | 'geographic' | 'behavioral'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  confidence: number
  metadata: any
}

export class DDoSProtectionSystem {
  private redis = getRedisClient()
  private readonly TRAFFIC_PREFIX = 'ddos:traffic:'
  private readonly PATTERN_PREFIX = 'ddos:pattern:'
  private readonly BLOCK_PREFIX = 'ddos:block:'
  private readonly ANOMALY_PREFIX = 'ddos:anomaly:'
  private readonly STATS_PREFIX = 'ddos:stats:'

  private readonly defaultConfig: DDoSConfig = {
    windowMs: 60 * 1000, // 1 minute
    requestThreshold: 100, // requests per minute
    connectionThreshold: 50, // concurrent connections
    suspiciousPatternThreshold: 0.8, // 80% confidence
    autoBlockDuration: 15 * 60 * 1000, // 15 minutes
    enableTrafficAnalysis: true,
    enableAnomalyDetection: true
  }

  constructor(private config: Partial<DDoSConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config }
  }

  /**
   * Main DDoS protection middleware
   */
  createDDoSProtection(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientIP = this.getClientIP(req)
        const startTime = Date.now()

        // Check if IP is already blocked
        const isBlocked = await this.isIPBlocked(clientIP)
        if (isBlocked) {
          res.status(429).json({
            error: 'IP address is temporarily blocked due to suspicious activity',
            blockedUntil: isBlocked.expiresAt,
            reason: isBlocked.reason
          })
          return
        }

        // Record traffic pattern
        const pattern: TrafficPattern = {
          timestamp: startTime,
          ip: clientIP,
          userAgent: req.headers['user-agent'] || 'unknown',
          endpoint: req.path,
          method: req.method,
          responseTime: 0, // Will be updated after response
          statusCode: 0, // Will be updated after response
          requestSize: this.getRequestSize(req)
        }

        // Analyze traffic in real-time
        const threatLevel = await this.analyzeTraffic(clientIP, pattern)
        
        if (threatLevel.block) {
          await this.blockIP(clientIP, threatLevel.reason, threatLevel.duration)
          res.status(429).json({
            error: 'Request blocked due to suspicious activity',
            reason: threatLevel.reason,
            threatLevel: threatLevel.level
          })
          return
        }

        // Add response time tracking
        const originalSend = res.send
        res.send = function(data) {
          pattern.responseTime = Date.now() - startTime
          pattern.statusCode = res.statusCode
          
          // Store pattern for analysis (async, don't wait)
          ddosProtection.storeTrafficPattern(pattern).catch(error => {
            logger.error('Error storing traffic pattern:', error)
          })
          
          return originalSend.call(this, data)
        }

        // Add DDoS protection headers
        res.set({
          'X-DDoS-Protection': 'active',
          'X-Threat-Level': threatLevel.level,
          'X-Request-ID': `${clientIP}-${startTime}`
        })

        next()
      } catch (error) {
        logger.error('DDoS protection error:', error)
        next() // Continue on error to avoid blocking legitimate requests
      }
    }
  }

  /**
   * Analyze traffic patterns for DDoS detection
   */
  private async analyzeTraffic(clientIP: string, pattern: TrafficPattern): Promise<{
    level: 'low' | 'medium' | 'high' | 'critical'
    block: boolean
    reason?: string
    duration?: number
  }> {
    const now = Date.now()
    const windowStart = now - this.config.windowMs!

    // Get recent traffic from this IP
    const trafficKey = `${this.TRAFFIC_PREFIX}${clientIP}`
    const recentRequests = await this.redis.zRangeByScore(trafficKey, windowStart, now)

    // Volume-based detection
    const requestCount = recentRequests.length + 1 // +1 for current request
    const volumeThreat = this.detectVolumeThreat(requestCount)

    // Pattern-based detection
    const patternThreat = await this.detectPatternThreat(clientIP, pattern, recentRequests)

    // Geographic anomaly detection
    const geoThreat = await this.detectGeographicAnomaly(clientIP)

    // Behavioral analysis
    const behaviorThreat = await this.detectBehavioralAnomaly(clientIP, pattern)

    // Calculate overall threat level
    const threats = [volumeThreat, patternThreat, geoThreat, behaviorThreat]
    const maxThreat = threats.reduce((max, threat) => 
      this.getThreatScore(threat.level) > this.getThreatScore(max.level) ? threat : max
    )

    // Store traffic data
    await this.redis.zAdd(trafficKey, { score: now, value: JSON.stringify(pattern) })
    await this.redis.expire(trafficKey, Math.ceil(this.config.windowMs! / 1000))

    // Log anomalies
    if (maxThreat.level !== 'low') {
      await this.logAnomaly({
        type: maxThreat.type as any,
        severity: maxThreat.level as any,
        description: maxThreat.reason || 'Suspicious activity detected',
        confidence: maxThreat.confidence || 0.8,
        metadata: { clientIP, pattern, threats }
      })
    }

    return {
      level: maxThreat.level,
      block: maxThreat.level === 'critical' || 
             (maxThreat.level === 'high' && maxThreat.confidence && maxThreat.confidence > 0.9),
      reason: maxThreat.reason,
      duration: this.config.autoBlockDuration
    }
  }  /**
 
  * Detect volume-based threats
   */
  private detectVolumeThreat(requestCount: number): {
    level: 'low' | 'medium' | 'high' | 'critical'
    type: string
    reason?: string
    confidence?: number
  } {
    const threshold = this.config.requestThreshold!
    
    if (requestCount > threshold * 5) {
      return {
        level: 'critical',
        type: 'volume',
        reason: `Extremely high request volume: ${requestCount} requests`,
        confidence: 0.95
      }
    } else if (requestCount > threshold * 3) {
      return {
        level: 'high',
        type: 'volume',
        reason: `High request volume: ${requestCount} requests`,
        confidence: 0.85
      }
    } else if (requestCount > threshold * 2) {
      return {
        level: 'medium',
        type: 'volume',
        reason: `Elevated request volume: ${requestCount} requests`,
        confidence: 0.7
      }
    }
    
    return { level: 'low', type: 'volume' }
  }

  /**
   * Detect pattern-based threats
   */
  private async detectPatternThreat(clientIP: string, currentPattern: TrafficPattern, recentRequests: string[]): Promise<{
    level: 'low' | 'medium' | 'high' | 'critical'
    type: string
    reason?: string
    confidence?: number
  }> {
    if (recentRequests.length === 0) {
      return { level: 'low', type: 'pattern' }
    }

    try {
      const patterns = recentRequests.map(req => JSON.parse(req) as TrafficPattern)
      
      // Check for identical requests (potential bot behavior)
      const identicalRequests = patterns.filter(p => 
        p.endpoint === currentPattern.endpoint &&
        p.method === currentPattern.method &&
        p.userAgent === currentPattern.userAgent
      ).length

      const identicalRatio = identicalRequests / patterns.length

      // Check for rapid-fire requests (very short intervals)
      const intervals = patterns
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(1)
        .map((p, i) => p.timestamp - patterns[i].timestamp)
      
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      const shortIntervals = intervals.filter(interval => interval < 100).length // < 100ms
      const shortIntervalRatio = shortIntervals / intervals.length

      // Check for suspicious user agent patterns
      const userAgents = new Set(patterns.map(p => p.userAgent))
      const singleUserAgent = userAgents.size === 1 && currentPattern.userAgent !== 'unknown'

      // Calculate pattern threat score
      let threatScore = 0
      let reasons = []

      if (identicalRatio > 0.8) {
        threatScore += 0.4
        reasons.push(`${(identicalRatio * 100).toFixed(1)}% identical requests`)
      }

      if (shortIntervalRatio > 0.7) {
        threatScore += 0.3
        reasons.push(`${(shortIntervalRatio * 100).toFixed(1)}% rapid-fire requests`)
      }

      if (singleUserAgent && patterns.length > 10) {
        threatScore += 0.2
        reasons.push('consistent user agent pattern')
      }

      if (avgInterval < 50) {
        threatScore += 0.1
        reasons.push(`very short average interval: ${avgInterval.toFixed(1)}ms`)
      }

      if (threatScore > 0.8) {
        return {
          level: 'critical',
          type: 'pattern',
          reason: `Suspicious request patterns: ${reasons.join(', ')}`,
          confidence: Math.min(threatScore, 0.95)
        }
      } else if (threatScore > 0.6) {
        return {
          level: 'high',
          type: 'pattern',
          reason: `Potential bot behavior: ${reasons.join(', ')}`,
          confidence: threatScore
        }
      } else if (threatScore > 0.4) {
        return {
          level: 'medium',
          type: 'pattern',
          reason: `Unusual request patterns: ${reasons.join(', ')}`,
          confidence: threatScore
        }
      }

      return { level: 'low', type: 'pattern' }
    } catch (error) {
      logger.error('Error in pattern threat detection:', error)
      return { level: 'low', type: 'pattern' }
    }
  }

  /**
   * Detect geographic anomalies
   */
  private async detectGeographicAnomaly(clientIP: string): Promise<{
    level: 'low' | 'medium' | 'high' | 'critical'
    type: string
    reason?: string
    confidence?: number
  }> {
    // This is a simplified implementation
    // In production, you would integrate with a GeoIP service
    
    // Check if IP is from known suspicious ranges
    const suspiciousRanges = [
      '10.0.0.0/8',     // Private networks (if coming from outside)
      '172.16.0.0/12',  // Private networks
      '192.168.0.0/16', // Private networks
      '127.0.0.0/8'     // Loopback
    ]

    // Simple check for private IPs coming from external sources
    if (this.isPrivateIP(clientIP) && !this.isLocalRequest(clientIP)) {
      return {
        level: 'medium',
        type: 'geographic',
        reason: 'Request from private IP range',
        confidence: 0.6
      }
    }

    return { level: 'low', type: 'geographic' }
  }

  /**
   * Detect behavioral anomalies
   */
  private async detectBehavioralAnomaly(clientIP: string, pattern: TrafficPattern): Promise<{
    level: 'low' | 'medium' | 'high' | 'critical'
    type: string
    reason?: string
    confidence?: number
  }> {
    // Check for suspicious user agents
    const suspiciousUserAgents = [
      'curl',
      'wget',
      'python-requests',
      'bot',
      'crawler',
      'spider',
      'scraper'
    ]

    const userAgent = pattern.userAgent.toLowerCase()
    const isSuspiciousUserAgent = suspiciousUserAgents.some(agent => 
      userAgent.includes(agent)
    )

    // Check for unusual request sizes
    const isUnusualSize = pattern.requestSize > 10 * 1024 * 1024 // > 10MB

    // Check for suspicious endpoints
    const suspiciousEndpoints = [
      '/admin',
      '/wp-admin',
      '/phpmyadmin',
      '/.env',
      '/config',
      '/backup'
    ]

    const isSuspiciousEndpoint = suspiciousEndpoints.some(endpoint =>
      pattern.endpoint.toLowerCase().includes(endpoint)
    )

    let threatScore = 0
    let reasons = []

    if (isSuspiciousUserAgent) {
      threatScore += 0.3
      reasons.push(`suspicious user agent: ${pattern.userAgent}`)
    }

    if (isUnusualSize) {
      threatScore += 0.2
      reasons.push(`large request size: ${(pattern.requestSize / 1024 / 1024).toFixed(2)}MB`)
    }

    if (isSuspiciousEndpoint) {
      threatScore += 0.4
      reasons.push(`suspicious endpoint: ${pattern.endpoint}`)
    }

    if (threatScore > 0.7) {
      return {
        level: 'high',
        type: 'behavioral',
        reason: `Suspicious behavior: ${reasons.join(', ')}`,
        confidence: Math.min(threatScore, 0.9)
      }
    } else if (threatScore > 0.4) {
      return {
        level: 'medium',
        type: 'behavioral',
        reason: `Unusual behavior: ${reasons.join(', ')}`,
        confidence: threatScore
      }
    }

    return { level: 'low', type: 'behavioral' }
  } 
 /**
   * Block an IP address
  