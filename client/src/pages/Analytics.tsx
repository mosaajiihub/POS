import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'
import { useAnalyticsStore } from '../stores/analyticsStore'
import DateRangePicker from '../components/analytics/DateRangePicker'
import SalesChart from '../components/analytics/SalesChart'
import ProductChart from '../components/analytics/ProductChart'
import CategoryChart from '../components/analytics/CategoryChart'

export default function Analytics() {
  const {
    salesMetrics,
    productAnalytics,
    categoryAnalytics,
    timeSeriesData,
    profitAnalysis,
    isLoadingMetrics,
    isLoadingProducts,
    isLoadingCategories,
    isLoadingTimeSeries,
    isLoadingProfitAnalysis,
    isExporting,
    error,
    getSalesMetrics,
    getProductAnalytics,
    getCategoryAnalytics,
    getTimeSeriesData,
    getProfitAnalysis,
    exportData,
    clearError
  } = useAnalyticsStore()

  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('day')
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories'>('overview')

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange, groupBy])

  const loadAnalyticsData = async () => {
    const filters = {
      ...dateRange,
      groupBy
    }

    // Load all analytics data
    await Promise.all([
      getSalesMetrics(filters),
      getProductAnalytics({ ...filters, limit: 10 }),
      getCategoryAnalytics({ ...filters, limit: 8 }),
      getTimeSeriesData(filters),
      getProfitAnalysis(filters)
    ])
  }

  const handleRefresh = () => {
    loadAnalyticsData()
  }

  const handleExport = async (type: 'sales' | 'products' | 'categories' | 'profit', format: 'pdf' | 'excel' | 'csv') => {
    await exportData({
      type,
      format,
      ...dateRange
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const isLoading = isLoadingMetrics || isLoadingProducts || isLoadingCategories || isLoadingTimeSeries || isLoadingProfitAnalysis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600">Track your business performance and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesMetrics ? formatCurrency(salesMetrics.totalRevenue) : '$0'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {salesMetrics && (
            <p className="text-sm text-gray-500 mt-2">
              {salesMetrics.totalTransactions} transactions
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesMetrics ? formatCurrency(salesMetrics.totalProfit) : '$0'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          {salesMetrics && (
            <p className="text-sm text-gray-500 mt-2">
              {formatPercentage(salesMetrics.profitMargin)} margin
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Items Sold</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesMetrics ? salesMetrics.totalSales.toLocaleString() : '0'}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          {salesMetrics && (
            <p className="text-sm text-gray-500 mt-2">
              {formatCurrency(salesMetrics.averageOrderValue)} avg order
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {salesMetrics ? salesMetrics.totalTransactions.toLocaleString() : '0'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Products
            </div>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Categories
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Sales Trend Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sales Trend</h3>
              <button
                onClick={() => handleExport('sales', 'csv')}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <SalesChart data={timeSeriesData} groupBy={groupBy} />
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Top Products Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Top Products by Revenue</h3>
              <button
                onClick={() => handleExport('products', 'csv')}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <ProductChart data={productAnalytics} />
          </div>

          {/* Product Analytics Table */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Product Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productAnalytics.map((product) => (
                    <tr key={product.productId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.totalQuantitySold.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(product.totalProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(product.profitMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Category Distribution Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Revenue by Category</h3>
              <button
                onClick={() => handleExport('categories', 'csv')}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <CategoryChart data={categoryAnalytics} />
          </div>

          {/* Category Analytics Table */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Category Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categoryAnalytics.map((category) => (
                    <tr key={category.categoryId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.productCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.totalQuantitySold.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(category.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(category.totalProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(category.profitMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}