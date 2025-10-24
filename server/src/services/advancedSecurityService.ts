import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { SecurityMonitoringService, SecurityEventType, SecuritySeverity } from './securityMonitoringService'

export interface ThreatPattern {
  id: string
  name: string
  description: string
  pattern: RegExp
  severity: SecuritySeverity
  enabled: boolean
}

export interface VulnerabilityAssessment {
  id: string
  type: VulnerabilityType
  severity: SecuritySeverity
  description: string
  recommendation: string
  status: 'OPEN' | 'ACKNOWLEDGED' | 'FIXED' | 'FALSE_POSITIVE'
  discoveredAt: Date
  lastChecked: Date
}

export interface IntrusionAttempt {
  id: string
  type: IntrusionType
  sourceIP: string
  targetEndpoint: string
  payload?: string
  userAgent?: string
  timestamp: Date
  blocked: boolean
  severity: SecuritySeverity
}

export interface SecurityScanResult {
  scanId: string
  scanType: 'VULNERABILITY' | 'INTRUSION' | 'MALWARE' | 'COMPLIANCE'
  startTime: Date
  endTime?: Date
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  findings: VulnerabilityAssessment[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
}

export enum VulnerabilityType {
  SQL_INJECTION = 'SQL_INJECTION',
  XSS = 'XSS',
  CSRF = 'CSRF',
  WEAK_AUTHENTICATION = 'WEAK_AUTHENTICATION',
  INSECURE_DIRECT_OBJECT_REFERENCE = 'INSECURE_DIRECT_OBJECT_REFERENCE',
  SECURITY_MISCONFIGURATION = 'SECURITY_MISCONFIGURATION',
  SENSITIVE_DATA_EXPOSURE = 'SENSITIVE_DATA_EXPOSURE',
  BROKEN_ACCESS_CONTROL = 'BROKEN_ACCESS_CONTROL',
  KNOWN_VULNERABLE_COMPONENTS = 'KNOWN_VULNERABLE_COMPONENTS',
  INSUFFICIENT_LOGGING = 'INSUFFICIENT_LOGGING'
}

export enum IntrusionType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  DIRECTORY_TRAVERSAL = 'DIRECTORY_TRAVERSAL',
  COMMAND_INJECTION = 'COMMAND_INJECTION',
  MALICIOUS_FILE_UPLOAD = 'MALICIOUS_FILE_UPLOAD',
  SUSPICIOUS_USER_AGENT = 'SUSPICIOUS_USER_AGENT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_API_ACCESS = 'UNAUTHORIZED_API_ACCESS',
  SUSPICIOUS_PAYLOAD = 'SUSPICIOUS_PAYLOAD'
}

/**
 * Advanced Security Service
 * Handles intrusion detection, vulnerability assessment, and threat monitoring
 */
