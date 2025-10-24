import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, Filter, RefreshCw, AlertTriangle, TrendingUp, Package } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface StockReportData {
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
  supplierId?: string
  productId?: string
  limit?: number
  offset?: number
}

export const StockReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('levels')
  const [reportData, setReportData] = useState<StockReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    limit: 100,
    offset: 0
  })
  const [categories, setCategories] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  useEffect(() => {
    loadInitialData()
    generateReport()
  }, [activeTab])

  const loadInitialData = async () => {
    try {
      // Load categories and suppliers for filters
      const [categoriesRes, suppliersRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/suppliers')
      ])
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
      
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json()
        setSuppliers(suppliersData)
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
        case 'levels':
          endpoint = '/api/reports/stock/levels'
          break
        case 'movements':
          endpoint = '/api/reports/stock/movements'
          break
        case 'low-stock':
          endpoint = '/api/reports/stock/low-stock'
          break
        case 'valuation':
          endpoint = '/api/reports/stock/valuation'
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
        case 'levels':
          reportType = 'stock-levels'
          break
        case 'movements':
          reportType = 'stock-movements'
          break
        case 'low-stock':
          reportType = 'low-stock'
          break
        case 'valuation':
          reportType = 'inventory-valuation'
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

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'Low Stock':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Low Stock
        </Badge>
      case 'In Stock':
        return <Badge variant="default" className="flex items-center gap-1">
          <Package className="w-3 h-3" />
          In Stock
        </Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory and stock movement reporting
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
            {(activeTab === 'movements') && (
              <>
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
              </>
            )}

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

            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select
                value={filters.supplierId || ''}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  supplierId: value || undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="levels" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Movements
          </TabsTrigger>
          <TabsTrigger value="low-stock" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Low Stock
          </TabsTrigger>
          <TabsTrigger value="valuation" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Valuation
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {reportData && (
            <>
              {/* Summary Cards */}
              {reportData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <Card key={key}>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">
                          {typeof value === 'number' && key.toLowerCase().includes('value') 
                            ? formatValue(value, 'currency')
                            : formatValue(value, 'number')
                          }
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
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
                                {column.key === 'stockStatus' ? (
                                  getStockStatusBadge(row[column.key])
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