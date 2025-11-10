import { Request, Response } from 'express'
import { body, param, validationResult } from 'express-validator'
import { AccessReviewService } from '../services/accessReviewService'
import { logger } from '../utils/logger'

/**
 * Access Review Controller
 * Handles HTTP requests for access review and compliance operations
 */
export class AccessReviewController {
  /**
   * Create access review
   */
  static async createReview(req: Request, res: Response) {
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

      const reviewData = req.body
      const creatorId = req.user!.userId

      const review = await AccessReviewService.createAccessReview(reviewData, creatorId)

      res.status(201).json({
        message: 'Access review created successfully',
        review
      })
    } catch (error) {
      logger.error('Create review controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Conduct user access review
   */
  static async conductReview(req: Request, res: Response) {
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

      const { reviewId } = req.params
      const reviewerId = req.user!.userId

      const review = await AccessReviewService.conductUserAccessReview(reviewId, reviewerId)

      res.status(200).json({
        message: 'Access review conducted successfully',
        review
      })
    } catch (error) {
      logger.error('Conduct review controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get all reviews
   */
  static async getAllReviews(req: Request, res: Response) {
    try {
      const reviews = await AccessReviewService.getAllReviews()

      res.status(200).json({
        message: 'Reviews retrieved successfully',
        reviews,
        total: reviews.length
      })
    } catch (error) {
      logger.error('Get all reviews controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get review by ID
   */
  static async getReview(req: Request, res: Response) {
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

      const { reviewId } = req.params

      const review = await AccessReviewService.getReview(reviewId)

      if (!review) {
        return res.status(404).json({
          error: {
            code: 'REVIEW_NOT_FOUND',
            message: 'Review not found'
          }
        })
      }

      res.status(200).json({
        message: 'Review retrieved successfully',
        review
      })
    } catch (error) {
      logger.error('Get review controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create certification campaign
   */
  static async createCampaign(req: Request, res: Response) {
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

      const campaignData = req.body
      const creatorId = req.user!.userId

      const campaign = await AccessReviewService.createCertificationCampaign(campaignData, creatorId)

      res.status(201).json({
        message: 'Certification campaign created successfully',
        campaign
      })
    } catch (error) {
      logger.error('Create campaign controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Certify user access
   */
  static async certifyAccess(req: Request, res: Response) {
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

      const { certificationId } = req.params
      const { decision, comments } = req.body
      const certifierId = req.user!.userId

      const certification = await AccessReviewService.certifyUserAccess(
        certificationId,
        certifierId,
        decision,
        comments
      )

      res.status(200).json({
        message: 'Access certified successfully',
        certification
      })
    } catch (error) {
      logger.error('Certify access controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get all campaigns
   */
  static async getAllCampaigns(req: Request, res: Response) {
    try {
      const campaigns = await AccessReviewService.getAllCampaigns()

      res.status(200).json({
        message: 'Campaigns retrieved successfully',
        campaigns,
        total: campaigns.length
      })
    } catch (error) {
      logger.error('Get all campaigns controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaign(req: Request, res: Response) {
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

      const { campaignId } = req.params

      const campaign = await AccessReviewService.getCampaign(campaignId)

      if (!campaign) {
        return res.status(404).json({
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Campaign not found'
          }
        })
      }

      res.status(200).json({
        message: 'Campaign retrieved successfully',
        campaign
      })
    } catch (error) {
      logger.error('Get campaign controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get pending certifications
   */
  static async getPendingCertifications(req: Request, res: Response) {
    try {
      const certifierId = req.user!.userId

      const certifications = await AccessReviewService.getPendingCertifications(certifierId)

      res.status(200).json({
        message: 'Pending certifications retrieved successfully',
        certifications,
        total: certifications.length
      })
    } catch (error) {
      logger.error('Get pending certifications controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get all SoD violations
   */
  static async getAllViolations(req: Request, res: Response) {
    try {
      const violations = await AccessReviewService.getAllViolations()

      res.status(200).json({
        message: 'Violations retrieved successfully',
        violations,
        total: violations.length
      })
    } catch (error) {
      logger.error('Get all violations controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get open violations
   */
  static async getOpenViolations(req: Request, res: Response) {
    try {
      const violations = await AccessReviewService.getOpenViolations()

      res.status(200).json({
        message: 'Open violations retrieved successfully',
        violations,
        total: violations.length
      })
    } catch (error) {
      logger.error('Get open violations controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Mitigate violation
   */
  static async mitigateViolation(req: Request, res: Response) {
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

      const { violationId } = req.params
      const { mitigationPlan } = req.body
      const mitigatorId = req.user!.userId

      const violation = await AccessReviewService.mitigateViolation(
        violationId,
        mitigationPlan,
        mitigatorId
      )

      res.status(200).json({
        message: 'Violation mitigated successfully',
        violation
      })
    } catch (error) {
      logger.error('Mitigate violation controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get all SoD rules
   */
  static async getAllSoDRules(req: Request, res: Response) {
    try {
      const rules = await AccessReviewService.getAllSoDRules()

      res.status(200).json({
        message: 'SoD rules retrieved successfully',
        rules,
        total: rules.length
      })
    } catch (error) {
      logger.error('Get all SoD rules controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get compliance summary
   */
  static async getComplianceSummary(req: Request, res: Response) {
    try {
      const summary = await AccessReviewService.getComplianceSummary()

      res.status(200).json({
        message: 'Compliance summary retrieved successfully',
        summary
      })
    } catch (error) {
      logger.error('Get compliance summary controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Initialize access review system
   */
  static async initialize(req: Request, res: Response) {
    try {
      await AccessReviewService.initialize()

      res.status(200).json({
        message: 'Access review system initialized successfully'
      })
    } catch (error) {
      logger.error('Initialize access review controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }
}

/**
 * Validation rules for access review endpoints
 */
export const accessReviewValidation = {
  createReview: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('reviewType').isIn(['USER_ACCESS', 'ROLE_PERMISSIONS', 'SEGREGATION_OF_DUTIES', 'COMPLIANCE_CHECK']).withMessage('Invalid review type'),
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
    body('scheduledDate').isISO8601().withMessage('Scheduled date must be valid'),
    body('scope').isObject().withMessage('Scope must be an object'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],

  reviewId: [
    param('reviewId').isString().notEmpty().withMessage('Review ID is required')
  ],

  createCampaign: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('startDate').isISO8601().withMessage('Start date must be valid'),
    body('endDate').isISO8601().withMessage('End date must be valid'),
    body('status').isIn(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
    body('certifiers').isArray().notEmpty().withMessage('Certifiers array is required'),
    body('scope').isObject().withMessage('Scope must be an object'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],

  certifyAccess: [
    param('certificationId').isString().notEmpty().withMessage('Certification ID is required'),
    body('decision').isIn(['APPROVE', 'REVOKE', 'MODIFY']).withMessage('Invalid decision'),
    body('comments').optional().isString().withMessage('Comments must be a string')
  ],

  campaignId: [
    param('campaignId').isString().notEmpty().withMessage('Campaign ID is required')
  ],

  mitigateViolation: [
    param('violationId').isString().notEmpty().withMessage('Violation ID is required'),
    body('mitigationPlan').isString().notEmpty().withMessage('Mitigation plan is required')
  ]
}
