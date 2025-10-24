import React, { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Table } from '../ui/table'
import { Badge } from '../ui/badge'
import { LoadingSpinner } from '../ui/loading-spinner'

interface AuditLog {
  id: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
  action: string
  tableName?: string
  recordId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

interface AuditLogFilters {
  userId?: string
  action?: string
  tableName?: string
  recordId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

interface AuditLogViewerProps {
  userId?: string
  showFilters?: boolean
  maxHeight?: string
}

export function AuditLogViewer({ 
  userId, 
  showFilters = true, 
  maxHeight = '600px' 
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFilters>({
    userId,
    page: 1,
    limit: 50
  })
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0
  })

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/audit/logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.data.logs)
      setPagination(data.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  const exportLogs = async (format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'page' && key !== 'limit') {
          queryParams.append(key, value.toString())
        }
      })
      queryParams.append('format', format)

      const response = await fetch(`/api/audit/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export audit logs')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes('FAILED') || action.includes('UNAUTHORIZED')) {
      return 'destructive'
    }
    if (action.includes('LOGIN') || action.includes('CREATE')) {
      return 'default'
    }
    if (action.includes('UPDATE') || action.includes('ASSIGNED')) {
      return 'secondary'
    }
    if (action.includes('DELETE') || action.includes('REMOVED')) {
      return 'outline'
    }
    return 'default'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatUserAgent = (userAgent?: string) => {
    if (!userAgent) return 'Unknown'
    
    // Extract browser and OS info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)
    
    const browser = browserMatch ? browserMatch[1] : 'Unknown Browser'
    const os = osMatch ? osMatch[1] : 'Unknown OS'
    
    return `${browser} on ${os}`
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <LoadingSpinner />
          <span className="ml-2">Loading audit logs...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>Error loading audit logs: {error}</p>
          <Button onClick={fetchAuditLogs} className="mt-2">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <Input
                placeholder="Filter by action..."
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Table</label>
              <Input
                placeholder="Filter by table..."
                value={filters.tableName || ''}
                onChange={(e) => handleFilterChange('tableName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={() => exportLogs('csv')} variant="outline" size="sm">
                Export CSV
              </Button>
              <Button onClick={() => exportLogs('json')} variant="outline" size="sm">
                Export JSON
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Audit Logs ({pagination.total} total)
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div style={{ maxHeight, overflowY: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>IP Address</th>
                <th>Browser</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="text-sm">
                    {formatDate(log.createdAt)}
                  </td>
                  <td>
                    <div className="text-sm">
                      <div className="font-medium">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-gray-500">{log.user.email}</div>
                      <Badge variant="outline" className="text-xs">
                        {log.user.role}
                      </Badge>
                    </div>
                  </td>
                  <td>
                    <Badge variant={getActionBadgeColor(log.action)}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="text-sm">{log.tableName || '-'}</td>
                  <td className="text-sm font-mono">{log.recordId || '-'}</td>
                  <td className="text-sm">{log.ipAddress || '-'}</td>
                  <td className="text-sm">{formatUserAgent(log.userAgent)}</td>
                  <td>
                    <Button
                      onClick={() => setSelectedLog(log)}
                      variant="ghost"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Audit Log Details</h3>
              <Button
                onClick={() => setSelectedLog(null)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="text-sm font-mono">{selectedLog.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date/Time</label>
                <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <p className="text-sm">
                  {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <Badge variant={getActionBadgeColor(selectedLog.action)}>
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Table</label>
                <p className="text-sm">{selectedLog.tableName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Record ID</label>
                <p className="text-sm font-mono">{selectedLog.recordId || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="text-sm">{selectedLog.ipAddress || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Agent</label>
                <p className="text-sm">{formatUserAgent(selectedLog.userAgent)}</p>
              </div>
            </div>

            {selectedLog.oldValues && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Old Values</label>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValues && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New Values</label>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}