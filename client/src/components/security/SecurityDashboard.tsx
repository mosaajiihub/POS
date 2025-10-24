import React, { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { LoadingSpinner } from '../ui/loading-spinner'

interface SecurityStatus {
  dataIntegrity: {
    status: 'PASSED' | 'ISSUES_FOUND'
    issues?: string[]
  }
  encryption: {
    databaseEncryption: boolean
    backupEncryption: boolean
    transitEncryption: boolean
  }
  compliance: {
    gdprCompliant: boolean
    auditLoggingEnabled: boolean
    dataRetentionConfigured: boolean
    backupPolicyConfigured: boolean
  }
  retentionPolicy: {
    userDataRetentionDays: number
    transactionDataRetentionDays: number
    auditLogRetentionDays: number
    automaticCleanup: boolean
    backupBeforeCleanup: boolean
  }
  lastUpdated: string
}

interface BackupOptions {
  includeAuditLogs: boolean
  includeUserData: boolean
  includeTransactionData: boolean
  includeSystemSettings: boolean
  encryptBackup: boolean
}

export function SecurityDashboard() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'backup' | 'gdpr' | 'retention'>('overview')
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeAuditLogs: true,
    includeUserData: true,
    includeTransactionData: true,
    includeSystemSettings: true,
    encryptBackup: true
  })
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    fetchSecurityStatus()
  }, [])

  const fetchSecurityStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/security/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch security status')
      }

      const data = await response.json()
      setSecurityStatus(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/security/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupOptions)
      })

      if (!response.ok) {
        throw new Error('Failed to create backup')
      }

      const data = await response.json()
      alert(`Backup created successfully!\nBackup ID: ${data.data.backupId}\nSize: ${(data.data.backupSize / 1024 / 1024).toFixed(2)} MB`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup creation failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const validateDataIntegrity = async () => {
    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/security/integrity/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to validate data integrity')
      }

      const data = await response.json()
      
      if (data.data.passed) {
        alert('Data integrity check passed successfully!')
      } else {
        alert(`Data integrity issues found:\n${data.data.issues?.join('\n') || 'Unknown issues'}`)
      }
      
      fetchSecurityStatus() // Refresh status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Data integrity validation failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const exportUserData = async (userId: string, format: 'json' | 'csv' = 'json') => {
    try {
      setOperationLoading(true)
      
      const response = await fetch(`/api/security/gdpr/export/${userId}?format=${format}&includeTransactions=true&includePersonalData=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export user data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user_data_export_${userId}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User data export failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const getStatusBadge = (status: boolean | string) => {
    if (typeof status === 'boolean') {
      return (
        <Badge variant={status ? 'default' : 'destructive'}>
          {status ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    }
    
    return (
      <Badge variant={status === 'PASSED' ? 'default' : 'destructive'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={fetchSecurityStatus}>Retry</Button>
      </div>
    )
  }

  if (!securityStatus) {
    return <div>No security status available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Security Management</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('overview')}
            variant={activeTab === 'overview' ? 'default' : 'outline'}
          >
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab('backup')}
            variant={activeTab === 'backup' ? 'default' : 'outline'}
          >
            Backup & Recovery
          </Button>
          <Button
            onClick={() => setActiveTab('gdpr')}
            variant={activeTab === 'gdpr' ? 'default' : 'outline'}
          >
            GDPR Compliance
          </Button>
          <Button
            onClick={() => setActiveTab('retention')}
            variant={activeTab === 'retention' ? 'default' : 'outline'}
          >
            Data Retention
          </Button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Security Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-600">Data Integrity</div>
                  {getStatusBadge(securityStatus.dataIntegrity.status)}
                </div>
                <Button
                  onClick={validateDataIntegrity}
                  disabled={operationLoading}
                  variant="outline"
                  size="sm"
                >
                  Check
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-gray-600">Database Encryption</div>
              {getStatusBadge(securityStatus.encryption.databaseEncryption)}
            </Card>

            <Card className="p-4">
              <div className="text-sm text-gray-600">GDPR Compliance</div>
              {getStatusBadge(securityStatus.compliance.gdprCompliant)}
            </Card>

            <Card className="p-4">
              <div className="text-sm text-gray-600">Audit Logging</div>
              {getStatusBadge(securityStatus.compliance.auditLoggingEnabled)}
            </Card>
          </div>

          {/* Detailed Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Encryption Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Database Encryption</span>
                  {getStatusBadge(securityStatus.encryption.databaseEncryption)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Backup Encryption</span>
                  {getStatusBadge(securityStatus.encryption.backupEncryption)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Transit Encryption (HTTPS)</span>
                  {getStatusBadge(securityStatus.encryption.transitEncryption)}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>GDPR Compliant</span>
                  {getStatusBadge(securityStatus.compliance.gdprCompliant)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Audit Logging</span>
                  {getStatusBadge(securityStatus.compliance.auditLoggingEnabled)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Data Retention Policy</span>
                  {getStatusBadge(securityStatus.compliance.dataRetentionConfigured)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Backup Policy</span>
                  {getStatusBadge(securityStatus.compliance.backupPolicyConfigured)}
                </div>
              </div>
            </Card>
          </div>

          {/* Data Integrity Issues */}
          {securityStatus.dataIntegrity.issues && securityStatus.dataIntegrity.issues.length > 0 && (
            <Card className="p-6 border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-800 mb-4">Data Integrity Issues</h3>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {securityStatus.dataIntegrity.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create Secure Backup</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeUserData"
                    checked={backupOptions.includeUserData}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      includeUserData: e.target.checked
                    }))}
                  />
                  <label htmlFor="includeUserData">Include User Data</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeTransactionData"
                    checked={backupOptions.includeTransactionData}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      includeTransactionData: e.target.checked
                    }))}
                  />
                  <label htmlFor="includeTransactionData">Include Transaction Data</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeAuditLogs"
                    checked={backupOptions.includeAuditLogs}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      includeAuditLogs: e.target.checked
                    }))}
                  />
                  <label htmlFor="includeAuditLogs">Include Audit Logs</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeSystemSettings"
                    checked={backupOptions.includeSystemSettings}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      includeSystemSettings: e.target.checked
                    }))}
                  />
                  <label htmlFor="includeSystemSettings">Include System Settings</label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="encryptBackup"
                  checked={backupOptions.encryptBackup}
                  onChange={(e) => setBackupOptions(prev => ({
                    ...prev,
                    encryptBackup: e.target.checked
                  }))}
                />
                <label htmlFor="encryptBackup">Encrypt Backup</label>
              </div>

              <Button
                onClick={createBackup}
                disabled={operationLoading}
                className="w-full"
              >
                {operationLoading ? 'Creating Backup...' : 'Create Secure Backup'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* GDPR Tab */}
      {activeTab === 'gdpr' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">GDPR Data Export</h3>
            <p className="text-sm text-gray-600 mb-4">
              Export user data for GDPR compliance requests. Enter the user ID to export their data.
            </p>
            
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter User ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                id="userIdInput"
              />
              <Button
                onClick={() => {
                  const input = document.getElementById('userIdInput') as HTMLInputElement
                  if (input.value) {
                    exportUserData(input.value, 'json')
                  }
                }}
                disabled={operationLoading}
              >
                Export JSON
              </Button>
              <Button
                onClick={() => {
                  const input = document.getElementById('userIdInput') as HTMLInputElement
                  if (input.value) {
                    exportUserData(input.value, 'csv')
                  }
                }}
                disabled={operationLoading}
                variant="outline"
              >
                Export CSV
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">GDPR Compliance Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Right to Access:</strong> Users can request their personal data through the export function above.</p>
              <p><strong>Right to Rectification:</strong> Users can update their personal information through their profile.</p>
              <p><strong>Right to Erasure:</strong> Contact system administrator for data deletion requests.</p>
              <p><strong>Data Portability:</strong> User data can be exported in JSON or CSV format.</p>
              <p><strong>Data Retention:</strong> Data is retained according to the configured retention policy.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'retention' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Retention Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">User Data Retention (Days)</label>
                <div className="text-2xl font-bold text-blue-600">
                  {securityStatus.retentionPolicy.userDataRetentionDays}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Data Retention (Days)</label>
                <div className="text-2xl font-bold text-green-600">
                  {securityStatus.retentionPolicy.transactionDataRetentionDays}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Audit Log Retention (Days)</label>
                <div className="text-2xl font-bold text-orange-600">
                  {securityStatus.retentionPolicy.auditLogRetentionDays}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center">
                <span>Automatic Cleanup</span>
                {getStatusBadge(securityStatus.retentionPolicy.automaticCleanup)}
              </div>
              <div className="flex justify-between items-center">
                <span>Backup Before Cleanup</span>
                {getStatusBadge(securityStatus.retentionPolicy.backupBeforeCleanup)}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(securityStatus.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}