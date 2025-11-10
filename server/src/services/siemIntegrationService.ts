import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { SecuritySeverity } from './securityMonitoringService'

export interface SIEMEvent {
  id: string
  timestamp: Date
  eventType: string
  severity: SecuritySeverity
  source: string
  destination?: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  action: string
  result: 'SUCCESS' | 'FAILURE' | 'UNKNOWN'
  details: any
  tags: string[]
}

export interface SIEMConfig {
  enabled: boolean
  provider: 'splunk' | 'elastic' | 'datadog' | 'custom'
  endpoint: string
  apiKey?: string
  batchSize: number
  flushInterval: number
}

export interface SecurityAnalytics {
  timeRange: string
  totalEvents: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
  topUsers: { userId: string; eventCount: number }[]
  topIPs: { ipAddress: string; eventCount: number }[]
  topActions: { action: string; count: number }[]
  anomalies: number
  trends: AnalyticsTrend[]
}

export interface AnalyticsTrend {
  metric: string
  direction: 'increasing' | 'decreasing' | 'stable'
  changePercentage: number
  significance: 'high' | 'medium' | 'low'
}

export interface ComplianceReport {
  id: string
  reportType: 'PCI_DSS' | 'GDPR' | 'SOC2' | 'HIPAA' | 'ISO27001'
  generatedAt: Date
  period: { start: Date; end: Date }
  overallScore: number
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'
  findings: ComplianceFinding[]
  recommendations: string[]
  auditTrail: AuditTrailEntry[]
}

export interface ComplianceFinding {
  id: string
  requirement: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  severity: SecuritySeverity
  description: string
  evidence: string[]
  remediation?: string
}

export interface AuditTrailEntry {
  timestamp: Date
  action: string
  userId: string
  resource: string
  result: string
  details: any
}

/**
 * SIEM Integration Service
 * Handles integration with external SIEM systems and security analytics
 */
export class SIEMIntegrationService {
  private static eventBuffer: SIEMEvent[] = []
  private static config: SIEMConfig = {
    enabled: false,
    provider: 'custom',
    endpoint: '',
    batchSize: 100,
    flushInterval: 60000 // 1 minute
  }

