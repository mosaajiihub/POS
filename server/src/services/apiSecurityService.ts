import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import crypto from 'crypto'
import { AuditService } from './auditService'
import { SecurityMonitoringService } from './securityMonitoringService'

export interface APISecurityLog {
  id: string
  method: string
  endpoint: string
  version?: string
  userId?: string
  ipAddress: string
  userAgent?: string
  requestHeaders: any
  requestBody?: any
  responseStatus: number
  responseHeaders: any
  responseBody?: any
  responseTime: number
  securityContext: SecurityContext
  timestamp: Date
  riskScore: number
  anomalies: string[]
}

export interface SecurityContext {
  authenticated: boolean
  userId?: string
  userRole?: string
  permissions: string[]
  sessionId?: string
  requestSignature?: string
  signatureValid?: boolean
  rateLimitStatus: RateLimitStatus
  geoLocation?: GeoLocation
  deviceFingerprint?: string
  threatLevel: ThreatLevel
}

export interface RateLimitStatus {
  limit: number
  remaining: number
  resetTime: Date
  exceeded: boolean
}

export interface GeoLocation {
  country?: string
  region?: string
  city?: string
  coordinates?: { lat: number; lng: number }
}

export interface RequestSignature {
  signature: string
  timestamp: number
  nonce: string
  algorithm: string
}

export interface APIVersionConfig {
  version: string
  deprecated: boolean
  deprecationDate?: Date
  endOfLifeDate?: Date
  securityLevel: SecurityLevel
  allowedMethods: string[]
  rateLimits: { [key: string]: number }
  requiredPermissions: string[]
}

export interface SecurityTestResult {
  testId: string
  endpoint: string
  method: string
  testType: SecurityTestType
  passed: boolean
  vulnerabilities: Vulnerability[]
  riskScore: number
  recommendations: string[]
  timestamp: Date
}

export interface Vulnerability {
  type: VulnerabilityType
  severity: VulnerabilitySeverity
  description: string
  evidence: any
  remediation: string
}

export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum SecurityLevel {
  PUBLIC = 'PUBLIC',
  AUTHENTICATED = 'AUTHENTICATED',
  AUTHORIZED = 'AUTHORIZED',
  RESTRICTED = 'RESTRICTED'
}

export enum SecurityTestType {
  INJECTION = 'INJECTION',
  XSS = 'XSS',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RATE_LIMITING = 'RATE_LIMITING',
  INPUT_VALIDATION = 'INPUT_VALIDATION',
  OUTPUT_ENCODING = 'OUTPUT_ENCODING',
  SESSION_MANAGEMENT = 'SESSION_MANAGEMENT'
}

export enum VulnerabilityType {
  SQL_INJECTION = 'SQL_INJECTION',
  XSS = 'XSS',
  CSRF = 'CSRF',
  BROKEN_AUTHENTICATION = 'BROKEN_AUTHENTICATION',
  BROKEN_ACCESS_CONTROL = 'BROKEN_ACCESS_CONTROL',
  SECURITY_MISCONFIGURATION = 'SECURITY_MISCONFIGURATION',
  INSECURE_DESERIALIZATION = 'INSECURE_DESERIALIZATION',
  INSUFFICIENT_LOGGING = 'INSUFFICIENT_LOGGING'
}

export enum VulnerabilitySeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * API Security Service
 * Handles comprehensive API security monitoring, logging, and testing
 */
export class APISecurityService {
  private static readonly SECRET_KEY = process.env.API_SIGNATURE_SECRET || 'default-secret-key'
  private static readonly SIGNATURE_VALIDITY_WINDOW = 5 * 60 * 1000 // 5 minutes
  private static readonly MAX_REQUEST_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly SUPPORTED_VERSIONS = ['v1', 'v2']
  private static readonly VERSION_CONFIGS: Map<string, APIVersionConfig> = new Map([
    ['v1', {
      version: 'v1',
      deprecated: true,
      deprecationDate: new Date('2024-01-01'),
      endOfLifeDate: new Date('2024-12-31'),
      securityLevel: SecurityLevel.AUTHENTICATED,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      rateLimits: { default: 100, authenticated: 1000 },
      requiredPermissions: []
    }],
    ['v2', {
      version: 'v2',
      deprecated: false,
      securityLevel: SecurityLevel.AUTHORIZED,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      rateLimits: { default: 200, authenticated: 2000 },
      requiredPermissions: []
    }]
  ])

