import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { ComplianceReportingService } from '../services/complianceReportingService'
import { logger } from '../utils/logger'

/**
 * Compliance Reporting Controller
 * Handles HTTP requests for compliance reporting operations
 */
export class ComplianceReportingController {
  /**
   * Conduct compliance assessment
   */
  static async conductAssessment(req: Request, res: Response) {
    try {
      const assessment = await ComplianceReportingService.conductAssessment()

      res.status(200).json({
        message: 'Compliance assessment completed successfully',
        data: assessment
      })
    } catch (error) {
      logger.error('Conduct assessment controller error:', error)
      res.status(500).json({
        error: {
          code: 'ASSESSMENT_ERROR',
          message: error.message || 'Failed to conduct compliance assessment'
        }
      })
    }
  }

  /**
   * Generate compliance report
   */
  static async generateReport(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        })
      }

      const { reportType, startDate, endDate } = req.query

      const report = await ComplianceReportingService.generateReport(
        (reportType as any) || 'FULL',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )

      res.status(200).json({
        message: 'Compliance report generated successfully',
        data: report
      })
    } catch (error) {
      logger.error('Generate report controller error:', error)
      res.status(500).json({
        error: {
          code: 'REPORT_ERROR',
          message: error.message || 'Failed to generate compliance report'
        }
      })
    }
  }

  /**
   * Get compliance dashboard
   */
  static async getComplianceDashboard(req: Request, res: Response) {
    try {
      const dashboard = await ComplianceReportingService.getComplianceDashboard()

      res.status(200).json({
        message: 'Compliance dashboard retrieved successfully',
        data: dashboard
      })
    } catch (error) {
      logger.error('Get compliance dashboard controller error:', error)
      res.status(500).json({
        error: {
          code: 'DASHBOARD_ERROR',
          message: error.message || 'Failed to retrieve compliance dashboard'
        }
      })
    }
  }

  /**
   * Track remediation progress
   */
  static async trackRemediation(req: Request, res: Response) {
    try {
      const { findingId } = req.params

      const remediation = await ComplianceReportingService.trackRemediation(findingId)

      if (!remediation) {
        return res.status(404).json({
          error: {
            code: 'REMEDIATION_NOT_FOUND',
            message: 'Remediation plan not found'
          }
        })
      }

      res.status(200).json({
        message: 'Remediation progress retrieved successfully',
        data: remediation
      })
    } catch (error) {
      logger.error('Track remediation controller error:', error)
      res.status(500).json({
        error: {
          code: 'REMEDIATION_ERROR',
          message: error.message || 'Failed to track remediation'
        }
      })
    }
  }

  /**
   * Create remediation plan
   */
  static async createRemediationPlan(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { findingId, description, steps, assignedTo, dueDate } = req.body

      const plan = await ComplianceReportingService.createRemediationPlan(
        findingId,
        description,
        steps,
        assignedTo,
        dueDate ? new Date(dueDate) : undefined
      )

      res.status(201).json({
        message: 'Remediation plan created successfully',
        data: plan
      })
    } catch (error) {
      logger.error('Create remediation plan controller error:', error)
      res.status(500).json({
        error: {
          code: 'REMEDIATION_ERROR',
          message: error.message || 'Failed to create remediation plan'
        }
      })
    }
  }
}

/**
 * Validation rules for compliance reporting endpoints
 */
export const complianceReportingValidation = {
  generateReport: [
    query('reportType')
      .optional()
      .isIn(['FULL', 'SUMMARY', 'EXECUTIVE', 'TECHNICAL'])
      .withMessage('Invalid report type'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date')
  ],

  createRemediationPlan: [
    body('findingId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Finding ID is required'),
    body('description')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description is required and must be less than 500 characters'),
    body('steps')
      .isArray({ min: 1 })
      .withMessage('At least one remediation step is required'),
    body('steps.*.description')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Step description is required'),
    body('assignedTo')
      .optional()
      .isString()
      .withMessage('Assigned to must be a string'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO date')
  ]
}