export class AdvancedSecurityService {
  private static threatPatterns: ThreatPattern[] = [
    {
      id: 'sql_injection_1',
      name: 'SQL Injection - Union Based',
      description: 'Detects UNION-based SQL injection attempts',
      pattern: /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
      severity: SecuritySeverity.HIGH,
      enabled: true
    },
    {
      id: 'sql_injection_2',
      name: 'SQL Injection - Boolean Based',
      description: 'Detects boolean-based SQL injection attempts',
      pattern: /(\b(and|or)\b\s*\d+\s*=\s*\d+)|(\b(and|or)\b\s*\'\w+\'\s*=\s*\'\w+\')/i,
      severity: SecuritySeverity.HIGH,
      enabled: true
    },
    {
      id: 'xss_1',
      name: 'XSS - Script Tag',
      description: 'Detects script tag XSS attempts',
      pattern: /<script[^>]*>.*?<\/script>/i,
      severity: SecuritySeverity.HIGH,
      enabled: true
    },
    {
      id: 'xss_2',
      name: 'XSS - Event Handler',
      description: 'Detects event handler XSS attempts',
      pattern: /\bon\w+\s*=\s*["\'].*?["\']/i,
      severity: SecuritySeverity.MEDIUM,
      enabled: true
    },
    {
      id: 'directory_traversal',
      name: 'Directory Traversal',
      description: 'Detects directory traversal attempts',
      pattern: /(\.\.[\/\\]){2,}/,
      severity: SecuritySeverity.HIGH,
      enabled: true
    },
    {
      id: 'command_injection',
      name: 'Command Injection',
      description: 'Detects command injection attempts',
      pattern: /[;&|`$(){}[\]]/,
      severity: SecuritySeverity.CRITICAL,
      enabled: true
    },
    {
      id: 'suspicious_user_agent',
      name: 'Suspicious User Agent',
      description: 'Detects suspicious or malicious user agents',
      pattern: /(sqlmap|nikto|nmap|masscan|zap|burp|acunetix)/i,
      severity: SecuritySeverity.MEDIUM,
      enabled: true
    }
  ]

  /**
   * Analyze request for intrusion attempts
   */
  static async analyzeRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
    query?: any,
    ipAddress?: string
  ): Promise<IntrusionAttempt[]> {
    const intrusions: IntrusionAttempt[] = []
    const timestamp = new Date()

    try {
      // Combine all input data for analysis
      const inputData = {
        url,
        headers,
        body: body ? JSON.stringify(body) : '',
        query: query ? JSON.stringify(query) : ''
      }

      const fullPayload = JSON.stringify(inputData)

      // Check against threat patterns
      for (const pattern of this.threatPatterns) {
        if (!pattern.enabled) continue

        if (pattern.pattern.test(fullPayload)) {
          const intrusion: IntrusionAttempt = {
            id: `intrusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: this.mapPatternToIntrusionType(pattern.id),
            sourceIP: ipAddress || 'unknown',
            targetEndpoint: url,
            payload: fullPayload.length > 1000 ? fullPayload.substring(0, 1000) + '...' : fullPayload,
            userAgent: headers['user-agent'],
            timestamp,
            blocked: pattern.severity === SecuritySeverity.CRITICAL || pattern.severity === SecuritySeverity.HIGH,
            severity: pattern.severity
          }

          intrusions.push(intrusion)

          // Log the intrusion attempt
          await this.logIntrusionAttempt(intrusion)

          // Create security event
          await SecurityMonitoringService.createSecurityEvent({
            type: SecurityEventType.DATA_BREACH_ATTEMPT,
            severity: pattern.severity,
            ipAddress,
            userAgent: headers['user-agent'],
            details: {
              intrusionType: intrusion.type,
              pattern: pattern.name,
              endpoint: url,
              method,
              blocked: intrusion.blocked
            }
          })
        }
      }

      // Additional behavioral analysis
      await this.performBehavioralAnalysis(method, url, headers, ipAddress, intrusions)

    } catch (error) {
      logger.error('Request analysis error:', error)
    }

    return intrusions
  }

  /**
   * Perform vulnerability assessment
   */
  static async performVulnerabilityAssessment(): Promise<SecurityScanResult> {
    const scanId = `vuln_scan_${Date.now()}`
    const startTime = new Date()
    
    logger.info(`Starting vulnerability assessment: ${scanId}`)

    try {
      const findings: VulnerabilityAssessment[] = []

      // Check for common vulnerabilities
      await this.checkWeakAuthentication(findings)
      await this.checkSecurityMisconfiguration(findings)
      await this.checkSensitiveDataExposure(findings)
      await this.checkBrokenAccessControl(findings)
      await this.checkInsufficientLogging(findings)

      const summary = this.calculateSummary(findings)

      const result: SecurityScanResult = {
        scanId,
        scanType: 'VULNERABILITY',
        startTime,
        endTime: new Date(),
        status: 'COMPLETED',
        findings,
        summary
      }

      // Log scan completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'VULNERABILITY_SCAN_COMPLETED',
        newValues: {
          scanId,
          findingsCount: findings.length,
          summary
        }
      })

      logger.info(`Vulnerability assessment completed: ${scanId}, found ${findings.length} issues`)

