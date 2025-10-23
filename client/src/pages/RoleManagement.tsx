import React, { useState, useEffect } from 'react'
import { PermissionGuard } from '../components/PermissionGuard'

interface Role {
  id: string
  name: string
  displayName: string
  description?: string
  isSystem: boolean
  isActive: boolean
  permissions: Permission[]
  userCount: number
  createdAt: string
  updatedAt: string
}

interface Permission {
  id: string
  resource: string
  action: string
  displayName: string
  description?: string
}

interface CreateRoleData {
  name: string
  displayName: string
  description?: string
  permissions: string[]
}

/**
 * Role Management Page
 * Provides interface for managing roles and permissions
 */
export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      } else {
        setError('Failed to fetch roles')
      }
    } catch (err) {
      setError('Error fetching roles')
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/roles/system/permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      } else {
        setError('Failed to fetch permissions')
      }
    } catch (err) {
      setError('Error fetching permissions')
    } finally {
      setLoading(false)
    }
  }

  const createRole = async (roleData: CreateRoleData) => {
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      })

      if (response.ok) {
        await fetchRoles()
        setShowCreateModal(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error?.message || 'Failed to create role')
      }
    } catch (err) {
      setError('Error creating role')
    }
  }

  const updateRole = async (roleId: string, roleData: Partial<CreateRoleData>) => {
    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      })

      if (response.ok) {
        await fetchRoles()
        setEditingRole(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error?.message || 'Failed to update role')
      }
    } catch (err) {
      setError('Error updating role')
    }
  }

  const deleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await fetchRoles()
      } else {
        const errorData = await response.json()
        setError(errorData.error?.message || 'Failed to delete role')
      }
    } catch (err) {
      setError('Error deleting role')
    }
  }

  const groupPermissionsByResource = (permissions: Permission[]) => {
    return permissions.reduce((groups, permission) => {
      const resource = permission.resource
      if (!groups[resource]) {
        groups[resource] = []
      }
      groups[resource].push(permission)
      return groups
    }, {} as Record<string, Permission[]>)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="roles:read" fallback={
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have permission to view roles.</p>
      </div>
    }>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <PermissionGuard permission="roles:create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Role
            </button>
          </PermissionGuard>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {roles.map((role) => (
              <li key={role.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {role.displayName}
                      </h3>
                      {role.isSystem && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      )}
                      {!role.isActive && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {role.description || 'No description'}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>{role.permissions.length} permissions</span>
                      <span className="mx-2">•</span>
                      <span>{role.userCount} users</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <PermissionGuard permission="roles:update">
                      <button
                        onClick={() => setEditingRole(role)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="roles:delete">
                      {!role.isSystem && (
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </PermissionGuard>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Create Role Modal */}
        {showCreateModal && (
          <CreateRoleModal
            permissions={permissions}
            onClose={() => setShowCreateModal(false)}
            onSubmit={createRole}
          />
        )}

        {/* Edit Role Modal */}
        {editingRole && (
          <EditRoleModal
            role={editingRole}
            permissions={permissions}
            onClose={() => setEditingRole(null)}
            onSubmit={(data) => updateRole(editingRole.id, data)}
          />
        )}
      </div>
    </PermissionGuard>
  )
}

/**
 * Create Role Modal Component
 */
interface CreateRoleModalProps {
  permissions: Permission[]
  onClose: () => void
  onSubmit: (data: CreateRoleData) => void
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  permissions,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    displayName: '',
    description: '',
    permissions: []
  })

  const groupedPermissions = permissions.reduce((groups, permission) => {
    const resource = permission.resource
    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(permission)
    return groups
  }, {} as Record<string, Permission[]>)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const togglePermission = (permissionKey: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter(p => p !== permissionKey)
        : [...prev.permissions, permissionKey]
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Role</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3">
                {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="mb-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-2">{resource}</h4>
                    <div className="space-y-1">
                      {resourcePermissions.map((permission) => {
                        const permissionKey = `${permission.resource}:${permission.action}`
                        return (
                          <label key={permission.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permissionKey)}
                              onChange={() => togglePermission(permissionKey)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {permission.displayName}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Role
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * Edit Role Modal Component
 */
interface EditRoleModalProps {
  role: Role
  permissions: Permission[]
  onClose: () => void
  onSubmit: (data: Partial<CreateRoleData>) => void
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({
  role,
  permissions,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: role.name,
    displayName: role.displayName,
    description: role.description || '',
    isActive: role.isActive,
    permissions: role.permissions.map(p => `${p.resource}:${p.action}`)
  })

  const groupedPermissions = permissions.reduce((groups, permission) => {
    const resource = permission.resource
    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(permission)
    return groups
  }, {} as Record<string, Permission[]>)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const togglePermission = (permissionKey: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter(p => p !== permissionKey)
        : [...prev.permissions, permissionKey]
    }))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Role</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role Name
              </label>
              <input
                type="text"
                required
                disabled={role.isSystem}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {!role.isSystem && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3">
                {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="mb-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-2">{resource}</h4>
                    <div className="space-y-1">
                      {resourcePermissions.map((permission) => {
                        const permissionKey = `${permission.resource}:${permission.action}`
                        return (
                          <label key={permission.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permissionKey)}
                              onChange={() => togglePermission(permissionKey)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {permission.displayName}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Update Role
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RoleManagement