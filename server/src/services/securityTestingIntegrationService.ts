import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { SASTService, SASTScanResult } from './sastService'
import { DASTService, DASTScanResult } from './dastService'
import { PenetrationTestingService, PenTestResult } from './penetrationTestingService'
import { VulnerabilityService } from './vulnerabilityService'

export interface SecurityTestSuite {
  id: string
  name: string
  description: string
  enabled: boolean
  schedule?: string
  tests: SecurityTestConfig[]
}

export interface SecurityTestConfig {
  type: 'SAST' | 'DAST' | 'PENTEST' | 'DEPENDENCY' | 'CONTAINER'
  enabled: boolean
  configuration: any
  failOnCritical: boolean
  failOnHigh: boolean
}

export interface UnifiedSecurityReport {
  reportId: string
  timestamp: Date
  duration: number
  summary: UnifiedSecuritySummary
  sastResults?: SASTScanResult
  dastResults?: DASTScanResult
  pentestResults?: PenTestResult
  dependencyResults?: any
  correlatedFindings: CorrelatedFinding[]
  metrics: SecurityMetrics
  trends: SecurityTrends
  recommendations: string[]
  complianceStatus: ComplianceStatus
}

export interface UnifiedSecuritySummary {
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  overallSecurityScore: number
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  testsExecuted: number
  testsPassed: number
  testsFailed: number
}

export interface CorrelatedFinding {
  id: string
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  sources: FindingSource[]
  affectedAssets: string[]
  description: string
  impact: string
  remediation: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'FALSE_POSITIVE'
}

export interface FindingSource {
  type: 'SAST' | 'DAST' | 'PENTEST' | 'DEPENDENCY'
  findingId: string
  timestamp: Date
}

export interface SecurityMetrics {
  securityScore: number
  codeQualityScore: number
  vulnerabilityDensity: number
  meanTimeToRemediate: number
  criticalVulnerabilityAge: number
  testCoverage: number
  falsePositiveRate: number
}

export interface SecurityTrends {
  scoreHistory: ScoreDataPoint[]
  vulnerabilityTrend: TrendDataPoint[]
  remediationRate: TrendDataPoint[]
  testExecutionRate: TrendDataPoint[]
}

export interface ScoreDataPoint {
  date: Date
  score: number
  category: string
}

export interface TrendDataPoint {
  date: Date
  value: number
  label: string
}

export interface ComplianceStatus {
  pciDss: boolean
  gdpr: boolean
  soc2: boolean
  iso27001: boolean
  owaspTop10: {
    compliant: boolean
    issues: string[]
  }
}

/**
 * Security Testing Integration Service
 * Unified security testing and reporting
 */