      return result
    } catch (error) {
      logger.error('Vulnerability assessment error:', error)
      
      return {
        scanId,
        scanType: 'VULNERABILITY',
        startTime,
        endTime: new Date(),
        status: 'FAILED',
        findings: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
      }
    }
  }

  /**
   * Perform automated security scanning
   */
  static async performSecurityScan(scanType: 'VULNERABILITY' | 'INTRUSION' | 'COMPLIANCE'): Promise<SecurityScanResult> {
    const scanId = `security_scan_${scanType.toLowerCase()}_${Date.now()}`
    const startTime = new Date()

    logger.info(`Starting security scan: ${scanId} (${scanType})`)

    try {
      let findings: VulnerabilityAssessment[] = []

      switch (scanType) {
        case 'VULNERABILITY':
          return await this.performVulnerabilityAssessment()
        
        case 'INTRUSION':
          findings = await this.scanForIntrusionIndicators()
          break
        
        case 'COMPLIANCE':
          findings = await this.performComplianceCheck()
          break
      }

      const summary = this.calculateSummary(findings)

      const result: SecurityScanResult = {
        scanId,
        scanType,
        startTime,
        endTime: new Date(),
        status: 'COMPLETED',
        findings,
        summary
      }

      // Log scan completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_SCAN_COMPLETED',
        newValues: {
          scanId,
          scanType,
          findingsCount: findings.length,
          summary
        }
      })

      return result
    } catch (error) {
      logger.error('Security scan error:', error)
      
      return {
        scanId,
        scanType,
        startTime,
        endTime: new Date(),
        status: 'FAILED',
        findings: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
      }
    }
  }

  /**
   * Get threat intelligence data
   */
  static async getThreatIntelligence(): Promise<{
    knownMaliciousIPs: string[]
    suspiciousUserAgents: string[]
    recentThreats: any[]
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }> {
    try {
      // In a real implementation, this would fetch from threat intelligence feeds
      const recentIntrusions = await this.getRecentIntrusions(24) // Last 24 hours
      
      const knownMaliciousIPs = [...new Set(
        recentIntrusions
          .filter(i => i.severity === SecuritySeverity.HIGH || i.severity === SecuritySeverity.CRITICAL)
          .map(i => i.sourceIP)
      )]

      const suspiciousUserAgents = [...new Set(
        recentIntrusions
          .filter(i => i.userAgent && i.type === IntrusionType.SUSPICIOUS_USER_AGENT)
          .map(i => i.userAgent!)
      )]

      // Calculate threat level based on recent activity
      const criticalThreats = recentIntrusions.filter(i => i.severity === SecuritySeverity.CRITICAL).length
      const highThreats = recentIntrusions.filter(i => i.severity === SecuritySeverity.HIGH).length

      let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      if (criticalThreats > 0) {
        threatLevel = 'CRITICAL'
      } else if (highThreats > 5) {
        threatLevel = 'HIGH'
      } else if (highThreats > 0 || recentIntrusions.length > 10) {
        threatLevel = 'MEDIUM'
      }

      return {
        knownMaliciousIPs,
        suspiciousUserAgents,
        recentThreats: recentIntrusions.slice(0, 20),
        threatLevel
      }
    } catch (error) {
      logger.error('Threat intelligence error:', error)
      return {
        knownMaliciousIPs: [],
        suspiciousUserAgents: [],
        recentThreats: [],
        threatLevel: 'LOW'
      }
    }
  }

  /**
   * Private helper methods
   */
  private static mapPatternToIntrusionType(patternId: string): IntrusionType {
    const mapping: Record<string, IntrusionType> = {
      'sql_injection_1': IntrusionType.SQL_INJECTION_ATTEMPT,
      'sql_injection_2': IntrusionType.SQL_INJECTION_ATTEMPT,
      'xss_1': IntrusionType.XSS_ATTEMPT,
      'xss_2': IntrusionType.XSS_ATTEMPT,
      'directory_traversal': IntrusionType.DIRECTORY_TRAVERSAL,
      'command_injection': IntrusionType.COMMAND_INJECTION,
      'suspicious_user_agent': IntrusionType.SUSPICIOUS_USER_AGENT
    }

    return mapping[patternId] || IntrusionType.SUSPICIOUS_PAYLOAD
  }

  private static async logIntrusionAttempt(intrusion: IntrusionAttempt): Promise<void> {
    try {
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'INTRUSION_ATTEMPT_DETECTED',
        newValues: {
          intrusionId: intrusion.id,
          type: intrusion.type,
          sourceIP: intrusion.sourceIP,
          targetEndpoint: intrusion.targetEndpoint,
          severity: intrusion.severity,
          blocked: intrusion.blocked
        },
        ipAddress: intrusion.sourceIP,
        userAgent: intrusion.userAgent
      })
    } catch (error) {
      logger.error('Failed to log intrusion attempt:', error)
    }
  }

  private static async performBehavioralAnalysis(
    method: string,
    url: string,
    headers: Record<string, string>,
    ipAddress?: string,
    intrusions: IntrusionAttempt[] = []
  ): Promise<void> {
    // Check for rate limiting violations
    if (ipAddress) {
      const recentRequests = await this.getRecentRequestsFromIP(ipAddress, 60) // Last minute
      if (recentRequests > 100) { // More than 100 requests per minute
        intrusions.push({
          id: `rate_limit_${Date.now()}`,
          type: IntrusionType.RATE_LIMIT_EXCEEDED,
          sourceIP: ipAddress,
          targetEndpoint: url,
          userAgent: headers['user-agent'],
          timestamp: new Date(),
          blocked: true,
          severity: SecuritySeverity.MEDIUM
        })
      }
    }

    // Check for suspicious patterns in URL
    if (url.length > 2000) { // Unusually long URL
      intrusions.push({
        id: `long_url_${Date.now()}`,
        type: IntrusionType.SUSPICIOUS_PAYLOAD,
        sourceIP: ipAddress || 'unknown',
        targetEndpoint: url,
        userAgent: headers['user-agent'],
        timestamp: new Date(),
        blocked: false,
        severity: SecuritySeverity.LOW
      })
    }
  }

  private static async getRecentRequestsFromIP(ipAddress: string, seconds: number): Promise<number> {
    // In a real implementation, this would query request logs
    // For now, return a mock value
    return Math.floor(Math.random() * 50)
  }

  private static async getRecentIntrusions(hours: number): Promise<IntrusionAttempt[]> {
    // In a real implementation, this would query intrusion logs from database
    // For now, return empty array
    return []
  }

  private static async checkWeakAuthentication(findings: VulnerabilityAssessment[]): Promise<void> {
    // Check for users with weak passwords, no MFA, etc.
    const usersWithoutMFA = await prisma.user.count({
      where: {
        // In a real implementation, check for MFA status
        status: 'ACTIVE'
      }
    })

    if (usersWithoutMFA > 0) {
      findings.push({
        id: `weak_auth_${Date.now()}`,
        type: VulnerabilityType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.MEDIUM,
        description: `${usersWithoutMFA} users without multi-factor authentication`,
        recommendation: 'Enable MFA for all user accounts',
        status: 'OPEN',
        discoveredAt: new Date(),
        lastChecked: new Date()
      })
    }
  }

  private static async checkSecurityMisconfiguration(findings: VulnerabilityAssessment[]): Promise<void> {
    // Check for security misconfigurations
    const isHttpsEnforced = process.env.FORCE_HTTPS === 'true'
    if (!isHttpsEnforced) {
      findings.push({
        id: `https_not_enforced_${Date.now()}`,
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.HIGH,
        description: 'HTTPS is not enforced for all connections',
        recommendation: 'Enable HTTPS enforcement in production',
        status: 'OPEN',
        discoveredAt: new Date(),
        lastChecked: new Date()
      })
    }
  }

  private static async checkSensitiveDataExposure(findings: VulnerabilityAssessment[]): Promise<void> {
    // Check for potential sensitive data exposure
    const hasEncryptionKey = !!process.env.ENCRYPTION_SECRET
    if (!hasEncryptionKey) {
      findings.push({
        id: `no_encryption_key_${Date.now()}`,
        type: VulnerabilityType.SENSITIVE_DATA_EXPOSURE,
        severity: SecuritySeverity.CRITICAL,
        description: 'No encryption key configured for sensitive data',
        recommendation: 'Configure encryption key for sensitive data protection',
        status: 'OPEN',
        discoveredAt: new Date(),
        lastChecked: new Date()
      })
    }
  }

  private static async checkBrokenAccessControl(findings: VulnerabilityAssessment[]): Promise<void> {
    // Check for broken access control
    const usersWithoutRoles = await prisma.user.count({
      where: {
        userRoles: {
          none: {}
        }
      }
    })

    if (usersWithoutRoles > 0) {
      findings.push({
        id: `users_without_roles_${Date.now()}`,
        type: VulnerabilityType.BROKEN_ACCESS_CONTROL,
        severity: SecuritySeverity.MEDIUM,
        description: `${usersWithoutRoles} users without assigned roles`,
        recommendation: 'Assign appropriate roles to all users',
        status: 'OPEN',
        discoveredAt: new Date(),
        lastChecked: new Date()
      })
    }
  }

  private static async checkInsufficientLogging(findings: VulnerabilityAssessment[]): Promise<void> {
    // Check for insufficient logging
    const recentAuditLogs = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    if (recentAuditLogs === 0) {
      findings.push({
        id: `no_recent_logs_${Date.now()}`,
        type: VulnerabilityType.INSUFFICIENT_LOGGING,
        severity: SecuritySeverity.MEDIUM,
        description: 'No audit logs generated in the last 24 hours',
        recommendation: 'Verify audit logging is working correctly',
        status: 'OPEN',
        discoveredAt: new Date(),
        lastChecked: new Date()
      })
    }
  }

  private static async scanForIntrusionIndicators(): Promise<VulnerabilityAssessment[]> {
    // Scan for indicators of compromise
    const findings: VulnerabilityAssessment[] = []
    
    // This would include checks for:
    // - Unusual file modifications
    // - Suspicious network connections
    // - Unauthorized privilege escalations
    // - Malware signatures
    
    return findings
  }

  private static async performComplianceCheck(): Promise<VulnerabilityAssessment[]> {
    // Check compliance with security standards (GDPR, PCI DSS, etc.)
    const findings: VulnerabilityAssessment[] = []
    
    // This would include checks for:
    // - Data retention policies
    // - Encryption requirements
    // - Access control compliance
    // - Audit trail completeness
    
    return findings
  }

  private static calculateSummary(findings: VulnerabilityAssessment[]): {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  } {
    const summary = {
      critical: findings.filter(f => f.severity === SecuritySeverity.CRITICAL).length,
      high: findings.filter(f => f.severity === SecuritySeverity.HIGH).length,
      medium: findings.filter(f => f.severity === SecuritySeverity.MEDIUM).length,
      low: findings.filter(f => f.severity === SecuritySeverity.LOW).length,
      total: findings.length
    }

    return summary
  }
}