import React, { ReactNode, useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

interface PermissionGuardProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  role?: string
  roles?: string[]
  requireAll?: boolean
  fallback?: ReactNode
  loading?: ReactNode
}

interface UserPermissions {
  permissions: string[]
  roles: string[]
}

/**
 * PermissionGuard Component
 * Controls visibility of UI components based on user permissions and roles
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions = [],
  role,
  roles = [],
  requireAll = false,
  fallback = null,
  loading = null
}) => {
  const { user, isAuthenticated } = useAuthStore()
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Combine single permission/role with arrays
  const allPermissions = permission ? [permission, ...permissions] : permissions
  const allRoles = role ? [role, ...roles] : roles

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!isAuthenticated || !user) {
        setUserPermissions(null)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/roles/user/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUserPermissions({
            permissions: data.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [],
            roles: data.roles?.map((r: any) => r.name) || []
          })
        } else {
          setUserPermissions({ permissions: [], roles: [] })
        }
      } catch (error) {
        console.error('Failed to fetch user permissions:', error)
        setUserPermissions({ permissions: [], roles: [] })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserPermissions()
  }, [isAuthenticated, user])

  // Show loading state
  if (isLoading) {
    return loading ? <>{loading}</> : null
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <>{fallback}</>
  }

  // No permissions data
  if (!userPermissions) {
    return <>{fallback}</>
  }

  // Check permissions
  const hasPermissions = checkPermissions(
    userPermissions.permissions,
    allPermissions,
    requireAll
  )

  // Check roles
  const hasRoles = checkRoles(
    userPermissions.roles,
    allRoles,
    requireAll
  )

  // Determine if user has access
  const hasAccess = (allPermissions.length === 0 || hasPermissions) && 
                   (allRoles.length === 0 || hasRoles)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Check if user has required permissions
 */
function checkPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
  requireAll: boolean
): boolean {
  if (requiredPermissions.length === 0) {
    return true
  }

  if (requireAll) {
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    )
  } else {
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    )
  }
}

/**
 * Check if user has required roles
 */
function checkRoles(
  userRoles: string[],
  requiredRoles: string[],
  requireAll: boolean
): boolean {
  if (requiredRoles.length === 0) {
    return true
  }

  if (requireAll) {
    return requiredRoles.every(role => 
      userRoles.includes(role)
    )
  } else {
    return requiredRoles.some(role => 
      userRoles.includes(role)
    )
  }
}

/**
 * Hook for checking permissions in components
 */
export const usePermissions = () => {
  const { user, isAuthenticated } = useAuthStore()
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!isAuthenticated || !user) {
        setUserPermissions(null)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/roles/user/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUserPermissions({
            permissions: data.permissions?.map((p: any) => `${p.resource}:${p.action}`) || [],
            roles: data.roles?.map((r: any) => r.name) || []
          })
        } else {
          setUserPermissions({ permissions: [], roles: [] })
        }
      } catch (error) {
        console.error('Failed to fetch user permissions:', error)
        setUserPermissions({ permissions: [], roles: [] })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserPermissions()
  }, [isAuthenticated, user])

  const hasPermission = (permission: string): boolean => {
    return userPermissions?.permissions.includes(permission) || false
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  const hasRole = (role: string): boolean => {
    return userPermissions?.roles.includes(role) || false
  }

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role))
  }

  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every(role => hasRole(role))
  }

  return {
    userPermissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles
  }
}

/**
 * Higher-order component for permission-based rendering
 */
export const withPermissions = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string[] = [],
  requiredRoles: string[] = [],
  requireAll: boolean = false
) => {
  return (props: P) => (
    <PermissionGuard
      permissions={requiredPermissions}
      roles={requiredRoles}
      requireAll={requireAll}
    >
      <Component {...props} />
    </PermissionGuard>
  )
}

export default PermissionGuard