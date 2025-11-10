import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface ComplianceStandard {
  id: string
  name: string
  version: string
  description: string
  requirements: ComplianceRequirement[]
  applicableRegions: string[]
  effectiveDate: Date
  expirationDate?: Date
  status: StandardStatus
}

export interface ComplianceRequirement {
  id: string
  standardId: string
  category: RequirementCategory
  title: string
  description: string
  mandatoryControls: string[]
  optionalControls: string[]
  testProcedures: string[]
  evidenceRequired: string[]
  severity: RequirementSeverity
  automatedCheck: boolean
}

export interface ComplianceAssessment {
  id: string
  standardId: string
  assessmentDate: Date
  assessedBy: string
  overallScore: number
  maxScore: number
  compliancePercentage: number
  status: AssessmentStatus
  findings: ComplianceFinding[]
  recommendations: string[]
  nextAssessmentDate: Date
  evidence: ComplianceEvidence[]
}

export interface ComplianceFinding {
  id: string
  requirementId: string
  category: RequirementCategory
  severity: RequirementSeverity
  title: string
  description: string
  currentState: string
  requiredState: string
  gap: string
  remediation: string
  priority: FindingPriority
  status: FindingStatus
  assignedTo?: string
  dueDate?: Date
  resolvedDate?: Date
  evidence?: string[]
}

export interface ComplianceEvidence {
  id: string
  type: EvidenceType
  title: string
  description: string
  filePath?: string
  content?: string
  collectedAt: Date
  collectedBy: string
  validUntil?: Date
  tags: string[]
  metadata: any
}

export interface EncryptionAuditLog {
  id: string
  timestamp: Date
  eventType: AuditEventType
  userId: string
  ipAddress: string
  userAgent: string
  resource: string
  action: string
  details: any
  success: boolean
  errorMessage?: string
  riskLevel: RiskLevel
  complianceImpact: ComplianceImpact
}

export interface KeyUsageMetrics {
  keyId: string
  keyType: string
  algorithm: string
  totalOperations: number
  operationsByType: Record<string, number>
  operationsByUser: Record<string, number>
  operationsByTimeRange: Record<string, number>
  averageOperationTime: number
  errorRate: number
  lastUsed: Date
  complianceScore: number
  violations: string[]
}

export interface EncryptionPerformanceMetrics {
  timestamp: Date
  operationType: string
  algorithm: string
  keySize: number
  dataSize: number
  operationTime: number
  cpuUsage: number
  memoryUsage: number
  throughput: number
  success: boolean
  errorType?: string
}

export interface ComplianceReport {
  id: string
  reportType: ReportType
  standardId: string
  generatedAt: Date
  generatedBy: string
  reportPeriod: {
    start: Date
    end: Date
  }
  summary: ComplianceSummary
  detailedFindings: ComplianceFinding[]
  recommendations: string[]
  actionPlan: ActionItem[]
  attachments: string[]
}

export interface ComplianceSummary {
  totalRequirements: number
  compliantRequirements: number
  nonCompliantRequirements: number
  partiallyCompliantRequirements: number
  overallComplianceScore: number
  riskScore: number
  criticalFindings: number
  highFindings: number
  mediumFindings: number
  lowFindings: number
}

export interface ActionItem {
  id: string
  title: string
  description: string
  priority: FindingPriority
  assignedTo: string
  dueDate: Date
  status: ActionStatus
  estimatedEffort: string
  dependencies: string[]
  progress: number
}

export enum StandardStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  DEPRECATED = 'DEPRECATED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum RequirementCategory {
  ENCRYPTION_ALGORITHMS = 'ENCRYPTION_ALGORITHMS',
  KEY_MANAGEMENT = 'KEY_MANAGEMENT',
  DATA_PROTECTION = 'DATA_PROTECTION',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  AUDIT_LOGGING = 'AUDIT_LOGGING',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
  COMPLIANCE_MONITORING = 'COMPLIANCE_MONITORING'
}

export enum RequirementSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFORMATIONAL = 'INFORMATIONAL'
}

export enum AssessmentStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum FindingPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum FindingStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ACCEPTED_RISK = 'ACCEPTED_RISK',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}

export enum EvidenceType {
  CONFIGURATION = 'CONFIGURATION',
  LOG_FILE = 'LOG_FILE',
  SCREENSHOT = 'SCREENSHOT',
  DOCUMENT = 'DOCUMENT',
  TEST_RESULT = 'TEST_RESULT',
  CERTIFICATE = 'CERTIFICATE',
  POLICY = 'POLICY'
}

export enum AuditEventType {
  KEY_GENERATION = 'KEY_GENERATION',
  KEY_ACCESS = 'KEY_ACCESS',
  KEY_ROTATION = 'KEY_ROTATION',
  KEY_REVOCATION = 'KEY_REVOCATION',
  ENCRYPTION_OPERATION = 'ENCRYPTION_OPERATION',
  DECRYPTION_OPERATION = 'DECRYPTION_OPERATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  POLICY_VIOLATION = 'POLICY_VIOLATION'
}

export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFORMATIONAL = 'INFORMATIONAL'
}

export enum ComplianceImpact {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE'
}

