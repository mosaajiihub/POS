import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { SecurityMonitoringService, SecurityEventType, SecuritySeverity } from './securityMonitoringService'

export interface SecurityKPI {
  name: string
  value: number
  change: number // percentage change from previous period
  trend: 'up' | 'down' | 'stable'
  severity?: SecuritySeverity
}

export interface ThreatIntelligence {
  id: string
  source: string
  threatType: string
  indicators: string[]
  severity: SecuritySeverity
  description: string
  timestamp: Date
  actionable: boolean
}

export interface SecurityEventCorrelation {
  correlationId: string
  events: any[]
  pattern: string
  severity: SecuritySeverity
  confidence: number
  description: string
  timestamp: Date
}

export interface RealTimeAlert {
  id: string
  type: string
  message: string
  severity: SecuritySeverity
  timestamp: Date
  source: string
  affectedResources: string[]
  recommendedActions: string[]
}

export interface DashboardMetrics {
  kpis: SecurityKPI[]
  realtimeAlerts: RealTimeAlert[]
  threatIntelligence: ThreatIntelligence[]
  eventCorrelations: SecurityEventCorrelation[]
  securityScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

/**
 * Security Dashboard Service
 * Provides real-time security monitoring, KPI tracking, and threat intelligence
 */
export class SecurityDashboardService {
  private static readonly CORRELATION_TIME_WINDOW = 5 * 60 * 1000 // 5 minutes
  private static readonly THREAT_INTEL_CACHE_TTL = 60 * 60 * 1000 // 1 hour

  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(timeRange: number = 24): Promise<DashboardMetrics> {
    try {
      const startDate = new Date(Date.now() - timeRange * 60 * 60 * 1000)
      const previousStartDate = new Date(startDate.getTime() - timeRange * 60 * 60 * 1000)

      // Get all metrics in parallel
      const [kpis, realtimeAlerts, threatIntel, correlations] = await Promise.all([
        this.calculateSecurityKPIs(startDate, previousStartDate),
        this.getRealTimeAlerts(),
        this.getThreatIntelligence(),
        this.correlateSecurityEvents(startDate)
      ])

      // Calculate overall security score
      const securityScore = this.calculateSecurityScore(kpis, realtimeAlerts, correlations)
      const riskLevel = this.determineRiskLevel(securityScore, realtimeAlerts)

      return {
        kpis,
        realtimeAlerts,
        threatIntelligence: threatIntel,
        eventCorrelations: correlations,
        securityScore,
        riskLevel
      }
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error)
      throw new Error('Failed to retrieve dashboard metrics')
    }
  }

