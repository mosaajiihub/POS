import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { AuditService } from '../services/auditService'
import { SecurityMonitoringService } from '../services/securityMonitoringService'
import crypto from 'crypto'
import validator from 'validator'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Attack Detection and Prevention Middleware
 * Implements comprehensive attack detection including SQL injection, XSS, CSRF, and suspicious activity
 */

export interface AttackDetectionOptions {
  enableSQLInjectionDetection?: boolean
  enableXSSDetection?: boolean
  enableCSRFProtection?: boolean
  enableSuspiciousActivityDetection?: boolean
  enableBruteForceProtection?: boolean
  logSecurityEvents?: boolean
  blockSuspiciousRequests?: boolean
  maxSuspiciousScore?: number
}

export interface SecurityThreat {
  type: ThreatType
  severity: ThreatSeverity
  description: string
  evidence: any
  source: string
  timestamp: Date
  blocked: boolean
}

export interface SuspiciousActivity {
  pattern: string
  score: number
  description: string
  evidence: any
}

export enum ThreatType {
  SQL_INJECTION = 'SQL_INJECTION',
  XSS = 'XSS',
  CSRF = 'CSRF',
  BRUTE_FORCE = 'BRUTE_FORCE',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  RATE_LIMIT_ABUSE = 'RATE_LIMIT_ABUSE',
  MALICIOUS_PAYLOAD = 'MALICIOUS_PAYLOAD'
}

export enum ThreatSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// In-memory stores for tracking suspicious activity (in production, use Redis)
const suspiciousIPs = new Map<string, { count: number; lastSeen: Date; blocked: boolean }>()
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>()
const csrfTokens = new Map<string, { token: string; expires: Date; used: boolean }>()

/**
 * Main attack detection middleware
 */
export function attackDetectionMiddleware(options: AttackDetectionOptions = {}) {
  const {
    enableSQLInjectionDetection = true,
    enableXSSDetection = true,
    enableCSRFProtection = true,
    enableSuspiciousActivityDetection = true,
    enableBruteForceProtection = true,
    logSecurityEvents = true,
    blockSuspiciousRequests = true,
    maxSuspiciousScore = 75
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const threats: SecurityThreat[] = []
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
      let totalSuspiciousScore = 0

      // Check if IP is already blocked
      const ipStatus = suspiciousIPs.get(clientIP)
      if (ipStatus?.blocked) {
        const threat: SecurityThreat = {
          type: ThreatType.SUSPICIOUS_PATTERN,
          severity: ThreatSeverity.HIGH,
          description: 'Request from blocked IP address',
          evidence: { ip: clientIP, blockReason: 'Previous suspicious activity' },
          source: clientIP,
          timestamp: new Date(),
          blocked: true
        }
        threats.push(threat)

        if (logSecurityEvents) {
          await logSecurityThreat(req, threat)
        }

        return res.status(403).json({
          error: {
            code: 'IP_BLOCKED',
            message: 'Access denied due to suspicious activity'
          }
        })
      }

      // SQL Injection Detection
      if (enableSQLInjectionDetection) {
        const sqlThreat = await detectSQLInjection(req)
        if (sqlThreat) {
          threats.push(sqlThreat)
          totalSuspiciousScore += 50
        }
      }

      // XSS Detection
      if (enableXSSDetection) {
        const xssThreat = await detectXSSAttack(req)
        if (xssThreat) {
          threats.push(xssThreat)
          totalSuspiciousScore += 40
        }
      }

      // CSRF Protection
      if (enableCSRFProtection && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfThreat = await detectCSRFAttack(req)
        if (csrfThreat) {
          threats.push(csrfThreat)
          totalSuspiciousScore += 60
        }
      }

      // Brute Force Detection
      if (enableBruteForceProtection) {
        const bruteForceThreat = await detectBruteForceAttack(req, clientIP)
        if (bruteForceThreat) {
          threats.push(bruteForceThreat)
          totalSuspiciousScore += 30
        }
      }

      // Suspicious Activity Pattern Detection
      if (enableSuspiciousActivityDetection) {
        const suspiciousActivities = await detectSuspiciousActivityPatterns(req)
        for (const activity of suspiciousActivities) {
          const threat: SecurityThreat = {
            type: ThreatType.SUSPICIOUS_PATTERN,
            severity: activity.score > 50 ? ThreatSeverity.HIGH : ThreatSeverity.MEDIUM,
            description: activity.description,
            evidence: activity.evidence,
            source: clientIP,
            timestamp: new Date(),
            blocked: false
          }
          threats.push(threat)
          totalSuspiciousScore += activity.score
        }
      }

      // Log all detected threats
      if (logSecurityEvents && threats.length > 0) {
        for (const threat of threats) {
          await logSecurityThreat(req, threat)
        }
      }

      // Block request if suspicious score is too high
      if (blockSuspiciousRequests && totalSuspiciousScore >= maxSuspiciousScore) {
        // Mark IP as suspicious
        updateSuspiciousIPStatus(clientIP, true)

        // Block the request
        const blockThreat: SecurityThreat = {
          type: ThreatType.SUSPICIOUS_PATTERN,
          severity: ThreatSeverity.CRITICAL,
          description: `Request blocked due to high suspicious score: ${totalSuspiciousScore}`,
          evidence: { score: totalSuspiciousScore, threats: threats.map(t => t.type) },
          source: clientIP,
          timestamp: new Date(),
          blocked: true
        }

        if (logSecurityEvents) {
          await logSecurityThreat(req, blockThreat)
        }

        return res.status(403).json({
          error: {
            code: 'SUSPICIOUS_ACTIVITY_DETECTED',
            message: 'Request blocked due to suspicious activity patterns'
          }
        })
      }

      // Add security context to request
      req.securityThreats = threats
      req.suspiciousScore = totalSuspiciousScore

      next()
    } catch (error) {
      logger.error('Attack detection middleware error:', error)
      next() // Continue on error to avoid breaking the application
    }
  }
}

