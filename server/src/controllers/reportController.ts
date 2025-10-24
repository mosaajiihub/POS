import { Request, Response } from 'express'
import { ReportService, ReportFilter, ExportOptions } from '../services/reportService'
import { logger } from '../utils/logger'
import { createReadStream, promises as fs } from 'fs'
import path from 'path'

export class ReportController {
  // Stock Reports
  static async getStockLevelReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        categoryId: req.query.categoryId as string,
        supplierId: req.query.supplierId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateStockLevelReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting stock level report:', error)
      res.status(500).json({ error: 'Failed to generate stock level report' })
    }
  }

  static async getStockMovementReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        productId: req.query.productId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateStockMovementReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting stock movement report:', error)
      res.status(500).json({ error: 'Failed to generate stock movement report' })
    }
  }

  static async getLowStockReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        categoryId: req.query.categoryId as string,
        supplierId: req.query.supplierId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateLowStockReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting low stock report:', error)
      res.status(500).json({ error: 'Failed to generate low stock report' })
    }
  }

  static async getInventoryValuationReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        categoryId: req.query.categoryId as string,
        supplierId: req.query.supplierId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateInventoryValuationReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting inventory valuation report:', error)
      res.status(500).json({ error: 'Failed to generate inventory valuation report' })
    }
  }

  // Sales Reports
  static async getSalesPerformanceReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        customerId: req.query.customerId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateSalesPerformanceReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting sales performance report:', error)
      res.status(500).json({ error: 'Failed to generate sales performance report' })
    }
  }

  static async getProductPerformanceReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        categoryId: req.query.categoryId as string,
        productId: req.query.productId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateProductPerformanceReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting product performance report:', error)
      res.status(500).json({ error: 'Failed to generate product performance report' })
    }
  }

  static async getCustomerAnalyticsReport(req: Request, res: Response) {
    try {
      const filters: ReportFilter = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        customerId: req.query.customerId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      const report = await ReportService.generateCustomerAnalyticsReport(filters)
      res.json(report)
    } catch (error) {
      logger.error('Error getting customer analytics report:', error)
      res.status(500).json({ error: 'Failed to generate customer analytics report' })
    }
  }

  // Export functionality
  static async exportReport(req: Request, res: Response) {
    try {
      const { reportType, format } = req.params
      const exportFormat = format as 'pdf' | 'excel' | 'csv'
      
      if (!['pdf', 'excel', 'csv'].includes(exportFormat)) {
        return res.status(400).json({ error: 'Invalid export format' })
      }

      const filters: ReportFilter = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        categoryId: req.query.categoryId as string,
        supplierId: req.query.supplierId as string,
        customerId: req.query.customerId as string,
        productId: req.query.productId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      }

      let report
      switch (reportType) {
        case 'stock-levels':
          report = await ReportService.generateStockLevelReport(filters)
          break
        case 'stock-movements':
          report = await ReportService.generateStockMovementReport(filters)
          break
        case 'low-stock':
          report = await ReportService.generateLowStockReport(filters)
          break
        case 'inventory-valuation':
          report = await ReportService.generateInventoryValuationReport(filters)
          break
        case 'sales-performance':
          report = await ReportService.generateSalesPerformanceReport(filters)
          break
        case 'product-performance':
          report = await ReportService.generateProductPerformanceReport(filters)
          break
        case 'customer-analytics':
          report = await ReportService.generateCustomerAnalyticsReport(filters)
          break
        default:
          return res.status(400).json({ error: 'Invalid report type' })
      }

      const exportOptions: ExportOptions = {
        format: exportFormat,
        filename: req.query.filename as string
      }

      let filepath: string
      let contentType: string
      let fileExtension: string

      switch (exportFormat) {
        case 'excel':
          filepath = await ReportService.exportToExcel(report, exportOptions)
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          fileExtension = 'xlsx'
          break
        case 'pdf':
          filepath = await ReportService.exportToPDF(report, exportOptions)
          contentType = 'application/pdf'
          fileExtension = 'pdf'
          break
        case 'csv':
          filepath = await ReportService.exportToCSV(report, exportOptions)
          contentType = 'text/csv'
          fileExtension = 'csv'
          break
        default:
          return res.status(400).json({ error: 'Invalid export format' })
      }

      const filename = `${report.title.replace(/\s+/g, '_')}_${Date.now()}.${fileExtension}`
      
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      
      const fileStream = createReadStream(filepath)
      fileStream.pipe(res)
      
      // Clean up temp file after sending
      fileStream.on('end', async () => {
        try {
          await fs.unlink(filepath)
        } catch (error) {
          logger.error('Error cleaning up temp file:', error)
        }
      })
      
    } catch (error) {
      logger.error('Error exporting report:', error)
      res.status(500).json({ error: 'Failed to export report' })
    }
  }

  // Scheduled reports
  static async scheduleReport(req: Request, res: Response) {
    try {
      const { reportType, schedule, recipients, format } = req.body

      if (!reportType || !schedule || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const scheduledReport = await ReportService.scheduleReport({
        reportType,
        schedule,
        recipients,
        format: format || 'pdf',
        filters: req.body.filters || {}
      })

      res.status(201).json(scheduledReport)
    } catch (error) {
      logger.error('Error scheduling report:', error)
      res.status(500).json({ error: 'Failed to schedule report' })
    }
  }

  static async getScheduledReports(req: Request, res: Response) {
    try {
      const scheduledReports = await ReportService.getScheduledReports()
      res.json(scheduledReports)
    } catch (error) {
      logger.error('Error getting scheduled reports:', error)
      res.status(500).json({ error: 'Failed to get scheduled reports' })
    }
  }

  static async updateScheduledReport(req: Request, res: Response) {
    try {
      const { id } = req.params
      const updates = req.body

      const updatedReport = await ReportService.updateScheduledReport(id, updates)
      res.json(updatedReport)
    } catch (error) {
      logger.error('Error updating scheduled report:', error)
      res.status(500).json({ error: 'Failed to update scheduled report' })
    }
  }

  static async deleteScheduledReport(req: Request, res: Response) {
    try {
      const { id } = req.params
      await ReportService.deleteScheduledReport(id)
      res.status(204).send()
    } catch (error) {
      logger.error('Error deleting scheduled report:', error)
      res.status(500).json({ error: 'Failed to delete scheduled report' })
    }
  }
}