import { Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'
import { GDPRComplianceService, ConsentType } from '../services/gdprComplianceService'
import { logger } from '../utils/logger'

/**
 * GDPR Compliance Controller
 * Handles HTTP requests for GDPR compliance operations
 */
export class GDPRComplianceController {
  /**
   * Record user consent
   */
  static async recordConsent(req: Request, res: Response) {
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

      const { userId, consentType, granted } = req.body
      const ipAddress = req.ip
      const userAgent = req.get('user-agent')

      const consent = await GDPRComplianceService.recordConsent(
        userId,
        consentType,
        granted,
        ipAddress,
        userAgent
      )

      res.status(200).json({
        message: 'Consent recorded successfully',
        data: consent
      })
    } catch (error) {
      logger.error('Record consent controller error:', error)
      res.status(500).json({
        error: {
          code: 'CONSENT_ERROR',
          message: error.message || 'Failed to record consent'
        }
      })
    }
  }

  /**
   * Get user consent status
   */
  static async getUserConsent(req: Request, res: Response) {
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

      const { userId } = req.params
      const { consentType } = req.query

      const consents = await GDPRComplianceService.getUserConsent(
        userId,
        consentType as ConsentType
      )

      res.status(200).json({
        message: 'Consent retrieved successfully',
        data: consents
      })
    } catch (error) {
      logger.error('Get user consent controller error:', error)
      res.status(500).json({
        error: {
          code: 'CONSENT_ERROR',
          message: error.message || 'Failed to retrieve consent'
        }
      })
    }
  }

  /**
   * Handle data access request
   */
  static async handleAccessRequest(req: Request, res: Response) {
    try {
      const { userId } = req.params

      const request = await GDPRComplianceService.handleAccessRequest(userId)

      res.status(200).json({
        message: 'Data access request processed successfully',
        data: request
      })
    } catch (error) {
      logger.error('Handle access request controller error:', error)
      res.status(500).json({
        error: {
          code: 'ACCESS_REQUEST_ERROR',
          message: error.message || 'Failed to process access request'
        }
      })
    }
  }

  /**
   * Handle data erasure request
   */
  static async handleErasureRequest(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const { reason } = req.body

      const request = await GDPRComplianceService.handleErasureRequest(userId, reason)

      if (request.status === 'REJECTED') {
        return res.status(400).json({
          error: {
            code: 'ERASURE_REJECTED',
            message: 'Erasure request rejected',
            details: request.data
          }
        })
      }

      res.status(200).json({
        message: 'Data erasure request processed successfully',
        data: request
      })
    } catch (error) {
      logger.error('Handle erasure request controller error:', error)
      res.status(500).json({
        error: {
          code: 'ERASURE_REQUEST_ERROR',
          message: error.message || 'Failed to process erasure request'
        }
      })
    }
  }

  /**
   * Handle data portability request
   */
  static async handlePortabilityRequest(req: Request, res: Response) {
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

      const { userId } = req.params
      const { format } = req.query

      const request = await GDPRComplianceService.handlePortabilityRequest(
        userId,
        (format as 'JSON' | 'CSV') || 'JSON'
      )

      res.status(200).json({
        message: 'Data portability request processed successfully',
        data: request
      })
    } catch (error) {
      logger.error('Handle portability request controller error:', error)
      res.status(500).json({
        error: {
          code: 'PORTABILITY_REQUEST_ERROR',
          message: error.message || 'Failed to process portability request'
        }
      })
    }
  }

  /**
   * Validate lawful basis for data processing
   */
  static async validateLawfulBasis(req: Request, res: Response) {
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

      const { userId, processingPurpose } = req.body

      const result = await GDPRComplianceService.validateLawfulBasis(userId, processingPurpose)

      if (!result.valid) {
        return res.status(400).json({
          error: {
            code: 'INVALID_LAWFUL_BASIS',
            message: result.reason || 'No valid lawful basis for data processing'
          }
        })
      }

      res.status(200).json({
        message: 'Lawful basis validated successfully',
        data: result
      })
    } catch (error) {
      logger.error('Validate lawful basis controller error:', error)
      res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Failed to validate lawful basis'
        }
      })
    }
  }

  /**
   * Report data breach
   */
  static async reportDataBreach(req: Request, res: Response) {
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

      const {
        breachType,
        severity,
        affectedRecords,
        affectedUsers,
        detectedAt,
        description,
        mitigationSteps
      } = req.body

      const breach = await GDPRComplianceService.reportDataBreach({
        breachType,
        severity,
        affectedRecords,
        affectedUsers,
        detectedAt: new Date(detectedAt),
        description,
        mitigationSteps
      })

      res.status(200).json({
        message: 'Data breach reported successfully',
        data: breach
      })
    } catch (error) {
      logger.error('Report data breach controller error:', error)
      res.status(500).json({
        error: {
          code: 'BREACH_REPORT_ERROR',
          message: error.message || 'Failed to report data breach'
        }
      })
    }
  }

  /**
   * Generate GDPR compliance report
   */
  static async getComplianceReport(req: Request, res: Response) {
    try {
      const report = await GDPRComplianceService.generateComplianceReport()

      res.status(200).json({
        message: 'GDPR compliance report generated successfully',
        data: report
      })
    } catch (error) {
      logger.error('Get GDPR compliance report controller error:', error)
      res.status(500).json({
        error: {
          code: 'REPORT_ERROR',
          message: error.message || 'Failed to generate compliance report'
        }
      })
    }
  }
}

/**
 * Validation rules for GDPR compliance endpoints
 */
export const gdprValidation = {
  recordConsent: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('consentType')
      .isIn(['DATA_PROCESSING', 'MARKETING', 'ANALYTICS', 'THIRD_PARTY_SHARING', 'PROFILING'])
      .withMessage('Invalid consent type'),
    body('granted')
      .isBoolean()
      .withMessage('Granted must be a boolean')
  ],

  getUserConsent: [
    query('consentType')
      .optional()
      .isIn(['DATA_PROCESSING', 'MARKETING', 'ANALYTICS', 'THIRD_PARTY_SHARING', 'PROFILING'])
      .withMessage('Invalid consent type')
  ],

  handlePortabilityRequest: [
    query('format')
      .optional()
      .isIn(['JSON', 'CSV'])
      .withMessage('Format must be JSON or CSV')
  ],

  validateLawfulBasis: [
    body('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('User ID is required'),
    body('processingPurpose')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Processing purpose is required')
  ],

  reportDataBreach: [
    body('breachType')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Breach type is required'),
    body('severity')
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid severity level'),
    body('affectedRecords')
      .isInt({ min: 0 })
      .withMessage('Affected records must be a non-negative integer'),
    body('affectedUsers')
      .isArray()
      .withMessage('Affected users must be an array'),
    body('detectedAt')
      .isISO8601()
      .withMessage('Detected at must be a valid ISO date'),
    body('description')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Description is required'),
    body('mitigationSteps')
      .isArray()
      .withMessage('Mitigation steps must be an array')
  ]
}
