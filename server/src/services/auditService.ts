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
}