  /**
   * Calculate security KPIs with trend analysis
   */
  static async calculateSecurityKPIs(
    currentPeriodStart: Date,
    previousPeriodStart: Date
  ): Promise<SecurityKPI[]> {
    try {
      // Get current period data
      const [
        currentFailedLogins,
        currentSecurityEvents,
        currentAlerts,
        currentSuspiciousActivities
      ] = await Promise.all([
        prisma.auditLog.count({
          where: { action: 'FAILED_LOGIN', createdAt: { gte: currentPeriodStart } }
        }),
        prisma.auditLog.count({
          where: { action: { startsWith: 'SECURITY_EVENT_' }, createdAt: { gte: currentPeriodStart } }
        }),
        prisma.auditLog.count({
          where: { action: 'SECURITY_ALERT_CREATED', createdAt: { gte: currentPeriodStart } }
        }),
        prisma.auditLog.count({
          where: {
            action: { in: ['SECURITY_EVENT_SUSPICIOUS_LOGIN', 'SECURITY_EVENT_UNUSUAL_ACTIVITY'] },
            createdAt: { gte: currentPeriodStart }
          }
        })
      ])

      // Get previous period data for comparison
      const [
        previousFailedLogins,
        previousSecurityEvents,
        previousAlerts,
        previousSuspiciousActivities
      ] = await Promise.all([
        prisma.auditLog.count({
          where: {
            action: 'FAILED_LOGIN',
            createdAt: { gte: previousPeriodStart, lt: currentPeriodStart }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: { startsWith: 'SECURITY_EVENT_' },
            createdAt: { gte: previousPeriodStart, lt: currentPeriodStart }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: 'SECURITY_ALERT_CREATED',
            createdAt: { gte: previousPeriodStart, lt: currentPeriodStart }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: { in: ['SECURITY_EVENT_SUSPICIOUS_LOGIN', 'SECURITY_EVENT_UNUSUAL_ACTIVITY'] },
            createdAt: { gte: previousPeriodStart, lt: currentPeriodStart }
          }
        })
      ])

      return [
        {
          name: 'Failed Login Attempts',
          value: currentFailedLogins,
          change: this.calculatePercentageChange(currentFailedLogins, previousFailedLogins),
          trend: this.determineTrend(currentFailedLogins, previousFailedLogins),
          severity: currentFailedLogins > 100 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM
        },
        {
          name: 'Security Events',
          value: currentSecurityEvents,
          change: this.calculatePercentageChange(currentSecurityEvents, previousSecurityEvents),
          trend: this.determineTrend(currentSecurityEvents, previousSecurityEvents),
          severity: currentSecurityEvents > 50 ? SecuritySeverity.HIGH : SecuritySeverity.LOW
        },
        {
          name: 'Security Alerts',
          value: currentAlerts,
          change: this.calculatePercentageChange(currentAlerts, previousAlerts),
          trend: this.determineTrend(currentAlerts, previousAlerts),
          severity: currentAlerts > 10 ? SecuritySeverity.CRITICAL : SecuritySeverity.MEDIUM
        },
        {
          name: 'Suspicious Activities',
          value: currentSuspiciousActivities,
          change: this.calculatePercentageChange(currentSuspiciousActivities, previousSuspiciousActivities),
          trend: this.determineTrend(currentSuspiciousActivities, previousSuspiciousActivities),
          severity: currentSuspiciousActivities > 20 ? SecuritySeverity.HIGH : SecuritySeverity.LOW
        }
      ]
    } catch (error) {
      logger.error('Failed to calculate security KPIs:', error)
      return []
    }
  }

