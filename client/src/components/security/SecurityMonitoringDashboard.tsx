import React, { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { LoadingSpinner } from '../ui/loading-spinner'
import { Table } from '../ui/table'

interface SecurityMetrics {
  totalFailedLogins: number
  uniqueFailedLoginIPs: number
  suspiciousActivities: number
  activeSessions: number
  securityAlerts: number
  unresolvedAlerts: number
  topFailedLoginIPs: { ip: string; count: number }[]
  recentSecurityEvents: SecurityEvent[]
}

interface SecurityEvent {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  userId?: string
  ipAddress?: string
  userAgent?: string
  details: any
  timestamp: string
  resolved: boolean
}

interface SessionInfo {
  sessionId: string
  userId: string
  userEmail: string
  ipAddress: string
  userAgent?: string
  createdAt: string
  lastActivity: string
  isActive: boolean
}

export function SecurityMonitoringDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'events' | 'alerts'>('overview')
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    fetchData()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [metricsResponse, sessionsResponse] = await Promise.all([
        fetch('/api/security-monitoring/metrics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/security-monitoring/sessions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!metricsResponse.ok || !sessionsResponse.ok) {
        throw new Error('Failed to fetch security monitoring data')
      }

      const metricsData = await metricsResponse.json()
      const sessionsData = await sessionsResponse.json()

      setMetrics(metricsData.data)
      setSessions(sessionsData.data.sessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) {
      return
    }

    try {
      setOperationLoading(true)
      
      const response = await fetch(`/api/security-monitoring/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to terminate session')
      }

      alert('Session terminated successfully')
      fetchData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session termination failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const blockIP = async () => {
    const ipAddress = prompt('Enter IP address to block:')
    const reason = prompt('Enter reason for blocking:')
    
    if (!ipAddress || !reason) {
      return
    }

    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/security-monitoring/block-ip', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ipAddress, reason })
      })

      if (!response.ok) {
        throw new Error('Failed to block IP address')
      }

      alert(`IP address ${ipAddress} has been blocked successfully`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IP blocking failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const clearFailedAttempts = async () => {
    const email = prompt('Enter email address:')
    const ipAddress = prompt('Enter IP address:')
    
    if (!email || !ipAddress) {
      return
    }

    try {
      setOperationLoading(true)
      
      const response = await fetch('/api/security-monitoring/clear-attempts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, ipAddress })
      })

      if (!response.ok) {
        throw new Error('Failed to clear failed attempts')
      }

      alert('Failed login attempts cleared successfully')
      fetchData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear attempts failed')
    } finally {
      setOperationLoading(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      LOW: 'outline',
      MEDIUM: 'secondary',
      HIGH: 'destructive',
      CRITICAL: 'destructive'
    } as const

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'outline'}>
        {severity}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatUserAgent = (userAgent?: string) => {
    if (!userAgent) return 'Unknown'
    
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)
    
    const browser = browserMatch ? browserMatch[1] : 'Unknown Browser'
    const os = osMatch ? osMatch[1] : 'Unknown OS'
    
    return `${browser} on ${os}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading security monitoring...</span>
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

  if (!metrics) {
    return <div>No security metrics available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Security Monitoring</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('overview')}
            variant={activeTab === 'overview' ? 'default' : 'outline'}
          >
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab('sessions')}
            variant={activeTab === 'sessions' ? 'default' : 'outline'}
          >
            Active Sessions
          </Button>
          <Button
            onClick={() => setActiveTab('events')}
            variant={activeTab === 'events' ? 'default' : 'outline'}
          >
            Security Events
          </Button>
          <Button
            onClick={() => setActiveTab('alerts')}
            variant={activeTab === 'alerts' ? 'default' : 'outline'}
          >
            Alerts
          </Button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">{metrics.totalFailedLogins}</div>
              <div className="text-sm text-gray-600">Failed Logins (7 days)</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-orange-600">{metrics.uniqueFailedLoginIPs}</div>
              <div className="text-sm text-gray-600">Unique Failed IPs</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">{metrics.activeSessions}</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">{metrics.unresolvedAlerts}</div>
              <div className="text-sm text-gray-600">Unresolved Alerts</div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex space-x-2">
              <Button
                onClick={blockIP}
                disabled={operationLoading}
                variant="destructive"
              >
                Block IP Address
              </Button>
              <Button
                onClick={clearFailedAttempts}
                disabled={operationLoading}
                variant="outline"
              >
                Clear Failed Attempts
              </Button>
              <Button
                onClick={fetchData}
                disabled={operationLoading}
                variant="outline"
              >
                Refresh Data
              </Button>
            </div>
          </Card>

          {/* Top Failed Login IPs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Top Failed Login IPs</h3>
              <div className="space-y-2">
                {metrics.topFailedLoginIPs.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-mono">{item.ip}</span>
                    <Badge variant="destructive">{item.count} attempts</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Security Events */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
              <div className="space-y-2">
                {metrics.recentSecurityEvents.slice(0, 10).map((event, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{event.type}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(event.timestamp)}
                      </div>
                    </div>
                    {getSeverityBadge(event.severity)}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Active Sessions ({sessions.length})</h3>
              <Button onClick={fetchData} variant="outline" size="sm">
                Refresh
              </Button>
            </div>

            <Table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Browser</th>
                  <th>Created</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.sessionId}>
                    <td>
                      <div className="text-sm">
                        <div className="font-medium">{session.userEmail}</div>
                        <div className="text-gray-500 font-mono text-xs">
                          {session.userId}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm font-mono">{session.ipAddress}</td>
                    <td className="text-sm">{formatUserAgent(session.userAgent)}</td>
                    <td className="text-sm">{formatDate(session.createdAt)}</td>
                    <td className="text-sm">{formatDate(session.lastActivity)}</td>
                    <td>
                      <Button
                        onClick={() => terminateSession(session.sessionId)}
                        disabled={operationLoading}
                        variant="destructive"
                        size="sm"
                      >
                        Terminate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {/* Security Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Security Events</h3>
            <div className="space-y-3">
              {metrics.recentSecurityEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{event.type}</div>
                      <div className="text-sm text-gray-600">
                        {formatDate(event.timestamp)}
                      </div>
                    </div>
                    {getSeverityBadge(event.severity)}
                  </div>
                  
                  {event.ipAddress && (
                    <div className="text-sm text-gray-600">
                      IP: <span className="font-mono">{event.ipAddress}</span>
                    </div>
                  )}
                  
                  {event.details && (
                    <div className="text-sm text-gray-600 mt-2">
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Security Alerts</h3>
            <p className="text-sm text-gray-600">
              Security alerts will be displayed here. Currently showing recent security events as alerts.
            </p>
            <div className="mt-4 space-y-3">
              {metrics.recentSecurityEvents
                .filter(event => event.severity === 'HIGH' || event.severity === 'CRITICAL')
                .map((event) => (
                <div key={event.id} className="border-l-4 border-red-500 bg-red-50 p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-red-800">{event.type}</div>
                      <div className="text-sm text-red-600">
                        {formatDate(event.timestamp)}
                      </div>
                      {event.ipAddress && (
                        <div className="text-sm text-red-600">
                          IP: <span className="font-mono">{event.ipAddress}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {getSeverityBadge(event.severity)}
                      <Button size="sm" variant="outline">
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}