/**
 * SQL Injection Detection
 */
async function detectSQLInjection(req: Request): Promise<SecurityThreat | null> {
  const sqlPatterns = [
    // Classic SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /('|(\\')|(;)|(--)|(\s*(or|and)\s*\d+\s*=\s*\d+))/i,
    /(UNION\s+(ALL\s+)?SELECT)/i,
    /(((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;)))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    // Advanced SQL injection patterns
    /\b(WAITFOR|DELAY|BENCHMARK|SLEEP)\b/i,
    /\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i,
    /\b(INFORMATION_SCHEMA|MYSQL\.USER|SYS\.DATABASES)\b/i,
    /(\bCAST\s*\(|\bCONVERT\s*\()/i,
    /(\bCHAR\s*\(|\bASCII\s*\()/i
  ]

  const inputSources = [
    JSON.stringify(req.body),
    JSON.stringify(req.query),
    JSON.stringify(req.params),
    req.url
  ]

  for (const input of inputSources) {
    if (!input) continue

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return {
          type: ThreatType.SQL_INJECTION,
          severity: ThreatSeverity.HIGH,
          description: 'SQL injection pattern detected in request',
          evidence: {
            pattern: pattern.source,
            input: input.substring(0, 200), // Limit evidence size
            source: 'request_data'
          },
          source: req.ip || 'unknown',
          timestamp: new Date(),
          blocked: false
        }
      }
    }
  }

  return null
}

/**
 * XSS Attack Detection
 */
async function detectXSSAttack(req: Request): Promise<SecurityThreat | null> {
  const xssPatterns = [
    // Script tags and JavaScript
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi,
    /<[^>]*\s+on\w+\s*=\s*["\'][^"\']*["\'][^>]*>/gi,
    // Advanced XSS patterns
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /livescript:/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<applet[^>]*>/gi,
    /<meta[^>]*http-equiv[^>]*refresh/gi,
    /document\.(write|writeln|cookie|location)/gi,
    /window\.(location|open)/gi
  ]

  const inputSources = [
    JSON.stringify(req.body),
    JSON.stringify(req.query),
    JSON.stringify(req.params)
  ]

  for (const input of inputSources) {
    if (!input) continue

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        return {
          type: ThreatType.XSS,
          severity: ThreatSeverity.HIGH,
          description: 'XSS attack pattern detected in request',
          evidence: {
            pattern: pattern.source,
            input: input.substring(0, 200),
            source: 'request_data'
          },
          source: req.ip || 'unknown',
          timestamp: new Date(),
          blocked: false
        }
      }
    }
  }

  return null
}

/**
 * CSRF Attack Detection
 */
async function detectCSRFAttack(req: Request): Promise<SecurityThreat | null> {
  // Check for CSRF token in headers or body
  const csrfToken = req.headers['x-csrf-token'] || 
                   req.headers['csrf-token'] || 
                   req.body?.csrfToken || 
                   req.body?._token

  if (!csrfToken) {
    return {
      type: ThreatType.CSRF,
      severity: ThreatSeverity.MEDIUM,
      description: 'Missing CSRF token in state-changing request',
      evidence: {
        method: req.method,
        path: req.path,
        headers: Object.keys(req.headers)
      },
      source: req.ip || 'unknown',
      timestamp: new Date(),
      blocked: false
    }
  }

  // Validate CSRF token (simplified validation)
  const sessionId = req.session?.id || req.headers['x-session-id']
  if (sessionId) {
    const storedToken = csrfTokens.get(sessionId)
    if (!storedToken || storedToken.token !== csrfToken || storedToken.expires < new Date()) {
      return {
        type: ThreatType.CSRF,
        severity: ThreatSeverity.HIGH,
        description: 'Invalid or expired CSRF token',
        evidence: {
          providedToken: csrfToken.substring(0, 10) + '...',
          sessionId: sessionId.substring(0, 10) + '...'
        },
        source: req.ip || 'unknown',
        timestamp: new Date(),
        blocked: false
      }
    }
  }

  return null
}

/**
 * Brute Force Attack Detection
 */
async function detectBruteForceAttack(req: Request, clientIP: string): Promise<SecurityThreat | null> {
  // Track failed authentication attempts
  if (req.path.includes('/login') || req.path.includes('/auth')) {
    const attempts = failedAttempts.get(clientIP) || { count: 0, lastAttempt: new Date() }
    const now = new Date()
    const timeDiff = now.getTime() - attempts.lastAttempt.getTime()

    // Reset counter if more than 15 minutes have passed
    if (timeDiff > 15 * 60 * 1000) {
      attempts.count = 0
    }

    // Check for rapid successive requests (potential brute force)
    if (timeDiff < 1000 && attempts.count > 0) { // Less than 1 second between requests
      attempts.count++
      attempts.lastAttempt = now
      failedAttempts.set(clientIP, attempts)

      if (attempts.count >= 5) {
        return {
          type: ThreatType.BRUTE_FORCE,
          severity: ThreatSeverity.HIGH,
          description: 'Rapid successive authentication attempts detected',
          evidence: {
            attemptCount: attempts.count,
            timeWindow: timeDiff,
            endpoint: req.path
          },
          source: clientIP,
          timestamp: new Date(),
          blocked: false
        }
      }
    }
  }

  return null
}

/**
 * Suspicious Activity Pattern Detection
 */
async function detectSuspiciousActivityPatterns(req: Request): Promise<SuspiciousActivity[]> {
  const activities: SuspiciousActivity[] = []

  // Check for suspicious user agents
  const userAgent = req.headers['user-agent']
  if (!userAgent || userAgent.length < 10) {
    activities.push({
      pattern: 'suspicious_user_agent',
      score: 20,
      description: 'Missing or suspicious user agent',
      evidence: { userAgent }
    })
  }

  // Check for suspicious request patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /%2e%2e%2f/gi, // URL encoded directory traversal
    /\/etc\/passwd/gi, // Unix password file access
    /\/proc\/self\/environ/gi, // Process environment access
    /cmd\.exe/gi, // Windows command execution
    /powershell/gi, // PowerShell execution
    /base64_decode/gi, // Base64 decoding (potential payload)
    /eval\(/gi, // Code evaluation
    /system\(/gi, // System command execution
  ]

  const fullUrl = req.url
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl)) {
      activities.push({
        pattern: 'malicious_payload',
        score: 35,
        description: 'Malicious payload pattern detected in URL',
        evidence: { pattern: pattern.source, url: fullUrl.substring(0, 100) }
      })
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip']
  const headerCount = suspiciousHeaders.filter(header => req.headers[header]).length
  if (headerCount >= 2) {
    activities.push({
      pattern: 'header_manipulation',
      score: 15,
      description: 'Multiple IP forwarding headers detected',
      evidence: { headers: suspiciousHeaders.filter(h => req.headers[h]) }
    })
  }

  // Check for unusual request sizes
  const contentLength = req.headers['content-length']
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB
    activities.push({
      pattern: 'large_request',
      score: 10,
      description: 'Unusually large request detected',
      evidence: { contentLength: parseInt(contentLength) }
    })
  }

  return activities
}

