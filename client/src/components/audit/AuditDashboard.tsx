import React, { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { LoadingSpinner } from '../ui/loading-spinner'
import { AuditLogViewer } from './AuditLogViewer'

interface AuditStatistics {
  totalLogs: number
  logsByAction: { action: string; count: number }[]
  logsByUser: { userId: string; userName: string; count: number }[]
  logsByTable: { tableName: string; count: number }[]
  recentActivity: { date: string; count: number }[]
  securityEvents: number
  failedLogins: number
  unauthorizedAccess: number
}

interface RetentionSettings {
  retentionDays: number
  autoCleanup: boolean
  backupBeforeCleanup: boolean
  lastCleanup?: string
}

export function AuditDashboard() {
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null)
  const [retentionSettings, setRetentionSettings] = useState<RetentionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'security' | 'settings'>('overview')
  const [cleanupLoading, setCleanupLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsResponse, retentionResponse] = await Promise.all([
        fetch('/api/audit/statistics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/audit/retention', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!statsResponse.ok || !retentionResponse.ok) {
        throw new Error('Failed to fetch audit data')
      }

      const statsData = await statsResponse.json()
      const retentionData = await retentionResponse.json()

      setStatistics(statsData.data)
      setRetentionSettings(retentionData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateRetentionSettings = async (settings: Partial<RetentionSettings>) => {
    try {
      const response = await fetch('/api/audit/retention', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to update retention settings')
      }

      const data = await response.json()
      setRetentionSettings(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    }
  }

  const performCleanup = async (dryRun: boolean = false) => {
    try {
      setCleanupLoading(true)
      
      const response = await fetch(`/api/audit/cleanup?dryRun=${dryRun}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Cleanup failed')
      }

      const data = await response.json()
      alert(`${data.message}\nDeleted: ${data.data.deletedCount} logs`)
      
      if (!dryRun) {
        fetchData() // Refresh data after actual cleanup
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed')
    } finally {
      setCleanupLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading audit dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit & Security Dashboard</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('overview')}
            variant={activeTab === 'overview' ? 'default' : 'outline'}
          >
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab('logs')}
            variant={activeTab === 'logs' ? 'default' : 'outline'}
          >
            Audit Logs
          </Button>
          <Button
            onClick={() => setActiveTab('security')}
            variant={activeTab === 'security' ? 'default' : 'outline'}
          >
            Security Events
          </Button>
          <Button
            onClick={() => setActiveTab('settings')}
            variant={activeTab === 'settings' ? 'default' : 'outline'}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && statistics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalLogs}</div>
              <div className="text-sm text-gray-600">Total Audit Logs</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-orange-600">{statistics.securityEvents}</div>
              <div className="text-sm text-gray-600">Security Events</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">{statistics.failedLogins}</div>
              <div className="text-sm text-gray-600">Failed Logins</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">{statistics.unauthorizedAccess}</div>
              <div className="text-sm text-gray-600">Unauthorized Access</div>
            </Card>
          </div>

          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Actions */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Top Actions</h3>
              <div className="space-y-2">
                {statistics.logsByAction.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.action}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Users */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Most Active Users</h3>
              <div className="space-y-2">
                {statistics.logsByUser.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.userName}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Tables */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Most Modified Tables</h3>
              <div className="space-y-2">
                {statistics.logsByTable.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.tableName}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Activity (Last 30 Days)</h3>
              <div className="space-y-2">
                {statistics.recentActivity.slice(-10).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.date}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <AuditLogViewer showFilters={true} />
      )}

      {/* Security Events Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Security Events</h3>
            <p className="text-sm text-gray-600 mb-4">
              View security-related audit logs including failed logins, unauthorized access attempts, and permission changes.
            </p>
          </Card>
          <AuditLogViewer 
            showFilters={true}
            // This would be enhanced to filter for security events specifically
          />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && retentionSettings && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Retention Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Retention Period (Days)
                </label>
                <input
                  type="number"
                  value={retentionSettings.retentionDays}
                  onChange={(e) => setRetentionSettings(prev => prev ? {
                    ...prev,
                    retentionDays: parseInt(e.target.value)
                  } : null)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                  min="1"
                  max="3650"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Audit logs older than this will be eligible for cleanup
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoCleanup"
                  checked={retentionSettings.autoCleanup}
                  onChange={(e) => setRetentionSettings(prev => prev ? {
                    ...prev,
                    autoCleanup: e.target.checked
                  } : null)}
                  className="rounded"
                />
                <label htmlFor="autoCleanup" className="text-sm">
                  Enable automatic cleanup
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="backupBeforeCleanup"
                  checked={retentionSettings.backupBeforeCleanup}
                  onChange={(e) => setRetentionSettings(prev => prev ? {
                    ...prev,
                    backupBeforeCleanup: e.target.checked
                  } : null)}
                  className="rounded"
                />
                <label htmlFor="backupBeforeCleanup" className="text-sm">
                  Backup logs before cleanup
                </label>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => updateRetentionSettings(retentionSettings)}
                  variant="default"
                >
                  Save Settings
                </Button>
                <Button
                  onClick={() => performCleanup(true)}
                  variant="outline"
                  disabled={cleanupLoading}
                >
                  {cleanupLoading ? 'Processing...' : 'Preview Cleanup'}
                </Button>
                <Button
                  onClick={() => performCleanup(false)}
                  variant="destructive"
                  disabled={cleanupLoading}
                >
                  {cleanupLoading ? 'Processing...' : 'Run Cleanup'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Compliance Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Data Retention:</strong> Audit logs are retained for {retentionSettings.retentionDays} days</p>
              <p><strong>Backup Policy:</strong> {retentionSettings.backupBeforeCleanup ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Auto Cleanup:</strong> {retentionSettings.autoCleanup ? 'Enabled' : 'Disabled'}</p>
              {retentionSettings.lastCleanup && (
                <p><strong>Last Cleanup:</strong> {new Date(retentionSettings.lastCleanup).toLocaleString()}</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}