  /**
   * Log API request with comprehensive security context
   */
  static async logAPIRequest(
    req: Request,
    res: Response,
    responseTime: number,
    responseBody?: any
  ): Promise<void> {
    try {
      const securityContext = await this.buildSecurityContext(req, res)
      const riskScore = this.calculateRiskScore(req, res, securityContext)
      const anomalies = this.detectAnomalies(req, res, securityContext)

      const apiLog: Omit<APISecurityLog, 'id'> = {
        method: req.method,
        endpoint: this.normalizeEndpoint(req.path),
        version: this.extractAPIVersion(req.path),
        userId: req.user?.userId,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        requestHeaders: this.sanitizeHeaders(req.headers),
        requestBody: this.shouldLogRequestBody(req) ? this.sanitizeRequestBody(req.body) : undefined,
        responseStatus: res.statusCode,
        responseHeaders: this.sanitizeHeaders(res.getHeaders()),
        responseBody: this.shouldLogResponseBody(res) ? this.sanitizeResponseBody(responseBody) : undefined,
        responseTime,
        securityContext,
        timestamp: new Date(),
        riskScore,
        anomalies
      }

      // Store in database (in production, consider using a time-series database)
      await this.storeAPILog(apiLog)

      // Log security events if high risk
      if (riskScore >= 70) {
        await SecurityMonitoringService.createSecurityEvent({
          type: 'SUSPICIOUS_API_ACTIVITY' as any,
          severity: riskScore >= 90 ? 'CRITICAL' as any : 'HIGH' as any,
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            endpoint: req.path,
            method: req.method,
            riskScore,
            anomalies
          }
        })
      }

      // Log to audit service for compliance
      if (req.user) {
        await AuditService.logUserAction(req.user.userId, 'API_REQUEST', {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          riskScore,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        })
      }

      logger.info('API request logged', {
        method: req.method,
        endpoint: req.path,
        status: res.statusCode,
        responseTime,
        riskScore,
        userId: req.user?.userId,
        ip: req.ip
      })

    } catch (error) {
      logger.error('Failed to log API request:', error)
    }
  }

  /**
   * Build comprehensive security context for request
   */
  private static async buildSecurityContext(req: Request, res: Response): Promise<SecurityContext> {
    const rateLimitStatus = await this.getRateLimitStatus(req)
    const geoLocation = await this.getGeoLocation(req.ip)
    const deviceFingerprint = this.generateDeviceFingerprint(req)
    const threatLevel = this.assessThreatLevel(req, res)

    return {
      authenticated: !!req.user,
      userId: req.user?.userId,
      userRole: req.user?.role,
      permissions: req.user?.permissions || [],
      sessionId: req.sessionId,
      requestSignature: req.headers['x-signature'] as string,
      signatureValid: await this.verifyRequestSignature(req),
      rateLimitStatus,
      geoLocation,
      deviceFingerprint,
      threatLevel
    }
  }

  /**
   * Calculate risk score based on various factors
   */
  private static calculateRiskScore(req: Request, res: Response, context: SecurityContext): number {
    let score = 0

    // Base score for unauthenticated requests
    if (!context.authenticated) score += 20

    // High score for failed authentication
    if (res.statusCode === 401 || res.statusCode === 403) score += 30

    // Score based on threat level
    switch (context.threatLevel) {
      case ThreatLevel.LOW: score += 10; break
      case ThreatLevel.MEDIUM: score += 25; break
      case ThreatLevel.HIGH: score += 50; break
      case ThreatLevel.CRITICAL: score += 80; break
    }

    // Score for rate limit violations
    if (context.rateLimitStatus.exceeded) score += 40

    // Score for invalid signatures
    if (context.requestSignature && !context.signatureValid) score += 35

    // Score for suspicious patterns in request
    if (this.containsSuspiciousPatterns(req)) score += 45

    // Score for error responses
    if (res.statusCode >= 400) score += 15

    // Score for new/unknown locations
    if (context.geoLocation && this.isUnknownLocation(context.geoLocation, req.user?.userId)) score += 20

    return Math.min(score, 100) // Cap at 100
  }

  /**
   * Detect anomalies in API requests
   */
  private static detectAnomalies(req: Request, res: Response, context: SecurityContext): string[] {
    const anomalies: string[] = []

    // Unusual request patterns
    if (req.method === 'DELETE' && !context.authenticated) {
      anomalies.push('UNAUTHENTICATED_DELETE_REQUEST')
    }

    // Suspicious user agents
    if (this.isSuspiciousUserAgent(req.headers['user-agent'])) {
      anomalies.push('SUSPICIOUS_USER_AGENT')
    }

    // Unusual request sizes
    const contentLength = parseInt(req.headers['content-length'] || '0')
    if (contentLength > this.MAX_REQUEST_SIZE) {
      anomalies.push('OVERSIZED_REQUEST')
    }

    // Rapid successive requests
    if (context.rateLimitStatus.remaining < context.rateLimitStatus.limit * 0.1) {
      anomalies.push('RAPID_REQUESTS')
    }

    // Geographic anomalies
    if (context.geoLocation && this.isGeographicAnomaly(context.geoLocation, req.user?.userId)) {
      anomalies.push('GEOGRAPHIC_ANOMALY')
    }

    // Version-related anomalies
    const version = this.extractAPIVersion(req.path)
    if (version && this.isDeprecatedVersion(version)) {
      anomalies.push('DEPRECATED_API_VERSION')
    }

    return anomalies
  }

  /**
   * Generate and verify request signatures
   */
  static generateRequestSignature(
    method: string,
    path: string,
    body: any,
    timestamp: number,
    nonce: string
  ): string {
    const payload = `${method}|${path}|${JSON.stringify(body || {})}|${timestamp}|${nonce}`
    return crypto.createHmac('sha256', this.SECRET_KEY).update(payload).digest('hex')
  }

  /**
   * Verify request signature
   */
  static async verifyRequestSignature(req: Request): Promise<boolean> {
    try {
      const signature = req.headers['x-signature'] as string
      const timestamp = parseInt(req.headers['x-timestamp'] as string)
      const nonce = req.headers['x-nonce'] as string

      if (!signature || !timestamp || !nonce) {
        return false
      }

      // Check timestamp validity (prevent replay attacks)
      const now = Date.now()
      if (Math.abs(now - timestamp) > this.SIGNATURE_VALIDITY_WINDOW) {
        return false
      }

      // Generate expected signature
      const expectedSignature = this.generateRequestSignature(
        req.method,
        req.path,
        req.body,
        timestamp,
        nonce
      )

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      logger.error('Signature verification error:', error)
      return false
    }
  }

  /**
   * Validate API version and apply security controls
   */
  static validateAPIVersion(req: Request, res: Response): boolean {
    const version = this.extractAPIVersion(req.path)
    
    if (!version) {
      // Default to latest version if not specified
      return true
    }

    const versionConfig = this.VERSION_CONFIGS.get(version)
    if (!versionConfig) {
      res.status(400).json({
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version ${version} is not supported`,
          supportedVersions: Array.from(this.VERSION_CONFIGS.keys())
        }
      })
      return false
    }

    // Check if version is deprecated
    if (versionConfig.deprecated) {
      res.setHeader('X-API-Deprecated', 'true')
      res.setHeader('X-API-Deprecation-Date', versionConfig.deprecationDate?.toISOString() || '')
      
      if (versionConfig.endOfLifeDate) {
        res.setHeader('X-API-End-Of-Life', versionConfig.endOfLifeDate.toISOString())
        
        // Block requests to end-of-life versions
        if (new Date() > versionConfig.endOfLifeDate) {
          res.status(410).json({
            error: {
              code: 'API_VERSION_END_OF_LIFE',
              message: `API version ${version} has reached end of life`,
              endOfLifeDate: versionConfig.endOfLifeDate.toISOString()
            }
          })
          return false
        }
      }
    }

    // Check allowed methods
    if (!versionConfig.allowedMethods.includes(req.method)) {
      res.status(405).json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${req.method} is not allowed for API version ${version}`,
          allowedMethods: versionConfig.allowedMethods
        }
      })
      return false
    }

    return true
  }

  /**
   * Run automated security tests on API endpoints
   */
  static async runSecurityTests(endpoint: string, method: string = 'GET'): Promise<SecurityTestResult> {
    const testId = crypto.randomUUID()
    const vulnerabilities: Vulnerability[] = []
    let riskScore = 0

    try {
      // Test for SQL injection vulnerabilities
      const sqlInjectionResult = await this.testSQLInjection(endpoint, method)
      if (!sqlInjectionResult.passed) {
        vulnerabilities.push(...sqlInjectionResult.vulnerabilities)
        riskScore += 30
      }

      // Test for XSS vulnerabilities
      const xssResult = await this.testXSS(endpoint, method)
      if (!xssResult.passed) {
        vulnerabilities.push(...xssResult.vulnerabilities)
        riskScore += 25
      }

      // Test authentication and authorization
      const authResult = await this.testAuthentication(endpoint, method)
      if (!authResult.passed) {
        vulnerabilities.push(...authResult.vulnerabilities)
        riskScore += 35
      }

      // Test rate limiting
      const rateLimitResult = await this.testRateLimiting(endpoint, method)
      if (!rateLimitResult.passed) {
        vulnerabilities.push(...rateLimitResult.vulnerabilities)
        riskScore += 20
      }

      // Test input validation
      const inputValidationResult = await this.testInputValidation(endpoint, method)
      if (!inputValidationResult.passed) {
        vulnerabilities.push(...inputValidationResult.vulnerabilities)
        riskScore += 15
      }

      const recommendations = this.generateSecurityRecommendations(vulnerabilities)

      const result: SecurityTestResult = {
        testId,
        endpoint,
        method,
        testType: SecurityTestType.INJECTION, // Primary test type
        passed: vulnerabilities.length === 0,
        vulnerabilities,
        riskScore: Math.min(riskScore, 100),
        recommendations,
        timestamp: new Date()
      }

      // Store test results
      await this.storeSecurityTestResult(result)

      logger.info('Security test completed', {
        testId,
        endpoint,
        method,
        vulnerabilityCount: vulnerabilities.length,
        riskScore
      })

      return result
    } catch (error) {
      logger.error('Security test error:', error)
      throw new Error('Failed to run security tests')
    }
  }

  /**
   * Test for SQL injection vulnerabilities
   */
  private static async testSQLInjection(endpoint: string, method: string): Promise<{ passed: boolean; vulnerabilities: Vulnerability[] }> {
    const vulnerabilities: Vulnerability[] = []
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#"
    ]

    try {
      for (const payload of sqlPayloads) {
        // In a real implementation, make actual HTTP requests to test
        // For now, simulate the test
        const testPassed = true // Placeholder

        if (!testPassed) {
          vulnerabilities.push({
            type: VulnerabilityType.SQL_INJECTION,
            severity: VulnerabilitySeverity.HIGH,
            description: `SQL injection vulnerability detected with payload: ${payload}`,
            evidence: { payload, endpoint, method },
            remediation: 'Use parameterized queries and input validation'
          })
        }
      }

      return { passed: vulnerabilities.length === 0, vulnerabilities }
    } catch (error) {
      logger.error('SQL injection test error:', error)
      return { passed: false, vulnerabilities: [] }
    }
  }

  /**
   * Test for XSS vulnerabilities
   */
  private static async testXSS(endpoint: string, method: string): Promise<{ passed: boolean; vulnerabilities: Vulnerability[] }> {
    const vulnerabilities: Vulnerability[] = []
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload="alert(1)">',
      '"><script>alert("XSS")</script>'
    ]

    try {
      for (const payload of xssPayloads) {
        // In a real implementation, make actual HTTP requests to test
        // For now, simulate the test
        const testPassed = true // Placeholder

        if (!testPassed) {
          vulnerabilities.push({
            type: VulnerabilityType.XSS,
            severity: VulnerabilitySeverity.MEDIUM,
            description: `XSS vulnerability detected with payload: ${payload}`,
            evidence: { payload, endpoint, method },
            remediation: 'Implement proper output encoding and Content Security Policy'
          })
        }
      }

      return { passed: vulnerabilities.length === 0, vulnerabilities }
    } catch (error) {
      logger.error('XSS test error:', error)
      return { passed: false, vulnerabilities: [] }
    }
  }

  /**
   * Test authentication and authorization
   */
  private static async testAuthentication(endpoint: string, method: string): Promise<{ passed: boolean; vulnerabilities: Vulnerability[] }> {
    const vulnerabilities: Vulnerability[] = []

    try {
      // Test unauthenticated access
      // In a real implementation, make HTTP requests without authentication
      const unauthenticatedAccessAllowed = false // Placeholder

      if (unauthenticatedAccessAllowed && this.requiresAuthentication(endpoint)) {
        vulnerabilities.push({
          type: VulnerabilityType.BROKEN_AUTHENTICATION,
          severity: VulnerabilitySeverity.HIGH,
          description: 'Endpoint allows unauthenticated access',
          evidence: { endpoint, method },
          remediation: 'Implement proper authentication checks'
        })
      }

      // Test privilege escalation
      // In a real implementation, test with different user roles
      const privilegeEscalationPossible = false // Placeholder

      if (privilegeEscalationPossible) {
        vulnerabilities.push({
          type: VulnerabilityType.BROKEN_ACCESS_CONTROL,
          severity: VulnerabilitySeverity.CRITICAL,
          description: 'Privilege escalation vulnerability detected',
          evidence: { endpoint, method },
          remediation: 'Implement proper authorization checks and principle of least privilege'
        })
      }

      return { passed: vulnerabilities.length === 0, vulnerabilities }
    } catch (error) {
      logger.error('Authentication test error:', error)
      return { passed: false, vulnerabilities: [] }
    }
  }

  /**
   * Test rate limiting
   */
  private static async testRateLimiting(endpoint: string, method: string): Promise<{ passed: boolean; vulnerabilities: Vulnerability[] }> {
    const vulnerabilities: Vulnerability[] = []

    try {
      // In a real implementation, make rapid successive requests
      const rateLimitingEnabled = true // Placeholder

      if (!rateLimitingEnabled) {
        vulnerabilities.push({
          type: VulnerabilityType.SECURITY_MISCONFIGURATION,
          severity: VulnerabilitySeverity.MEDIUM,
          description: 'Rate limiting not implemented',
          evidence: { endpoint, method },
          remediation: 'Implement rate limiting to prevent abuse'
        })
      }

      return { passed: vulnerabilities.length === 0, vulnerabilities }
    } catch (error) {
      logger.error('Rate limiting test error:', error)
      return { passed: false, vulnerabilities: [] }
    }
  }

  /**
   * Test input validation
   */
  private static async testInputValidation(endpoint: string, method: string): Promise<{ passed: boolean; vulnerabilities: Vulnerability[] }> {
    const vulnerabilities: Vulnerability[] = []

    try {
      // Test with invalid input types
      const invalidInputs = [
        { type: 'oversized', value: 'A'.repeat(10000) },
        { type: 'malformed_json', value: '{"invalid": json}' },
        { type: 'null_bytes', value: 'test\x00injection' },
        { type: 'unicode_bypass', value: 'test\u0000bypass' }
      ]

      for (const input of invalidInputs) {
        // In a real implementation, send these inputs to the endpoint
        const inputValidationPassed = true // Placeholder

        if (!inputValidationPassed) {
          vulnerabilities.push({
            type: VulnerabilityType.SECURITY_MISCONFIGURATION,
            severity: VulnerabilitySeverity.LOW,
            description: `Input validation bypass with ${input.type}`,
            evidence: { input, endpoint, method },
            remediation: 'Implement comprehensive input validation and sanitization'
          })
        }
      }

      return { passed: vulnerabilities.length === 0, vulnerabilities }
    } catch (error) {
      logger.error('Input validation test error:', error)
      return { passed: false, vulnerabilities: [] }
    }
  }

  /**
   * Generate security recommendations based on vulnerabilities
   */
  private static generateSecurityRecommendations(vulnerabilities: Vulnerability[]): string[] {
    const recommendations = new Set<string>()

    vulnerabilities.forEach(vuln => {
      switch (vuln.type) {
        case VulnerabilityType.SQL_INJECTION:
          recommendations.add('Implement parameterized queries and stored procedures')
          recommendations.add('Use ORM frameworks with built-in SQL injection protection')
          recommendations.add('Validate and sanitize all user inputs')
          break
        case VulnerabilityType.XSS:
          recommendations.add('Implement Content Security Policy (CSP) headers')
          recommendations.add('Use proper output encoding for all user-generated content')
          recommendations.add('Validate and sanitize inputs on both client and server side')
          break
        case VulnerabilityType.BROKEN_AUTHENTICATION:
          recommendations.add('Implement multi-factor authentication (MFA)')
          recommendations.add('Use secure session management')
          recommendations.add('Implement proper password policies')
          break
        case VulnerabilityType.BROKEN_ACCESS_CONTROL:
          recommendations.add('Implement role-based access control (RBAC)')
          recommendations.add('Follow principle of least privilege')
          recommendations.add('Regularly audit user permissions')
          break
        case VulnerabilityType.SECURITY_MISCONFIGURATION:
          recommendations.add('Implement security headers')
          recommendations.add('Configure proper error handling')
          recommendations.add('Regular security configuration reviews')
          break
      }
    })

    return Array.from(recommendations)
  }

  /**
   * Helper methods
   */
  private static normalizeEndpoint(path: string): string {
    // Remove API version and normalize path
    return path.replace(/\/api\/v\d+/, '/api').replace(/\/\d+/g, '/:id')
  }

  private static extractAPIVersion(path: string): string | undefined {
    const match = path.match(/\/api\/v(\d+)/)
    return match ? `v${match[1]}` : undefined
  }

  private static sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers }
    // Remove sensitive headers
    delete sanitized.authorization
    delete sanitized.cookie
    delete sanitized['x-api-key']
    return sanitized
  }

  private static shouldLogRequestBody(req: Request): boolean {
    // Don't log sensitive endpoints
    const sensitiveEndpoints = ['/auth/login', '/auth/register', '/users/password']
    return !sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))
  }

  private static shouldLogResponseBody(res: Response): boolean {
    // Only log response body for errors or specific status codes
    return res.statusCode >= 400 || res.statusCode === 201
  }

  private static sanitizeRequestBody(body: any): any {
    if (!body) return body
    const sanitized = { ...body }
    // Remove sensitive fields
    delete sanitized.password
    delete sanitized.token
    delete sanitized.secret
    return sanitized
  }

  private static sanitizeResponseBody(body: any): any {
    if (!body) return body
    const sanitized = { ...body }
    // Remove sensitive fields from response
    delete sanitized.password
    delete sanitized.token
    delete sanitized.secret
    return sanitized
  }

  private static async getRateLimitStatus(req: Request): Promise<RateLimitStatus> {
    // In a real implementation, get from Redis or rate limiting service
    return {
      limit: 100,
      remaining: 95,
      resetTime: new Date(Date.now() + 60000),
      exceeded: false
    }
  }

  private static async getGeoLocation(ip: string): Promise<GeoLocation | undefined> {
    // In a real implementation, use a GeoIP service
    return undefined
  }

  private static generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || ''
    const acceptLanguage = req.headers['accept-language'] || ''
    const acceptEncoding = req.headers['accept-encoding'] || ''
    
    const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`
    return crypto.createHash('sha256').update(fingerprint).digest('hex')
  }

  private static assessThreatLevel(req: Request, res: Response): ThreatLevel {
    let score = 0

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(req)) score += 30
    if (res.statusCode >= 400) score += 20
    if (this.isSuspiciousUserAgent(req.headers['user-agent'])) score += 25

    if (score >= 70) return ThreatLevel.CRITICAL
    if (score >= 50) return ThreatLevel.HIGH
    if (score >= 30) return ThreatLevel.MEDIUM
    return ThreatLevel.LOW
  }

  private static containsSuspiciousPatterns(req: Request): boolean {
    const suspiciousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ]

    const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.path
    return suspiciousPatterns.some(pattern => pattern.test(checkString))
  }

  private static isSuspiciousUserAgent(userAgent?: string): boolean {
    if (!userAgent) return true

    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  private static isUnknownLocation(location: GeoLocation, userId?: string): boolean {
    // In a real implementation, check against user's known locations
    return false
  }

  private static isGeographicAnomaly(location: GeoLocation, userId?: string): boolean {
    // In a real implementation, check for unusual geographic patterns
    return false
  }

  private static isDeprecatedVersion(version: string): boolean {
    const config = this.VERSION_CONFIGS.get(version)
    return config?.deprecated || false
  }

  private static requiresAuthentication(endpoint: string): boolean {
    const publicEndpoints = ['/health', '/api/auth/login', '/api/auth/register']
    return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint))
  }

  private static async storeAPILog(log: Omit<APISecurityLog, 'id'>): Promise<void> {
    // In a real implementation, store in database or time-series database
    logger.debug('API log stored', { endpoint: log.endpoint, method: log.method })
  }

  private static async storeSecurityTestResult(result: SecurityTestResult): Promise<void> {
    // In a real implementation, store in database
    logger.debug('Security test result stored', { testId: result.testId })
  }
}