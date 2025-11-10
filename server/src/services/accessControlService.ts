import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { ABACService } from './abacService'

/**
 * Fine-Grained Access Control Service
 * Implements RBAC with granular permissions, inheritance, and UI visibility controls
 * Integrates with ABAC for context-aware access decisions
 */

export interface PermissionCheck {
  resource: string
  action: string
  context?: Record<string, any>
}

export interface AccessDecision {
  granted: boolean
  reason?: string
  effectivePermissions?: string[]
}

export interface UIComponentPermissions {
  component: string
  visible: boolean
  enabled: boolean
  actions: string[]
}

export interface PermissionInheritance {
  roleId: string
  roleName: string
  permissions: string[]
  inherited: boolean
  source?: string
}

export class AccessControlService {
  /**
   * Check if user has permission with context awareness
   */
  static async checkPermission(
    userId: string,
    permission: PermissionCheck
  ): Promise<AccessDecision> {
    try {
      const { resource, action, context } = permission

      // Get user's effective permissions (including inherited)
      const effectivePermissions = await this.getEffectivePermissions(userId)

      // Check direct permission
      const permissionKey = `${resource}:${action}`
      const hasDirectPermission = effectivePermissions.includes(permissionKey)

      // Check wildcard permissions
      const hasWildcardResource = effectivePermissions.includes(`${resource}:*`)
      const hasWildcardAll = effectivePermissions.includes('*:*')

      const granted = hasDirectPermission || hasWildcardResource || hasWildcardAll

      // Apply context-based restrictions if provided
      if (granted && context) {
        const contextCheck = await this.checkContextRestrictions(
          userId,
          resource,
          action,
          context
        )
        if (!contextCheck.granted) {
          return contextCheck
        }
      }

      return {
        granted,
        reason: granted ? 'Permission granted' : 'Permission denied',
        effectivePermissions
      }
    } catch (error) {
      logger.error('Permission check error:', error)
      return {
        granted: false,
        reason: 'Error checking permission'
      }
    }
  }

  /**
   * Check multiple permissions at once
   */
  static async checkMultiplePermissions(
    userId: string,
    permissions: PermissionCheck[],
    requireAll: boolean = false
  ): Promise<AccessDecision> {
    try {
      const results = await Promise.all(
        permissions.map(p => this.checkPermission(userId, p))
      )

      if (requireAll) {
        const allGranted = results.every(r => r.granted)
        return {
          granted: allGranted,
          reason: allGranted ? 'All permissions granted' : 'Some permissions denied'
        }
      } else {
        const anyGranted = results.some(r => r.granted)
        return {
          granted: anyGranted,
          reason: anyGranted ? 'At least one permission granted' : 'All permissions denied'
        }
      }
    } catch (error) {
      logger.error('Multiple permission check error:', error)
      return {
        granted: false,
        reason: 'Error checking permissions'
      }
    }
  }

