import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, Filter, RefreshCw, TrendingUp, Users, Package, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface SalesReportData {
  title: string
  data: any[]
  columns: ReportColumn[]
  summary?: Record<string, any>
  generatedAt: Date
}

interface ReportColumn {
  key: string
  title: string
  type: 'string' | 'number' | 'date' | 'currency'
  width?: number
}

interface ReportFilters {
  startDate?: Date
  endDate?: Date
  categoryId?: string
  customerId?: string
  productId?: string
  limit?: number
  offset?: number
}

export const SalesReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('performance')
  const [reportData, setReportData] = useState<SalesReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    limit: 100,
    offset: 0,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date()
  })
  const [categories, setCategories] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    loadInitialData()
    generateReport()
  }, [activeTab])

  const loadInitialData = async () => {
    try {
      const [categoriesRes, customersRes, productsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/customers'),
        fetch('/api/products')
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
      
      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData)
      }
      
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const generateReport = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString())
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })

      let endpoint = ''
      switch (activeTab) {
        case 'performance':
          endpoint = '/api/reports/sales/performance'
          break
        case 'products':
          endpoint = '/api/reports/sales/products'
          break
        case 'customers':
          endpoint = '/api/reports/sales/customers'
          break
      }

      const response = await fetch(`${endpoint}?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        console.error('Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString())
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })

      let reportType = ''
      switch (activeTab) {
        case 'performance':
          reportType = 'sales-performance'
          break
        case 'products':
          reportType = 'product-performance'
          break
        case 'customers':
          reportType = 'customer-analytics'
          break
      }

      const response = await fetch(`/api/reports/export/${reportType}/${format}?${queryParams}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}-report.${format === 'excel' ? 'xlsx' : format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return '-'
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(Number(value))
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value))
      case 'date':
        return format(new Date(value), 'MMM dd, yyyy')
      default:
        return value.toString()
    }
  }

  const getPerformanceBadge = (value: number, threshold: number = 0) => {
    if (value > threshold) {
      return <Badge variant="default" className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        Positive
      </Badge>
    } else {
      return <Badge variant="destructive">
        Negative
      </Badge>
    }
  }

  const getCustomerSegmentBadge = (segment: string) => {
    switch (segment) {
      case 'VIP':
        return <Badge variant="default" className="bg-purple-600">VIP</Badge>
      case 'Regular':
        return <Badge variant="secondary">Regular</Badge>
      case 'New':
        return <Badge variant="outline">New</Badge>
      default:
        return <Badge variant="secondary">{segment}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales & Performance Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive sales analytics and performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {activeTab === 'products' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filters.categoryId || ''}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    categoryId: value || undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer</label>
                <Select
                  value={filters.customerId || ''}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    customerId: value || undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All customers</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={generateReport} disabled={loading}>
              Generate Report
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('pdf')}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('excel')}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('csv')}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales Performance
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product Performance
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customer Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {reportData && (
            <>
              {/* Summary Cards */}
              {reportData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(reportData.summary).map(([key, value]) => {
                    let icon = <DollarSign className="w-4 h-4" />
                    
                    if (key.toLowerCase().includes('customer')) {
                      icon = <Users className="w-4 h-4" />
                    } else if (key.toLowerCase().includes('product') || key.toLowerCase().includes('item')) {
                      icon = <Package className="w-4 h-4" />
                    } else if (key.toLowerCase().includes('sales') || key.toLowerCase().includes('order')) {
                      icon = <TrendingUp className="w-4 h-4" />
                    }

                    return (
                      <Card key={key}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            {icon}
                            <div>
                              <div className="text-2xl font-bold">
                                {typeof value === 'number' && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('value') || key.toLowerCase().includes('cost'))
                                  ? formatValue(value, 'currency')
                                  : formatValue(value, 'number')
                                }
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Report Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{reportData.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Generated on {format(new Date(reportData.generatedAt), 'PPP p')}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {reportData.columns.map((column) => (
                            <TableHead key={column.key}>{column.title}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.data.map((row, index) => (
                          <TableRow key={index}>
                            {reportData.columns.map((column) => (
                              <TableCell key={column.key}>
                                {column.key === 'profitMargin' && typeof row[column.key] === 'number' ? (
                                  <div className="flex items-center gap-2">
                                    {formatValue(row[column.key], 'number')}%
                                    {getPerformanceBadge(row[column.key])}
                                  </div>
                                ) : column.key === 'customerSegment' ? (
                                  getCustomerSegmentBadge(row[column.key])
                                ) : (
                                  formatValue(row[column.key], column.type)
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {reportData.data.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No data available for the selected filters
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {loading && (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Generating report...
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}