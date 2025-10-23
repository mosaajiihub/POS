import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { RoleService } from '../services/roleService'
import { prisma } from '../config/database'
import { UserRole, UserStatus } from '@prisma/client'

describe('RoleService', () => {
  let testUserId: string
  let testRoleId: string

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        paymentVerified: true
      }
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.userRole_Assignment.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.rolePermission.deleteMany({
      where: { roleId: testRoleId }
    })
    if (testRoleId) {
      await prisma.role.deleteMany({
        where: { id: testRoleId }
      })
    }
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  beforeEach(async () => {
    // Initialize system roles and permissions
    await RoleService.initializeSystemRoles()
  })

  it('should initialize system roles and permissions', async () => {
    const rolesResult = await RoleService.getRoles()
    expect(rolesResult.success).toBe(true)
    expect(rolesResult.roles).toBeDefined()
    expect(rolesResult.roles!.length).toBeGreaterThan(0)

    const permissionsResult = await RoleService.getPermissions()
    expect(permissionsResult.success).toBe(true)
    expect(permissionsResult.permissions).toBeDefined()
    expect(permissionsResult.permissions!.length).toBeGreaterThan(0)
  })

  it('should create a new role', async () => {
    const roleData = {
      name: 'test-role',
      displayName: 'Test Role',
      description: 'A test role for unit testing',
      permissions: ['users:read', 'products:read']
    }

    const result = await RoleService.createRole(roleData, testUserId)
    expect(result.success).toBe(true)
    expect(result.role).toBeDefined()
    expect(result.role!.name).toBe('test-role')
    expect(result.role!.displayName).toBe('Test Role')

    testRoleId = result.role!.id
  })

  it('should get role by ID', async () => {
    // First create a role
    const createResult = await RoleService.createRole({
      name: 'get-test-role',
      displayName: 'Get Test Role',
      description: 'Role for get test'
    }, testUserId)
    
    expect(createResult.success).toBe(true)
    const roleId = createResult.role!.id

    // Then get it
    const getResult = await RoleService.getRole(roleId)
    expect(getResult.success).toBe(true)
    expect(getResult.role).toBeDefined()
    expect(getResult.role!.name).toBe('get-test-role')

    // Clean up
    await prisma.role.delete({ where: { id: roleId } })
  })

  it('should assign role to user', async () => {
    // Create a role first
    const createResult = await RoleService.createRole({
      name: 'assign-test-role',
      displayName: 'Assign Test Role',
      permissions: ['users:read']
    }, testUserId)
    
    expect(createResult.success).toBe(true)
    const roleId = createResult.role!.id

    // Assign role to user
    const assignResult = await RoleService.assignRoleToUser(testUserId, roleId, testUserId)
    expect(assignResult.success).toBe(true)
    expect(assignResult.assignment).toBeDefined()

    // Verify user has the role
    const userRolesResult = await RoleService.getUserRolesAndPermissions(testUserId)
    expect(userRolesResult.success).toBe(true)
    expect(userRolesResult.roles).toBeDefined()
    expect(userRolesResult.roles!.some(r => r.id === roleId)).toBe(true)

    // Clean up
    await prisma.userRole_Assignment.deleteMany({ where: { userId: testUserId, roleId } })
    await prisma.role.delete({ where: { id: roleId } })
  })

  it('should check user permissions', async () => {
    // Create a role with specific permissions
    const createResult = await RoleService.createRole({
      name: 'permission-test-role',
      displayName: 'Permission Test Role',
      permissions: ['users:read', 'products:create']
    }, testUserId)
    
    expect(createResult.success).toBe(true)
    const roleId = createResult.role!.id

    // Assign role to user
    await RoleService.assignRoleToUser(testUserId, roleId, testUserId)

    // Check permissions
    const hasReadPermission = await RoleService.userHasPermission(testUserId, 'users', 'read')
    expect(hasReadPermission).toBe(true)

    const hasCreatePermission = await RoleService.userHasPermission(testUserId, 'products', 'create')
    expect(hasCreatePermission).toBe(true)

    const hasDeletePermission = await RoleService.userHasPermission(testUserId, 'users', 'delete')
    expect(hasDeletePermission).toBe(false)

    // Clean up
    await prisma.userRole_Assignment.deleteMany({ where: { userId: testUserId, roleId } })
    await prisma.role.delete({ where: { id: roleId } })
  })

  it('should prevent deletion of system roles', async () => {
    // Try to get a system role
    const rolesResult = await RoleService.getRoles()
    const systemRole = rolesResult.roles!.find(r => r.isSystem)
    
    if (systemRole) {
      const deleteResult = await RoleService.deleteRole(systemRole.id, testUserId)
      expect(deleteResult.success).toBe(false)
      expect(deleteResult.message).toContain('system roles')
    }
  })
})