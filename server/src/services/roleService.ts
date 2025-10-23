import { Role, Permission, RolePermission, UserRole_Assignment } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface CreateRoleData {
  name: string
  displayName: string
  description?: string
  permissions?: string[]
}

export interface UpdateRoleData {
  name?: string
  displayName?: string
  description?: string
  isActive?: boolean
  permissions?: string[]
}

export interface RoleResult {
  success: boolean
  message: string
  role?: Role & { permissions?: Permission[] }
}

export interface RoleListResult {
  success: boolean
  message: string
  roles?: (Role & { permissions: Permission[], userCount: number })[]
  total?: number
}

export interface PermissionResult {
  success: boolean
  message: string
  permission?: Permission
}

export interface PermissionListResult {
  success: boolean
  message: string
  permissions?: Permission[]
  total?: number
}

export interface UserRoleAssignmentResult {
  success: boolean
  message: string
  assignment?: UserRole_Assignment
}

/**
 * Role and Permission Management Service
 * Handles role definitions, permission assignments, and user role management
 */
export class RoleService {
  /**
   * Initialize system roles and permissions
   */
  static async initializeSystemRoles(): Promise<void> {
    try {
      // Create system permissions
      const systemPermissions = [
        // User management
        { resource: 'users', action: 'create', displayName: 'Create Users', description: 'Create new user accounts' },
        { resource: 'users', action: 'read', displayName: 'View Users', description: 'View user information' },
        { resource: 'users', action: 'update', displayName: 'Update Users', description: 'Update user information' },
        { resource: 'users', action: 'delete', displayName: 'Delete Users', description: 'Delete user accounts' },
        { resource: 'users', action: 'activate', displayName: 'Activate Users', description: 'Activate/deactivate users' },
        
        // Role management
        { resource: 'roles', action: 'create', displayName: 'Create Roles', description: 'Create new roles' },
        { resource: 'roles', action: 'read', displayName: 'View Roles', description: 'View role information' },
        { resource: 'roles', action: 'update', displayName: 'Update Roles', description: 'Update role information' },
        { resource: 'roles', action: 'delete', displayName: 'Delete Roles', description: 'Delete roles' },
        { resource: 'roles', action: 'assign', displayName: 'Assign Roles', description: 'Assign roles to users' },
        
        // Product management
        { resource: 'products', action: 'create', displayName: 'Create Products', description: 'Create new products' },
        { resource: 'products', action: 'read', displayName: 'View Products', description: 'View product information' },
        { resource: 'products', action: 'update', displayName: 'Update Products', description: 'Update product information' },
        { resource: 'products', action: 'delete', displayName: 'Delete Products', description: 'Delete products' },
        
        // Sales management
        { resource: 'sales', action: 'create', displayName: 'Create Sales', description: 'Process sales transactions' },
        { resource: 'sales', action: 'read', displayName: 'View Sales', description: 'View sales information' },
        { resource: 'sales', action: 'update', displayName: 'Update Sales', description: 'Update sales information' },
        { resource: 'sales', action: 'void', displayName: 'Void Sales', description: 'Void sales transactions' },
        { resource: 'sales', action: 'refund', displayName: 'Process Refunds', description: 'Process refunds' },
        
        // Inventory management
        { resource: 'inventory', action: 'read', displayName: 'View Inventory', description: 'View inventory levels' },
        { resource: 'inventory', action: 'update', displayName: 'Update Inventory', description: 'Update inventory levels' },
        { resource: 'inventory', action: 'adjust', displayName: 'Adjust Inventory', description: 'Make inventory adjustments' },
        
        // Reports
        { resource: 'reports', action: 'read', displayName: 'View Reports', description: 'View business reports' },
        { resource: 'reports', action: 'export', displayName: 'Export Reports', description: 'Export reports to files' },
        
        // Customer management
        { resource: 'customers', action: 'create', displayName: 'Create Customers', description: 'Create customer profiles' },
        { resource: 'customers', action: 'read', displayName: 'View Customers', description: 'View customer information' },
        { resource: 'customers', action: 'update', displayName: 'Update Customers', description: 'Update customer information' },
        { resource: 'customers', action: 'delete', displayName: 'Delete Customers', description: 'Delete customer profiles' },
        
        // Supplier management
        { resource: 'suppliers', action: 'create', displayName: 'Create Suppliers', description: 'Create supplier profiles' },
        { resource: 'suppliers', action: 'read', displayName: 'View Suppliers', description: 'View supplier information' },
        { resource: 'suppliers', action: 'update', displayName: 'Update Suppliers', description: 'Update supplier information' },
        { resource: 'suppliers', action: 'delete', displayName: 'Delete Suppliers', description: 'Delete supplier profiles' },
        
        // System administration
        { resource: 'system', action: 'configure', displayName: 'System Configuration', description: 'Configure system settings' },
        { resource: 'system', action: 'backup', displayName: 'System Backup', description: 'Perform system backups' },
        { resource: 'system', action: 'audit', displayName: 'View Audit Logs', description: 'View system audit logs' }
      ]

      // Create permissions if they don't exist
      for (const permData of systemPermissions) {
        await prisma.permission.upsert({
          where: { resource_action: { resource: permData.resource, action: permData.action } },
          update: {},
          create: { ...permData, isSystem: true }
        })
      }

      // Create system roles
      const systemRoles = [
        {
          name: 'admin',
          displayName: 'Administrator',
          description: 'Full system access with all permissions',
          permissions: systemPermissions.map(p => `${p.resource}:${p.action}`)
        },
        {
          name: 'manager',
          displayName: 'Manager',
          description: 'Management access with most permissions except system administration',
          permissions: [
            'users:read', 'users:create', 'users:update', 'users:activate',
            'products:create', 'products:read', 'products:update', 'products:delete',
            'sales:create', 'sales:read', 'sales:update', 'sales:void', 'sales:refund',
            'inventory:read', 'inventory:update', 'inventory:adjust',
            'reports:read', 'reports:export',
            'customers:create', 'customers:read', 'customers:update', 'customers:delete',
            'suppliers:create', 'suppliers:read', 'suppliers:update', 'suppliers:delete'
          ]
        },
        {
          name: 'cashier',
          displayName: 'Cashier',
          description: 'Point of sale operations and basic customer management',
          permissions: [
            'products:read',
            'sales:create', 'sales:read',
            'inventory:read',
            'customers:read', 'customers:create'
          ]
        },
        {
          name: 'viewer',
          displayName: 'Viewer',
          description: 'Read-only access to basic information',
          permissions: [
            'products:read',
            'sales:read',
            'inventory:read',
            'customers:read',
            'reports:read'
          ]
        }
      ]

      // Find admin user to assign as creator
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      })

