import { Router } from 'express'
import { SubscriptionController, subscriptionValidation } from '../controllers/subscriptionController'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

/**
 * Subscription Management Routes
 */

// GET /api/subscriptions - Get all subscriptions with filtering and pagination
router.get(
  '/',
  subscriptionValidation.getSubscriptions,
  SubscriptionController.getSubscriptions
)

// GET /api/subscriptions/:subscriptionId - Get subscription by ID
router.get(
  '/:subscriptionId',
  subscriptionValidation.getSubscription,
  SubscriptionController.getSubscription
)

// POST /api/subscriptions - Create new subscription
router.post(
  '/',
  subscriptionValidation.createSubscription,
  SubscriptionController.createSubscription
)

// PUT /api/subscriptions/:subscriptionId - Update subscription
router.put(
  '/:subscriptionId',
  subscriptionValidation.updateSubscription,
  SubscriptionController.updateSubscription
)

// POST /api/subscriptions/:subscriptionId/cancel - Cancel subscription
router.post(
  '/:subscriptionId/cancel',
  subscriptionValidation.cancelSubscription,
  SubscriptionController.cancelSubscription
)

// POST /api/subscriptions/process-billing - Process billing cycle for all active subscriptions
router.post(
  '/process-billing',
  SubscriptionController.processBillingCycle
)

export default router