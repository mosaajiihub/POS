import cron from 'node-cron'
import { ReportService } from './reportService'
import { logger } from '../utils/logger'
import nodemailer from 'nodemailer'
import { promises as fs } from 'fs'

export interface ScheduledReportConfig {
  id: string
  reportType: string
  schedule: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv'
  filters: any
  isActive: boolean
  lastRun?: Date
  nextRun: Date
}

export class ScheduledReportService {
  private static scheduledTasks = new Map<string, cron.ScheduledTask>()
  private static emailTransporter: nodemailer.Transporter

  static async initialize() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    // Load and start existing scheduled reports
    await this.loadScheduledReports()
  }

  private static async loadScheduledReports() {
    try {
      const scheduledReports = await ReportService.getScheduledReports()
      
      for (const report of scheduledReports) {
        if (report.isActive) {
          await this.scheduleReportTask(report)
        }
      }
      
      logger.info(`Loaded ${scheduledReports.length} scheduled reports`)
    } catch (error) {
      logger.error('Error loading scheduled reports:', error)
    }
  }

  static async scheduleReportTask(config: ScheduledReportConfig) {
    try {
      // Stop existing task if it exists
      if (this.scheduledTasks.has(config.id)) {
        this.scheduledTasks.get(config.id)?.stop()
        this.scheduledTasks.delete(config.id)
      }

      // Convert schedule to cron expression
      const cronExpression = this.convertScheduleToCron(config.schedule)
      
      if (!cronExpression) {
        logger.error(`Invalid schedule format: ${config.schedule}`)
        return
      }

      // Create and start the scheduled task
      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledReport(config)
      }, {
        scheduled: false,
        timezone: process.env.TIMEZONE || 'UTC'
      })

      task.start()
      this.scheduledTasks.set(config.id, task)
      
      logger.info(`Scheduled report task created: ${config.id} with schedule: ${config.schedule}`)
    } catch (error) {
      logger.error(`Error scheduling report task ${config.id}:`, error)
    }
  }

  static async executeScheduledReport(config: ScheduledReportConfig) {
    try {
      logger.info(`Executing scheduled report: ${config.id}`)

      // Generate the report
      let report
      switch (config.reportType) {
        case 'stock-levels':
          report = await ReportService.generateStockLevelReport(config.filters)
          break
        case 'stock-movements':
          report = await ReportService.generateStockMovementReport(config.filters)
          break
        case 'low-stock':
          report = await ReportService.generateLowStockReport(config.filters)
          break
        case 'inventory-valuation':
          report = await ReportService.generateInventoryValuationReport(config.filters)
          break
        case 'sales-performance':
          report = await ReportService.generateSalesPerformanceReport(config.filters)
          break
        case 'product-performance':
          report = await ReportService.generateProductPerformanceReport(config.filters)
          break
        case 'customer-analytics':
          report = await ReportService.generateCustomerAnalyticsReport(config.filters)
          break
        default:
          throw new Error(`Unknown report type: ${config.reportType}`)
      }

      // Export the report
      let filepath: string
      switch (config.format) {
        case 'excel':
          filepath = await ReportService.exportToExcel(report)
          break
        case 'pdf':
          filepath = await ReportService.exportToPDF(report)
          break
        case 'csv':
          filepath = await ReportService.exportToCSV(report)
          break
        default:
          throw new Error(`Unknown export format: ${config.format}`)
      }

      // Send the report via email
      await this.sendReportEmail(config, report, filepath)

      // Clean up the temporary file
      await fs.unlink(filepath)

      // Update last run time
      await ReportService.updateScheduledReport(config.id, {
        lastRun: new Date(),
        nextRun: this.calculateNextRun(config.schedule)
      })

      logger.info(`Successfully executed scheduled report: ${config.id}`)
    } catch (error) {
      logger.error(`Error executing scheduled report ${config.id}:`, error)
    }
  }

  private static async sendReportEmail(config: ScheduledReportConfig, report: any, filepath: string) {
    try {
      const filename = filepath.split('/').pop() || 'report'
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@mosaajii-pos.com',
        to: config.recipients.join(', '),
        subject: `Scheduled Report: ${report.title}`,
        html: `
          <h2>${report.title}</h2>
          <p>This is your scheduled report generated on ${report.generatedAt.toLocaleString()}.</p>
          
          ${report.summary ? `
            <h3>Summary</h3>
            <ul>
              ${Object.entries(report.summary).map(([key, value]) => 
                `<li><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${value}</li>`
              ).join('')}
            </ul>
          ` : ''}
          
          <p>Please find the detailed report attached.</p>
          
          <hr>
          <p><small>This is an automated email from Mosaajii POS System.</small></p>
        `,
        attachments: [
          {
            filename: filename,
            path: filepath
          }
        ]
      }

      await this.emailTransporter.sendMail(mailOptions)
      logger.info(`Report email sent to: ${config.recipients.join(', ')}`)
    } catch (error) {
      logger.error('Error sending report email:', error)
      throw error
    }
  }

  private static convertScheduleToCron(schedule: string): string | null {
    switch (schedule.toLowerCase()) {
      case 'daily':
        return '0 9 * * *' // 9 AM daily
      case 'weekly':
        return '0 9 * * 1' // 9 AM every Monday
      case 'monthly':
        return '0 9 1 * *' // 9 AM on the 1st of every month
      case 'hourly':
        return '0 * * * *' // Every hour
      default:
        // Try to parse as cron expression
        if (cron.validate(schedule)) {
          return schedule
        }
        return null
    }
  }

  private static calculateNextRun(schedule: string): Date {
    const now = new Date()
    
    switch (schedule.toLowerCase()) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000)
      case 'daily':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)
        return tomorrow
      case 'weekly':
        const nextWeek = new Date(now)
        const daysUntilMonday = (8 - nextWeek.getDay()) % 7 || 7
        nextWeek.setDate(nextWeek.getDate() + daysUntilMonday)
        nextWeek.setHours(9, 0, 0, 0)
        return nextWeek
      case 'monthly':
        const nextMonth = new Date(now)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        nextMonth.setDate(1)
        nextMonth.setHours(9, 0, 0, 0)
        return nextMonth
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
  }

  static async stopScheduledReport(id: string) {
    try {
      if (this.scheduledTasks.has(id)) {
        this.scheduledTasks.get(id)?.stop()
        this.scheduledTasks.delete(id)
        logger.info(`Stopped scheduled report task: ${id}`)
      }
    } catch (error) {
      logger.error(`Error stopping scheduled report ${id}:`, error)
    }
  }

  static async restartScheduledReport(config: ScheduledReportConfig) {
    await this.stopScheduledReport(config.id)
    await this.scheduleReportTask(config)
  }

  static getActiveScheduledReports(): string[] {
    return Array.from(this.scheduledTasks.keys())
  }

  static async stopAllScheduledReports() {
    for (const [id, task] of this.scheduledTasks) {
      task.stop()
      logger.info(`Stopped scheduled report task: ${id}`)
    }
    this.scheduledTasks.clear()
  }
}