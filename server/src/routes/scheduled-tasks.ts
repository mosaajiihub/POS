import { Router } from 'express'
import { ScheduledTaskController, scheduledTaskValidation } from '../controllers/scheduledTaskController'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

/**
 * Scheduled Task Management Routes
 */

// GET /api/scheduled-tasks/status - Get status of all scheduled tasks
router.get(
  '/status',
  ScheduledTaskController.getTaskStatus
)

// POST /api/scheduled-tasks/:taskName/trigger - Manually trigger a specific task
router.post(
  '/:taskName/trigger',
  scheduledTaskValidation.triggerTask,
  ScheduledTaskController.triggerTask
)

export default router