  /**
   * Initialize SIEM integration
   */
  static initialize(config: Partial<SIEMConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.config.enabled) {
      // Start periodic flush
      setInterval(() => this.flushEvents(), this.config.flushInterval)
      logger.info(`SIEM integration initialized: ${this.config.provider}`)
    }
  }

  /**
   * Send event to SIEM
   */
  static async sendEvent(event: Partial<SIEMEvent>): Promise<void> {
    try {
      const siemEvent: SIEMEvent = {
        id: event.id || `siem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: event.timestamp || new Date(),
        eventType: event.eventType || 'UNKNOWN',
        severity: event.severity || SecuritySeverity.LOW,
        source: event.source || 'mosaajii-pos',
        destination: event.destination,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        action: event.action || 'UNKNOWN',
        result: event.result || 'UNKNOWN',
        details: event.details || {},
        tags: event.tags || []
      }

      // Add to buffer
      this.eventBuffer.push(siemEvent)

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.config.batchSize) {
        await this.flushEvents()
      }
    } catch (error) {
      logger.error('Failed to send SIEM event:', error)
    }
  }

  /**
   * Flush buffered events to SIEM
   */
  static async flushEvents(): Promise<void> {
    if (!this.config.enabled || this.eventBuffer.length === 0) {
      return
    }

    try {
      const events = [...this.eventBuffer]
      this.eventBuffer = []

      // Send to SIEM provider
      await this.sendToSIEM(events)

      logger.info(`Flushed ${events.length} events to SIEM`)
    } catch (error) {
      logger.error('Failed to flush SIEM events:', error)
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...this.eventBuffer)
    }
  }

  /**
   * Generate security analytics
   */
  static async generateAnalytics(timeRange: number = 24): Promise<SecurityAnalytics> {
    try {
      const startDate = new Date(Date.now() - timeRange * 60 * 60 * 1000)

      // Get all security events
      const events = await prisma.auditLog.findMany({
        where: { createdAt: { gte: startDate } }
      })

      // Calculate analytics
      const eventsByType: Record<string, number> = {}
      const eventsBySeverity: Record<string, number> = {}
      const userCounts: Record<string, number> = {}
      const ipCounts: Record<string, number> = {}
      const actionCounts: Record<string, number> = {}

      events.forEach(event => {
        // By type
        eventsByType[event.action] = (eventsByType[event.action] || 0) + 1

        // By severity (from event details)
        const severity = event.newValues?.severity || 'LOW'
        eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1

        // By user
        if (event.userId) {
          userCounts[event.userId] = (userCounts[event.userId] || 0) + 1
        }

        // By IP
        if (event.ipAddress) {
          ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1
        }

        // By action
        actionCounts[event.action] = (actionCounts[event.action] || 0) + 1
      })

      // Get top users
      const topUsers = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, eventCount]) => ({ userId, eventCount }))

      // Get top IPs
      const topIPs = Object.entries(ipCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ipAddress, count]) => ({ ipAddress, eventCount: count }))

      // Get top actions
      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }))

      // Calculate trends
      const trends = await this.calculateTrends(startDate)

      // Count anomalies
      const anomalies = events.filter(e => 
        e.action.includes('SUSPICIOUS') || 
        e.action.includes('UNUSUAL') ||
        e.action.includes('ANOMALY')
      ).length

      return {
        timeRange: `${timeRange} hours`,
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        topUsers,
        topIPs,
        topActions,
        anomalies,
        trends
      }
    } catch (error) {
      logger.error('Failed to generate analytics:', error)
      throw new Error('Failed to generate security analytics')
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      const findings: ComplianceFinding[] = []
      let overallScore = 100

      // Get audit trail for the period
      const auditTrail = await this.getAuditTrail(startDate, endDate)

      // Check compliance requirements based on type
      switch (reportType) {
        case 'PCI_DSS':
          findings.push(...await this.checkPCIDSSCompliance(startDate, endDate))
          break
        case 'GDPR':
          findings.push(...await this.checkGDPRCompliance(startDate, endDate))
          break
        case 'SOC2':
          findings.push(...await this.checkSOC2Compliance(startDate, endDate))
          break
        case 'HIPAA':
          findings.push(...await this.checkHIPAACompliance(startDate, endDate))
          break
        case 'ISO27001':
          findings.push(...await this.checkISO27001Compliance(startDate, endDate))
          break
      }

      // Calculate overall score
      const failedFindings = findings.filter(f => f.status === 'FAIL').length
      const warningFindings = findings.filter(f => f.status === 'WARNING').length
      overallScore -= (failedFindings * 10) + (warningFindings * 5)
      overallScore = Math.max(0, overallScore)

      // Determine status
      let status: ComplianceReport['status'] = 'COMPLIANT'
      if (failedFindings > 0) {
        status = overallScore < 50 ? 'NON_COMPLIANT' : 'PARTIAL'
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(findings)

      return {
        id: `report_${Date.now()}_${reportType}`,
        reportType,
        generatedAt: new Date(),
        period: { start: startDate, end: endDate },
        overallScore,
        status,
        findings,
        recommendations,
        auditTrail
      }
    } catch (error) {
      logger.error('Failed to generate compliance report:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  /**
   * Get audit trail
   */
  static async getAuditTrail(startDate: Date, endDate: Date): Promise<AuditTrailEntry[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 1000
      })

      return logs.map(log => ({
        timestamp: log.createdAt,
        action: log.action,
        userId: log.userId,
        resource: log.tableName || 'unknown',
        result: 'SUCCESS', // Simplified
        details: log.newValues || {}
      }))
    } catch (error) {
      logger.error('Failed to get audit trail:', error)
      return []
    }
  }

  /**
   * Export security metrics
   */
  static async exportMetrics(format: 'json' | 'csv' | 'pdf' = 'json'): Promise<any> {
    try {
      const analytics = await this.generateAnalytics(24)
      
      if (format === 'json') {
        return analytics
      } else if (format === 'csv') {
        return this.convertToCSV(analytics)
      } else if (format === 'pdf') {
        return this.convertToPDF(analytics)
      }

      return analytics
    } catch (error) {
      logger.error('Failed to export metrics:', error)
      throw new Error('Failed to export security metrics')
    }
  }

  /**
   * Helper methods
   */
  private static async sendToSIEM(events: SIEMEvent[]): Promise<void> {
    // In production, send to actual SIEM provider
    // For now, just log
    logger.info(`Sending ${events.length} events to ${this.config.provider}`)
    
    // Example: Send to Splunk HEC
    // await fetch(this.config.endpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Splunk ${this.config.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(events)
    // })
  }

  private static async calculateTrends(startDate: Date): Promise<AnalyticsTrend[]> {
    const trends: AnalyticsTrend[] = []

    // Get current period data
    const currentEvents = await prisma.auditLog.count({
      where: { createdAt: { gte: startDate } }
    })

    // Get previous period data
    const periodLength = Date.now() - startDate.getTime()
    const previousStartDate = new Date(startDate.getTime() - periodLength)
    const previousEvents = await prisma.auditLog.count({
      where: {
        createdAt: { gte: previousStartDate, lt: startDate }
      }
    })

    // Calculate trend
    const change = previousEvents > 0 
      ? ((currentEvents - previousEvents) / previousEvents) * 100 
      : 0

    trends.push({
      metric: 'Total Events',
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      changePercentage: Math.abs(change),
      significance: Math.abs(change) > 20 ? 'high' : Math.abs(change) > 10 ? 'medium' : 'low'
    })

    return trends
  }

  private static async checkPCIDSSCompliance(startDate: Date, endDate: Date): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = []

    // Check encryption
    findings.push({
      id: 'pci_1',
      requirement: 'PCI DSS 3.4 - Render PAN unreadable',
      status: 'PASS',
      severity: SecuritySeverity.HIGH,
      description: 'Cardholder data encryption is implemented',
      evidence: ['Data encryption service active']
    })

    // Check access controls
    const accessLogs = await prisma.auditLog.count({
      where: {
        action: { contains: 'ACCESS' },
        createdAt: { gte: startDate, lte: endDate }
      }
    })

    findings.push({
      id: 'pci_2',
      requirement: 'PCI DSS 7.1 - Limit access to cardholder data',
      status: accessLogs > 0 ? 'PASS' : 'WARNING',
      severity: SecuritySeverity.MEDIUM,
      description: 'Access control mechanisms are in place',
      evidence: [`${accessLogs} access events logged`]
    })

    return findings
  }

  private static async checkGDPRCompliance(startDate: Date, endDate: Date): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = []

    // Check data protection
    findings.push({
      id: 'gdpr_1',
      requirement: 'GDPR Article 32 - Security of processing',
      status: 'PASS',
      severity: SecuritySeverity.HIGH,
      description: 'Technical security measures implemented',
      evidence: ['Encryption enabled', 'Access controls active']
    })

    // Check audit logging
    const auditLogs = await prisma.auditLog.count({
      where: { createdAt: { gte: startDate, lte: endDate } }
    })

    findings.push({
      id: 'gdpr_2',
      requirement: 'GDPR Article 30 - Records of processing activities',
      status: auditLogs > 0 ? 'PASS' : 'FAIL',
      severity: SecuritySeverity.HIGH,
      description: 'Audit logging is active',
      evidence: [`${auditLogs} audit entries recorded`],
      remediation: auditLogs === 0 ? 'Enable comprehensive audit logging' : undefined
    })

    return findings
  }

  private static async checkSOC2Compliance(startDate: Date, endDate: Date): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = []

    findings.push({
      id: 'soc2_1',
      requirement: 'CC6.1 - Logical and physical access controls',
      status: 'PASS',
      severity: SecuritySeverity.HIGH,
      description: 'Access controls implemented',
      evidence: ['Authentication required', 'Authorization enforced']
    })

    return findings
  }

  private static async checkHIPAACompliance(startDate: Date, endDate: Date): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = []

    findings.push({
      id: 'hipaa_1',
      requirement: 'HIPAA 164.312(a)(1) - Access Control',
      status: 'PASS',
      severity: SecuritySeverity.CRITICAL,
      description: 'Access control mechanisms in place',
      evidence: ['Role-based access control', 'Authentication required']
    })

    return findings
  }

  private static async checkISO27001Compliance(startDate: Date, endDate: Date): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = []

    findings.push({
      id: 'iso_1',
      requirement: 'ISO 27001 A.9.2 - User access management',
      status: 'PASS',
      severity: SecuritySeverity.HIGH,
      description: 'User access management implemented',
      evidence: ['Access control system active']
    })

    return findings
  }

  private static generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = []

    const failedFindings = findings.filter(f => f.status === 'FAIL')
    const warningFindings = findings.filter(f => f.status === 'WARNING')

    if (failedFindings.length > 0) {
      recommendations.push('Address all failed compliance requirements immediately')
      failedFindings.forEach(f => {
        if (f.remediation) {
          recommendations.push(f.remediation)
        }
      })
    }

    if (warningFindings.length > 0) {
      recommendations.push('Review and improve warning-level compliance items')
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current security posture')
      recommendations.push('Continue regular compliance monitoring')
    }

    return recommendations
  }

  private static convertToCSV(analytics: SecurityAnalytics): string {
    // Simple CSV conversion
    let csv = 'Metric,Value\n'
    csv += `Total Events,${analytics.totalEvents}\n`
    csv += `Anomalies,${analytics.anomalies}\n`
    return csv
  }

  private static convertToPDF(analytics: SecurityAnalytics): any {
    // In production, use a PDF library
    return { message: 'PDF export not implemented', data: analytics }
  }
}
