import React, { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { LoadingSpinner } from '../ui/loading-spinner'

interface SecurityDashboard {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
  recentThreats: any[]
  knownMaliciousIPs: number
  lastScanDate: string
  systemStatus: {
    intrusionDetection: string
    vulnerabilityScanning: string
    threatMonitoring: string
    complianceChecking: string
  }
}

interface SecuritySettings {
  intrusionDetectionEnabled: boolean
  vulnerabilityScanningEnabled: boolean
  threatMonitoringEnabled: boolean
  scanFrequency: string
  alertThreshold: string
  lastUpdated: string
}

export function AdvancedSecurityDashboard() {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null)
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scans' | 'threats' | 'settings'>('dashboard')
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [dashboardResponse, settingsResponse] = await Promise.all([
        fetch('/api/advanced-security/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/advanced-security/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!dashboardResponse.ok || !settingsResponse.ok) {
        throw new Error('Failed to fetch advanced security data')
      }

      const dashboardData = await dashboardResponse.json()
      const settingsData = await settingsResponse.json()

      setDashboard(dashboardData.data)
      setSettings(settingsData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const performVulnerabilityAssessment = async () => {
    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/advanced-security/vulnerability-assessment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to perform vulnerability assessment')
      }

      const data = await response.json()
      alert(`Vulnerability assessment completed!\nFound ${data.data.summary.total} issues:\n- Critical: ${data.data.summary.critical}\n- High: ${data.data.summary.high}\n- Medium: ${data.data.summary.medium}\n- Low: ${data.data.summary.low}`)
      
      fetchData() // Refresh dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vulnerability assessment failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const performSecurityScan = async (scanType: 'VULNERABILITY' | 'INTRUSION' | 'COMPLIANCE') => {
    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/advanced-security/security-scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scanType })
      })

      if (!response.ok) {
        throw new Error('Failed to perform security scan')
      }

      const data = await response.json()
      alert(`${scanType} scan completed!\nScan ID: ${data.data.scanId}\nFindings: ${data.data.summary.total}`)
      
      fetchData() // Refresh dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Security scan failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<SecuritySettings>) => {
    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/advanced-security/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      })

      if (!response.ok) {
        throw new Error('Failed to update security settings')
      }

      alert('Security settings updated successfully')
      fetchData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settings update failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const getThreatLevelColor = (level: string) => {
    const colors = {
      LOW: 'text-green-600',
      MEDIUM: 'text-yellow-600',
      HIGH: 'text-orange-600',
      CRITICAL: 'text-red-600'
    }
    return colors[level as keyof typeof colors] || 'text-gray-600'
  }

  const getThreatLevelBadge = (level: string) => {
    const variants = {
      LOW: 'default',
      MEDIUM: 'secondary',
      HIGH: 'destructive',
      CRITICAL: 'destructive'
    } as const

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'ACTIVE' ? 'default' : 'destructive'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading advanced security dashboard...</span>
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

  if (!dashboard || !settings) {
    return <div>No security data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Advanced Security</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('dashboard')}
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
          >
            Dashboard
          </Button>
          <Button
            onClick={() => setActiveTab('scans')}
            variant={activeTab === 'scans' ? 'default' : 'outline'}
          >
            Security Scans
          </Button>
          <Button
            onClick={() => setActiveTab('threats')}
            variant={activeTab === 'threats' ? 'default' : 'outline'}
          >
            Threat Intelligence
          </Button>
          <Button
            onClick={() => setActiveTab('settings')}
            variant={activeTab === 'settings' ? 'default' : 'outline'}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Threat Level Alert */}
          <Card className={`p-4 border-l-4 ${
            dashboard.threatLevel === 'CRITICAL' ? 'border-red-500 bg-red-50' :
            dashboard.threatLevel === 'HIGH' ? 'border-orange-500 bg-orange-50' :
            dashboard.threatLevel === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
            'border-green-500 bg-green-50'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Current Threat Level</h3>
                <div className={`text-2xl font-bold ${getThreatLevelColor(dashboard.threatLevel)}`}>
                  {dashboard.threatLevel}
                </div>
              </div>
              {getThreatLevelBadge(dashboard.threatLevel)}
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">{dashboard.vulnerabilities.critical}</div>
              <div className="text-sm text-gray-600">Critical Vulnerabilities</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-orange-600">{dashboard.vulnerabilities.high}</div>
              <div className="text-sm text-gray-600">High Risk Issues</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">{dashboard.knownMaliciousIPs}</div>
              <div className="text-sm text-gray-600">Known Malicious IPs</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">{dashboard.recentThreats.length}</div>
              <div className="text-sm text-gray-600">Recent Threats</div>
            </Card>
          </div>

          {/* System Status */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security System Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex justify-between items-center">
                <span>Intrusion Detection</span>
                {getStatusBadge(dashboard.systemStatus.intrusionDetection)}
              </div>
              <div className="flex justify-between items-center">
                <span>Vulnerability Scanning</span>
                {getStatusBadge(dashboard.systemStatus.vulnerabilityScanning)}
              </div>
              <div className="flex justify-between items-center">
                <span>Threat Monitoring</span>
                {getStatusBadge(dashboard.systemStatus.threatMonitoring)}
              </div>
              <div className="flex justify-between items-center">
                <span>Compliance Checking</span>
                {getStatusBadge(dashboard.systemStatus.complianceChecking)}
              </div>
            </div>
          </Card>

          {/* Vulnerability Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Vulnerability Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Critical</span>
                <Badge variant="destructive">{dashboard.vulnerabilities.critical}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>High</span>
                <Badge variant="destructive">{dashboard.vulnerabilities.high}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Medium</span>
                <Badge variant="secondary">{dashboard.vulnerabilities.medium}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Low</span>
                <Badge variant="outline">{dashboard.vulnerabilities.low}</Badge>
              </div>
              <div className="flex justify-between items-center font-semibold">
                <span>Total</span>
                <Badge>{dashboard.vulnerabilities.total}</Badge>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Last scan: {new Date(dashboard.lastScanDate).toLocaleString()}
            </div>
          </Card>
        </div>
      )}

      {/* Security Scans Tab */}
      {activeTab === 'scans' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Scans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={performVulnerabilityAssessment}
                disabled={operationLoading}
                className="h-20 flex flex-col items-center justify-center"
              >
                <div className="font-semibold">Vulnerability Assessment</div>
                <div className="text-sm opacity-75">Scan for security vulnerabilities</div>
              </Button>
              
              <Button
                onClick={() => performSecurityScan('INTRUSION')}
                disabled={operationLoading}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
              >
                <div className="font-semibold">Intrusion Detection Scan</div>
                <div className="text-sm opacity-75">Check for intrusion indicators</div>
              </Button>
              
              <Button
                onClick={() => performSecurityScan('COMPLIANCE')}
                disabled={operationLoading}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
              >
                <div className="font-semibold">Compliance Check</div>
                <div className="text-sm opacity-75">Verify compliance standards</div>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Scan Results</h3>
            <p className="text-sm text-gray-600">
              Recent security scan results will be displayed here. Run a scan to see results.
            </p>
          </Card>
        </div>
      )}

      {/* Threat Intelligence Tab */}
      {activeTab === 'threats' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Threat Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Known Malicious IPs</h4>
                <div className="text-2xl font-bold text-red-600">{dashboard.knownMaliciousIPs}</div>
                <p className="text-sm text-gray-600">IPs identified as malicious</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recent Threats</h4>
                <div className="text-2xl font-bold text-orange-600">{dashboard.recentThreats.length}</div>
                <p className="text-sm text-gray-600">Threats detected in last 24h</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Threat Activity</h3>
            {dashboard.recentThreats.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recentThreats.slice(0, 10).map((threat, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{threat.type || 'Unknown Threat'}</div>
                        <div className="text-sm text-gray-600">
                          {threat.timestamp ? new Date(threat.timestamp).toLocaleString() : 'Unknown time'}
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {threat.severity || 'MEDIUM'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No recent threats detected</p>
            )}
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Intrusion Detection</div>
                  <div className="text-sm text-gray-600">Monitor for intrusion attempts</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.intrusionDetectionEnabled}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    intrusionDetectionEnabled: e.target.checked
                  } : null)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Vulnerability Scanning</div>
                  <div className="text-sm text-gray-600">Automated vulnerability assessments</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.vulnerabilityScanningEnabled}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    vulnerabilityScanningEnabled: e.target.checked
                  } : null)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Threat Monitoring</div>
                  <div className="text-sm text-gray-600">Real-time threat intelligence</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.threatMonitoringEnabled}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    threatMonitoringEnabled: e.target.checked
                  } : null)}
                  className="rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scan Frequency</label>
                <select
                  value={settings.scanFrequency}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    scanFrequency: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="HOURLY">Hourly</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Alert Threshold</label>
                <select
                  value={settings.alertThreshold}
                  onChange={(e) => setSettings(prev => prev ? {
                    ...prev,
                    alertThreshold: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <Button
                onClick={() => updateSettings(settings)}
                disabled={operationLoading}
                className="w-full"
              >
                {operationLoading ? 'Updating...' : 'Save Settings'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">System Information</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Last Updated:</strong> {new Date(settings.lastUpdated).toLocaleString()}</p>
              <p><strong>Security Version:</strong> 1.0.0</p>
              <p><strong>Threat Database:</strong> Updated daily</p>
              <p><strong>Compliance Standards:</strong> GDPR, PCI DSS, SOC 2</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}