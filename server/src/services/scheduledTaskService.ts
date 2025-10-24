import { InvoiceService } from './invoiceService'
import { RecurringBillingService } from './recurringBillingService'
import { logger } from '../utils/logger'

/**
 * Scheduled Task Service
 * Handles automated background tasks like sending reminders and updating statuses
 */
export class ScheduledTaskService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Start all scheduled tasks
   */
  static startAllTasks(): void {
    this.startAutomatedReminders()
    this.startStatusUpdates()
    this.startRecurringInvoiceGeneration()
    this.startSubscriptionBilling()
    
    logger.info('All scheduled tasks started')
  }

  /**
   * Stop all scheduled tasks
   */
  static stopAllTasks(): void {
    this.intervals.forEach((interval, taskName) => {
      clearInterval(interval)
      logger.info(`Stopped scheduled task: ${taskName}`)
    })
    this.intervals.clear()
    
    logger.info('All scheduled tasks stopped')
  }

  /**
   * Start automated payment reminders
   * Runs every 6 hours
   */
  private static startAutomatedReminders(): void {
    const taskName = 'automated-reminders'
    
    // Run immediately on startup
    this.runAutomatedReminders()
    
    // Schedule to run every 6 hours (6 * 60 * 60 * 1000 ms)
    const interval = setInterval(() => {
      this.runAutomatedReminders()
    }, 6 * 60 * 60 * 1000)
    
    this.intervals.set(taskName, interval)
    logger.info(`Started scheduled task: ${taskName} (every 6 hours)`)
  }

  /**
   * Start invoice status updates
   * Runs every 2 hours
   */
  private static startStatusUpdates(): void {
    const taskName = 'status-updates'
    
    // Run immediately on startup
    this.runStatusUpdates()
    
    // Schedule to run every 2 hours (2 * 60 * 60 * 1000 ms)
    const interval = setInterval(() => {
      this.runStatusUpdates()
    }, 2 * 60 * 60 * 1000)
    
    this.intervals.set(taskName, interval)
    logger.info(`Started scheduled task: ${taskName} (every 2 hours)`)
  }

  /**
   * Start recurring invoice generation
   * Runs daily at 9 AM
   */
  private static startRecurringInvoiceGeneration(): void {
    const taskName = 'recurring-invoices'
    
    // Calculate time until next 9 AM
    const now = new Date()
    const next9AM = new Date()
    next9AM.setHours(9, 0, 0, 0)
    
    // If it's already past 9 AM today, schedule for tomorrow
    if (now.getTime() > next9AM.getTime()) {
      next9AM.setDate(next9AM.getDate() + 1)
    }
    
    const timeUntilNext9AM = next9AM.getTime() - now.getTime()
    
    // Schedule first run
    setTimeout(() => {
      this.runRecurringInvoiceGeneration()
      
      // Then schedule to run daily (24 * 60 * 60 * 1000 ms)
      const interval = setInterval(() => {
        this.runRecurringInvoiceGeneration()
      }, 24 * 60 * 60 * 1000)
      
      this.intervals.set(taskName, interval)
    }, timeUntilNext9AM)
    
    logger.info(`Scheduled task: ${taskName} (daily at 9 AM, next run: ${next9AM.toISOString()})`)
  }

  /**
   * Start subscription billing
   * Runs daily at 10 AM
   */
  private static startSubscriptionBilling(): void {
    const taskName = 'subscription-billing'
    
    // Calculate time until next 10 AM
    const now = new Date()
    const next10AM = new Date()
    next10AM.setHours(10, 0, 0, 0)
    
    // If it's already past 10 AM today, schedule for tomorrow
    if (now.getTime() > next10AM.getTime()) {
      next10AM.setDate(next10AM.getDate() + 1)
    }
    
    const timeUntilNext10AM = next10AM.getTime() - now.getTime()
    
    // Schedule first run
    setTimeout(() => {
      this.runSubscriptionBilling()
      
      // Then schedule to run daily (24 * 60 * 60 * 1000 ms)
      const interval = setInterval(() => {
        this.runSubscriptionBilling()
      }, 24 * 60 * 60 * 1000)
      
      this.intervals.set(taskName, interval)
    }, timeUntilNext10AM)
    
    logger.info(`Scheduled task: ${taskName} (daily at 10 AM, next run: ${next10AM.toISOString()})`)
  }

  /**
   * Execute automated reminders task
   */
  private static async runAutomatedReminders(): Promise<void> {
    try {
      logger.info('Running automated payment reminders task...')
      
      const result = await InvoiceService.sendAutomatedReminders()
      
      if (result.success) {
        logger.info(`Automated reminders task completed: ${result.remindersSent} reminders sent`)
      } else {
        logger.error(`Automated reminders task failed: ${result.message}`)
      }
    } catch (error) {
      logger.error('Error running automated reminders task:', error)
    }
  }

  /**
   * Execute status updates task
   */
  private static async runStatusUpdates(): Promise<void> {
    try {
      logger.info('Running invoice status updates task...')
      
      const result = await InvoiceService.updateAllInvoiceStatuses()
      
      if (result.success) {
        logger.info(`Status updates task completed: ${result.updated} invoices updated`)
      } else {
        logger.error(`Status updates task failed: ${result.message}`)
      }
    } catch (error) {
      logger.error('Error running status updates task:', error)
    }
  }

  /**
   * Execute recurring invoice generation task
   */
  private static async runRecurringInvoiceGeneration(): Promise<void> {
    try {
      logger.info('Running recurring invoice generation task...')
      
      const result = await InvoiceService.generateRecurringInvoices()
      
      if (result.success) {
        logger.info(`Recurring invoice generation task completed: ${result.generated} invoices generated`)
      } else {
        logger.error(`Recurring invoice generation task failed: ${result.message}`)
      }
    } catch (error) {
      logger.error('Error running recurring invoice generation task:', error)
    }
  }

  /**
   * Execute subscription billing task
   */
  private static async runSubscriptionBilling(): Promise<void> {
    try {
      logger.info('Running subscription billing task...')
      
      const result = await RecurringBillingService.processRecurringBilling()
      
      if (result.success) {
        logger.info(`Subscription billing task completed:`, result.results)
      } else {
        logger.error(`Subscription billing task failed: ${result.message}`)
      }
    } catch (error) {
      logger.error('Error running subscription billing task:', error)
    }
  }

  /**
   * Get status of all scheduled tasks
   */
  static getTaskStatus(): Record<string, { running: boolean; nextRun?: string }> {
    const status: Record<string, { running: boolean; nextRun?: string }> = {}
    
    // Check which tasks are running
    status['automated-reminders'] = {
      running: this.intervals.has('automated-reminders'),
      nextRun: this.intervals.has('automated-reminders') ? 'Every 6 hours' : undefined
    }
    
    status['status-updates'] = {
      running: this.intervals.has('status-updates'),
      nextRun: this.intervals.has('status-updates') ? 'Every 2 hours' : undefined
    }
    
    status['recurring-invoices'] = {
      running: this.intervals.has('recurring-invoices'),
      nextRun: this.intervals.has('recurring-invoices') ? 'Daily at 9 AM' : undefined
    }

    status['subscription-billing'] = {
      running: this.intervals.has('subscription-billing'),
      nextRun: this.intervals.has('subscription-billing') ? 'Daily at 10 AM' : undefined
    }
    
    return status
  }

  /**
   * Manually trigger a specific task
   */
  static async triggerTask(taskName: string): Promise<{ success: boolean; message: string }> {
    try {
      switch (taskName) {
        case 'automated-reminders':
          await this.runAutomatedReminders()
          return { success: true, message: 'Automated reminders task triggered successfully' }
          
        case 'status-updates':
          await this.runStatusUpdates()
          return { success: true, message: 'Status updates task triggered successfully' }
          
        case 'recurring-invoices':
          await this.runRecurringInvoiceGeneration()
          return { success: true, message: 'Recurring invoice generation task triggered successfully' }

        case 'subscription-billing':
          await this.runSubscriptionBilling()
          return { success: true, message: 'Subscription billing task triggered successfully' }
          
        default:
          return { success: false, message: `Unknown task: ${taskName}` }
      }
    } catch (error) {
      logger.error(`Error triggering task ${taskName}:`, error)
      return { success: false, message: `Failed to trigger task: ${taskName}` }
    }
  }
}