import { logger } from '../utils/logger'
import { InvoiceService } from './invoiceService'
import { SubscriptionService } from './subscriptionService'

/**
 * Recurring Billing Service
 * Handles automated recurring invoice generation and subscription billing
 */
export class RecurringBillingService {
  /**
   * Process all recurring billing tasks
   */
  static async processRecurringBilling(): Promise<{
    success: boolean
    message: string
    results: {
      recurringInvoices: { generated: number }
      subscriptionBilling: { processed: number; failed: number }
    }
  }> {
    try {
      logger.info('Starting recurring billing process...')

      // Process recurring invoices
      const recurringInvoicesResult = await InvoiceService.generateRecurringInvoices()
      
      // Process subscription billing
      const subscriptionBillingResult = await SubscriptionService.processBillingCycle()

      const results = {
        recurringInvoices: {
          generated: recurringInvoicesResult.success ? recurringInvoicesResult.generated || 0 : 0
        },
        subscriptionBilling: {
          processed: subscriptionBillingResult.success ? subscriptionBillingResult.processed || 0 : 0,
          failed: subscriptionBillingResult.success ? subscriptionBillingResult.failed || 0 : 0
        }
      }

      logger.info('Recurring billing process completed:', results)

      return {
        success: true,
        message: 'Recurring billing processed successfully',
        results
      }
    } catch (error) {
      logger.error('Process recurring billing error:', error)
      return {
        success: false,
        message: 'An error occurred while processing recurring billing',
        results: {
          recurringInvoices: { generated: 0 },
          subscriptionBilling: { processed: 0, failed: 0 }
        }
      }
    }
  }

  /**
   * Process payment reminders for overdue invoices
   */
  static async processPaymentReminders(): Promise<{
    success: boolean
    message: string
    remindersSent: number
  }> {
    try {
      logger.info('Starting payment reminders process...')

      const result = await InvoiceService.sendAutomatedReminders()

      logger.info(`Payment reminders process completed: ${result.remindersSent} reminders sent`)

      return {
        success: result.success,
        message: result.message,
        remindersSent: result.remindersSent
      }
    } catch (error) {
      logger.error('Process payment reminders error:', error)
      return {
        success: false,
        message: 'An error occurred while processing payment reminders',
        remindersSent: 0
      }
    }
  }

  /**
   * Update invoice statuses based on current conditions
   */
  static async updateInvoiceStatuses(): Promise<{
    success: boolean
    message: string
    updated: number
  }> {
    try {
      logger.info('Starting invoice status update process...')

      const result = await InvoiceService.updateAllInvoiceStatuses()

      logger.info(`Invoice status update completed: ${result.updated} invoices updated`)

      return {
        success: result.success,
        message: result.message,
        updated: result.updated
      }
    } catch (error) {
      logger.error('Update invoice statuses error:', error)
      return {
        success: false,
        message: 'An error occurred while updating invoice statuses',
        updated: 0
      }
    }
  }

  /**
   * Run all recurring billing tasks
   */
  static async runAllTasks(): Promise<{
    success: boolean
    message: string
    results: {
      recurringBilling: any
      paymentReminders: any
      statusUpdates: any
    }
  }> {
    try {
      logger.info('Starting all recurring billing tasks...')

      // Run all tasks in parallel
      const [
        recurringBillingResult,
        paymentRemindersResult,
        statusUpdatesResult
      ] = await Promise.all([
        this.processRecurringBilling(),
        this.processPaymentReminders(),
        this.updateInvoiceStatuses()
      ])

      const results = {
        recurringBilling: recurringBillingResult,
        paymentReminders: paymentRemindersResult,
        statusUpdates: statusUpdatesResult
      }

      logger.info('All recurring billing tasks completed:', results)

      return {
        success: true,
        message: 'All recurring billing tasks completed successfully',
        results
      }
    } catch (error) {
      logger.error('Run all tasks error:', error)
      return {
        success: false,
        message: 'An error occurred while running recurring billing tasks',
        results: {
          recurringBilling: { success: false, message: 'Failed to run', results: { recurringInvoices: { generated: 0 }, subscriptionBilling: { processed: 0, failed: 0 } } },
          paymentReminders: { success: false, message: 'Failed to run', remindersSent: 0 },
          statusUpdates: { success: false, message: 'Failed to run', updated: 0 }
        }
      }
    }
  }
}