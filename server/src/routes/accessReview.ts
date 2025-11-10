import { Router } from 'express'
import { AccessReviewController, accessReviewValidation } from '../controllers/accessReviewController'
import { requireAuth, requirePermission } from '../middleware/auth'

const router = Router()

/**
 * Access Review Routes
 * All routes require authentication and appropriate permissions
 */

// Create access review
router.post(
  '/reviews',
  requirePermission('system', 'audit'),
  accessReviewValidation.createReview,
  AccessReviewController.createReview
)

// Conduct review
router.post(
  '/reviews/:reviewId/conduct',
  requirePermission('system', 'audit'),
  accessReviewValidation.reviewId,
  AccessReviewController.conductReview
)

// Get all reviews
router.get(
  '/reviews',
  requirePermission('system', 'audit'),
  AccessReviewController.getAllReviews
)

// Get review by ID
router.get(
  '/reviews/:reviewId',
  requirePermission('system', 'audit'),
  accessReviewValidation.reviewId,
  AccessReviewController.getReview
)

// Create certification campaign
router.post(
  '/campaigns',
  requirePermission('system', 'audit'),
  accessReviewValidation.createCampaign,
  AccessReviewController.createCampaign
)

// Get all campaigns
router.get(
  '/campaigns',
  requirePermission('system', 'audit'),
  AccessReviewController.getAllCampaigns
)

// Get campaign by ID
router.get(
  '/campaigns/:campaignId',
  requirePermission('system', 'audit'),
  accessReviewValidation.campaignId,
  AccessReviewController.getCampaign
)

// Get pending certifications for current user
router.get(
  '/certifications/pending',
  requireAuth,
  AccessReviewController.getPendingCertifications
)

// Certify user access
router.post(
  '/certifications/:certificationId/certify',
  requireAuth,
  accessReviewValidation.certifyAccess,
  AccessReviewController.certifyAccess
)

// Get all SoD violations
router.get(
  '/violations',
  requirePermission('system', 'audit'),
  AccessReviewController.getAllViolations
)

// Get open violations
router.get(
  '/violations/open',
  requirePermission('system', 'audit'),
  AccessReviewController.getOpenViolations
)

// Mitigate violation
router.post(
  '/violations/:violationId/mitigate',
  requirePermission('system', 'audit'),
  accessReviewValidation.mitigateViolation,
  AccessReviewController.mitigateViolation
)

// Get all SoD rules
router.get(
  '/sod-rules',
  requirePermission('system', 'audit'),
  AccessReviewController.getAllSoDRules
)

// Get compliance summary
router.get(
  '/compliance/summary',
  requirePermission('system', 'audit'),
  AccessReviewController.getComplianceSummary
)

// Initialize access review system
router.post(
  '/initialize',
  requirePermission('system', 'configure'),
  AccessReviewController.initialize
)

export default router
