import { Router } from 'express'
import { ABACController, abacValidation } from '../controllers/abacController'
import { requireAuth, requirePermission } from '../middleware/auth'

const router = Router()

/**
 * ABAC Routes
 * All routes require authentication and appropriate permissions
 */

// Evaluate access request
router.post(
  '/evaluate',
  requireAuth,
  abacValidation.evaluateAccess,
  ABACController.evaluateAccess
)

// Register new policy
router.post(
  '/policies',
  requirePermission('system', 'configure'),
  abacValidation.registerPolicy,
  ABACController.registerPolicy
)

// Update policy
router.put(
  '/policies/:policyId',
  requirePermission('system', 'configure'),
  abacValidation.updatePolicy,
  ABACController.updatePolicy
)

// Delete policy
router.delete(
  '/policies/:policyId',
  requirePermission('system', 'configure'),
  abacValidation.policyId,
  ABACController.deletePolicy
)

// Get all policies
router.get(
  '/policies',
  requireAuth,
  ABACController.getAllPolicies
)

// Get policy by ID
router.get(
  '/policies/:policyId',
  requireAuth,
  abacValidation.policyId,
  ABACController.getPolicy
)

// Test policy
router.post(
  '/policies/:policyId/test',
  requirePermission('system', 'configure'),
  abacValidation.testPolicy,
  ABACController.testPolicy
)

// Initialize ABAC system
router.post(
  '/initialize',
  requirePermission('system', 'configure'),
  ABACController.initialize
)

export default router
