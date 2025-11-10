import { logger } from '../utils/logger'
import { prisma } from '../config/database'
import { PCIDssComplianceService } from './pciDssComplianceService'
import { GDPRComplianceService } from './gdprComplianceService'

/**
 * Compliance Reporting Service
 * Automated compliance assessment, reporting, and remediation tracking
 */

export interface ComplianceAssessment {
  assessmentId: string
  assessmentDate: Date
  standards: ComplianceStandard[]
  overallScore: number
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT'
  findings: ComplianceFinding[]
  recommendations: string[]
}

export interface ComplianceStandard {
  standardId: string
  name: string
  version: string
  score: number
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT'
  requirements: ComplianceRequirement[]
}

export interface ComplianceRequirement {
  requirementId: string
  description: string
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE'
  evidence: string[]
  lastAssessed: Date
}

export interface ComplianceFinding {
  findingId: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  description: string
  affectedSystems: string[]
  detectedAt: Date
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED'
  remediation?: RemediationPlan
}

export interface RemediationPlan {
  planId: string
  findingId: string
  description: string
  steps: RemediationStep[]
  assignedTo?: string
  dueDate: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  completedAt?: Date
}

export interface RemediationStep {
  stepId: string
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completedAt?: Date
  notes?: string
}

export interface ComplianceDashboard {
  dashboardId: string
  generatedAt: Date
  overallCompliance: {
    score: number
    status: string
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  }
  standardsCompliance: {
    pciDss: { score: number; status: string }
    gdpr: { score: number; status: string }
    iso27001: { score: number; status: string }
  }
  openFindings: {
    critical: number
    high: number
    medium: number
    low: number
  }
  remediationProgress: {
    total: number
    completed: number
    inProgress: number
    overdue: number
  }
  recentActivity: ComplianceActivity[]
}

export interface ComplianceActivity {
  activityId: string
  type: 'ASSESSMENT' | 'FINDING' | 'REMEDIATION' | 'REPORT'
  description: string
  timestamp: Date
  userId?: string
}

export interface ComplianceReport {
  reportId: string
  reportType: 'FULL' | 'SUMMARY' | 'EXECUTIVE' | 'TECHNICAL'
  generatedAt: Date
  period: {
    startDate: Date
    endDate: Date
  }
  assessment: ComplianceAssessment
  metrics: ComplianceMetrics
  trends: ComplianceTrend[]
  recommendations: string[]
}

export interface ComplianceMetrics {
  totalAssessments: number
  averageScore: number
  complianceRate: number
  findingsResolved: number
  meanTimeToRemediate: number
}

export interface ComplianceTrend {
  date: Date
  score: number
  findings: number
}

export class ComplianceReportingService {
  /**
   * Conduct comprehensive compliance assessment
   */
  static async conductAssessment(): Promise<ComplianceAssessment> {
    try {
      const assessmentId = `assessment_${Date.now()}`

      // Assess PCI DSS compliance
      const pciDssReport = await PCIDssComplianceService.generateComplianceReport()
      const pciDssStandard = this.convertPCIDssToStandard(pciDssReport)

      // Assess GDPR compliance
      const gdprReport = await GDPRComplianceService.generateComplianceReport()
      const gdprStandard = this.convertGDPRToStandard(gdprReport)

      // Assess ISO 27001 compliance (mock)
      const iso27001Standard = await this.assessISO27001()

      const standards = [pciDssStandard, gdprStandard, iso27001Standard]

      // Calculate overall score
      const overallScore = this.calculateOverallScore(standards)
      const status = this.determineComplianceStatus(overallScore)

      // Collect findings
      const findings = await this.collectFindings(standards)

      // Generate recommendations
      const recommendations = this.generateRecommendations(standards, findings)

      const assessment: ComplianceAssessment = {
        assessmentId,
        assessmentDate: new Date(),
        standards,
        overallScore,
        status,
        findings,
        recommendations
      }

      // Store assessment
      await this.storeAssessment(assessment)

      logger.info(`Compliance assessment completed: ${assessmentId}`)

      return assessment
    } catch (error) {
      logger.error('Conduct assessment error:', error)
      throw new Error('Failed to conduct compliance assessment')
    }
  }