  /**
   * Get real-time security alerts
   */
  static async getRealTimeAlerts(): Promise<RealTimeAlert[]> {
    try {
      const recentAlerts = await prisma.auditLog.findMany({
        where: {
          action: 'SECURITY_ALERT_CREATED',
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      return recentAlerts.map(alert => ({
        id: alert.id,
        type: alert.newValues?.alertType || 'UNKNOWN',
        message: alert.newValues?.message || 'Security alert',
        severity: alert.newValues?.severity || SecuritySeverity.MEDIUM,
        timestamp: alert.createdAt,
        source: alert.ipAddress || 'system',
        affectedResources: this.extractAffectedResources(alert),
        recommendedActions: this.generateRecommendedActions(alert)
      }))
    } catch (error) {
      logger.error('Failed to get real-time alerts:', error)
      return []
    }
  }

  /**
   * Correlate security events to identify patterns
   */
  static async correlateSecurityEvents(startDate: Date): Promise<SecurityEventCorrelation[]> {
    try {
      const events = await prisma.auditLog.findMany({
        where: {
          action: { startsWith: 'SECURITY_EVENT_' },
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      })

      const correlations: SecurityEventCorrelation[] = []

      // Group events by IP address within time window
      const eventsByIP = this.groupEventsByIP(events)
      
      for (const [ip, ipEvents] of Object.entries(eventsByIP)) {
        if (ipEvents.length >= 3) {
          const pattern = this.identifyAttackPattern(ipEvents)
          if (pattern) {
            correlations.push({
              correlationId: `corr_${Date.now()}_${ip}`,
              events: ipEvents,
              pattern: pattern.name,
              severity: pattern.severity,
              confidence: pattern.confidence,
              description: pattern.description,
              timestamp: new Date()
            })
          }
        }
      }

      // Group events by user within time window
      const eventsByUser = this.groupEventsByUser(events)
      
      for (const [userId, userEvents] of Object.entries(eventsByUser)) {
        if (userEvents.length >= 3) {
          const pattern = this.identifyAttackPattern(userEvents)
          if (pattern) {
            correlations.push({
              correlationId: `corr_${Date.now()}_${userId}`,
              events: userEvents,
              pattern: pattern.name,
              severity: pattern.severity,
              confidence: pattern.confidence,
              description: pattern.description,
              timestamp: new Date()
            })
          }
        }
      }

      return correlations
    } catch (error) {
      logger.error('Failed to correlate security events:', error)
      return []
    }
  }

  /**
   * Get threat intelligence feeds
   */
  static async getThreatIntelligence(): Promise<ThreatIntelligence[]> {
    try {
      // In production, integrate with external threat intelligence feeds
      // For now, generate intelligence from recent security events
      const recentThreats = await prisma.auditLog.findMany({
        where: {
          action: { startsWith: 'SECURITY_EVENT_' },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      const threatMap = new Map<string, ThreatIntelligence>()

      for (const threat of recentThreats) {
        const threatType = threat.action.replace('SECURITY_EVENT_', '')
        const key = `${threatType}_${threat.ipAddress}`

        if (!threatMap.has(key)) {
          threatMap.set(key, {
            id: `threat_${Date.now()}_${threatType}`,
            source: 'Internal Detection',
            threatType,
            indicators: [threat.ipAddress || 'unknown'],
            severity: threat.newValues?.severity || SecuritySeverity.MEDIUM,
            description: this.generateThreatDescription(threatType, threat),
            timestamp: threat.createdAt,
            actionable: true
          })
        }
      }

      return Array.from(threatMap.values()).slice(0, 10)
    } catch (error) {
      logger.error('Failed to get threat intelligence:', error)
      return []
    }
  }

  /**
   * Calculate overall security score (0-100)
   */
  private static calculateSecurityScore(
    kpis: SecurityKPI[],
    alerts: RealTimeAlert[],
    correlations: SecurityEventCorrelation[]
  ): number {
    let score = 100

    // Deduct points for failed logins
    const failedLogins = kpis.find(k => k.name === 'Failed Login Attempts')?.value || 0
    score -= Math.min(failedLogins / 10, 20)

    // Deduct points for security events
    const securityEvents = kpis.find(k => k.name === 'Security Events')?.value || 0
    score -= Math.min(securityEvents / 5, 15)

    // Deduct points for alerts by severity
    alerts.forEach(alert => {
      switch (alert.severity) {
        case SecuritySeverity.CRITICAL:
          score -= 10
          break
        case SecuritySeverity.HIGH:
          score -= 5
          break
        case SecuritySeverity.MEDIUM:
          score -= 2
          break
        case SecuritySeverity.LOW:
          score -= 1
          break
      }
    })

    // Deduct points for correlated attack patterns
    score -= correlations.length * 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Determine risk level based on security score and alerts
   */
  private static determineRiskLevel(
    score: number,
    alerts: RealTimeAlert[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalAlerts = alerts.filter(a => a.severity === SecuritySeverity.CRITICAL).length
    const highAlerts = alerts.filter(a => a.severity === SecuritySeverity.HIGH).length

    if (criticalAlerts > 0 || score < 40) {
      return 'CRITICAL'
    } else if (highAlerts > 2 || score < 60) {
      return 'HIGH'
    } else if (score < 80) {
      return 'MEDIUM'
    } else {
      return 'LOW'
    }
  }

  /**
   * Helper methods
   */
  private static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  private static determineTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = current - previous
    if (Math.abs(change) < 2) return 'stable'
    return change > 0 ? 'up' : 'down'
  }

  private static groupEventsByIP(events: any[]): Record<string, any[]> {
    return events.reduce((acc, event) => {
      const ip = event.ipAddress || 'unknown'
      if (!acc[ip]) acc[ip] = []
      acc[ip].push(event)
      return acc
    }, {} as Record<string, any[]>)
  }

  private static groupEventsByUser(events: any[]): Record<string, any[]> {
    return events.reduce((acc, event) => {
      const userId = event.userId || 'unknown'
      if (!acc[userId]) acc[userId] = []
      acc[userId].push(event)
      return acc
    }, {} as Record<string, any[]>)
  }

  private static identifyAttackPattern(events: any[]): {
    name: string
    severity: SecuritySeverity
    confidence: number
    description: string
  } | null {
    const eventTypes = events.map(e => e.action)
    
    // Brute force pattern
    if (eventTypes.filter(t => t.includes('FAILED_LOGIN')).length >= 3) {
      return {
        name: 'Brute Force Attack',
        severity: SecuritySeverity.HIGH,
        confidence: 0.85,
        description: 'Multiple failed login attempts detected from same source'
      }
    }

    // Privilege escalation pattern
    if (eventTypes.some(t => t.includes('PRIVILEGE_ESCALATION'))) {
      return {
        name: 'Privilege Escalation Attempt',
        severity: SecuritySeverity.CRITICAL,
        confidence: 0.90,
        description: 'Unauthorized privilege escalation attempt detected'
      }
    }

    // Data breach pattern
    if (eventTypes.some(t => t.includes('DATA_BREACH'))) {
      return {
        name: 'Data Breach Attempt',
        severity: SecuritySeverity.CRITICAL,
        confidence: 0.95,
        description: 'Potential data breach activity detected'
      }
    }

    // Suspicious activity pattern
    if (eventTypes.filter(t => t.includes('SUSPICIOUS') || t.includes('UNUSUAL')).length >= 2) {
      return {
        name: 'Suspicious Activity Pattern',
        severity: SecuritySeverity.MEDIUM,
        confidence: 0.70,
        description: 'Multiple suspicious activities detected from same source'
      }
    }

    return null
  }

  private static extractAffectedResources(alert: any): string[] {
    const resources: string[] = []
    
    if (alert.userId && alert.userId !== 'system') {
      resources.push(`User: ${alert.userId}`)
    }
    
    if (alert.ipAddress) {
      resources.push(`IP: ${alert.ipAddress}`)
    }
    
    if (alert.tableName) {
      resources.push(`Resource: ${alert.tableName}`)
    }

    return resources
  }

  private static generateRecommendedActions(alert: any): string[] {
    const actions: string[] = []
    const alertType = alert.newValues?.alertType || ''

    if (alertType.includes('BRUTE_FORCE')) {
      actions.push('Block IP address temporarily')
      actions.push('Enable MFA for affected accounts')
      actions.push('Review authentication logs')
    } else if (alertType.includes('PRIVILEGE')) {
      actions.push('Review user permissions immediately')
      actions.push('Audit recent access changes')
      actions.push('Terminate suspicious sessions')
    } else if (alertType.includes('DATA_BREACH')) {
      actions.push('Isolate affected systems')
      actions.push('Initiate incident response protocol')
      actions.push('Notify security team immediately')
    } else {
      actions.push('Review security logs')
      actions.push('Monitor for additional suspicious activity')
    }

    return actions
  }

  private static generateThreatDescription(threatType: string, threat: any): string {
    const descriptions: Record<string, string> = {
      'FAILED_LOGIN': 'Multiple failed authentication attempts detected',
      'SUSPICIOUS_LOGIN': 'Login from unusual location or device',
      'BRUTE_FORCE_ATTACK': 'Automated password guessing attack in progress',
      'PRIVILEGE_ESCALATION': 'Unauthorized attempt to gain elevated privileges',
      'DATA_BREACH_ATTEMPT': 'Suspicious data access or exfiltration attempt',
      'UNUSUAL_ACTIVITY': 'Abnormal user or system behavior detected',
      'SESSION_HIJACKING': 'Potential session takeover attempt'
    }

    return descriptions[threatType] || 'Security threat detected'
  }
}