/**
 * Update suspicious IP status
 */
function updateSuspiciousIPStatus(ip: string, block: boolean = false) {
  const current = suspiciousIPs.get(ip) || { count: 0, lastSeen: new Date(), blocked: false }
  current.count++
  current.lastSeen = new Date()
  if (block) {
    current.blocked = true
  }
  suspiciousIPs.set(ip, current)
}

/**
 * Log security threat
 */
async function logSecurityThreat(req: Request, threat: SecurityThreat) {
  try {
    // Log to application logger
    logger.warn('Security threat detected', {
      type: threat.type,
      severity: threat.severity,
      description: threat.description,
      evidence: threat.evidence,
      source: threat.source,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      timestamp: threat.timestamp
    })

    // Log to audit service
    await AuditService.logSecurityEvent({
      eventType: 'THREAT_DETECTED',
      severity: threat.severity,
      description: threat.description,
      metadata: {
        threatType: threat.type,
        evidence: threat.evidence,
        request: {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      },
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown'
    })

    // Send to security monitoring service
    await SecurityMonitoringService.reportThreat(threat)
  } catch (error) {
    logger.error('Failed to log security threat:', error)
  }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  csrfTokens.set(sessionId, {
    token,
    expires,
    used: false
  })

  return token
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedToken = csrfTokens.get(sessionId)
  if (!storedToken || storedToken.used || storedToken.expires < new Date()) {
    return false
  }

  if (storedToken.token === token) {
    storedToken.used = true
    return true
  }

  return false
}

/**
 * Clean up expired tokens and blocked IPs (should be called periodically)
 */
export function cleanupSecurityData() {
  const now = new Date()
  
  // Clean up expired CSRF tokens
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    if (tokenData.expires < now) {
      csrfTokens.delete(sessionId)
    }
  }

  // Clean up old failed attempts (older than 1 hour)
  for (const [ip, attempts] of failedAttempts.entries()) {
    if (now.getTime() - attempts.lastAttempt.getTime() > 60 * 60 * 1000) {
      failedAttempts.delete(ip)
    }
  }

  // Clean up old suspicious IPs (older than 24 hours, unless blocked)
  for (const [ip, status] of suspiciousIPs.entries()) {
    if (!status.blocked && now.getTime() - status.lastSeen.getTime() > 24 * 60 * 60 * 1000) {
      suspiciousIPs.delete(ip)
    }
  }
}

// Extend Request interface for security context
declare global {
  namespace Express {
    interface Request {
      securityThreats?: SecurityThreat[]
      suspiciousScore?: number
    }
  }
}

export default {
  attackDetectionMiddleware,
  generateCSRFToken,
  validateCSRFToken,
  cleanupSecurityData
}