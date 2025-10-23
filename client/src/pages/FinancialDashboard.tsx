import { useState, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts'
import { useFinancialDashboardStore } from '../stores/financialDashboardStore'
import DateRangePicker from '../components/analytics/DateRangePicker'

const COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777']

export default function FinancialDashboard() {
  const {
    dashboardData,
    isLoading,
    error,
    getDashboardData,
    clearError
  } = useFinancialDashboardStore()

  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  const loadDashboardData = () => {
    getDashboardData(dateRange)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'on_track':
      case 'achieved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
      case 'behind':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'critical':
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium">
                {entry.name.includes('Margin') || entry.name.includes('%')
                  ? formatPercentage(entry.value)
                  : formatCurrency(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
          <p className="text-gray-600">Comprehensive financial overview and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          
          <button
            onClick={loadDashboardData}
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-600" />
            <p className="text-gray-600">Loading financial data...</p>
          </div>
        </div>
      ) : dashboardData ? (
        <>
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardData.metrics.totalRevenue)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {dashboardData.metrics.totalTransactions} transactions
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardData.metrics.netProfit)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatPercentage(dashboardData.metrics.profitMargin)} margin
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardData.metrics.totalExpenses)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formatPercentage(dashboardData.metrics.expenseRatio)} of revenue
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardData.metrics.averageOrderValue)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.performanceIndicators.map((indicator, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{indicator.name}</span>
                    {getStatusIcon(indicator.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {indicator.unit === 'currency' 
                        ? formatCurrency(indicator.value)
                        : indicator.unit === 'percentage'
                        ? formatPercentage(indicator.value)
                        : indicator.value.toLocaleString()
                      }
                    </span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(indicator.trend)}
                      <span className={`text-xs ${
                        indicator.trend === 'up' ? 'text-green-600' : 
                        indicator.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {formatPercentage(indicator.trendPercentage)}
                      </span>
                    </div>
                  </div>
                  {indicator.target && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Target</span>
                        <span>
                          {indicator.unit === 'currency' 
                            ? formatCurrency(indicator.target)
                            : indicator.unit === 'percentage'
                            ? formatPercentage(indicator.target)
                            : indicator.target.toLocaleString()
                          }
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            indicator.status === 'good' ? 'bg-green-500' :
                            indicator.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min((indicator.value / indicator.target) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial Trends Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dashboardData.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                  name="Expenses"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                  name="Net Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cash Flow Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cash Flow</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardData.cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
                <Tooltip 
                  content={<CustomTooltip />}
                  labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cashIn"
                  stackId="1"
                  stroke="#059669"
                  fill="#059669"
                  fillOpacity={0.6}
                  name="Cash In"
                />
                <Area
                  type="monotone"
                  dataKey="cashOut"
                  stackId="2"
                  stroke="#dc2626"
                  fill="#dc2626"
                  fillOpacity={0.6}
                  name="Cash Out"
                />
                <Line
                  type="monotone"
                  dataKey="runningBalance"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Running Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue and Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Category */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Category</h3>
              {dashboardData.revenueByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.revenueByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                      label={({ percentage }) => `${percentage.toFixed(0)}%`}
                    >
                      {dashboardData.revenueByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend formatter={(value, entry: any) => entry.payload.category} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No revenue data available
                </div>
              )}
            </div>

            {/* Top Expense Categories */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Expense Categories</h3>
              {dashboardData.topExpenseCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.topExpenseCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#6b7280" 
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="amount" fill="#dc2626" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No expense data available
                </div>
              )}
            </div>
          </div>

          {/* Financial Goals */}
          {dashboardData.goals.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Goals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.goals.map((goal) => (
                  <div key={goal.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{goal.name}</h4>
                      {getStatusIcon(goal.status)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            goal.status === 'on_track' || goal.status === 'achieved' ? 'bg-green-500' :
                            goal.status === 'behind' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(goal.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatCurrency(goal.currentAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Target: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Select a date range to view financial data</p>
          </div>
        </div>
      )}
    </div>
  )
}