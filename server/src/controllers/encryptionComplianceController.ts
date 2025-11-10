import { Request, Response } from 'express'
import { 
  EncryptionComplianceService, 
  ReportType, 
  AssessmentStatus,
  RequirementCategory,
  RequirementSeverity,
  FindingStatus,
  FindingPriority
} from '../services/encryptionComplianceService'
import { logger } from '../utils/logger'

/**
 * Encryption Compliance Controller
 * Handles HTTP requests for encryption compliance and auditing operations
 */
export class EncryptionComplianceController {
  /**
   * Initialize encryption compliance service
   */
  static async initialize(req: Request, res: Response): Promise<void> {
    try {
      await EncryptionComplianceService.initialize()
      
      res.json({
        success: true,
        message: 'Encryption compliance service initialized successfully'
      })
    } catch (error) {
      logger.error('Failed to initialize encryption compliance service:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to initialize encryption compliance service',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get compliance standards
   */
  static async getComplianceStandards(req: Request, res: Response): Promise<void> {
    try {
      const standards = EncryptionComplianceService.getComplianceStandards()
      
      res.json({
        success: true,
        standards: standards.map(standard => ({
          id: standard.id,
          name: standard.name,
          version: standard.version,
          description: standard.description,
          requirementCount: standard.requirements.length,
          applicableRegions: standard.applicableRegions,
          effectiveDate: standard.effectiveDate,
          expirationDate: standard.expirationDate,
          status: standard.status
        })),
        total: standards.length
      })
    } catch (error) {
      logger.error('Failed to get compliance standards:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance standards',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Create compliance standard
   */
  static async createComplianceStandard(req: Request, res: Response): Promise<void> {
    try {
      const {
        id,
        name,
        version,
        description,
        requirements,
        applicableRegions,
        effectiveDate,
        expirationDate,
        status
      } = req.body
      
      if (!id || !name || !version || !requirements) {
        res.status(400).json({
          success: false,
          message: 'ID, name, version, and requirements are required'
        })
        return
      }
      
      await EncryptionComplianceService.createComplianceStandard({
        id,
        name,
        version,
        description,
        requirements,
        applicableRegions: applicableRegions || [],
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        status: status || 'ACTIVE'
      })
      
      res.json({
        success: true,
        message: 'Compliance standard created successfully'
      })
    } catch (error) {
      logger.error('Failed to create compliance standard:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create compliance standard',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Conduct compliance assessment
   */
  static async conductComplianceAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { standardId } = req.body
      const userId = (req as any).user?.id || 'system'
      
      if (!standardId) {
        res.status(400).json({
          success: false,
          message: 'Standard ID is required'
        })
        return
      }
      
      const assessment = await EncryptionComplianceService.conductComplianceAssessment(standardId, userId)
      
      res.json({
        success: true,
        message: 'Compliance assessment completed successfully',
        assessment: {
          id: assessment.id,
          standardId: assessment.standardId,
          assessmentDate: assessment.assessmentDate,
          assessedBy: assessment.assessedBy,
          overallScore: assessment.overallScore,
          maxScore: assessment.maxScore,
          compliancePercentage: assessment.compliancePercentage,
          status: assessment.status,
          findingCount: assessment.findings.length,
          recommendations: assessment.recommendations,
          nextAssessmentDate: assessment.nextAssessmentDate
        }
      })
    } catch (error) {
      logger.error('Failed to conduct compliance assessment:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to conduct compliance assessment',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get compliance assessment
   */
  static async getComplianceAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { assessmentId } = req.params
      
      if (!assessmentId) {
        res.status(400).json({
          success: false,
          message: 'Assessment ID is required'
        })
        return
      }
      
      const assessment = EncryptionComplianceService.getComplianceAssessment(assessmentId)
      
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: 'Assessment not found'
        })
        return
      }
      
      res.json({
        success: true,
        assessment: {
          id: assessment.id,
          standardId: assessment.standardId,
          assessmentDate: assessment.assessmentDate,
          assessedBy: assessment.assessedBy,
          overallScore: assessment.overallScore,
          maxScore: assessment.maxScore,
          compliancePercentage: assessment.compliancePercentage,
          status: assessment.status,
          findings: assessment.findings.map(finding => ({
            id: finding.id,
            requirementId: finding.requirementId,
            category: finding.category,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            currentState: finding.currentState,
            requiredState: finding.requiredState,
            gap: finding.gap,
            remediation: finding.remediation,
            priority: finding.priority,
            status: finding.status,
            assignedTo: finding.assignedTo,
            dueDate: finding.dueDate,
            resolvedDate: finding.resolvedDate
          })),
          recommendations: assessment.recommendations,
          nextAssessmentDate: assessment.nextAssessmentDate,
          evidence: assessment.evidence
        }
      })
    } catch (error) {
      logger.error('Failed to get compliance assessment:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance assessment',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * List compliance assessments
   */
  static async listComplianceAssessments(req: Request, res: Response): Promise<void> {
    try {
      const { standardId, status, assessedBy, startDate, endDate } = req.query
      
      const filters: any = {}
      if (standardId) filters.standardId = standardId as string
      if (status) filters.status = status as AssessmentStatus
      if (assessedBy) filters.assessedBy = assessedBy as string
      if (startDate && endDate) {
        filters.dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        }
      }
      
      const assessments = EncryptionComplianceService.listComplianceAssessments(
        Object.keys(filters).length > 0 ? filters : undefined
      )
      
      res.json({
        success: true,
        assessments: assessments.map(assessment => ({
          id: assessment.id,
          standardId: assessment.standardId,
          assessmentDate: assessment.assessmentDate,
          assessedBy: assessment.assessedBy,
          overallScore: assessment.overallScore,
          maxScore: assessment.maxScore,
          compliancePercentage: assessment.compliancePercentage,
          status: assessment.status,
          findingCount: assessment.findings.length,
          nextAssessmentDate: assessment.nextAssessmentDate
        })),
        total: assessments.length
      })
    } catch (error) {
      logger.error('Failed to list compliance assessments:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to list compliance assessments',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportType, standardId, startDate, endDate } = req.body
      const userId = (req as any).user?.id || 'system'
      
      if (!reportType || !standardId || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Report type, standard ID, start date, and end date are required'
        })
        return
      }
      
      const report = await EncryptionComplianceService.generateComplianceReport(
        reportType as ReportType,
        standardId,
        {
          start: new Date(startDate),
          end: new Date(endDate)
        },
        userId
      )
      
      res.json({
        success: true,
        message: 'Compliance report generated successfully',
        report: {
          id: report.id,
          reportType: report.reportType,
          standardId: report.standardId,
          generatedAt: report.generatedAt,
          generatedBy: report.generatedBy,
          reportPeriod: report.reportPeriod,
          summary: report.summary,
          findingCount: report.detailedFindings.length,
          recommendationCount: report.recommendations.length,
          actionItemCount: report.actionPlan.length
        }
      })
    } catch (error) {
      logger.error('Failed to generate compliance report:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key usage metrics
   */
  static async getKeyUsageMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.query
      
      const metrics = EncryptionComplianceService.getKeyUsageMetrics(keyId as string)
      
      res.json({
        success: true,
        metrics: metrics.map(metric => ({
          keyId: metric.keyId,
          keyType: metric.keyType,
          algorithm: metric.algorithm,
          totalOperations: metric.totalOperations,
          operationsByType: metric.operationsByType,
          operationsByUser: metric.operationsByUser,
          averageOperationTime: metric.averageOperationTime,
          errorRate: metric.errorRate,
          lastUsed: metric.lastUsed,
          complianceScore: metric.complianceScore,
          violations: metric.violations
        })),
        total: metrics.length
      })
    } catch (error) {
      logger.error('Failed to get key usage metrics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key usage metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get performance metrics summary
   */
  static async getPerformanceMetricsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query
      
      let timeRange: { start: Date; end: Date } | undefined
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        }
      }
      
      const summary = await EncryptionComplianceService.getPerformanceMetricsSummary(timeRange)
      
      res.json({
        success: true,
        summary
      })
    } catch (error) {
      logger.error('Failed to get performance metrics summary:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get performance metrics summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Log audit event
   */
  static async logAuditEvent(req: Request, res: Response): Promise<void> {
    try {
      const {
        eventType,
        resource,
        action,
        details,
        success,
        errorMessage,
        riskLevel,
        complianceImpact
      } = req.body
      
      const userId = (req as any).user?.id || 'system'
      const ipAddress = req.ip || 'unknown'
      const userAgent = req.get('User-Agent') || 'unknown'
      
      if (!eventType || !resource || !action) {
        res.status(400).json({
          success: false,
          message: 'Event type, resource, and action are required'
        })
        return
      }
      
      await EncryptionComplianceService.logAuditEvent({
        eventType,
        userId,
        ipAddress,
        userAgent,
        resource,
        action,
        details: details || {},
        success: success !== false,
        errorMessage,
        riskLevel: riskLevel || 'LOW',
        complianceImpact: complianceImpact || 'LOW'
      })
      
      res.json({
        success: true,
        message: 'Audit event logged successfully'
      })
    } catch (error) {
      logger.error('Failed to log audit event:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to log audit event',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Track key usage
   */
  static async trackKeyUsage(req: Request, res: Response): Promise<void> {
    try {
      const {
        keyId,
        keyType,
        algorithm,
        operation,
        operationTime,
        success
      } = req.body
      
      const userId = (req as any).user?.id || 'system'
      
      if (!keyId || !keyType || !algorithm || !operation) {
        res.status(400).json({
          success: false,
          message: 'Key ID, type, algorithm, and operation are required'
        })
        return
      }
      
      await EncryptionComplianceService.trackKeyUsage(
        keyId,
        keyType,
        algorithm,
        operation,
        userId,
        operationTime || 0,
        success !== false
      )
      
      res.json({
        success: true,
        message: 'Key usage tracked successfully'
      })
    } catch (error) {
      logger.error('Failed to track key usage:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to track key usage',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Record performance metrics
   */
  static async recordPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const {
        operationType,
        algorithm,
        keySize,
        dataSize,
        operationTime,
        cpuUsage,
        memoryUsage,
        throughput,
        success,
        errorType
      } = req.body
      
      if (!operationType || !algorithm) {
        res.status(400).json({
          success: false,
          message: 'Operation type and algorithm are required'
        })
        return
      }
      
      await EncryptionComplianceService.recordPerformanceMetrics({
        operationType,
        algorithm,
        keySize: keySize || 0,
        dataSize: dataSize || 0,
        operationTime: operationTime || 0,
        cpuUsage: cpuUsage || 0,
        memoryUsage: memoryUsage || 0,
        throughput: throughput || 0,
        success: success !== false,
        errorType
      })
      
      res.json({
        success: true,
        message: 'Performance metrics recorded successfully'
      })
    } catch (error) {
      logger.error('Failed to record performance metrics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to record performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get compliance metadata
   */
  static async getComplianceMetadata(req: Request, res: Response): Promise<void> {
    try {
      const reportTypes = Object.values(ReportType).map(type => ({
        value: type,
        label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      const assessmentStatuses = Object.values(AssessmentStatus).map(status => ({
        value: status,
        label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      const requirementCategories = Object.values(RequirementCategory).map(category => ({
        value: category,
        label: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      const requirementSeverities = Object.values(RequirementSeverity).map(severity => ({
        value: severity,
        label: severity.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      const findingStatuses = Object.values(FindingStatus).map(status => ({
        value: status,
        label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      const findingPriorities = Object.values(FindingPriority).map(priority => ({
        value: priority,
        label: priority.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      res.json({
        success: true,
        metadata: {
          reportTypes,
          assessmentStatuses,
          requirementCategories,
          requirementSeverities,
          findingStatuses,
          findingPriorities
        }
      })
    } catch (error) {
      logger.error('Failed to get compliance metadata:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance metadata',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}