      if (!adminUser) {
        logger.warn('No admin user found for role initialization')
        return
      }

      // Create system roles
      for (const roleData of systemRoles) {
        const existingRole = await prisma.role.findUnique({
          where: { name: roleData.name }
        })

        if (!existingRole) {
          const role = await prisma.role.create({
            data: {
              name: roleData.name,
              displayName: roleData.displayName,
              description: roleData.description,
              isSystem: true,
              createdBy: adminUser.id
            }
          })

          // Assign permissions to role
          for (const permissionKey of roleData.permissions) {
            const [resource, action] = permissionKey.split(':')
            const permission = await prisma.permission.findUnique({
              where: { resource_action: { resource, action } }
            })

            if (permission) {
              await prisma.rolePermission.create({
                data: {
                  roleId: role.id,
                  permissionId: permission.id,
                  granted: true
                }
              })
            }
          }
        }
      }

      logger.info('System roles and permissions initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize system roles:', error)
      throw error
    }
  }

  /**
   * Create a new role
   */
  static async createRole(roleData: CreateRoleData, creatorId: string): Promise<RoleResult> {
    try {
      const { name, displayName, description, permissions = [] } = roleData

      // Check if role name already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: name.toLowerCase() }
      })

      if (existingRole) {
        return {
          success: false,
          message: 'Role with this name already exists'
        }
      }

      // Create role
      const role = await prisma.role.create({
        data: {
          name: name.toLowerCase(),
          displayName,
          description,
          createdBy: creatorId
        }
      })

      // Assign permissions if provided
      if (permissions.length > 0) {
        await this.assignPermissionsToRole(role.id, permissions)
      }

      // Fetch role with permissions
      const roleWithPermissions = await this.getRoleWithPermissions(role.id)

      // Log audit trail
      await AuditService.logRoleCreation(creatorId, {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions
      })

      logger.info(`Role created: ${role.name} by user: ${creatorId}`)

      return {
        success: true,
        message: 'Role created successfully',
        role: roleWithPermissions
      }
    } catch (error) {
      logger.error('Create role error:', error)
      return {
        success: false,
        message: 'An error occurred while creating role'
      }
    }
  }

  /**
   * Update an existing role
   */
  static async updateRole(roleId: string, updateData: UpdateRoleData, updaterId: string): Promise<RoleResult> {
    try {
      const { name, displayName, description, isActive, permissions } = updateData

      // Find existing role
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!existingRole) {
        return {
          success: false,
          message: 'Role not found'
        }
      }

      // Check if it's a system role and prevent certain updates
      if (existingRole.isSystem && (name || isActive === false)) {
        return {
          success: false,
          message: 'Cannot modify name or deactivate system roles'
        }
      }

      // Check if new name already exists
      if (name && name.toLowerCase() !== existingRole.name) {
        const nameExists = await prisma.role.findUnique({
          where: { name: name.toLowerCase() }
        })

        if (nameExists) {
          return {
            success: false,
            message: 'Role name already exists'
          }
        }
      }

      // Update role
      const updatePayload: any = { updatedBy: updaterId }
      if (name) updatePayload.name = name.toLowerCase()
      if (displayName) updatePayload.displayName = displayName
      if (description !== undefined) updatePayload.description = description
      if (isActive !== undefined) updatePayload.isActive = isActive

      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: updatePayload
      })

      // Update permissions if provided
      if (permissions) {
        await this.updateRolePermissions(roleId, permissions)
      }

      // Fetch role with permissions
      const roleWithPermissions = await this.getRoleWithPermissions(updatedRole.id)

      // Log audit trail
      await AuditService.logRoleUpdate(updaterId, roleId, existingRole, {
        name: updatedRole.name,
        displayName: updatedRole.displayName,
        description: updatedRole.description,
        isActive: updatedRole.isActive,
        permissions
      })

      logger.info(`Role updated: ${updatedRole.name} by user: ${updaterId}`)

      return {
        success: true,
        message: 'Role updated successfully',
        role: roleWithPermissions
      }
    } catch (error) {
      logger.error('Update role error:', error)
      return {
        success: false,
        message: 'An error occurred while updating role'
      }
    }
  }

  /**
   * Get role by ID with permissions
   */
  static async getRole(roleId: string): Promise<RoleResult> {
    try {
      const role = await this.getRoleWithPermissions(roleId)

      if (!role) {
        return {
          success: false,
          message: 'Role not found'
        }
      }

      return {
        success: true,
        message: 'Role retrieved successfully',
        role
      }
    } catch (error) {
      logger.error('Get role error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving role'
      }
    }
  }

  /**
   * Get all roles with permissions and user counts
   */
  static async getRoles(): Promise<RoleListResult> {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          userRoles: {
            where: { isActive: true }
          }
        },
        orderBy: [
          { isSystem: 'desc' },
          { name: 'asc' }
        ]
      })

      const rolesWithDetails = roles.map(role => ({
        ...role,
        permissions: role.permissions.map(rp => rp.permission),
        userCount: role.userRoles.length
      }))

      return {
        success: true,
        message: 'Roles retrieved successfully',
        roles: rolesWithDetails,
        total: roles.length
      }
    } catch (error) {
      logger.error('Get roles error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving roles'
      }
    }
  }

  /**
   * Delete a role
   */
  static async deleteRole(roleId: string, deleterId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find role
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          userRoles: { where: { isActive: true } }
        }
      })

      if (!role) {
        return {
          success: false,
          message: 'Role not found'
        }
      }

      // Prevent deletion of system roles
      if (role.isSystem) {
        return {
          success: false,
          message: 'Cannot delete system roles'
        }
      }

      // Check if role is assigned to users
      if (role.userRoles.length > 0) {
        return {
          success: false,
          message: 'Cannot delete role that is assigned to users'
        }
      }

      // Log audit trail before deletion
      await AuditService.logRoleDeletion(deleterId, {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions?.map(rp => `${rp.permission.resource}:${rp.permission.action}`) || []
      })

      // Delete role (this will cascade to role_permissions)
      await prisma.role.delete({
        where: { id: roleId }
      })

      logger.info(`Role deleted: ${role.name} by user: ${deleterId}`)

      return {
        success: true,
        message: 'Role deleted successfully'
      }
    } catch (error) {
      logger.error('Delete role error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting role'
      }
    }
  }

  /**
   * Get all permissions
   */
  static async getPermissions(): Promise<PermissionListResult> {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' }
        ]
      })

      return {
        success: true,
        message: 'Permissions retrieved successfully',
        permissions,
        total: permissions.length
      }
    } catch (error) {
      logger.error('Get permissions error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving permissions'
      }
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(userId: string, roleId: string, assignerId: string): Promise<UserRoleAssignmentResult> {
    try {
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

      // Check if assignment already exists
      const existingAssignment = await prisma.userRole_Assignment.findUnique({
        where: { userId_roleId: { userId, roleId } }
      })

      if (existingAssignment) {
        if (existingAssignment.isActive) {
          return {
            success: false,
            message: 'User already has this role assigned'
          }
        } else {
          // Reactivate existing assignment
          const assignment = await prisma.userRole_Assignment.update({
            where: { id: existingAssignment.id },
            data: { isActive: true, assignedBy: assignerId, assignedAt: new Date() }
          })

          logger.info(`Role reassigned: ${role.name} to user: ${userId} by: ${assignerId}`)

          return {
            success: true,
            message: 'Role assigned successfully',
            assignment
          }
        }
      }

      // Create new assignment
      const assignment = await prisma.userRole_Assignment.create({
        data: {
          userId,
          roleId,
          assignedBy: assignerId
        }
      })

      // Log audit trail
      await AuditService.logRoleAssignmentToUser(assignerId, userId, roleId, role.name)

      logger.info(`Role assigned: ${role.name} to user: ${userId} by: ${assignerId}`)

      return {
        success: true,
        message: 'Role assigned successfully',
        assignment
      }
    } catch (error) {
      logger.error('Assign role to user error:', error)
      return {
        success: false,
        message: 'An error occurred while assigning role'
      }
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(userId: string, roleId: string, removerId: string): Promise<{ success: boolean; message: string }> {
    try {
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

      // Log audit trail
      await AuditService.logRoleRemovalFromUser(removerId, userId, roleId, assignment.role.name)

      // Deactivate assignment
      await prisma.userRole_Assignment.update({
        where: { id: assignment.id },
        data: { isActive: false }
      })

      logger.info(`Role removed: ${assignment.role.name} from user: ${userId} by: ${removerId}`)

      return {
        success: true,
        message: 'Role removed successfully'
      }
    } catch (error) {
      logger.error('Remove role from user error:', error)
      return {
        success: false,
        message: 'An error occurred while removing role'
      }
    }
  }

  /**
   * Get user roles and permissions
   */
  static async getUserRolesAndPermissions(userId: string) {
    try {
      const userRoles = await prisma.userRole_Assignment.findMany({
        where: { userId, isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      })

      const roles = userRoles.map(ur => ur.role)
      const permissions = new Map<string, Permission>()

      // Collect all permissions from all roles
      roles.forEach(role => {
        role.permissions.forEach(rp => {
          if (rp.granted) {
            const key = `${rp.permission.resource}:${rp.permission.action}`
            permissions.set(key, rp.permission)
          }
        })
      })

      return {
        success: true,
        message: 'User roles and permissions retrieved successfully',
        roles,
        permissions: Array.from(permissions.values())
      }
    } catch (error) {
      logger.error('Get user roles and permissions error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving user roles and permissions'
      }
    }
  }

  /**
   * Check if user has permission
   */
  static async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const userRoles = await prisma.userRole_Assignment.findMany({
        where: { userId, isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                },
                where: {
                  permission: {
                    resource,
                    action
                  },
                  granted: true
                }
              }
            }
          }
        }
      })

      return userRoles.some(ur => ur.role.permissions.length > 0)
    } catch (error) {
      logger.error('Check user permission error:', error)
      return false
    }
  }

  /**
   * Private helper methods
   */
  private static async getRoleWithPermissions(roleId: string) {
    return await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    }).then(role => {
      if (!role) return null
      return {
        ...role,
        permissions: role.permissions.map(rp => rp.permission)
      }
    })
  }

  private static async assignPermissionsToRole(roleId: string, permissions: string[]) {
    for (const permissionKey of permissions) {
      const [resource, action] = permissionKey.split(':')
      const permission = await prisma.permission.findUnique({
        where: { resource_action: { resource, action } }
      })

      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permission.id } },
          update: { granted: true },
          create: {
            roleId,
            permissionId: permission.id,
            granted: true
          }
        })
      }
    }
  }

  private static async updateRolePermissions(roleId: string, permissions: string[]) {
    // Remove all existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId }
    })

    // Add new permissions
    await this.assignPermissionsToRole(roleId, permissions)
  }
}