export class SecurityTestingIntegrationService {
  /**
   * Run comprehensive security test suite
   */
  static async runSecurityTestSuite(suite: SecurityTestSuite): Promise<UnifiedSecurityReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    try {
      logger.info(`Running security test suite: ${suite.name}`)

      let sastResults: SASTScanResult | undefined
      let dastResults: DASTScanResult | undefined
      let pentestResults: PenTestResult | undefined
      let dependencyResults: any

      // Execute enabled tests
      for (const test of suite.tests.filter(t => t.enabled)) {
        try {
          switch (test.type) {
            case 'SAST':
              sastResults = await SASTService.runScan(test.configuration)
              break
            case 'DAST':
              dastResults = await DASTService.runScan(test.configuration)
              break
            case 'PENTEST':
              pentestResults = await PenetrationTestingService.runPenTest(test.configuration)
              break
            case 'DEPENDENCY':
              dependencyResults = await VulnerabilityService.scanDependencies()
              break
          }
        } catch (error) {
          logger.error(`Error executing ${test.type} test:`, error)
        }
      }

      const duration = Date.now() - startTime

      // Correlate findings across all tests
      const correlatedFindings = this.correlateFindings(sastResults, dastResults, pentestResults, dependencyResults)

      // Calculate unified summary
      const summary = this.calculateUnifiedSummary(sastResults, dastResults, pentestResults, dependencyResults)

      // Calculate metrics
      const metrics = this.calculateSecurityMetrics(correlatedFindings, sastResults, dastResults)

      // Get trends
      const trends = await this.getSecurityTrends()

      // Generate recommendations
      const recommendations = this.generateUnifiedRecommendations(summary, correlatedFindings)

      // Check compliance status
      const complianceStatus = this.checkComplianceStatus(correlatedFindings)

      const report: UnifiedSecurityReport = {
        reportId,
        timestamp: new Date(),
        duration,
        summary,
        sastResults,
        dastResults,
        pentestResults,
        dependencyResults,
        correlatedFindings,
        metrics,
        trends,
        recommendations,
        complianceStatus
      }

      // Log report generation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_REPORT_GENERATED',
        tableName: 'security_reports',
        recordId: reportId,
        newValues: {
          suiteName: suite.name,
          totalIssues: summary.totalIssues,
          criticalIssues: summary.criticalIssues,
          securityScore: summary.overallSecurityScore
        }
      })

      logger.info(`Security test suite completed: ${suite.name}`)
      return report
    } catch (error) {
      logger.error('Security test suite failed:', error)
      throw error
    }
  }

  /**
   * Correlate findings from multiple security tests
   */
  private static correlateFindings(
    sastResults?: SASTScanResult,
    dastResults?: DASTScanResult,
    pentestResults?: PenTestResult,
    dependencyResults?: any
  ): CorrelatedFinding[] {
    const correlatedFindings: CorrelatedFinding[] = []
    const findingMap = new Map<string, CorrelatedFinding>()

    // Process SAST findings
    if (sastResults) {
      for (const issue of sastResults.issues) {
        const key = `${issue.category}_${issue.file}_${issue.line}`
        if (!findingMap.has(key)) {
          findingMap.set(key, {
            id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: issue.title,
            severity: issue.severity,
            category: issue.category,
            sources: [{
              type: 'SAST',
              findingId: issue.id,
              timestamp: sastResults.timestamp
            }],
            affectedAssets: [issue.file],
            description: issue.description,
            impact: 'Code-level security vulnerability',
            remediation: issue.recommendation,
            confidence: issue.confidence,
            verificationStatus: 'UNVERIFIED'
          })
        } else {
          const finding = findingMap.get(key)!
          finding.sources.push({
            type: 'SAST',
            findingId: issue.id,
            timestamp: sastResults.timestamp
          })
          finding.confidence = 'HIGH' // Multiple sources increase confidence
        }
      }
    }

    // Process DAST findings
    if (dastResults) {
      for (const vuln of dastResults.vulnerabilities) {
        const key = `${vuln.category}_${vuln.url}_${vuln.type}`
        if (!findingMap.has(key)) {
          findingMap.set(key, {
            id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: vuln.title,
            severity: vuln.severity,
            category: vuln.category,
            sources: [{
              type: 'DAST',
              findingId: vuln.id,
              timestamp: dastResults.timestamp
            }],
            affectedAssets: [vuln.url],
            description: vuln.description,
            impact: 'Runtime security vulnerability',
            remediation: vuln.recommendation,
            confidence: vuln.verified ? 'HIGH' : 'MEDIUM',
            verificationStatus: vuln.verified ? 'VERIFIED' : 'UNVERIFIED'
          })
        } else {
          const finding = findingMap.get(key)!
          finding.sources.push({
            type: 'DAST',
            findingId: vuln.id,
            timestamp: dastResults.timestamp
          })
          finding.confidence = 'HIGH'
          finding.verificationStatus = 'VERIFIED'
        }
      }
    }

    // Process penetration test findings
    if (pentestResults) {
      for (const finding of pentestResults.findings) {
        const key = `${finding.category}_${finding.title}`
        if (!findingMap.has(key)) {
          findingMap.set(key, {
            id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: finding.title,
            severity: finding.severity,
            category: finding.category,
            sources: [{
              type: 'PENTEST',
              findingId: finding.id,
              timestamp: pentestResults.timestamp
            }],
            affectedAssets: finding.affectedAssets,
            description: finding.description,
            impact: finding.impact,
            remediation: finding.remediation,
            confidence: 'HIGH',
            verificationStatus: 'VERIFIED'
          })
        } else {
          const correlatedFinding = findingMap.get(key)!
          correlatedFinding.sources.push({
            type: 'PENTEST',
            findingId: finding.id,
            timestamp: pentestResults.timestamp
          })
          correlatedFinding.verificationStatus = 'VERIFIED'
        }
      }
    }

    return Array.from(findingMap.values())
  }

  /**
   * Calculate unified summary
   */
  private static calculateUnifiedSummary(
    sastResults?: SASTScanResult,
    dastResults?: DASTScanResult,
    pentestResults?: PenTestResult,
    dependencyResults?: any
  ): UnifiedSecuritySummary {
    let totalIssues = 0
    let criticalIssues = 0
    let highIssues = 0
    let mediumIssues = 0
    let lowIssues = 0
    let testsExecuted = 0
    let testsPassed = 0
    let testsFailed = 0

    if (sastResults) {
      totalIssues += sastResults.summary.totalIssues
      criticalIssues += sastResults.summary.criticalIssues
      highIssues += sastResults.summary.highIssues
      mediumIssues += sastResults.summary.mediumIssues
      lowIssues += sastResults.summary.lowIssues
      testsExecuted++
      if (sastResults.summary.criticalIssues === 0) testsPassed++
      else testsFailed++
    }

    if (dastResults) {
      totalIssues += dastResults.summary.totalVulnerabilities
      criticalIssues += dastResults.summary.criticalVulnerabilities
      highIssues += dastResults.summary.highVulnerabilities
      mediumIssues += dastResults.summary.mediumVulnerabilities
      lowIssues += dastResults.summary.lowVulnerabilities
      testsExecuted++
      if (dastResults.summary.criticalVulnerabilities === 0) testsPassed++
      else testsFailed++
    }

    if (pentestResults) {
      totalIssues += pentestResults.summary.totalFindings
      criticalIssues += pentestResults.summary.criticalFindings
      highIssues += pentestResults.summary.highFindings
      mediumIssues += pentestResults.summary.mediumFindings
      lowIssues += pentestResults.summary.lowFindings
      testsExecuted += pentestResults.summary.testCasesExecuted
      testsPassed += pentestResults.summary.testCasesPassed
      testsFailed += pentestResults.summary.testCasesFailed
    }

    if (dependencyResults?.report) {
      totalIssues += dependencyResults.report.totalVulnerabilities
      criticalIssues += dependencyResults.report.criticalCount
      highIssues += dependencyResults.report.highCount
      mediumIssues += dependencyResults.report.mediumCount
      lowIssues += dependencyResults.report.lowCount
      testsExecuted++
      if (dependencyResults.report.criticalCount === 0) testsPassed++
      else testsFailed++
    }

    // Calculate overall security score
    const overallSecurityScore = Math.max(
      0,
      100 - (criticalIssues * 20 + highIssues * 10 + mediumIssues * 5 + lowIssues * 2)
    )

    // Determine risk level
    let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    if (criticalIssues > 0) riskLevel = 'CRITICAL'
    else if (highIssues > 5) riskLevel = 'HIGH'
    else if (highIssues > 0 || mediumIssues > 10) riskLevel = 'MEDIUM'
    else riskLevel = 'LOW'

    return {
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      overallSecurityScore,
      riskLevel,
      testsExecuted,
      testsPassed,
      testsFailed
    }
  }

  /**
   * Calculate security metrics
   */
  private static calculateSecurityMetrics(
    findings: CorrelatedFinding[],
    sastResults?: SASTScanResult,
    dastResults?: DASTScanResult
  ): SecurityMetrics {
    const securityScore = Math.max(
      0,
      100 - findings.reduce((sum, f) => {
        const weights = { CRITICAL: 20, HIGH: 10, MEDIUM: 5, LOW: 2 }
        return sum + (weights[f.severity] || 0)
      }, 0)
    )

    const codeQualityScore = sastResults?.summary.codeQualityScore || 100

    const vulnerabilityDensity = sastResults
      ? sastResults.summary.totalIssues / Math.max(1, sastResults.summary.linesScanned) * 1000
      : 0

    const verifiedFindings = findings.filter(f => f.verificationStatus === 'VERIFIED').length
    const falsePositiveRate = findings.length > 0
      ? (findings.filter(f => f.verificationStatus === 'FALSE_POSITIVE').length / findings.length) * 100
      : 0

    return {
      securityScore,
      codeQualityScore,
      vulnerabilityDensity,
      meanTimeToRemediate: 0, // Would be calculated from historical data
      criticalVulnerabilityAge: 0, // Would be calculated from historical data
      testCoverage: 85, // Simplified
      falsePositiveRate
    }
  }

  /**
   * Get security trends
   */
  private static async getSecurityTrends(): Promise<SecurityTrends> {
    // In a real implementation, retrieve from historical data
    return {
      scoreHistory: [],
      vulnerabilityTrend: [],
      remediationRate: [],
      testExecutionRate: []
    }
  }

  /**
   * Generate unified recommendations
   */
  private static generateUnifiedRecommendations(
    summary: UnifiedSecuritySummary,
    findings: CorrelatedFinding[]
  ): string[] {
    const recommendations: string[] = []

    if (summary.criticalIssues > 0) {
      recommendations.push(`URGENT: Address ${summary.criticalIssues} critical security issues immediately`)
    }

    if (summary.highIssues > 0) {
      recommendations.push(`Fix ${summary.highIssues} high-severity security issues within 7 days`)
    }

    if (summary.overallSecurityScore < 50) {
      recommendations.push('Security posture is critically low - implement emergency security measures')
    } else if (summary.overallSecurityScore < 75) {
      recommendations.push('Security posture needs improvement - prioritize remediation efforts')
    }

    // Category-specific recommendations
    const categories = new Set(findings.map(f => f.category))
    if (categories.has('INJECTION')) {
      recommendations.push('Implement comprehensive input validation and parameterized queries')
    }
    if (categories.has('AUTHENTICATION')) {
      recommendations.push('Strengthen authentication mechanisms and implement MFA')
    }
    if (categories.has('CRYPTOGRAPHY')) {
      recommendations.push('Review and upgrade cryptographic implementations')
    }

    recommendations.push('Integrate automated security testing into CI/CD pipeline')
    recommendations.push('Conduct regular security training for development team')
    recommendations.push('Establish security incident response procedures')

    return recommendations
  }

  /**
   * Check compliance status
   */
  private static checkComplianceStatus(findings: CorrelatedFinding[]): ComplianceStatus {
    const criticalFindings = findings.filter(f => f.severity === 'CRITICAL')
    const highFindings = findings.filter(f => f.severity === 'HIGH')

    // Simplified compliance checks
    const pciDss = criticalFindings.length === 0 && highFindings.length < 3
    const gdpr = criticalFindings.length === 0
    const soc2 = criticalFindings.length === 0 && highFindings.length < 5
    const iso27001 = criticalFindings.length === 0

    // OWASP Top 10 compliance
    const owaspCategories = ['INJECTION', 'AUTHENTICATION', 'SENSITIVE_DATA_EXPOSURE', 'XSS', 'BROKEN_ACCESS_CONTROL']
    const owaspIssues = findings
      .filter(f => owaspCategories.includes(f.category) && (f.severity === 'CRITICAL' || f.severity === 'HIGH'))
      .map(f => f.title)

    return {
      pciDss,
      gdpr,
      soc2,
      iso27001,
      owaspTop10: {
        compliant: owaspIssues.length === 0,
        issues: owaspIssues
      }
    }
  }

  /**
   * Generate HTML report
   */
  static async generateHTMLReport(report: UnifiedSecurityReport): Promise<string> {
    // Simplified HTML report generation
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Security Test Report - ${report.reportId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; }
          .summary { background: #ecf0f1; padding: 15px; margin: 20px 0; }
          .critical { color: #e74c3c; font-weight: bold; }
          .high { color: #e67e22; font-weight: bold; }
          .medium { color: #f39c12; }
          .low { color: #3498db; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #34495e; color: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Security Test Report</h1>
          <p>Report ID: ${report.reportId}</p>
          <p>Generated: ${report.timestamp.toISOString()}</p>
        </div>
        <div class="summary">
          <h2>Executive Summary</h2>
          <p>Overall Security Score: <strong>${report.summary.overallSecurityScore}/100</strong></p>
          <p>Risk Level: <span class="${report.summary.riskLevel.toLowerCase()}">${report.summary.riskLevel}</span></p>
          <p>Total Issues: ${report.summary.totalIssues}</p>
          <p class="critical">Critical: ${report.summary.criticalIssues}</p>
          <p class="high">High: ${report.summary.highIssues}</p>
          <p class="medium">Medium: ${report.summary.mediumIssues}</p>
          <p class="low">Low: ${report.summary.lowIssues}</p>
        </div>
        <h2>Recommendations</h2>
        <ul>
          ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </body>
      </html>
    `
  }

  /**
   * Export report to JSON
   */
  static async exportReportJSON(report: UnifiedSecurityReport): Promise<string> {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Get security dashboard data
   */
  static async getSecurityDashboard(): Promise<any> {
    // In a real implementation, aggregate data from multiple sources
    return {
      currentScore: 85,
      trend: 'improving',
      recentTests: [],
      criticalIssues: 0,
      highIssues: 2,
      complianceStatus: {
        pciDss: true,
        gdpr: true,
        soc2: true
      }
    }
  }
}
