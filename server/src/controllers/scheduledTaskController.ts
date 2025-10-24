import { Request, Response } from 'express'
import { param, validationResult } from 'express-validator'
import { ScheduledTaskService } from '../services/scheduledTaskService'
import { logger } from '../utils/logger'

/**
 * Scheduled Task Controller
 * Handles HTTP requests for scheduled task management
 */
export class ScheduledTaskController {
  /**
   * Get status of all scheduled tasks
   */
  static async getTaskStatus(req: Request, res: Response) {
    try {
      const status = ScheduledTaskService.getTaskStatus()

      res.status(200).json({
        message: 'Task status retrieved successfully',
        tasks: status
      })
    } catch (error) {
      logger.error('Get task status controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Manually trigger a specific task
   */
  static async triggerTask(req: Request, res: Response) {
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

      const { taskName } = req.params

      const result = await ScheduledTaskService.triggerTask(taskName)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'TRIGGER_TASK_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Trigger task controller error:', error)
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
 * Validation rules for scheduled task endpoints
 */
export const scheduledTaskValidation = {
  triggerTask: [
    param('taskName')
      .isIn(['automated-reminders', 'status-updates', 'recurring-invoices', 'subscription-billing'])
      .withMessage('Invalid task name. Must be one of: automated-reminders, status-updates, recurring-invoices, subscription-billing')
  ]
}