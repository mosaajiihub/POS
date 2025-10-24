import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, Edit, Trash2, Play, Pause, Mail, Clock, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface ScheduledReport {
  id: string
  reportType: string
  schedule: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv'
  filters: any
  isActive: boolean
  lastRun?: Date
  nextRun: Date
  createdAt: Date
}

export const ScheduledReports: React.FC = () => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)
  const [formData, setFormData] = useState({
    reportType: '',
    schedule: '',
    recipients: '',
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
    filters: {}
  })

  useEffect(() => {
    loadScheduledReports()
  }, [])

  const loadScheduledReports = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports/scheduled')
      if (response.ok) {
        const data = await response.json()
        setScheduledReports(data)
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReport = async () => {
    try {
      const response = await fetch('/api/reports/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          recipients: formData.recipients.split(',').map(email => email.trim())
        })
      })

      if (response.ok) {
        await loadScheduledReports()
        setShowCreateForm(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error creating scheduled report:', error)
    }
  }

  const handleUpdateReport = async () => {
    if (!editingReport) return

    try {
      const response = await fetch(`/api/reports/scheduled/${editingReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          recipients: formData.recipients.split(',').map(email => email.trim())
        })
      })

      if (response.ok) {
        await loadScheduledReports()
        setEditingReport(null)
        resetForm()
      }
    } catch (error) {
      console.error('Error updating scheduled report:', error)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return

    try {
      const response = await fetch(`/api/reports/scheduled/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadScheduledReports()
      }
    } catch (error) {
      console.error('Error deleting scheduled report:', error)
    }
  }

  const handleToggleActive = async (report: ScheduledReport) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${report.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !report.isActive
        })
      })

      if (response.ok) {
        await loadScheduledReports()
      }
    } catch (error) {
      console.error('Error toggling report status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      reportType: '',
      schedule: '',
      recipients: '',
      format: 'pdf',
      filters: {}
    })
  }

  const startEdit = (report: ScheduledReport) => {
    setEditingReport(report)
    setFormData({
      reportType: report.reportType,
      schedule: report.schedule,
      recipients: report.recipients.join(', '),
      format: report.format,
      filters: report.filters
    })
    setShowCreateForm(true)
  }

  const getReportTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'stock-levels': 'Stock Levels',
      'stock-movements': 'Stock Movements',
      'low-stock': 'Low Stock Alert',
      'inventory-valuation': 'Inventory Valuation',
      'sales-performance': 'Sales Performance',
      'product-performance': 'Product Performance',
      'customer-analytics': 'Customer Analytics'
    }
    return typeMap[type] || type
  }

  const getScheduleBadge = (schedule: string) => {
    const scheduleMap: Record<string, { label: string; color: string }> = {
      'daily': { label: 'Daily', color: 'bg-blue-600' },
      'weekly': { label: 'Weekly', color: 'bg-green-600' },
      'monthly': { label: 'Monthly', color: 'bg-purple-600' },
      'hourly': { label: 'Hourly', color: 'bg-orange-600' }
    }
    
    const config = scheduleMap[schedule] || { label: schedule, color: 'bg-gray-600' }
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Clock className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getFormatBadge = (format: string) => {
    const formatMap: Record<string, string> = {
      'pdf': 'bg-red-600',
      'excel': 'bg-green-600',
      'csv': 'bg-blue-600'
    }
    
    return (
      <Badge className={`${formatMap[format] || 'bg-gray-600'} text-white`}>
        <FileText className="w-3 h-3 mr-1" />
        {format.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Reports</h1>
          <p className="text-muted-foreground">
            Manage automated report generation and delivery
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Schedule New Report
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select
                  value={formData.reportType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, reportType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock-levels">Stock Levels</SelectItem>
                    <SelectItem value="stock-movements">Stock Movements</SelectItem>
                    <SelectItem value="low-stock">Low Stock Alert</SelectItem>
                    <SelectItem value="inventory-valuation">Inventory Valuation</SelectItem>
                    <SelectItem value="sales-performance">Sales Performance</SelectItem>
                    <SelectItem value="product-performance">Product Performance</SelectItem>
                    <SelectItem value="customer-analytics">Customer Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Schedule</label>
                <Select
                  value={formData.schedule}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, schedule: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select
                  value={formData.format}
                  onValueChange={(value: 'pdf' | 'excel' | 'csv') => setFormData(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients (comma-separated emails)</label>
                <Input
                  value={formData.recipients}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={editingReport ? handleUpdateReport : handleCreateReport}
                disabled={!formData.reportType || !formData.schedule || !formData.recipients}
              >
                {editingReport ? 'Update Report' : 'Create Report'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingReport(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Reports ({scheduledReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading scheduled reports...</div>
          ) : scheduledReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled reports found. Create your first scheduled report to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {getReportTypeName(report.reportType)}
                      </TableCell>
                      <TableCell>
                        {getScheduleBadge(report.schedule)}
                      </TableCell>
                      <TableCell>
                        {getFormatBadge(report.format)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.isActive ? "default" : "secondary"}>
                          {report.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.lastRun ? format(new Date(report.lastRun), 'MMM dd, yyyy HH:mm') : 'Never'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.nextRun), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(report)}
                            className="flex items-center gap-1"
                          >
                            {report.isActive ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(report)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReport(report.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}