  /**
   * Generate automated compliance report
   */
  static async generateReport(
    reportType: 'FULL' | 'SUMMARY' | 'EXECUTIVE' | 'TECHNICAL' = 'FULL',
    startDate?: Date,
    endDate?: Date
  ): Promise<ComplianceReport> {
    try {
      const reportId = `report_${Date.now()}`
      const period = {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date()
      }

      // Get latest assessment
      const assessment = await this.conductAssessment()

      // Calculate metrics
      const metrics = await this.calculateMetrics(period)

      // Get trends
      const trends = await this.getComplianceTrends(period)

      // Generate recommendations
      const recommendations = this.generateReportRecommendations(assessment, metrics, trends)

      const report: ComplianceReport = {
        reportId,
        reportType,
        generatedAt: new Date(),
        period,
        assessment,
        metrics,
        trends,
        recommendations
      }

      // Store report
      await this.storeReport(report)

      logger.info(`Compliance report generated: ${reportId}`)

      return report
    } catch (error) {
      logger.error('Generate report error:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  /**
   * Get compliance dashboard
   */
  static async getComplianceDashboard(): Promise<ComplianceDashboard> {
    try {
      const dashboardId = `dashboard_${Date.now()}`

      // Get latest assessment
      const latestAssessment = await this.getLatestAssessment()

      // Calculate overall compliance
      const overallCompliance = {
        score: latestAssessment?.overallScore || 0,
        status: latestAssessment?.status || 'UNKNOWN',
        trend: await this.calculateTrend()
      }

      // Get standards compliance
      const standardsCompliance = {
        pciDss: this.getStandardScore(latestAssessment, 'PCI_DSS'),
        gdpr: this.getStandardScore(latestAssessment, 'GDPR'),
        iso27001: this.getStandardScore(latestAssessment, 'ISO_27001')
      }

      // Count open findings
      const openFindings = await this.countOpenFindings()

      // Get remediation progress
      const remediationProgress = await this.getRemediationProgress()

      // Get recent activity
      const recentActivity = await this.getRecentActivity(10)

      const dashboard: ComplianceDashboard = {
        dashboardId,
        generatedAt: new Date(),
        overallCompliance,
        standardsCompliance,
        openFindings,
        remediationProgress,
        recentActivity
      }

      logger.info(`Compliance dashboard generated: ${dashboardId}`)

      return dashboard
    } catch (error) {
      logger.error('Get compliance dashboard error:', error)
      throw new Error('Failed to generate compliance dashboard')
    }
  }

  /**
   * Track remediation progress
   */
  static async trackRemediation(findingId: string): Promise<RemediationPlan | null> {
    try {
      const remediation = await this.getRemediationPlan(findingId)

      if (!remediation) {
        return null
      }

      // Update status based on steps
      const completedSteps = remediation.steps.filter(s => s.status === 'COMPLETED').length
      const totalSteps = remediation.steps.length

      if (completedSteps === totalSteps) {
        remediation.status = 'COMPLETED'
        remediation.completedAt = new Date()
      } else if (completedSteps > 0) {
        remediation.status = 'IN_PROGRESS'
      }

      // Check if overdue
      if (remediation.dueDate < new Date() && remediation.status !== 'COMPLETED') {
        remediation.status = 'OVERDUE'
      }

      // Update remediation plan
      await this.updateRemediationPlan(remediation)

      return remediation
    } catch (error) {
      logger.error('Track remediation error:', error)
      throw new Error('Failed to track remediation')
    }
  }

  /**
   * Create remediation plan
   */
  static async createRemediationPlan(
    findingId: string,
    description: string,
    steps: Omit<RemediationStep, 'stepId' | 'status' | 'completedAt'>[],
    assignedTo?: string,
    dueDate?: Date
  ): Promise<RemediationPlan> {
    try {
      const planId = `plan_${Date.now()}`

      const remediationSteps: RemediationStep[] = steps.map((step, index) => ({
        stepId: `step_${index + 1}`,
        description: step.description,
        status: 'PENDING',
        notes: step.notes
      }))

      const plan: RemediationPlan = {
        planId,
        findingId,
        description,
        steps: remediationSteps,
        assignedTo,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'PENDING'
      }

      // Store remediation plan
      await this.storeRemediationPlan(plan)

      // Log activity
      await this.logActivity({
        type: 'REMEDIATION',
        description: `Remediation plan created for finding ${findingId}`,
        userId: assignedTo
      })

      logger.info(`Remediation plan created: ${planId}`)

      return plan
    } catch (error) {
      logger.error('Create remediation plan error:', error)
      throw new Error('Failed to create remediation plan')
    }
  }

  // Private helper methods

  private static convertPCIDssToStandard(report: any): ComplianceStandard {
    return {
      standardId: 'PCI_DSS',
      name: 'PCI DSS',
      version: '4.0',
      score: report.complianceScore,
      status: report.complianceScore >= 80 ? 'COMPLIANT' : 'NON_COMPLIANT',
      requirements: report.requirements.map((req: any) => ({
        requirementId: req.requirementId,
        description: req.description,
        status: req.status === 'compliant' ? 'COMPLIANT' : 'NON_COMPLIANT',
        evidence: req.evidence || [],
        lastAssessed: new Date()
      }))
    }
  }

  private static convertGDPRToStandard(report: any): ComplianceStandard {
    const score = report.consentCompliance.complianceRate

    return {
      standardId: 'GDPR',
      name: 'GDPR',
      version: '2016/679',
      score,
      status: score >= 80 ? 'COMPLIANT' : 'PARTIALLY_COMPLIANT',
      requirements: [
        {
          requirementId: 'GDPR_CONSENT',
          description: 'Consent management',
          status: score >= 80 ? 'COMPLIANT' : 'NON_COMPLIANT',
          evidence: [`${report.consentCompliance.usersWithConsent} users with consent`],
          lastAssessed: new Date()
        }
      ]
    }
  }

  private static async assessISO27001(): Promise<ComplianceStandard> {
    // Mock ISO 27001 assessment
    return {
      standardId: 'ISO_27001',
      name: 'ISO 27001',
      version: '2013',
      score: 85,
      status: 'COMPLIANT',
      requirements: [
        {
          requirementId: 'ISO_5',
          description: 'Information security policies',
          status: 'COMPLIANT',
          evidence: ['Security policy documented'],
          lastAssessed: new Date()
        }
      ]
    }
  }

  private static calculateOverallScore(standards: ComplianceStandard[]): number {
    const totalScore = standards.reduce((sum, std) => sum + std.score, 0)
    return Math.round(totalScore / standards.length)
  }

  private static determineComplianceStatus(score: number): 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' {
    if (score >= 90) return 'COMPLIANT'
    if (score >= 70) return 'PARTIALLY_COMPLIANT'
    return 'NON_COMPLIANT'
  }

  private static async collectFindings(standards: ComplianceStandard[]): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = []

    for (const standard of standards) {
      const nonCompliantReqs = standard.requirements.filter(r => r.status === 'NON_COMPLIANT')

      for (const req of nonCompliantReqs) {
        findings.push({
          findingId: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          severity: 'HIGH',
          category: standard.name,
          description: `Non-compliant with ${req.requirementId}: ${req.description}`,
          affectedSystems: ['POS_SYSTEM'],
          detectedAt: new Date(),
          status: 'OPEN'
        })
      }
    }

    return findings
  }

  private static generateRecommendations(standards: ComplianceStandard[], findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = []

    if (findings.length > 0) {
      recommendations.push(`Address ${findings.length} compliance findings`)
    }

    const lowScoreStandards = standards.filter(s => s.score < 80)
    if (lowScoreStandards.length > 0) {
      recommendations.push(`Improve compliance for: ${lowScoreStandards.map(s => s.name).join(', ')}`)
    }

    recommendations.push('Conduct regular compliance assessments')
    recommendations.push('Implement continuous compliance monitoring')
    recommendations.push('Provide compliance training to staff')

    return recommendations
  }

  private static async calculateMetrics(period: { startDate: Date; endDate: Date }): Promise<ComplianceMetrics> {
    // Mock metrics calculation
    return {
      totalAssessments: 12,
      averageScore: 85,
      complianceRate: 92,
      findingsResolved: 45,
      meanTimeToRemediate: 7 // days
    }
  }

  private static async getComplianceTrends(period: { startDate: Date; endDate: Date }): Promise<ComplianceTrend[]> {
    // Mock trends data
    const trends: ComplianceTrend[] = []
    const days = Math.floor((period.endDate.getTime() - period.startDate.getTime()) / (24 * 60 * 60 * 1000))

    for (let i = 0; i <= days; i += 7) {
      trends.push({
        date: new Date(period.startDate.getTime() + i * 24 * 60 * 60 * 1000),
        score: 80 + Math.random() * 15,
        findings: Math.floor(Math.random() * 10)
      })
    }

    return trends
  }

  private static generateReportRecommendations(
    assessment: ComplianceAssessment,
    metrics: ComplianceMetrics,
    trends: ComplianceTrend[]
  ): string[] {
    const recommendations = [...assessment.recommendations]

    if (metrics.meanTimeToRemediate > 14) {
      recommendations.push('Reduce mean time to remediate findings')
    }

    if (trends.length > 1) {
      const latestScore = trends[trends.length - 1].score
      const previousScore = trends[trends.length - 2].score
      
      if (latestScore < previousScore) {
        recommendations.push('Compliance score is declining - investigate root causes')
      }
    }

    return recommendations
  }

  private static async storeAssessment(assessment: ComplianceAssessment): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'COMPLIANCE_ASSESSMENT',
        tableName: 'COMPLIANCE',
        recordId: assessment.assessmentId,
        newValues: assessment,
        userId: 'SYSTEM'
      }
    })
  }

  private static async storeReport(report: ComplianceReport): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'COMPLIANCE_REPORT',
        tableName: 'COMPLIANCE',
        recordId: report.reportId,
        newValues: report,
        userId: 'SYSTEM'
      }
    })
  }

  private static async getLatestAssessment(): Promise<ComplianceAssessment | null> {
    const log = await prisma.auditLog.findFirst({
      where: { action: 'COMPLIANCE_ASSESSMENT' },
      orderBy: { createdAt: 'desc' }
    })

    return log ? (log.newValues as any) : null
  }

  private static async calculateTrend(): Promise<'IMPROVING' | 'STABLE' | 'DECLINING'> {
    // Mock trend calculation
    return 'IMPROVING'
  }

  private static getStandardScore(assessment: ComplianceAssessment | null, standardId: string): { score: number; status: string } {
    if (!assessment) {
      return { score: 0, status: 'UNKNOWN' }
    }

    const standard = assessment.standards.find(s => s.standardId === standardId)
    return {
      score: standard?.score || 0,
      status: standard?.status || 'UNKNOWN'
    }
  }

  private static async countOpenFindings(): Promise<{ critical: number; high: number; medium: number; low: number }> {
    // Mock findings count
    return {
      critical: 2,
      high: 5,
      medium: 12,
      low: 8
    }
  }

  private static async getRemediationProgress(): Promise<{ total: number; completed: number; inProgress: number; overdue: number }> {
    // Mock remediation progress
    return {
      total: 27,
      completed: 15,
      inProgress: 8,
      overdue: 4
    }
  }

  private static async getRecentActivity(limit: number): Promise<ComplianceActivity[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['COMPLIANCE_ASSESSMENT', 'COMPLIANCE_REPORT', 'COMPLIANCE_REMEDIATION']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return logs.map(log => ({
      activityId: log.id,
      type: log.action.includes('ASSESSMENT') ? 'ASSESSMENT' : 
            log.action.includes('REPORT') ? 'REPORT' : 'REMEDIATION',
      description: log.action,
      timestamp: log.createdAt,
      userId: log.userId
    }))
  }

  private static async getRemediationPlan(findingId: string): Promise<RemediationPlan | null> {
    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'COMPLIANCE_REMEDIATION',
        newValues: {
          path: ['findingId'],
          equals: findingId
        }
      }
    })

    return log ? (log.newValues as any) : null
  }

  private static async updateRemediationPlan(plan: RemediationPlan): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'COMPLIANCE_REMEDIATION',
        tableName: 'REMEDIATION',
        recordId: plan.planId,
        newValues: plan,
        userId: plan.assignedTo || 'SYSTEM'
      }
    })
  }

  private static async storeRemediationPlan(plan: RemediationPlan): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'COMPLIANCE_REMEDIATION',
        tableName: 'REMEDIATION',
        recordId: plan.planId,
        newValues: plan,
        userId: plan.assignedTo || 'SYSTEM'
      }
    })
  }

  private static async logActivity(activity: Omit<ComplianceActivity, 'activityId' | 'timestamp'>): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: `COMPLIANCE_${activity.type}`,
        tableName: 'COMPLIANCE',
        recordId: `activity_${Date.now()}`,
        newValues: activity,
        userId: activity.userId || 'SYSTEM'
      }
    })
  }
}
