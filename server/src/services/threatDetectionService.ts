import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { SecurityMonitoringService, SecurityEventType, SecuritySeverity } from './securityMonitoringService'

export interface ThreatSignature {
  id: string
  name: string
  pattern: RegExp | string
  severity: SecuritySeverity
  description: string
  indicators: string[]
}

export interface BehavioralProfile {
  userId: string
  normalLoginTimes: number[] // Hours of day
  normalLocations: string[] // IP ranges or countries
  normalDevices: string[] // User agent patterns
  averageSessionDuration: number
  typicalActions: string[]
  lastUpdated: Date
}

export interface AnomalyDetection {
  id: string
  type: 'statistical' | 'behavioral' | 'pattern'
  severity: SecuritySeverity
  confidence: number
  description: string
  affectedEntity: string
  timestamp: Date
  details: any
}

export interface ThreatHuntingResult {
  id: string
  huntType: string
  findings: any[]
  severity: SecuritySeverity
  timestamp: Date
  recommendations: string[]
}

/**
 * Threat Detection Service
 * Implements automated threat detection using multiple techniques
 */
export class ThreatDetectionService {
  private static threatSignatures: ThreatSignature[] = [
    {
      id: 'sig_sql_injection',
      name: 'SQL Injection Attempt',
      pattern: /(\bUNION\b|\bSELECT\b.*\bFROM\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|--|;|\/\*|\*\/|xp_|sp_)/i,
      severity: SecuritySeverity.CRITICAL,
      description: 'SQL injection attack pattern detected',
      indicators: ['UNION', 'SELECT', 'DROP', 'INSERT', 'UPDATE', 'DELETE']
    },
    {
      id: 'sig_xss',
      name: 'Cross-Site Scripting (XSS)',
      pattern: /(<script|javascript:|onerror=|onload=|<iframe|eval\(|alert\()/i,
      severity: SecuritySeverity.HIGH,
      description: 'XSS attack pattern detected',
      indicators: ['<script', 'javascript:', 'onerror', 'onload', 'eval(']
    },
    {
      id: 'sig_path_traversal',
      name: 'Path Traversal Attack',
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f)/i,
      severity: SecuritySeverity.HIGH,
      description: 'Path traversal attack pattern detected',
      indicators: ['../', '..\\', '%2e%2e']
    },
    {
      id: 'sig_command_injection',
      name: 'Command Injection',
      pattern: /(\||&|;|`|\$\(|>\||<\||&&|\|\|)/,
      severity: SecuritySeverity.CRITICAL,
      description: 'Command injection attack pattern detected',
      indicators: ['|', '&', ';', '`', '$(']
    },
    {
      id: 'sig_ldap_injection',
      name: 'LDAP Injection',
      pattern: /(\*|\(|\)|\||&)/,
      severity: SecuritySeverity.HIGH,
      description: 'LDAP injection attack pattern detected',
      indicators: ['*', '(', ')', '|', '&']
    }
  ]

  /**
   * Detect threats using signature-based detection
   */
  static async detectSignatureBasedThreats(input: string, context: any): Promise<ThreatSignature[]> {
    const detectedThreats: ThreatSignature[] = []

    for (const signature of this.threatSignatures) {
      if (typeof signature.pattern === 'string') {
        if (input.includes(signature.pattern)) {
          detectedThreats.push(signature)
        }
      } else if (signature.pattern.test(input)) {
        detectedThreats.push(signature)
      }
    }

    if (detectedThreats.length > 0) {
      await SecurityMonitoringService.createSecurityEvent({
        type: SecurityEventType.DATA_BREACH_ATTEMPT,
        severity: Math.max(...detectedThreats.map(t => 
          t.severity === SecuritySeverity.CRITICAL ? 4 : 
          t.severity === SecuritySeverity.HIGH ? 3 : 
          t.severity === SecuritySeverity.MEDIUM ? 2 : 1
        )) >= 4 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          detectedSignatures: detectedThreats.map(t => t.name),
          input: input.substring(0, 200),
          context
        }
      })

      logger.warn(`Signature-based threats detected: ${detectedThreats.map(t => t.name).join(', ')}`)
    }

    return detectedThreats
  }

  /**
   * Perform statistical anomaly detection
   */
  static async detectStatisticalAnomalies(timeRange: number = 24): Promise<AnomalyDetection[]> {
    try {
      const startDate = new Date(Date.now() - timeRange * 60 * 60 * 1000)
      const anomalies: AnomalyDetection[] = []

      // Detect unusual spike in failed logins
      const failedLoginsByHour = await this.getFailedLoginsByHour(startDate)
      const failedLoginAnomaly = this.detectSpike(failedLoginsByHour, 'failed_logins')
      if (failedLoginAnomaly) {
        anomalies.push(failedLoginAnomaly)
      }

      // Detect unusual spike in API requests from single IP
      const requestsByIP = await this.getRequestsByIP(startDate)
      for (const [ip, count] of Object.entries(requestsByIP)) {
        if (count > 1000) { // Threshold for suspicious activity
          anomalies.push({
            id: `anomaly_${Date.now()}_${ip}`,
            type: 'statistical',
            severity: count > 5000 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
            confidence: 0.85,
            description: `Unusual spike in requests from IP ${ip}`,
            affectedEntity: ip,
            timestamp: new Date(),
            details: { requestCount: count, threshold: 1000 }
          })
        }
      }

      // Detect unusual data access patterns
      const dataAccessAnomaly = await this.detectUnusualDataAccess(startDate)
      if (dataAccessAnomaly) {
        anomalies.push(dataAccessAnomaly)
      }

      return anomalies
    } catch (error) {
      logger.error('Failed to detect statistical anomalies:', error)
      return []
    }
  }

  /**
   * Perform behavioral analysis for users
   */
  static async analyzeBehavior(userId: string, currentActivity: any): Promise<AnomalyDetection | null> {
    try {
      // Get user's behavioral profile
      const profile = await this.getUserBehavioralProfile(userId)
      
      if (!profile) {
        // Not enough data to establish baseline
        return null
      }

      const anomalies: string[] = []
      let maxSeverity = SecuritySeverity.LOW
      let confidence = 0

      // Check login time anomaly
      const currentHour = new Date().getHours()
      if (!profile.normalLoginTimes.includes(currentHour)) {
        anomalies.push('Unusual login time')
        confidence += 0.2
        maxSeverity = SecuritySeverity.MEDIUM
      }

      // Check location anomaly
      if (currentActivity.ipAddress && !this.isNormalLocation(currentActivity.ipAddress, profile.normalLocations)) {
        anomalies.push('Login from unusual location')
        confidence += 0.3
        maxSeverity = SecuritySeverity.HIGH
      }

      // Check device anomaly
      if (currentActivity.userAgent && !this.isNormalDevice(currentActivity.userAgent, profile.normalDevices)) {
        anomalies.push('Login from unusual device')
        confidence += 0.25
        maxSeverity = SecuritySeverity.MEDIUM
      }

      // Check action pattern anomaly
      if (currentActivity.action && !profile.typicalActions.includes(currentActivity.action)) {
        anomalies.push('Unusual action for user')
        confidence += 0.15
      }

      if (anomalies.length > 0) {
        const anomaly: AnomalyDetection = {
          id: `anomaly_${Date.now()}_${userId}`,
          type: 'behavioral',
          severity: maxSeverity,
          confidence: Math.min(confidence, 0.95),
          description: `Behavioral anomalies detected: ${anomalies.join(', ')}`,
          affectedEntity: userId,
          timestamp: new Date(),
          details: {
            anomalies,
            currentActivity,
            profile: {
              normalLoginTimes: profile.normalLoginTimes,
              normalLocations: profile.normalLocations.length,
              normalDevices: profile.normalDevices.length
            }
          }
        }

        // Create security event for significant anomalies
        if (confidence > 0.5) {
          await SecurityMonitoringService.createSecurityEvent({
            type: SecurityEventType.UNUSUAL_ACTIVITY,
            severity: maxSeverity,
            userId,
            ipAddress: currentActivity.ipAddress,
            userAgent: currentActivity.userAgent,
            details: anomaly.details
          })
        }

        return anomaly
      }

      return null
    } catch (error) {
      logger.error('Failed to analyze behavior:', error)
      return null
    }
  }

  /**
   * Perform threat hunting
   */
  static async performThreatHunting(huntType: string): Promise<ThreatHuntingResult> {
    try {
      const findings: any[] = []
      let severity = SecuritySeverity.LOW
      const recommendations: string[] = []

      switch (huntType) {
        case 'credential_stuffing':
          const credentialStuffingFindings = await this.huntCredentialStuffing()
          findings.push(...credentialStuffingFindings)
          if (credentialStuffingFindings.length > 0) {
            severity = SecuritySeverity.HIGH
            recommendations.push('Enable MFA for affected accounts')
            recommendations.push('Force password reset for compromised accounts')
          }
          break

        case 'privilege_escalation':
          const privEscFindings = await this.huntPrivilegeEscalation()
          findings.push(...privEscFindings)
          if (privEscFindings.length > 0) {
            severity = SecuritySeverity.CRITICAL
            recommendations.push('Review and audit all permission changes')
            recommendations.push('Investigate affected user accounts')
          }
          break

        case 'data_exfiltration':
          const dataExfilFindings = await this.huntDataExfiltration()
          findings.push(...dataExfilFindings)
          if (dataExfilFindings.length > 0) {
            severity = SecuritySeverity.CRITICAL
            recommendations.push('Block suspicious IP addresses')
            recommendations.push('Review data access logs')
            recommendations.push('Initiate incident response protocol')
          }
          break

        case 'lateral_movement':
          const lateralMovementFindings = await this.huntLateralMovement()
          findings.push(...lateralMovementFindings)
          if (lateralMovementFindings.length > 0) {
            severity = SecuritySeverity.HIGH
            recommendations.push('Isolate affected systems')
            recommendations.push('Review network access logs')
          }
          break

        default:
          findings.push({ message: 'Unknown hunt type' })
      }

      return {
        id: `hunt_${Date.now()}_${huntType}`,
        huntType,
        findings,
        severity,
        timestamp: new Date(),
        recommendations
      }
    } catch (error) {
      logger.error('Failed to perform threat hunting:', error)
      throw new Error('Threat hunting failed')
    }
  }

  /**
   * Update user behavioral profile
   */
  static async updateBehavioralProfile(userId: string, activity: any): Promise<void> {
    try {
      // In production, store profiles in database
      // For now, just log the update
      logger.info(`Updating behavioral profile for user ${userId}`)
    } catch (error) {
      logger.error('Failed to update behavioral profile:', error)
    }
  }

  /**
   * Helper methods
   */
  private static async getFailedLoginsByHour(startDate: Date): Promise<Record<number, number>> {
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'FAILED_LOGIN',
        createdAt: { gte: startDate }
      },
      select: { createdAt: true }
    })

