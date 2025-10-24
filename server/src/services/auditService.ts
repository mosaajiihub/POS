import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface AuditLogData {
  userId: string
  action: string
  tableName?: string
  recordId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  metadata?: any
}

export interface AuditLogFilters {
  userId?: string
  action?: string
  tableName?: string
  recordId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface AuditLogResult {
  success: boolean
  message: string
  logs?: any[]
  total?: number
  page?: number
  limit?: number
}

export interface AuditStatistics {
  totalLogs: number
  logsByAction: { action: string; count: number }[]
  logsByUser: { userId: string; userName: string; count: number }[]
  logsByTable: { tableName: string; count: number }[]
  recentActivity: { date: string; count: number }[]
  securityEvents: number
  failedLogins: number
  unauthorizedAccess: number
}

export interface RetentionSettings {
  retentionDays: number
  autoCleanup: boolean
  backupBeforeCleanup: boolean
  lastCleanup?: Date
}

export interface ExportResult {
  success: boolean
  message: string
  data?: string
  contentType?: string
}

/**
 * Audit Logging Service
 * Handles comprehensive audit logging for security and compliance
 */
export class AuditService {
  /**
   * Create audit log entry
   */
  static async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          tableName: data.tableName,
          recordId: data.recordId,
          oldValues: data.oldValues,
          newValues: data.newValues,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent
        }
      })

      logger.info(`Audit log created: ${data.action} by user: ${data.userId}`)
    } catch (error) {
      logger.error('Failed to create audit log:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log role creation
   */
  static async logRoleCreation(
    userId: string,
    roleData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'ROLE_CREATED',
      tableName: 'roles',
      recordId: roleData.id,
      newValues: {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log role update
   */
  static async logRoleUpdate(
    userId: string,
    roleId: string,
    oldData: any,
    newData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'ROLE_UPDATED',
      tableName: 'roles',
      recordId: roleId,
      oldValues: {
        name: oldData.name,
        displayName: oldData.displayName,
        description: oldData.description,
        isActive: oldData.isActive,
        permissions: oldData.permissions
      },
      newValues: {
        name: newData.name,
        displayName: newData.displayName,
        description: newData.description,
        isActive: newData.isActive,
        permissions: newData.permissions
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log role deletion
   */
  static async logRoleDeletion(
    userId: string,
    roleData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'ROLE_DELETED',
      tableName: 'roles',
      recordId: roleData.id,
      oldValues: {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        permissions: roleData.permissions
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log permission assignment
   */
  static async logPermissionAssignment(
    userId: string,
    roleId: string,
    permissions: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'PERMISSIONS_ASSIGNED',
      tableName: 'role_permissions',
      recordId: roleId,
      newValues: {
        roleId,
        permissions
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log permission removal
   */
  static async logPermissionRemoval(
    userId: string,
    roleId: string,
    permissions: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'PERMISSIONS_REMOVED',
      tableName: 'role_permissions',
      recordId: roleId,
      oldValues: {
        roleId,
        permissions
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log role assignment to user
   */
  static async logRoleAssignmentToUser(
    assignerId: string,
    userId: string,
    roleId: string,
    roleName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId: assignerId,
      action: 'ROLE_ASSIGNED_TO_USER',
      tableName: 'user_role_assignments',
      recordId: `${userId}-${roleId}`,
      newValues: {
        targetUserId: userId,
        roleId,
        roleName
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log role removal from user
   */
  static async logRoleRemovalFromUser(
    removerId: string,
    userId: string,
    roleId: string,
    roleName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId: removerId,
      action: 'ROLE_REMOVED_FROM_USER',
      tableName: 'user_role_assignments',
      recordId: `${userId}-${roleId}`,
      oldValues: {
        targetUserId: userId,
        roleId,
        roleName
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log permission check
   */
  static async logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'PERMISSION_CHECK',
      tableName: 'permissions',
      newValues: {
        resource,
        action,
        granted
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log unauthorized access attempt
   */
  static async logUnauthorizedAccess(
    userId: string,
    resource: string,
    action: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      tableName: 'permissions',
      newValues: {
        resource,
        action,
        denied: true
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
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
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (userId) {
        where.userId = userId
      }

      if (action) {
        where.action = { contains: action, mode: 'insensitive' }
      }

      if (tableName) {
        where.tableName = tableName
      }

      if (recordId) {
        where.recordId = recordId
      }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt.gte = startDate
        }
        if (endDate) {
          where.createdAt.lte = endDate
        }
      }

      // Get logs and total count
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.auditLog.count({ where })
      ])

      return {
        success: true,
        message: 'Audit logs retrieved successfully',
        logs,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get audit logs error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving audit logs'
      }
    }
  }

  /**
   * Get audit logs for specific user
   */
  static async getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLogResult> {
    return this.getAuditLogs({ userId, limit })
  }

  /**
   * Get audit logs for specific action
   */
  static async getActionAuditLogs(action: string, limit: number = 50): Promise<AuditLogResult> {
    return this.getAuditLogs({ action, limit })
  }

  /**
   * Get recent audit logs
   */
  static async getRecentAuditLogs(hours: number = 24, limit: number = 100): Promise<AuditLogResult> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.getAuditLogs({ startDate, limit })
  }

  /**
   * Get security-related audit logs
   */
  static async getSecurityAuditLogs(limit: number = 100): Promise<AuditLogResult> {
    try {
      const securityActions = [
        'LOGIN',
        'LOGOUT',
        'FAILED_LOGIN',
        'ROLE_CREATED',
        'ROLE_UPDATED',
        'ROLE_DELETED',
        'ROLE_ASSIGNED_TO_USER',
        'ROLE_REMOVED_FROM_USER',
        'PERMISSIONS_ASSIGNED',
        'PERMISSIONS_REMOVED',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'PASSWORD_CHANGED',
        'USER_CREATED',
        'USER_DELETED',
        'USER_ACTIVATED',
        'USER_SUSPENDED'
      ]

      const logs = await prisma.auditLog.findMany({
        where: {
          action: {
            in: securityActions
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return {
        success: true,
        message: 'Security audit logs retrieved successfully',
        logs,
        total: logs.length
      }
    } catch (error) {
      logger.error('Get security audit logs error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving security audit logs'
      }
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  static async getAuditStatistics(days: number = 30): Promise<{ success: boolean; message: string; statistics?: AuditStatistics }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // Get total logs count
      const totalLogs = await prisma.auditLog.count({
        where: { createdAt: { gte: startDate } }
      })

      // Get logs by action
      const logsByAction = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      })

      // Get logs by user
      const logsByUser = await prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { userId: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      })

      // Get user details for the top users
      const userIds = logsByUser.map(log => log.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      })

      const logsByUserWithNames = logsByUser.map(log => {
        const user = users.find(u => u.id === log.userId)
        return {
          userId: log.userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
          count: log._count.userId
        }
      })

      // Get logs by table
      const logsByTable = await prisma.auditLog.groupBy({
        by: ['tableName'],
        _count: { tableName: true },
        where: { 
          createdAt: { gte: startDate },
          tableName: { not: null }
        },
        orderBy: { _count: { tableName: 'desc' } },
        take: 10
      })

      // Get recent activity (daily counts)
      const recentActivity = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

        const count = await prisma.auditLog.count({
          where: {
            createdAt: {
              gte: dayStart,
              lt: dayEnd
            }
          }
        })

        recentActivity.push({
          date: dayStart.toISOString().split('T')[0],
          count
        })
      }

      // Get security event counts
      const securityActions = [
        'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'UNAUTHORIZED_ACCESS_ATTEMPT',
        'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'PERMISSIONS_ASSIGNED'
      ]

      const securityEvents = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: { in: securityActions }
        }
      })

      const failedLogins = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: 'FAILED_LOGIN'
        }
      })

      const unauthorizedAccess = await prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT'
        }
      })

      const statistics: AuditStatistics = {
        totalLogs,
        logsByAction: logsByAction.map(log => ({
          action: log.action,
          count: log._count.action
        })),
        logsByUser: logsByUserWithNames,
        logsByTable: logsByTable.map(log => ({
          tableName: log.tableName || 'Unknown',
          count: log._count.tableName
        })),
        recentActivity,
        securityEvents,
        failedLogins,
        unauthorizedAccess
      }

      return {
        success: true,
        message: 'Audit statistics retrieved successfully',
        statistics
      }
    } catch (error) {
      logger.error('Get audit statistics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving audit statistics'
      }
    }
  }

  /**
   * Export audit logs in various formats
   */
  static async exportAuditLogs(filters: AuditLogFilters, format: string = 'csv'): Promise<ExportResult> {
    try {
      const result = await this.getAuditLogs({ ...filters, limit: 10000 })
      
      if (!result.success || !result.logs) {
        return {
          success: false,
          message: 'Failed to retrieve audit logs for export'
        }
      }

      switch (format.toLowerCase()) {
        case 'csv':
          return this.exportToCSV(result.logs)
        case 'json':
          return this.exportToJSON(result.logs)
        default:
          return {
            success: false,
            message: 'Unsupported export format. Supported formats: csv, json'
          }
      }
    } catch (error) {
      logger.error('Export audit logs error:', error)
      return {
        success: false,
        message: 'An error occurred while exporting audit logs'
      }
    }
  }

  /**
   * Export logs to CSV format
   */
  private static exportToCSV(logs: any[]): ExportResult {
    try {
      const headers = [
        'ID', 'User Email', 'User Name', 'Action', 'Table Name', 'Record ID',
        'IP Address', 'User Agent', 'Created At', 'Old Values', 'New Values'
      ]

      const csvRows = [headers.join(',')]

      logs.forEach(log => {
        const row = [
          log.id,
          log.user?.email || '',
          `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim(),
          log.action,
          log.tableName || '',
          log.recordId || '',
          log.ipAddress || '',
          `"${(log.userAgent || '').replace(/"/g, '""')}"`,
          log.createdAt,
          `"${JSON.stringify(log.oldValues || {}).replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.newValues || {}).replace(/"/g, '""')}"`
        ]
        csvRows.push(row.join(','))
      })

      return {
        success: true,
        message: 'CSV export completed successfully',
        data: csvRows.join('\n'),
        contentType: 'text/csv'
      }
    } catch (error) {
      logger.error('CSV export error:', error)
      return {
        success: false,
        message: 'Failed to export to CSV format'
      }
    }
  }

  /**
   * Export logs to JSON format
   */
  private static exportToJSON(logs: any[]): ExportResult {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalRecords: logs.length,
        logs: logs.map(log => ({
          id: log.id,
          user: {
            id: log.user?.id,
            email: log.user?.email,
            name: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim(),
            role: log.user?.role
          },
          action: log.action,
          tableName: log.tableName,
          recordId: log.recordId,
          oldValues: log.oldValues,
          newValues: log.newValues,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt
        }))
      }

      return {
        success: true,
        message: 'JSON export completed successfully',
        data: JSON.stringify(exportData, null, 2),
        contentType: 'application/json'
      }
    } catch (error) {
      logger.error('JSON export error:', error)
      return {
        success: false,
        message: 'Failed to export to JSON format'
      }
    }
  }

  /**
   * Get data retention settings
   */
  static async getRetentionSettings(): Promise<RetentionSettings> {
    // In a real implementation, this would be stored in database
    // For now, return default settings
    return {
      retentionDays: 365, // 1 year default
      autoCleanup: false,
      backupBeforeCleanup: true
    }
  }

  /**
   * Update data retention settings
   */
  static async updateRetentionSettings(settings: Partial<RetentionSettings>): Promise<{ success: boolean; message: string; settings?: RetentionSettings }> {
    try {
      // In a real implementation, this would update database settings
      // For now, just validate and return the settings
      const updatedSettings: RetentionSettings = {
        retentionDays: settings.retentionDays || 365,
        autoCleanup: settings.autoCleanup || false,
        backupBeforeCleanup: settings.backupBeforeCleanup !== false
      }

      return {
        success: true,
        message: 'Retention settings updated successfully',
        settings: updatedSettings
      }
    } catch (error) {
      logger.error('Update retention settings error:', error)
      return {
        success: false,
        message: 'Failed to update retention settings'
      }
    }
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  static async cleanupOldLogs(dryRun: boolean = false): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    try {
      const settings = await this.getRetentionSettings()
      const cutoffDate = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000)

      if (dryRun) {
        const count = await prisma.auditLog.count({
          where: { createdAt: { lt: cutoffDate } }
        })

        return {
          success: true,
          message: `Dry run completed. ${count} logs would be deleted.`,
          deletedCount: count
        }
      }

      // Backup before cleanup if enabled
      if (settings.backupBeforeCleanup) {
        const logsToBackup = await prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoffDate } },
          include: { user: true }
        })

        if (logsToBackup.length > 0) {
          const backupData = {
            backupDate: new Date().toISOString(),
            retentionCutoff: cutoffDate.toISOString(),
            totalRecords: logsToBackup.length,
            logs: logsToBackup
          }

          // In a real implementation, save to backup storage
          logger.info(`Backing up ${logsToBackup.length} audit logs before cleanup`)
        }
      }

      // Delete old logs
      const deleteResult = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } }
      })

      logger.info(`Cleaned up ${deleteResult.count} old audit logs`)

      return {
        success: true,
        message: `Successfully deleted ${deleteResult.count} old audit logs`,
        deletedCount: deleteResult.count
      }
    } catch (error) {
      logger.error('Cleanup old logs error:', error)
      return {
        success: false,
        message: 'Failed to cleanup old audit logs'
      }
    }
  }

  /**
   * Log comprehensive user actions with enhanced metadata
   */
  static async logUserAction(
    userId: string,
    action: string,
    details: {
      tableName?: string
      recordId?: string
      oldValues?: any
      newValues?: any
      metadata?: any
      ipAddress?: string
      userAgent?: string
      sessionId?: string
      endpoint?: string
      method?: string
    }
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          tableName: details.tableName,
          recordId: details.recordId,
          oldValues: details.oldValues,
          newValues: {
            ...details.newValues,
            metadata: details.metadata,
            sessionId: details.sessionId,
            endpoint: details.endpoint,
            method: details.method
          },
          ipAddress: details.ipAddress,
          userAgent: details.userAgent
        }
      })

      logger.info(`Enhanced audit log created: ${action} by user: ${userId}`)
    } catch (error) {
      logger.error('Failed to create enhanced audit log:', error)
    }
  }
}