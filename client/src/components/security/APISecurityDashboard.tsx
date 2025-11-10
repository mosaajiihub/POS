import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  TrendingUp,
  Clock,
  Globe,
  Lock,
  Eye,
  Download,
  Play,
  Settings
} from 'lucide-react'

interface APISecurityMetrics {
  totalRequests: number
  highRiskRequests: number
  averageRiskScore: number
  topEndpoints: Array<{ endpoint: string; requests: number; riskScore: number }>
  topUserAgents: Array<{ userAgent: string; requests: number }>
  topIPs: Array<{ ip: string; requests: number; riskScore: number }>
  requestsByMethod: Record<string, number>
  requestsByStatus: Record<string, number>
  anomaliesDetected: number
  securityTestsRun: number
  vulnerabilitiesFound: number
  timeSeriesData: Array<{ timestamp: string; requests: number; riskScore: number }>
}

interface SecurityTestResult {
  testId: string
  endpoint: string
  method: string
  testType: string
  passed: boolean
  vulnerabilities: Array<{
    type: string
    severity: string
    description: string
    remediation: string
  }>
  riskScore: number
  recommendations: string[]
  timestamp: string
}

interface APISecurityLog {
  id: string
  method: string
  endpoint: string
  version?: string
  userId?: string
  ipAddress: string
  userAgent?: string
  responseStatus: number
  responseTime: number
  riskScore: number
  anomalies: string[]
  timestamp: string
}

export const APISecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<APISecurityMetrics | null>(null)
  const [securityLogs, setSecurityLogs] = useState<APISecurityLog[]>([])
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [runningTest, setRunningTest] = useState(false)

  useEffect(() => {
    fetchSecurityData()
  }, [selectedTimeRange])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      
      // Fetch security metrics
      const metricsResponse = await fetch(`/api/api-security/metrics?days=${getTimeRangeDays(selectedTimeRange)}`)
      const metricsData = await metricsResponse.json()
      if (metricsData.success) {
        setMetrics(metricsData.data)
      }

      // Fetch security logs
      const logsResponse = await fetch('/api/api-security/logs?limit=50')
      const logsData = await logsResponse.json()
      if (logsData.success) {
        setSecurityLogs(logsData.data.logs)
      }

      // Fetch test results
      const testsResponse = await fetch('/api/api-security/test-results?limit=20')
      const testsData = await testsResponse.json()
      if (testsData.success) {
        setTestResults(testsData.data.testResults)
      }

    } catch (error) {
      console.error('Failed to fetch security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeRangeDays = (range: string): number => {
    switch (range) {
      case '1h': return 1/24
      case '24h': return 1
      case '7d': return 7
      case '30d': return 30
      default: return 1
    }
  }

  const runSecurityTest = async (endpoint: string, method: string = 'GET') => {
    try {
      setRunningTest(true)
      const response = await fetch('/api/api-security/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint, method })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh test results
        fetchSecurityData()
      }
    } catch (error) {
      console.error('Failed to run security test:', error)
    } finally {
      setRunningTest(false)
    }
  }

  const exportSecurityLogs = async (format: 'json' | 'csv' = 'json') => {
    try {
      const response = await fetch(`/api/api-security/export?format=${format}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-security-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export security logs:', error)
    }
  }

  const getRiskScoreColor = (score: number): string => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRiskScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'destructive'
    if (score >= 60) return 'secondary'
    return 'default'
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Security Dashboard</h1>
          <p className="text-gray-600">Monitor API security, vulnerabilities, and threats</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={() => exportSecurityLogs('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => fetchSecurityData()} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalRequests.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">High Risk Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.highRiskRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
                  <p className={`text-2xl font-bold ${getRiskScoreColor(metrics.averageRiskScore)}`}>
                    {metrics.averageRiskScore.toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Tests</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.securityTestsRun}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="tests">Security Tests</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints by Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.topEndpoints.slice(0, 5).map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{endpoint.endpoint}</p>
                        <p className="text-xs text-gray-500">{endpoint.requests} requests</p>
                      </div>
                      <Badge variant={getRiskScoreBadgeVariant(endpoint.riskScore)}>
                        {endpoint.riskScore.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top IPs by Risk */}
            <Card>
              <CardHeader>
                <CardTitle>Top IPs by Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.topIPs.slice(0, 5).map((ip, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{ip.ip}</p>
                        <p className="text-xs text-gray-500">{ip.requests} requests</p>
                      </div>
                      <Badge variant={getRiskScoreBadgeVariant(ip.riskScore)}>
                        {ip.riskScore.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Methods Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Request Methods Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {metrics && Object.entries(metrics.requestsByMethod).map(([method, count]) => (
                  <div key={method} className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600">{method}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anomalies
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">{log.method}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={log.responseStatus >= 400 ? 'destructive' : 'default'}>
                            {log.responseStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getRiskScoreBadgeVariant(log.riskScore)}>
                            {log.riskScore}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.anomalies.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.anomalies.slice(0, 2).map((anomaly, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {anomaly}
                                </Badge>
                              ))}
                              {log.anomalies.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{log.anomalies.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Security Test Results</h3>
            <Button 
              onClick={() => runSecurityTest('/api/auth/login', 'POST')} 
              disabled={runningTest}
            >
              <Play className="h-4 w-4 mr-2" />
              {runningTest ? 'Running...' : 'Run Test'}
            </Button>
          </div>

          <div className="grid gap-4">
            {testResults.map((result) => (
              <Card key={result.testId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {result.method} {result.endpoint}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <Badge variant={getRiskScoreBadgeVariant(result.riskScore)}>
                        Risk: {result.riskScore}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.vulnerabilities.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Vulnerabilities Found:</h4>
                        <div className="space-y-2">
                          {result.vulnerabilities.map((vuln, index) => (
                            <div key={index} className="border-l-4 border-red-400 pl-4">
                              <div className="flex items-center space-x-2">
                                <Badge variant="destructive">{vuln.severity}</Badge>
                                <span className="font-medium">{vuln.type}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{vuln.description}</p>
                              <p className="text-sm text-blue-600 mt-1">
                                <strong>Remediation:</strong> {vuln.remediation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {result.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-gray-600">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Test completed: {new Date(result.timestamp).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Security Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <p>Endpoint security monitoring coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Security Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4" />
                <p>Security configuration panel coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default APISecurityDashboard