    const byHour: Record<number, number> = {}
    failedLogins.forEach(log => {
      const hour = log.createdAt.getHours()
      byHour[hour] = (byHour[hour] || 0) + 1
    })

    return byHour
  }

  private static async getRequestsByIP(startDate: Date): Promise<Record<string, number>> {
    const requests = await prisma.auditLog.findMany({
      where: { createdAt: { gte: startDate } },
      select: { ipAddress: true }
    })

    const byIP: Record<string, number> = {}
    requests.forEach(req => {
      if (req.ipAddress) {
        byIP[req.ipAddress] = (byIP[req.ipAddress] || 0) + 1
      }
    })

    return byIP
  }

  private static detectSpike(data: Record<number, number>, metric: string): AnomalyDetection | null {
    const values = Object.values(data)
    if (values.length === 0) return null

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
    
    const threshold = mean + (2 * stdDev) // 2 standard deviations
    const spikes = values.filter(v => v > threshold)

    if (spikes.length > 0) {
      return {
        id: `anomaly_${Date.now()}_${metric}`,
        type: 'statistical',
        severity: spikes.length > 3 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM,
        confidence: 0.80,
        description: `Statistical anomaly detected in ${metric}`,
        affectedEntity: metric,
        timestamp: new Date(),
        details: { mean, stdDev, threshold, spikes: spikes.length }
      }
    }

    return null
  }

  private static async detectUnusualDataAccess(startDate: Date): Promise<AnomalyDetection | null> {
    // Check for unusual data access patterns
    const dataAccessLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['READ', 'EXPORT', 'DOWNLOAD'] },
        createdAt: { gte: startDate }
      }
    })

    // Group by user
    const accessByUser: Record<string, number> = {}
    dataAccessLogs.forEach(log => {
      accessByUser[log.userId] = (accessByUser[log.userId] || 0) + 1
    })

    // Find users with unusually high access
    const values = Object.values(accessByUser)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const threshold = mean * 3

    for (const [userId, count] of Object.entries(accessByUser)) {
      if (count > threshold && count > 50) {
        return {
          id: `anomaly_${Date.now()}_data_access`,
          type: 'statistical',
          severity: SecuritySeverity.HIGH,
          confidence: 0.75,
          description: `Unusual data access pattern detected for user ${userId}`,
          affectedEntity: userId,
          timestamp: new Date(),
          details: { accessCount: count, threshold, mean }
        }
      }
    }

    return null
  }

  private static async getUserBehavioralProfile(userId: string): Promise<BehavioralProfile | null> {
    try {
      // Get user's historical activity
      const historicalActivity = await prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      })

      if (historicalActivity.length < 10) {
        return null // Not enough data
      }

      // Extract patterns
      const loginTimes = new Set<number>()
      const locations = new Set<string>()
      const devices = new Set<string>()
      const actions = new Set<string>()

      historicalActivity.forEach(log => {
        loginTimes.add(log.createdAt.getHours())
        if (log.ipAddress) locations.add(log.ipAddress.split('.').slice(0, 2).join('.')) // First two octets
        if (log.userAgent) devices.add(log.userAgent.split(' ')[0]) // First part of user agent
        actions.add(log.action)
      })

      return {
        userId,
        normalLoginTimes: Array.from(loginTimes),
        normalLocations: Array.from(locations),
        normalDevices: Array.from(devices),
        averageSessionDuration: 3600, // Placeholder
        typicalActions: Array.from(actions),
        lastUpdated: new Date()
      }
    } catch (error) {
      logger.error('Failed to get user behavioral profile:', error)
      return null
    }
  }

  private static isNormalLocation(ipAddress: string, normalLocations: string[]): boolean {
    const ipPrefix = ipAddress.split('.').slice(0, 2).join('.')
    return normalLocations.some(loc => loc === ipPrefix)
  }

  private static isNormalDevice(userAgent: string, normalDevices: string[]): boolean {
    const devicePrefix = userAgent.split(' ')[0]
    return normalDevices.some(dev => dev === devicePrefix)
  }

  private static async huntCredentialStuffing(): Promise<any[]> {
    const findings: any[] = []
    
    // Look for multiple failed logins followed by success from same IP
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        action: { in: ['FAILED_LOGIN', 'LOGIN'] },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'asc' }
    })

    const byIP: Record<string, any[]> = {}
    recentActivity.forEach(log => {
      if (log.ipAddress) {
        if (!byIP[log.ipAddress]) byIP[log.ipAddress] = []
        byIP[log.ipAddress].push(log)
      }
    })

    for (const [ip, logs] of Object.entries(byIP)) {
      const failedCount = logs.filter(l => l.action === 'FAILED_LOGIN').length
      const successCount = logs.filter(l => l.action === 'LOGIN').length
      
      if (failedCount > 5 && successCount > 0) {
        findings.push({
          type: 'credential_stuffing',
          ipAddress: ip,
          failedAttempts: failedCount,
          successfulLogins: successCount,
          confidence: 0.85
        })
      }
    }

    return findings
  }

  private static async huntPrivilegeEscalation(): Promise<any[]> {
    const findings: any[] = []
    
    // Look for permission changes followed by unusual actions
    const permissionChanges = await prisma.auditLog.findMany({
      where: {
        action: { contains: 'PERMISSION' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    for (const change of permissionChanges) {
      // Check for suspicious activity after permission change
      const subsequentActivity = await prisma.auditLog.findMany({
        where: {
          userId: change.userId,
          createdAt: { gte: change.createdAt },
          action: { in: ['DELETE', 'UPDATE', 'EXPORT'] }
        },
        take: 10
      })

      if (subsequentActivity.length > 5) {
        findings.push({
          type: 'privilege_escalation',
          userId: change.userId,
          permissionChange: change.action,
          suspiciousActions: subsequentActivity.length,
          confidence: 0.70
        })
      }
    }

    return findings
  }

  private static async huntDataExfiltration(): Promise<any[]> {
    const findings: any[] = []
    
    // Look for large data exports or downloads
    const dataAccess = await prisma.auditLog.findMany({
      where: {
        action: { in: ['EXPORT', 'DOWNLOAD'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    const byUser: Record<string, number> = {}
    dataAccess.forEach(log => {
      byUser[log.userId] = (byUser[log.userId] || 0) + 1
    })

    for (const [userId, count] of Object.entries(byUser)) {
      if (count > 20) {
        findings.push({
          type: 'data_exfiltration',
          userId,
          exportCount: count,
          confidence: 0.75
        })
      }
    }

    return findings
  }

  private static async huntLateralMovement(): Promise<any[]> {
    const findings: any[] = []
    
    // Look for users accessing multiple different resources in short time
    const recentAccess = await prisma.auditLog.findMany({
      where: {
        action: { in: ['READ', 'ACCESS'] },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    })

    const byUser: Record<string, Set<string>> = {}
    recentAccess.forEach(log => {
      if (!byUser[log.userId]) byUser[log.userId] = new Set()
      if (log.tableName) byUser[log.userId].add(log.tableName)
    })

    for (const [userId, resources] of Object.entries(byUser)) {
      if (resources.size > 10) {
        findings.push({
          type: 'lateral_movement',
          userId,
          resourcesAccessed: resources.size,
          confidence: 0.65
        })
      }
    }

    return findings
  }
}