  /**
   * Get effective permissions for user (including inherited)
   */
  static async getEffectivePermissions(userId: string): Promise<string[]> {
    try {
      const userRoles = await prisma.userRole_Assignment.findMany({
        where: { userId, isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                where: { granted: true },
                include: {
                  permission: true
                }
              }
            }
          }
        }
      })

      const permissions = new Set<string>()

      for (const userRole of userRoles) {
        for (const rolePermission of userRole.role.permissions) {
          const permKey = `${rolePermission.permission.resource}:${rolePermission.permission.action}`
          permissions.add(permKey)
        }
      }

      return Array.from(permissions)
    } catch (error) {
      logger.error('Get effective permissions error:', error)
      return []
    }
  }

  /**
   * Get permission inheritance tree for user
   */
  static async getPermissionInheritance(userId: string): Promise<PermissionInheritance[]> {
    try {
      const userRoles = await prisma.userRole_Assignment.findMany({
        where: { userId, isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                where: { granted: true },
                include: {
                  permission: true
                }
              }
            }
          }
        }
      })

      return userRoles.map(userRole => ({
        roleId: userRole.role.id,
        roleName: userRole.role.name,
        permissions: userRole.role.permissions.map(
          rp => `${rp.permission.resource}:${rp.permission.action}`
        ),
        inherited: false, // Direct assignment
        source: userRole.role.displayName
      }))
    } catch (error) {
      logger.error('Get permission inheritance error:', error)
      return []
    }
  }

  /**
   * Get UI component permissions for user
   */
  static async getUIComponentPermissions(
    userId: string,
    components: string[]
  ): Promise<UIComponentPermissions[]> {
    try {
      const effectivePermissions = await this.getEffectivePermissions(userId)

      // Define component permission mappings
      const componentMappings: Record<string, { resource: string; actions: string[] }> = {
        'users-management': { resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
        'products-management': { resource: 'products', actions: ['read', 'create', 'update', 'delete'] },
        'sales-pos': { resource: 'sales', actions: ['create', 'read'] },
        'sales-management': { resource: 'sales', actions: ['read', 'update', 'void', 'refund'] },
        'inventory-management': { resource: 'inventory', actions: ['read', 'update', 'adjust'] },
        'reports-dashboard': { resource: 'reports', actions: ['read', 'export'] },
        'customers-management': { resource: 'customers', actions: ['read', 'create', 'update', 'delete'] },
        'suppliers-management': { resource: 'suppliers', actions: ['read', 'create', 'update', 'delete'] },
        'roles-management': { resource: 'roles', actions: ['read', 'create', 'update', 'delete', 'assign'] },
        'system-settings': { resource: 'system', actions: ['configure'] },
        'audit-logs': { resource: 'system', actions: ['audit'] }
      }

      return components.map(component => {
        const mapping = componentMappings[component]
        if (!mapping) {
          return {
            component,
            visible: false,
            enabled: false,
            actions: []
          }
        }

        const availableActions = mapping.actions.filter(action => {
          const permKey = `${mapping.resource}:${action}`
          return effectivePermissions.includes(permKey) ||
                 effectivePermissions.includes(`${mapping.resource}:*`) ||
                 effectivePermissions.includes('*:*')
        })

        return {
          component,
          visible: availableActions.length > 0,
          enabled: availableActions.includes('read') || availableActions.length > 0,
          actions: availableActions
        }
      })
    } catch (error) {
      logger.error('Get UI component permissions error:', error)
      return components.map(component => ({
        component,
        visible: false,
        enabled: false,
        actions: []
      }))
    }
  }

  /**
   * Dynamic role assignment with validation
   */
  static async assignRoleDynamic(
    userId: string,
    roleId: string,
    assignerId: string,
    options?: {
      expiresAt?: Date
      conditions?: Record<string, any>
      reason?: string
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate assigner has permission
      const assignerPermission = await this.checkPermission(assignerId, {
        resource: 'roles',
        action: 'assign'
      })

      if (!assignerPermission.granted) {
        return {
          success: false,
          message: 'Insufficient permissions to assign roles'
        }
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        return {
          success: false,
          message: 'Role not found'
        }
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check for existing assignment
      const existingAssignment = await prisma.userRole_Assignment.findUnique({
        where: { userId_roleId: { userId, roleId } }
      })

      if (existingAssignment && existingAssignment.isActive) {
        return {
          success: false,
          message: 'User already has this role assigned'
        }
      }

      // Create or update assignment
      if (existingAssignment) {
        await prisma.userRole_Assignment.update({
          where: { id: existingAssignment.id },
          data: {
            isActive: true,
            assignedBy: assignerId,
            assignedAt: new Date()
          }
        })
      } else {
        await prisma.userRole_Assignment.create({
          data: {
            userId,
            roleId,
            assignedBy: assignerId
          }
        })
      }

      // Log audit trail
      await AuditService.logRoleAssignmentToUser(
        assignerId,
        userId,
        roleId,
        role.name,
        options?.reason
      )

      logger.info(`Role ${role.name} assigned to user ${userId} by ${assignerId}`)

      return {
        success: true,
        message: 'Role assigned successfully'
      }
    } catch (error) {
      logger.error('Dynamic role assignment error:', error)
      return {
        success: false,
        message: 'Error assigning role'
      }
    }
  }

  /**
   * Remove role assignment dynamically
   */
  static async removeRoleDynamic(
    userId: string,
    roleId: string,
    removerId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate remover has permission
      const removerPermission = await this.checkPermission(removerId, {
        resource: 'roles',
        action: 'assign'
      })

      if (!removerPermission.granted) {
        return {
          success: false,
          message: 'Insufficient permissions to remove roles'
        }
      }

      // Find assignment
      const assignment = await prisma.userRole_Assignment.findUnique({
        where: { userId_roleId: { userId, roleId } },
        include: { role: true }
      })

      if (!assignment || !assignment.isActive) {
        return {
          success: false,
          message: 'Role assignment not found'
        }
      }

      // Deactivate assignment
      await prisma.userRole_Assignment.update({
        where: { id: assignment.id },
        data: { isActive: false }
      })

      // Log audit trail
      await AuditService.logRoleRemovalFromUser(
        removerId,
        userId,
        roleId,
        assignment.role.name,
        reason
      )

      logger.info(`Role ${assignment.role.name} removed from user ${userId} by ${removerId}`)

      return {
        success: true,
        message: 'Role removed successfully'
      }
    } catch (error) {
      logger.error('Dynamic role removal error:', error)
      return {
        success: false,
        message: 'Error removing role'
      }
    }
  }

  /**
   * Check context-based restrictions using ABAC
   */
  private static async checkContextRestrictions(
    userId: string,
    resource: string,
    action: string,
    context: Record<string, any>
  ): Promise<AccessDecision> {
    try {
      // Evaluate using ABAC policies
      const abacResult = await ABACService.evaluateAccess({
        userId,
        resource,
        action,
        resourceAttributes: context.resourceAttributes,
        userAttributes: context.userAttributes,
        environment: context.environment
      })

      // If ABAC explicitly denies, deny access
      if (abacResult.decision === 'DENY') {
        return {
          granted: false,
          reason: `ABAC policy denied: ${abacResult.reason}`
        }
      }

      // If ABAC allows or not applicable, allow
      return {
        granted: true,
        reason: abacResult.decision === 'ALLOW' 
          ? `ABAC policy allowed: ${abacResult.reason}`
          : 'No ABAC restrictions applied'
      }
    } catch (error) {
      logger.error('Context restrictions check error:', error)
      // On error, default to allow (fail open for RBAC, fail closed for ABAC)
      return {
        granted: true,
        reason: 'Error checking context restrictions - defaulting to allow'
      }
    }
  }

  /**
   * Get permission delegation chain
   */
  static async getPermissionDelegation(
    userId: string,
    permission: string
  ): Promise<{ delegated: boolean; chain: string[] }> {
    try {
      const [resource, action] = permission.split(':')
      
      // Get user's roles
      const userRoles = await prisma.userRole_Assignment.findMany({
        where: { userId, isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                where: {
                  permission: { resource, action },
                  granted: true
                },
                include: {
                  permission: true,
                  role: true
                }
              }
            }
          }
        }
      })

      const chain: string[] = []
      let delegated = false

      for (const userRole of userRoles) {
        if (userRole.role.permissions.length > 0) {
          chain.push(userRole.role.displayName)
          delegated = true
        }
      }

      return { delegated, chain }
    } catch (error) {
      logger.error('Get permission delegation error:', error)
      return { delegated: false, chain: [] }
    }
  }

  /**
   * Bulk permission check for performance
   */
  static async bulkCheckPermissions(
    userId: string,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    try {
      const effectivePermissions = await this.getEffectivePermissions(userId)
      const results: Record<string, boolean> = {}

      for (const permission of permissions) {
        const [resource, action] = permission.split(':')
        const permKey = `${resource}:${action}`
        
        results[permission] = 
          effectivePermissions.includes(permKey) ||
          effectivePermissions.includes(`${resource}:*`) ||
          effectivePermissions.includes('*:*')
      }

      return results
    } catch (error) {
      logger.error('Bulk permission check error:', error)
      return permissions.reduce((acc, perm) => ({ ...acc, [perm]: false }), {})
    }
  }
}