export enum ReportType {
  COMPLIANCE_ASSESSMENT = 'COMPLIANCE_ASSESSMENT',
  AUDIT_SUMMARY = 'AUDIT_SUMMARY',
  KEY_USAGE_REPORT = 'KEY_USAGE_REPORT',
  PERFORMANCE_REPORT = 'PERFORMANCE_REPORT',
  VIOLATION_REPORT = 'VIOLATION_REPORT'
}

export enum ActionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

/**
 * Encryption Compliance Service
 * Handles encryption compliance validation, audit logging, key usage tracking,
 * and performance monitoring for regulatory compliance
 */
export class EncryptionComplianceService {
  private static readonly COMPLIANCE_STORAGE_PATH = path.join(process.cwd(), 'server', 'compliance')
  private static readonly AUDIT_LOG_FILE = 'encryption-audit.log'
  private static readonly PERFORMANCE_LOG_FILE = 'encryption-performance.log'
  
  // In-memory caches
  private static complianceStandards = new Map<string, ComplianceStandard>()
  private static assessments = new Map<string, ComplianceAssessment>()
  private static auditLogBuffer: EncryptionAuditLog[] = []
  private static performanceMetricsBuffer: EncryptionPerformanceMetrics[] = []
  private static keyUsageMetrics = new Map<string, KeyUsageMetrics>()

  /**
   * Initialize encryption compliance service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Encryption Compliance Service...')
      
      // Create compliance storage directory
      await fs.mkdir(this.COMPLIANCE_STORAGE_PATH, { recursive: true })
      
      // Load compliance standards
      await this.loadComplianceStandards()
      
      // Load assessments
      await this.loadAssessments()
      
      // Initialize default compliance standards
      await this.initializeDefaultStandards()
      
      // Start audit log flusher
      this.startAuditLogFlusher()
      
      // Start performance metrics collector
      this.startPerformanceMetricsCollector()
      
      // Start compliance monitoring
      this.startComplianceMonitoring()
      
      logger.info('Encryption Compliance Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Encryption Compliance Service:', error)
      throw error
    }
  }

  /**
   * Create compliance standard
   */
  static async createComplianceStandard(standard: ComplianceStandard): Promise<void> {
    try {
      // Validate standard
      this.validateComplianceStandard(standard)
      
      // Store standard
      this.complianceStandards.set(standard.id, standard)
      await this.saveComplianceStandard(standard)
      
      // Log standard creation
      await this.logAuditEvent({
        eventType: AuditEventType.CONFIGURATION_CHANGE,
        userId: 'system',
        ipAddress: 'system',
        userAgent: 'EncryptionComplianceService',
        resource: 'compliance_standard',
        action: 'CREATE',
        details: {
          standardId: standard.id,
          name: standard.name,
          version: standard.version,
          requirementCount: standard.requirements.length
        },
        success: true,
        riskLevel: RiskLevel.MEDIUM,
        complianceImpact: ComplianceImpact.HIGH
      })
      
      logger.info(`Created compliance standard: ${standard.id} (${standard.name})`)
    } catch (error) {
      logger.error('Failed to create compliance standard:', error)
      throw error
    }
  }

  /**
   * Conduct compliance assessment
   */
  static async conductComplianceAssessment(
    standardId: string,
    assessedBy: string
  ): Promise<ComplianceAssessment> {
    try {
      const standard = this.complianceStandards.get(standardId)
      if (!standard) {
        throw new Error(`Compliance standard not found: ${standardId}`)
      }
      
      const assessmentId = `assessment_${standardId}_${Date.now()}`
      const findings: ComplianceFinding[] = []
      let totalScore = 0
      let maxScore = 0
      
      // Assess each requirement
      for (const requirement of standard.requirements) {
        const finding = await this.assessRequirement(requirement)
        findings.push(finding)
        
        // Calculate scores
        const requirementScore = this.calculateRequirementScore(finding)
        totalScore += requirementScore.actual
        maxScore += requirementScore.maximum
      }
      
      // Create assessment
      const assessment: ComplianceAssessment = {
        id: assessmentId,
        standardId,
        assessmentDate: new Date(),
        assessedBy,
        overallScore: totalScore,
        maxScore,
        compliancePercentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
        status: AssessmentStatus.COMPLETED,
        findings,
        recommendations: this.generateRecommendations(findings),
        nextAssessmentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        evidence: []
      }
      
      // Store assessment
      this.assessments.set(assessmentId, assessment)
      await this.saveAssessment(assessment)
      
      // Log assessment
      await this.logAuditEvent({
        eventType: AuditEventType.COMPLIANCE_CHECK,
        userId: assessedBy,
        ipAddress: 'system',
        userAgent: 'EncryptionComplianceService',
        resource: 'compliance_assessment',
        action: 'CONDUCT',
        details: {
          assessmentId,
          standardId,
          overallScore: totalScore,
          maxScore,
          compliancePercentage: assessment.compliancePercentage,
          findingCount: findings.length
        },
        success: true,
        riskLevel: assessment.compliancePercentage < 80 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        complianceImpact: ComplianceImpact.HIGH
      })
      
      logger.info(`Completed compliance assessment: ${assessmentId} (${assessment.compliancePercentage.toFixed(2)}% compliant)`)
      return assessment
    } catch (error) {
      logger.error('Failed to conduct compliance assessment:', error)
      throw error
    }
  }

  /**
   * Log encryption audit event
   */
  static async logAuditEvent(event: Omit<EncryptionAuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEvent: EncryptionAuditLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        ...event
      }
      
      // Add to buffer
      this.auditLogBuffer.push(auditEvent)
      
