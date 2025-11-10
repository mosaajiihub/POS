/**
 * End-to-End Test: User Role and Permission Workflow
 * Tests user authentication, role assignment, and permission enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

// Mock API services
vi.mock('../../services/apiService', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue({ success: true }),
    verifyToken: vi.fn(),
    refreshToken: vi.fn()
  },
  userApi: {
    getUsers: vi.fn().mockResolvedValue({
      users: [],
      total: 0
    }),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
  },
  roleApi: {
    getRoles: vi.fn().mockResolvedValue({
      roles: [
        {
          id: 'role-admin',
          name: 'Administrator',
          permissions: ['users:read', 'users:write', 'products:read', 'products:write', 'sales:read', 'sales:write']
        },
        {
          id: 'role-manager',
          name: 'Manager',
          permissions: ['products:read', 'products:write', 'sales:read', 'sales:write']
        },
        {
          id: 'role-cashier',
          name: 'Cashier',
          permissions: ['products:read', 'sales:read', 'sales:write']
        },
        {
          id: 'role-viewer',
          name: 'Viewer',
          permissions: ['products:read', 'sales:read']
        }
      ]
    }),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn()
  }
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('User Role and Permission Workflow E2E', () => {
  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().user = null
    useAuthStore.getState().token = null
    useAuthStore.getState().isAuthenticated = false
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should authenticate admin user and grant full access', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock successful admin login
    authApi.login = vi.fn().mockResolvedValue({
      success: true,
      token: 'admin-token-123',
      user: {
        id: 'user-admin',
        email: 'admin@mosaajii.com',
        firstName: 'Admin',
        lastName: 'User',
        role: {
          id: 'role-admin',
          name: 'Administrator',
          permissions: ['users:read', 'users:write', 'products:read', 'products:write', 'sales:read', 'sales:write']
        },
        status: 'ACTIVE',
        paymentVerified: true
      }
    })

    // Perform login
    const { login } = useAuthStore.getState()
    const result = await login('admin@mosaajii.com', 'admin123')

    expect(result.success).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.role.name).toBe('Administrator')

    // Verify admin has all permissions
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('users', 'read')).toBe(true)
    expect(hasPermission('users', 'write')).toBe(true)
    expect(hasPermission('products', 'read')).toBe(true)
    expect(hasPermission('products', 'write')).toBe(true)
    expect(hasPermission('sales', 'read')).toBe(true)
    expect(hasPermission('sales', 'write')).toBe(true)

    // Verify API was called correctly
    expect(authApi.login).toHaveBeenCalledWith('admin@mosaajii.com', 'admin123')
  })

  it('should authenticate cashier user with limited permissions', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock successful cashier login
    authApi.login = vi.fn().mockResolvedValue({
      success: true,
      token: 'cashier-token-123',
      user: {
        id: 'user-cashier',
        email: 'cashier@mosaajii.com',
        firstName: 'Cashier',
        lastName: 'User',
        role: {
          id: 'role-cashier',
          name: 'Cashier',
          permissions: ['products:read', 'sales:read', 'sales:write']
        },
        status: 'ACTIVE',
        paymentVerified: true
      }
    })

    // Perform login
    const { login } = useAuthStore.getState()
    const result = await login('cashier@mosaajii.com', 'cashier123')

    expect(result.success).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.role.name).toBe('Cashier')

    // Verify cashier has limited permissions
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('products', 'read')).toBe(true)
    expect(hasPermission('products', 'write')).toBe(false) // No write access to products
    expect(hasPermission('sales', 'read')).toBe(true)
    expect(hasPermission('sales', 'write')).toBe(true)
    expect(hasPermission('users', 'read')).toBe(false) // No access to users
    expect(hasPermission('users', 'write')).toBe(false)
  })

  it('should authenticate viewer user with read-only access', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock successful viewer login
    authApi.login = vi.fn().mockResolvedValue({
      success: true,
      token: 'viewer-token-123',
      user: {
        id: 'user-viewer',
        email: 'viewer@mosaajii.com',
        firstName: 'Viewer',
        lastName: 'User',
        role: {
          id: 'role-viewer',
          name: 'Viewer',
          permissions: ['products:read', 'sales:read']
        },
        status: 'ACTIVE',
        paymentVerified: true
      }
    })

    // Perform login
    const { login } = useAuthStore.getState()
    const result = await login('viewer@mosaajii.com', 'viewer123')

    expect(result.success).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.role.name).toBe('Viewer')

    // Verify viewer has only read permissions
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('products', 'read')).toBe(true)
    expect(hasPermission('products', 'write')).toBe(false)
    expect(hasPermission('sales', 'read')).toBe(true)
    expect(hasPermission('sales', 'write')).toBe(false) // No write access
    expect(hasPermission('users', 'read')).toBe(false)
    expect(hasPermission('users', 'write')).toBe(false)
  })

  it('should reject login for inactive user', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock login failure for inactive user
    authApi.login = vi.fn().mockRejectedValue({
      code: 'USER_INACTIVE',
      message: 'User account is inactive'
    })

    // Attempt login
    const { login } = useAuthStore.getState()
    
    await expect(
      login('inactive@mosaajii.com', 'password123')
    ).rejects.toMatchObject({
      code: 'USER_INACTIVE',
      message: 'User account is inactive'
    })

    // Verify user is not authenticated
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('should reject login for user with unverified payment', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock login failure for unverified payment
    authApi.login = vi.fn().mockRejectedValue({
      code: 'PAYMENT_NOT_VERIFIED',
      message: 'Payment verification required'
    })

    // Attempt login
    const { login } = useAuthStore.getState()
    
    await expect(
      login('unverified@mosaajii.com', 'password123')
    ).rejects.toMatchObject({
      code: 'PAYMENT_NOT_VERIFIED',
      message: 'Payment verification required'
    })

    // Verify user is not authenticated
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('should handle token expiration and refresh', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock initial successful login
    authApi.login = vi.fn().mockResolvedValue({
      success: true,
      token: 'initial-token',
      user: {
        id: 'user-1',
        email: 'user@mosaajii.com',
        role: { name: 'Manager', permissions: ['products:read'] }
      }
    })

    // Login user
    const { login } = useAuthStore.getState()
    await login('user@mosaajii.com', 'password123')

    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    // Mock token verification failure (expired)
    authApi.verifyToken = vi.fn().mockRejectedValue({
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired'
    })

    // Mock successful token refresh
    authApi.refreshToken = vi.fn().mockResolvedValue({
      success: true,
      token: 'refreshed-token',
      user: {
        id: 'user-1',
        email: 'user@mosaajii.com',
        role: { name: 'Manager', permissions: ['products:read'] }
      }
    })

    // Simulate token refresh
    const { refreshToken } = useAuthStore.getState()
    const refreshResult = await refreshToken()

    expect(refreshResult.success).toBe(true)
    expect(useAuthStore.getState().token).toBe('refreshed-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should logout user and clear session', async () => {
    const { authApi } = await import('../../services/apiService')
    
    // Mock successful login first
    authApi.login = vi.fn().mockResolvedValue({
      success: true,
      token: 'user-token',
      user: {
        id: 'user-1',
        email: 'user@mosaajii.com',
        role: { name: 'Cashier', permissions: ['sales:read'] }
      }
    })

    // Login user
    const { login } = useAuthStore.getState()
    await login('user@mosaajii.com', 'password123')

    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    // Logout user
    const { logout } = useAuthStore.getState()
    await logout()

    // Verify user is logged out
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()

    // Verify API was called
    expect(authApi.logout).toHaveBeenCalled()
  })

  it('should enforce permission-based access control', async () => {
    // Test different user roles and their access to various operations
    const testCases = [
      {
        role: 'Administrator',
        permissions: ['users:read', 'users:write', 'products:read', 'products:write', 'sales:read', 'sales:write'],
        expectedAccess: {
          canViewUsers: true,
          canCreateUsers: true,
          canEditProducts: true,
          canProcessSales: true,
          canViewReports: true
        }
      },
      {
        role: 'Manager',
        permissions: ['products:read', 'products:write', 'sales:read', 'sales:write'],
        expectedAccess: {
          canViewUsers: false,
          canCreateUsers: false,
          canEditProducts: true,
          canProcessSales: true,
          canViewReports: true
        }
      },
      {
        role: 'Cashier',
        permissions: ['products:read', 'sales:read', 'sales:write'],
        expectedAccess: {
          canViewUsers: false,
          canCreateUsers: false,
          canEditProducts: false,
          canProcessSales: true,
          canViewReports: false
        }
      },
      {
        role: 'Viewer',
        permissions: ['products:read', 'sales:read'],
        expectedAccess: {
          canViewUsers: false,
          canCreateUsers: false,
          canEditProducts: false,
          canProcessSales: false,
          canViewReports: true
        }
      }
    ]

    for (const testCase of testCases) {
      // Set up user with specific role
      useAuthStore.getState().user = {
        id: 'test-user',
        email: 'test@mosaajii.com',
        firstName: 'Test',
        lastName: 'User',
        role: {
          id: `role-${testCase.role.toLowerCase()}`,
          name: testCase.role,
          permissions: testCase.permissions
        },
        status: 'ACTIVE',
        paymentVerified: true
      }
      useAuthStore.getState().isAuthenticated = true

      const { hasPermission } = useAuthStore.getState()

      // Test permissions
      expect(hasPermission('users', 'read')).toBe(testCase.expectedAccess.canViewUsers)
      expect(hasPermission('users', 'write')).toBe(testCase.expectedAccess.canCreateUsers)
      expect(hasPermission('products', 'write')).toBe(testCase.expectedAccess.canEditProducts)
      expect(hasPermission('sales', 'write')).toBe(testCase.expectedAccess.canProcessSales)
      expect(hasPermission('reports', 'read')).toBe(testCase.expectedAccess.canViewReports)
    }
  })

  it('should handle role updates and permission changes', async () => {
    const { authApi, roleApi } = await import('../../services/apiService')
    
    // Mock initial login as manager
    authApi.login = vi.fn().mockResolvedValue({
      success: true,
      token: 'manager-token',
      user: {
        id: 'user-1',
        email: 'manager@mosaajii.com',
        role: {
          id: 'role-manager',
          name: 'Manager',
          permissions: ['products:read', 'products:write', 'sales:read']
        }
      }
    })

    // Login user
    const { login } = useAuthStore.getState()
    await login('manager@mosaajii.com', 'password123')

    // Verify initial permissions
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('sales', 'write')).toBe(false) // Initially no sales write permission

    // Mock role update to add sales write permission
    roleApi.updateRole = vi.fn().mockResolvedValue({
      success: true,
      role: {
        id: 'role-manager',
        name: 'Manager',
        permissions: ['products:read', 'products:write', 'sales:read', 'sales:write'] // Added sales:write
      }
    })

    // Update role permissions
    await roleApi.updateRole('role-manager', {
      permissions: ['products:read', 'products:write', 'sales:read', 'sales:write']
    })

    // In a real app, this would trigger a user data refresh
    // For testing, we'll manually update the user's role
    useAuthStore.getState().user!.role.permissions = ['products:read', 'products:write', 'sales:read', 'sales:write']

    // Verify updated permissions
    expect(hasPermission('sales', 'write')).toBe(true) // Now has sales write permission
  })
})