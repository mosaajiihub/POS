import { Request, Response } from 'express'
import { AuditService, AuditLogFilters } from '../services/auditService'
import { logger } from '../utils/logger'

/**
 * Audit Controller
 * Handles audit log retrieval and analysis endpoints
 */
export class AuditController {
  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const {
        userId,
        action,
        tableName,
        recordId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query

      const filters: AuditLogFilters = {
        userId: userId as string,
        action: action as string,
        tableName: tableName as string,
        recordId: recordId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Max 100 per page
      }

      const result = await AuditService.getAuditLogs(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'AUDIT_RETRIEVAL_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.ceil((result.total || 0) / (result.limit || 1))
          }
        }
      })
    } catch (error) {
      logger.error('Get audit logs error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving audit logs'
        }
      })
    }
  }

  /**
   * Get security-related audit logs
   */
  static async getSecurityLogs(req: Request, res: Response) {
    try {
      const { limit = 100 } = req.query
      const result = await AuditService.getSecurityAuditLogs(parseInt(limit as string))

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'SECURITY_LOGS_RETRIEVAL_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total
        }
      })
    } catch (error) {
      logger.error('Get security logs error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security logs'
        }
      })
    }
  }

  /**
   * Get user activity logs
   */
  static async getUserActivity(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const { limit = 50 } = req.query

      const result = await AuditService.getUserAuditLogs(userId, parseInt(limit as string))

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'USER_ACTIVITY_RETRIEVAL_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        data: {
          logs: result.logs,
          total: result.total
        }
      })
    } catch (error) {
      logger.error('Get user activity error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving user activity'
        }
      })
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query
      const result = await AuditService.getAuditStatistics(parseInt(days as string))

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'AUDIT_STATS_RETRIEVAL_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        data: result.statistics
      })
    } catch (error) {
      logger.error('Get audit statistics error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving audit statistics'
        }
      })
    }
  }

  /**
   * Export audit logs
   */
  static async exportAuditLogs(req: Request, res: Response) {
    try {
      const {
        format = 'csv',
        userId,
        action,
        tableName,
        startDate,
        endDate
      } = req.query

      const filters: AuditLogFilters = {
        userId: userId as string,
        action: action as string,
        tableName: tableName as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: 10000 // Max export limit
      }

      const result = await AuditService.exportAuditLogs(filters, format as string)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'AUDIT_EXPORT_FAILED',
            message: result.message
          }
        })
      }

      // Set appropriate headers for file download
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `audit_logs_${timestamp}.${format}`
      
      res.setHeader('Content-Type', result.contentType || 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(result.data)
    } catch (error) {
      logger.error('Export audit logs error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while exporting audit logs'
        }
      })
    }
  }

  /**
   * Get data retention settings
   */
  static async getRetentionSettings(req: Request, res: Response) {
    try {
      const settings = await AuditService.getRetentionSettings()
      
      res.json({
        success: true,
        data: settings
      })
    } catch (error) {
      logger.error('Get retention settings error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving retention settings'
        }
      })
    }
  }

  /**
   * Update data retention settings
   */
  static async updateRetentionSettings(req: Request, res: Response) {
    try {
      const { retentionDays, autoCleanup, backupBeforeCleanup } = req.body

      const result = await AuditService.updateRetentionSettings({
        retentionDays,
        autoCleanup,
        backupBeforeCleanup
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'RETENTION_UPDATE_FAILED',
            message: result.message
          }
        })
      }

      // Log the retention settings change
      if (req.user) {
        await AuditService.createAuditLog({
          userId: req.user.userId,
          action: 'RETENTION_SETTINGS_UPDATED',
          tableName: 'system_settings',
          newValues: { retentionDays, autoCleanup, backupBeforeCleanup },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        })
      }

      res.json({
        success: true,
        message: 'Retention settings updated successfully',
        data: result.settings
      })
    } catch (error) {
      logger.error('Update retention settings error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating retention settings'
        }
      })
    }
  }

  /**
   * Cleanup old audit logs
   */
  static async cleanupOldLogs(req: Request, res: Response) {
    try {
      const { dryRun = false } = req.query
      const result = await AuditService.cleanupOldLogs(dryRun === 'true')

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CLEANUP_FAILED',
            message: result.message
          }
        })
      }

      // Log the cleanup action
      if (req.user && !dryRun) {
        await AuditService.createAuditLog({
          userId: req.user.userId,
          action: 'AUDIT_LOGS_CLEANUP',
          tableName: 'audit_logs',
          newValues: { deletedCount: result.deletedCount },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        })
      }

      res.json({
        success: true,
        message: dryRun ? 'Cleanup simulation completed' : 'Cleanup completed successfully',
        data: {
          deletedCount: result.deletedCount,
          dryRun: dryRun === 'true'
        }
      })
    } catch (error) {
      logger.error('Cleanup old logs error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during cleanup'
        }
      })
    }
  }
}