      // Flush if buffer is full
      if (this.auditLogBuffer.length >= 100) {
        await this.flushAuditLogBuffer()
      }
      
      // Check for policy violations
      await this.checkPolicyViolations(auditEvent)
    } catch (error) {
      logger.error('Failed to log audit event:', error)
    }
  }

  /**
   * Track key usage metrics
   */
  static async trackKeyUsage(
    keyId: string,
    keyType: string,
    algorithm: string,
    operation: string,
    userId: string,
    operationTime: number,
    success: boolean
  ): Promise<void> {
    try {
      let metrics = this.keyUsageMetrics.get(keyId)
      
      if (!metrics) {
        metrics = {
          keyId,
          keyType,
          algorithm,
          totalOperations: 0,
          operationsByType: {},
          operationsByUser: {},
          operationsByTimeRange: {},
          averageOperationTime: 0,
          errorRate: 0,
          lastUsed: new Date(),
          complianceScore: 100,
          violations: []
        }
        this.keyUsageMetrics.set(keyId, metrics)
      }
      
      // Update metrics
      metrics.totalOperations++
      metrics.operationsByType[operation] = (metrics.operationsByType[operation] || 0) + 1
      metrics.operationsByUser[userId] = (metrics.operationsByUser[userId] || 0) + 1
      
      // Update time range (hourly buckets)
      const timeRange = new Date().toISOString().substring(0, 13) + ':00:00.000Z'
      metrics.operationsByTimeRange[timeRange] = (metrics.operationsByTimeRange[timeRange] || 0) + 1
      
      // Update average operation time
      metrics.averageOperationTime = (
        (metrics.averageOperationTime * (metrics.totalOperations - 1) + operationTime) / 
        metrics.totalOperations
      )
      
      // Update error rate
      if (!success) {
        const errorCount = Object.values(metrics.operationsByType).reduce((sum, count) => sum + count, 0) - 
                          metrics.totalOperations + 1
        metrics.errorRate = (errorCount / metrics.totalOperations) * 100
      }
      
      metrics.lastUsed = new Date()
      
      // Check compliance violations
      await this.checkKeyUsageCompliance(metrics)
    } catch (error) {
      logger.error('Failed to track key usage:', error)
    }
  }

  /**
   * Record performance metrics
   */
  static async recordPerformanceMetrics(metrics: Omit<EncryptionPerformanceMetrics, 'timestamp'>): Promise<void> {
    try {
      const performanceMetrics: EncryptionPerformanceMetrics = {
        timestamp: new Date(),
        ...metrics
      }
      
      // Add to buffer
      this.performanceMetricsBuffer.push(performanceMetrics)
      
      // Flush if buffer is full
      if (this.performanceMetricsBuffer.length >= 1000) {
        await this.flushPerformanceMetricsBuffer()
      }
      
      // Check performance thresholds
      await this.checkPerformanceThresholds(performanceMetrics)
    } catch (error) {
      logger.error('Failed to record performance metrics:', error)
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    reportType: ReportType,
    standardId: string,
    reportPeriod: { start: Date; end: Date },
    generatedBy: string
  ): Promise<ComplianceReport> {
    try {
      const reportId = `report_${reportType}_${standardId}_${Date.now()}`
      
      // Get relevant assessments
      const assessments = Array.from(this.assessments.values())
        .filter(a => a.standardId === standardId)
        .filter(a => a.assessmentDate >= reportPeriod.start && a.assessmentDate <= reportPeriod.end)
      
      // Generate summary
      const summary = this.generateComplianceSummary(assessments)
      
      // Collect detailed findings
      const detailedFindings = assessments.flatMap(a => a.findings)
      
      // Generate recommendations
      const recommendations = this.generateReportRecommendations(detailedFindings)
      
      // Create action plan
      const actionPlan = this.generateActionPlan(detailedFindings)
      
      const report: ComplianceReport = {
        id: reportId,
        reportType,
        standardId,
        generatedAt: new Date(),
        generatedBy,
        reportPeriod,
        summary,
        detailedFindings,
        recommendations,
        actionPlan,
        attachments: []
      }
      
      // Save report
      await this.saveComplianceReport(report)
      
      // Log report generation
      await this.logAuditEvent({
        eventType: AuditEventType.COMPLIANCE_CHECK,
        userId: generatedBy,
        ipAddress: 'system',
        userAgent: 'EncryptionComplianceService',
        resource: 'compliance_report',
        action: 'GENERATE',
        details: {
          reportId,
          reportType,
          standardId,
          assessmentCount: assessments.length,
          findingCount: detailedFindings.length
        },
        success: true,
        riskLevel: summary.riskScore > 70 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        complianceImpact: ComplianceImpact.HIGH
      })
      
      logger.info(`Generated compliance report: ${reportId}`)
      return report
    } catch (error) {
      logger.error('Failed to generate compliance report:', error)
      throw error
    }
  }  /**
 
  * Get compliance standards
   */
  static getComplianceStandards(): ComplianceStandard[] {
    return Array.from(this.complianceStandards.values())
  }

  /**
   * Get compliance assessment
   */
  static getComplianceAssessment(assessmentId: string): ComplianceAssessment | null {
    return this.assessments.get(assessmentId) || null
  }

  /**
   * List compliance assessments
   */
  static listComplianceAssessments(filters?: {
    standardId?: string
    status?: AssessmentStatus
    assessedBy?: string
    dateRange?: { start: Date; end: Date }
  }): ComplianceAssessment[] {
    let assessments = Array.from(this.assessments.values())
    
    if (filters) {
      if (filters.standardId) {
        assessments = assessments.filter(a => a.standardId === filters.standardId)
      }
      if (filters.status) {
        assessments = assessments.filter(a => a.status === filters.status)
      }
      if (filters.assessedBy) {
        assessments = assessments.filter(a => a.assessedBy === filters.assessedBy)
      }
      if (filters.dateRange) {
        assessments = assessments.filter(a => 
          a.assessmentDate >= filters.dateRange!.start && 
          a.assessmentDate <= filters.dateRange!.end
        )
      }
    }
    
    return assessments.sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())
  }

  /**
   * Get key usage metrics
   */
  static getKeyUsageMetrics(keyId?: string): KeyUsageMetrics[] {
    if (keyId) {
      const metrics = this.keyUsageMetrics.get(keyId)
      return metrics ? [metrics] : []
    }
    
    return Array.from(this.keyUsageMetrics.values())
  }

  /**
   * Get performance metrics summary
   */
  static async getPerformanceMetricsSummary(
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalOperations: number
    averageOperationTime: number
    throughputPerSecond: number
    errorRate: number
    algorithmDistribution: Record<string, number>
    operationTypeDistribution: Record<string, number>
    performanceTrends: Array<{ timestamp: Date; averageTime: number; throughput: number }>
  }> {
    try {
      // In a real implementation, this would query the performance metrics database
      // For now, return mock summary data
      return {
        totalOperations: 10000,
        averageOperationTime: 15.5, // milliseconds
        throughputPerSecond: 650,
        errorRate: 0.02, // 0.02%
        algorithmDistribution: {
          'AES-256-GCM': 7000,
          'RSA-2048': 2000,
          'ECDSA-P256': 1000
        },
        operationTypeDistribution: {
          'ENCRYPT': 5000,
          'DECRYPT': 4500,
          'SIGN': 300,
          'VERIFY': 200
        },
        performanceTrends: [
          { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), averageTime: 16.2, throughput: 620 },
          { timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), averageTime: 15.8, throughput: 635 },
          { timestamp: new Date(), averageTime: 15.5, throughput: 650 }
        ]
      }
    } catch (error) {
      logger.error('Failed to get performance metrics summary:', error)
      throw error
    }
  }

  /**
   * Validate compliance standard
   */
  private static validateComplianceStandard(standard: ComplianceStandard): void {
    if (!standard.id || !standard.name || !standard.version) {
      throw new Error('Standard ID, name, and version are required')
    }
    
    if (standard.requirements.length === 0) {
      throw new Error('Standard must have at least one requirement')
    }
    
    // Validate requirements
    for (const requirement of standard.requirements) {
      if (!requirement.id || !requirement.title || !requirement.description) {
        throw new Error('Requirement ID, title, and description are required')
      }
    }
  }

  /**
   * Assess individual requirement
   */
  private static async assessRequirement(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    try {
      // This is a simplified assessment - in reality, this would involve
      // complex checks against system configuration, policies, and evidence
      
      const findingId = `finding_${requirement.id}_${Date.now()}`
      let status: FindingStatus = FindingStatus.OPEN
      let gap = ''
      let remediation = ''
      
      // Simulate assessment logic based on requirement category
      switch (requirement.category) {
        case RequirementCategory.ENCRYPTION_ALGORITHMS:
          // Check if approved algorithms are being used
          const approvedAlgorithms = ['AES-256-GCM', 'RSA-2048', 'ECDSA-P256']
          const currentAlgorithms = this.getCurrentEncryptionAlgorithms()
          const unapprovedAlgorithms = currentAlgorithms.filter(alg => !approvedAlgorithms.includes(alg))
          
          if (unapprovedAlgorithms.length === 0) {
            status = FindingStatus.RESOLVED
          } else {
            gap = `Unapproved algorithms in use: ${unapprovedAlgorithms.join(', ')}`
            remediation = 'Replace unapproved algorithms with approved alternatives'
          }
          break
          
        case RequirementCategory.KEY_MANAGEMENT:
          // Check key management practices
          const keyRotationCompliance = await this.checkKeyRotationCompliance()
          if (keyRotationCompliance.compliant) {
            status = FindingStatus.RESOLVED
          } else {
            gap = keyRotationCompliance.issues.join('; ')
            remediation = 'Implement automated key rotation for all encryption keys'
          }
          break
          
        case RequirementCategory.AUDIT_LOGGING:
          // Check audit logging completeness
          const auditCompliance = await this.checkAuditLoggingCompliance()
          if (auditCompliance.compliant) {
            status = FindingStatus.RESOLVED
          } else {
            gap = auditCompliance.issues.join('; ')
            remediation = 'Enable comprehensive audit logging for all encryption operations'
          }
          break
          
        default:
          // Default to compliant for other categories
          status = FindingStatus.RESOLVED
      }
      
      return {
        id: findingId,
        requirementId: requirement.id,
        category: requirement.category,
        severity: requirement.severity,
        title: requirement.title,
        description: requirement.description,
        currentState: 'Current implementation state',
        requiredState: 'Required compliant state',
        gap,
        remediation,
        priority: this.mapSeverityToPriority(requirement.severity),
        status
      }
    } catch (error) {
      logger.error('Failed to assess requirement:', error)
      throw error
    }
  }

  /**
   * Calculate requirement score
   */
  private static calculateRequirementScore(finding: ComplianceFinding): { actual: number; maximum: number } {
    const maxScore = this.getMaxScoreForSeverity(finding.severity)
    
    let actualScore = 0
    switch (finding.status) {
      case FindingStatus.RESOLVED:
        actualScore = maxScore
        break
      case FindingStatus.IN_PROGRESS:
        actualScore = maxScore * 0.5
        break
      case FindingStatus.ACCEPTED_RISK:
        actualScore = maxScore * 0.7
        break
      default:
        actualScore = 0
    }
    
    return { actual: actualScore, maximum: maxScore }
  }

  /**
   * Get maximum score for severity
   */
  private static getMaxScoreForSeverity(severity: RequirementSeverity): number {
    switch (severity) {
      case RequirementSeverity.CRITICAL:
        return 100
      case RequirementSeverity.HIGH:
        return 75
      case RequirementSeverity.MEDIUM:
        return 50
      case RequirementSeverity.LOW:
        return 25
      case RequirementSeverity.INFORMATIONAL:
        return 10
      default:
        return 50
    }
  }

  /**
   * Map severity to priority
   */
  private static mapSeverityToPriority(severity: RequirementSeverity): FindingPriority {
    switch (severity) {
      case RequirementSeverity.CRITICAL:
        return FindingPriority.CRITICAL
      case RequirementSeverity.HIGH:
        return FindingPriority.HIGH
      case RequirementSeverity.MEDIUM:
        return FindingPriority.MEDIUM
      default:
        return FindingPriority.LOW
    }
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = []
    
    const criticalFindings = findings.filter(f => f.priority === FindingPriority.CRITICAL && f.status === FindingStatus.OPEN)
    const highFindings = findings.filter(f => f.priority === FindingPriority.HIGH && f.status === FindingStatus.OPEN)
    
    if (criticalFindings.length > 0) {
      recommendations.push(`Address ${criticalFindings.length} critical compliance findings immediately`)
    }
    
    if (highFindings.length > 0) {
      recommendations.push(`Prioritize resolution of ${highFindings.length} high-priority findings`)
    }
    
    // Category-specific recommendations
    const keyMgmtFindings = findings.filter(f => f.category === RequirementCategory.KEY_MANAGEMENT && f.status === FindingStatus.OPEN)
    if (keyMgmtFindings.length > 0) {
      recommendations.push('Implement comprehensive key lifecycle management')
    }
    
    const auditFindings = findings.filter(f => f.category === RequirementCategory.AUDIT_LOGGING && f.status === FindingStatus.OPEN)
    if (auditFindings.length > 0) {
      recommendations.push('Enhance audit logging and monitoring capabilities')
    }
    
    return recommendations
  }

  /**
   * Generate report recommendations
   */
  private static generateReportRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations = this.generateRecommendations(findings)
    
    // Add performance-based recommendations
    const avgPerformance = this.calculateAveragePerformance()
    if (avgPerformance.operationTime > 20) {
      recommendations.push('Optimize encryption performance to meet SLA requirements')
    }
    
    if (avgPerformance.errorRate > 1) {
      recommendations.push('Investigate and reduce encryption operation error rate')
    }
    
    return recommendations
  }

  /**
   * Generate action plan
   */
  private static generateActionPlan(findings: ComplianceFinding[]): ActionItem[] {
    const actionItems: ActionItem[] = []
    
    const openFindings = findings.filter(f => f.status === FindingStatus.OPEN)
    
    for (const finding of openFindings) {
      const actionItem: ActionItem = {
        id: `action_${finding.id}`,
        title: `Resolve: ${finding.title}`,
        description: finding.remediation,
        priority: finding.priority,
        assignedTo: finding.assignedTo || 'Security Team',
        dueDate: finding.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: ActionStatus.PLANNED,
        estimatedEffort: this.estimateEffort(finding.priority),
        dependencies: [],
        progress: 0
      }
      
      actionItems.push(actionItem)
    }
    
    return actionItems.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Estimate effort for finding
   */
  private static estimateEffort(priority: FindingPriority): string {
    switch (priority) {
      case FindingPriority.CRITICAL:
        return '2-4 weeks'
      case FindingPriority.HIGH:
        return '1-2 weeks'
      case FindingPriority.MEDIUM:
        return '3-5 days'
      default:
        return '1-2 days'
    }
  }

  /**
   * Generate compliance summary
   */
  private static generateComplianceSummary(assessments: ComplianceAssessment[]): ComplianceSummary {
    if (assessments.length === 0) {
      return {
        totalRequirements: 0,
        compliantRequirements: 0,
        nonCompliantRequirements: 0,
        partiallyCompliantRequirements: 0,
        overallComplianceScore: 0,
        riskScore: 100,
        criticalFindings: 0,
        highFindings: 0,
        mediumFindings: 0,
        lowFindings: 0
      }
    }
    
    const latestAssessment = assessments.sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())[0]
    const findings = latestAssessment.findings
    
    const compliantFindings = findings.filter(f => f.status === FindingStatus.RESOLVED)
    const nonCompliantFindings = findings.filter(f => f.status === FindingStatus.OPEN)
    const partiallyCompliantFindings = findings.filter(f => f.status === FindingStatus.IN_PROGRESS)
    
    const criticalFindings = findings.filter(f => f.priority === FindingPriority.CRITICAL && f.status === FindingStatus.OPEN)
    const highFindings = findings.filter(f => f.priority === FindingPriority.HIGH && f.status === FindingStatus.OPEN)
    const mediumFindings = findings.filter(f => f.priority === FindingPriority.MEDIUM && f.status === FindingStatus.OPEN)
    const lowFindings = findings.filter(f => f.priority === FindingPriority.LOW && f.status === FindingStatus.OPEN)
    
    const riskScore = this.calculateRiskScore(criticalFindings.length, highFindings.length, mediumFindings.length, lowFindings.length)
    
    return {
      totalRequirements: findings.length,
      compliantRequirements: compliantFindings.length,
      nonCompliantRequirements: nonCompliantFindings.length,
      partiallyCompliantRequirements: partiallyCompliantFindings.length,
      overallComplianceScore: latestAssessment.compliancePercentage,
      riskScore,
      criticalFindings: criticalFindings.length,
      highFindings: highFindings.length,
      mediumFindings: mediumFindings.length,
      lowFindings: lowFindings.length
    }
  }

  /**
   * Calculate risk score
   */
  private static calculateRiskScore(critical: number, high: number, medium: number, low: number): number {
    const weightedScore = (critical * 100) + (high * 75) + (medium * 50) + (low * 25)
    const maxPossibleScore = 1000 // Assuming max 10 findings of each type
    
    return Math.min(100, (weightedScore / maxPossibleScore) * 100)
  }

  /**
   * Check policy violations
   */
  private static async checkPolicyViolations(auditEvent: EncryptionAuditLog): Promise<void> {
    try {
      const violations: string[] = []
      
      // Check for suspicious patterns
      if (auditEvent.eventType === AuditEventType.KEY_ACCESS && auditEvent.riskLevel === RiskLevel.HIGH) {
        violations.push('High-risk key access detected')
      }
      
      if (auditEvent.eventType === AuditEventType.ENCRYPTION_OPERATION && !auditEvent.success) {
        violations.push('Failed encryption operation')
      }
      
      // Check for unusual activity patterns
      const recentEvents = this.auditLogBuffer.filter(e => 
        e.userId === auditEvent.userId && 
        e.timestamp.getTime() > (Date.now() - 60 * 60 * 1000) // Last hour
      )
      
      if (recentEvents.length > 100) {
        violations.push('Unusual high-frequency activity detected')
      }
      
      // Log violations
      if (violations.length > 0) {
        await this.logAuditEvent({
          eventType: AuditEventType.POLICY_VIOLATION,
          userId: auditEvent.userId,
          ipAddress: auditEvent.ipAddress,
          userAgent: auditEvent.userAgent,
          resource: 'policy_violation',
          action: 'DETECT',
          details: {
            originalEvent: auditEvent.id,
            violations
          },
          success: true,
          riskLevel: RiskLevel.HIGH,
          complianceImpact: ComplianceImpact.HIGH
        })
      }
    } catch (error) {
      logger.error('Failed to check policy violations:', error)
    }
  }

  /**
   * Check key usage compliance
   */
  private static async checkKeyUsageCompliance(metrics: KeyUsageMetrics): Promise<void> {
    try {
      const violations: string[] = []
      
      // Check usage patterns
      if (metrics.errorRate > 5) {
        violations.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`)
      }
      
      if (metrics.averageOperationTime > 100) {
        violations.push(`Slow operations: ${metrics.averageOperationTime.toFixed(2)}ms average`)
      }
      
      // Check for unusual usage patterns
      const totalOps = Object.values(metrics.operationsByUser).reduce((sum, count) => sum + count, 0)
      const maxUserOps = Math.max(...Object.values(metrics.operationsByUser))
      
      if (maxUserOps > totalOps * 0.8) {
        violations.push('Single user dominates key usage')
      }
      
      // Update compliance score
      metrics.complianceScore = Math.max(0, 100 - (violations.length * 20))
      metrics.violations = violations
      
      if (violations.length > 0) {
        logger.warn(`Key usage compliance violations for ${metrics.keyId}: ${violations.join(', ')}`)
      }
    } catch (error) {
      logger.error('Failed to check key usage compliance:', error)
    }
  }

  /**
   * Check performance thresholds
   */
  private static async checkPerformanceThresholds(metrics: EncryptionPerformanceMetrics): Promise<void> {
    try {
      const violations: string[] = []
      
      // Define performance thresholds
      const thresholds = {
        maxOperationTime: 50, // milliseconds
        maxCpuUsage: 80, // percentage
        maxMemoryUsage: 512, // MB
        minThroughput: 100 // operations per second
      }
      
      if (metrics.operationTime > thresholds.maxOperationTime) {
        violations.push(`Operation time exceeded: ${metrics.operationTime}ms > ${thresholds.maxOperationTime}ms`)
      }
      
      if (metrics.cpuUsage > thresholds.maxCpuUsage) {
        violations.push(`CPU usage exceeded: ${metrics.cpuUsage}% > ${thresholds.maxCpuUsage}%`)
      }
      
      if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
        violations.push(`Memory usage exceeded: ${metrics.memoryUsage}MB > ${thresholds.maxMemoryUsage}MB`)
      }
      
      if (metrics.throughput < thresholds.minThroughput) {
        violations.push(`Throughput below threshold: ${metrics.throughput} < ${thresholds.minThroughput} ops/sec`)
      }
      
      if (violations.length > 0) {
        await this.logAuditEvent({
          eventType: AuditEventType.POLICY_VIOLATION,
          userId: 'system',
          ipAddress: 'system',
          userAgent: 'PerformanceMonitor',
          resource: 'performance_threshold',
          action: 'VIOLATION',
          details: {
            algorithm: metrics.algorithm,
            operationType: metrics.operationType,
            violations,
            metrics: {
              operationTime: metrics.operationTime,
              cpuUsage: metrics.cpuUsage,
              memoryUsage: metrics.memoryUsage,
              throughput: metrics.throughput
            }
          },
          success: true,
          riskLevel: RiskLevel.MEDIUM,
          complianceImpact: ComplianceImpact.MEDIUM
        })
        
        logger.warn(`Performance threshold violations: ${violations.join(', ')}`)
      }
    } catch (error) {
      logger.error('Failed to check performance thresholds:', error)
    }
  }

  /**
   * Helper methods for compliance checks
   */
  private static getCurrentEncryptionAlgorithms(): string[] {
    // In a real implementation, this would scan the system for active algorithms
    return ['AES-256-GCM', 'RSA-2048', 'ECDSA-P256', 'DES'] // DES is unapproved
  }

  private static async checkKeyRotationCompliance(): Promise<{ compliant: boolean; issues: string[] }> {
    // Simplified check - in reality, this would examine key rotation policies and schedules
    return {
      compliant: true,
      issues: []
    }
  }

  private static async checkAuditLoggingCompliance(): Promise<{ compliant: boolean; issues: string[] }> {
    // Simplified check - in reality, this would verify audit log completeness
    return {
      compliant: true,
      issues: []
    }
  }

  private static calculateAveragePerformance(): { operationTime: number; errorRate: number } {
    // Simplified calculation - in reality, this would analyze performance metrics
    return {
      operationTime: 15.5,
      errorRate: 0.02
    }
  }

  /**
   * Initialize default compliance standards
   */
  private static async initializeDefaultStandards(): Promise<void> {
    try {
      // Create NIST compliance standard if it doesn't exist
      if (!this.complianceStandards.has('nist-800-57')) {
        const nistStandard: ComplianceStandard = {
          id: 'nist-800-57',
          name: 'NIST SP 800-57 Part 1',
          version: 'Rev. 5',
          description: 'Recommendations for Key Management',
          requirements: [
            {
              id: 'nist-800-57-req-1',
              standardId: 'nist-800-57',
              category: RequirementCategory.KEY_MANAGEMENT,
              title: 'Key Generation',
              description: 'Cryptographic keys shall be generated using approved methods',
              mandatoryControls: ['approved-algorithms', 'secure-random-generation'],
              optionalControls: ['hardware-security-modules'],
              testProcedures: ['algorithm-validation', 'entropy-testing'],
              evidenceRequired: ['key-generation-logs', 'algorithm-certificates'],
              severity: RequirementSeverity.HIGH,
              automatedCheck: true
            },
            {
              id: 'nist-800-57-req-2',
              standardId: 'nist-800-57',
              category: RequirementCategory.KEY_MANAGEMENT,
              title: 'Key Storage',
              description: 'Cryptographic keys shall be stored securely',
              mandatoryControls: ['encrypted-storage', 'access-controls'],
              optionalControls: ['hardware-security-modules', 'key-escrow'],
              testProcedures: ['storage-security-testing', 'access-control-validation'],
              evidenceRequired: ['storage-configuration', 'access-logs'],
              severity: RequirementSeverity.CRITICAL,
              automatedCheck: true
            }
          ],
          applicableRegions: ['US', 'Global'],
          effectiveDate: new Date('2020-05-01'),
          status: StandardStatus.ACTIVE
        }
        
        await this.createComplianceStandard(nistStandard)
      }
    } catch (error) {
      logger.error('Failed to initialize default standards:', error)
    }
  }

  /**
   * Storage and loading methods
   */
  private static async loadComplianceStandards(): Promise<void> {
    try {
      const standardsFile = path.join(this.COMPLIANCE_STORAGE_PATH, 'standards.json')
      
      try {
        const data = await fs.readFile(standardsFile, 'utf8')
        const standards: ComplianceStandard[] = JSON.parse(data)
        
        for (const standard of standards) {
          standard.effectiveDate = new Date(standard.effectiveDate)
          if (standard.expirationDate) {
            standard.expirationDate = new Date(standard.expirationDate)
          }
          
          this.complianceStandards.set(standard.id, standard)
        }
        
        logger.info(`Loaded ${standards.length} compliance standards`)
      } catch {
        logger.info('No existing compliance standards found')
      }
    } catch (error) {
      logger.error('Failed to load compliance standards:', error)
    }
  }

  private static async saveComplianceStandard(standard: ComplianceStandard): Promise<void> {
    try {
      const standardsFile = path.join(this.COMPLIANCE_STORAGE_PATH, 'standards.json')
      
      let allStandards: ComplianceStandard[] = []
      try {
        const existingData = await fs.readFile(standardsFile, 'utf8')
        allStandards = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Remove existing standard
      allStandards = allStandards.filter(s => s.id !== standard.id)
      
      // Add new standard
      allStandards.push(standard)
      
      await fs.writeFile(standardsFile, JSON.stringify(allStandards, null, 2))
    } catch (error) {
      logger.error('Failed to save compliance standard:', error)
    }
  }

  private static async loadAssessments(): Promise<void> {
    try {
      const assessmentsFile = path.join(this.COMPLIANCE_STORAGE_PATH, 'assessments.json')
      
      try {
        const data = await fs.readFile(assessmentsFile, 'utf8')
        const assessments: ComplianceAssessment[] = JSON.parse(data)
        
        for (const assessment of assessments) {
          assessment.assessmentDate = new Date(assessment.assessmentDate)
          assessment.nextAssessmentDate = new Date(assessment.nextAssessmentDate)
          
          this.assessments.set(assessment.id, assessment)
        }
        
        logger.info(`Loaded ${assessments.length} compliance assessments`)
      } catch {
        logger.info('No existing compliance assessments found')
      }
    } catch (error) {
      logger.error('Failed to load compliance assessments:', error)
    }
  }

  private static async saveAssessment(assessment: ComplianceAssessment): Promise<void> {
    try {
      const assessmentsFile = path.join(this.COMPLIANCE_STORAGE_PATH, 'assessments.json')
      
      let allAssessments: ComplianceAssessment[] = []
      try {
        const existingData = await fs.readFile(assessmentsFile, 'utf8')
        allAssessments = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Remove existing assessment
      allAssessments = allAssessments.filter(a => a.id !== assessment.id)
      
      // Add new assessment
      allAssessments.push(assessment)
      
      await fs.writeFile(assessmentsFile, JSON.stringify(allAssessments, null, 2))
    } catch (error) {
      logger.error('Failed to save compliance assessment:', error)
    }
  }

  private static async saveComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      const reportsFile = path.join(this.COMPLIANCE_STORAGE_PATH, 'reports.json')
      
      let allReports: ComplianceReport[] = []
      try {
        const existingData = await fs.readFile(reportsFile, 'utf8')
        allReports = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Add new report
      allReports.push(report)
      
      // Keep only last 100 reports
      if (allReports.length > 100) {
        allReports = allReports.slice(-100)
      }
      
      await fs.writeFile(reportsFile, JSON.stringify(allReports, null, 2))
    } catch (error) {
      logger.error('Failed to save compliance report:', error)
    }
  }

  /**
   * Start audit log flusher
   */
  private static startAuditLogFlusher(): void {
    setInterval(async () => {
      if (this.auditLogBuffer.length > 0) {
        await this.flushAuditLogBuffer()
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Flush audit log buffer
   */
  private static async flushAuditLogBuffer(): Promise<void> {
    try {
      if (this.auditLogBuffer.length === 0) return
      
      const logFile = path.join(this.COMPLIANCE_STORAGE_PATH, this.AUDIT_LOG_FILE)
      const logEntries = this.auditLogBuffer.splice(0) // Remove all entries from buffer
      
      const logLines = logEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n'
      
      await fs.appendFile(logFile, logLines)
      
      logger.debug(`Flushed ${logEntries.length} audit log entries`)
    } catch (error) {
      logger.error('Failed to flush audit log buffer:', error)
    }
  }

  /**
   * Start performance metrics collector
   */
  private static startPerformanceMetricsCollector(): void {
    setInterval(async () => {
      if (this.performanceMetricsBuffer.length > 0) {
        await this.flushPerformanceMetricsBuffer()
      }
    }, 10 * 60 * 1000) // 10 minutes
  }

  /**
   * Flush performance metrics buffer
   */
  private static async flushPerformanceMetricsBuffer(): Promise<void> {
    try {
      if (this.performanceMetricsBuffer.length === 0) return
      
      const logFile = path.join(this.COMPLIANCE_STORAGE_PATH, this.PERFORMANCE_LOG_FILE)
      const logEntries = this.performanceMetricsBuffer.splice(0) // Remove all entries from buffer
      
      const logLines = logEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n'
      
      await fs.appendFile(logFile, logLines)
      
      logger.debug(`Flushed ${logEntries.length} performance metrics entries`)
    } catch (error) {
      logger.error('Failed to flush performance metrics buffer:', error)
    }
  }

  /**
   * Start compliance monitoring
   */
  private static startComplianceMonitoring(): void {
    // Run compliance checks every 24 hours
    setInterval(async () => {
      try {
        await this.runAutomatedComplianceChecks()
      } catch (error) {
        logger.error('Automated compliance check error:', error)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
    
    logger.info('Compliance monitoring started')
  }

  /**
   * Run automated compliance checks
   */
  private static async runAutomatedComplianceChecks(): Promise<void> {
    try {
      logger.info('Running automated compliance checks...')
      
      // Check all active standards
      for (const [standardId, standard] of this.complianceStandards) {
        if (standard.status === StandardStatus.ACTIVE) {
          // Check if assessment is due
          const latestAssessment = Array.from(this.assessments.values())
            .filter(a => a.standardId === standardId)
            .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())[0]
          
          if (!latestAssessment || latestAssessment.nextAssessmentDate <= new Date()) {
            logger.info(`Conducting automated assessment for standard: ${standardId}`)
            await this.conductComplianceAssessment(standardId, 'system')
          }
        }
      }
      
      logger.info('Automated compliance checks completed')
    } catch (error) {
      logger.error('Failed to run automated compliance checks:', error)
    }
  }
}