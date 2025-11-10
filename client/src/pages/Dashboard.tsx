import React from 'react'
import { 
  RefreshCw, Settings, AlertCircle, TrendingUp, DollarSign, 
  ShoppingCart, Users, Package, Calendar, ArrowUpRight, ArrowDownRight,
  Sparkles, BarChart3, PieChart, Activity, Plus
} from 'lucide-react'
import { useDashboardMetrics } from '../hooks/useRealTimeData'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { useGlobalKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { DashboardLayoutCustomizer } from '../components/dashboard/DashboardLayoutCustomizer'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FloatingActionButton } from '../components/ui/FloatingActionButton'
import { showToast } from '../lib/toast'
import { formatDate } from '../lib/utils'

// Mock data for demonstration
const mockMetrics = {
  totalSales: 125430,
  salesGrowth: 12.5,
  totalOrders: 1247,
  ordersGrowth: 8.3,
  totalCustomers: 3456,
  customersGrowth: 15.2,
  totalProducts: 892,
  productsGrowth: -2.1,
  recentTransactions: [
    { id: 1, customer: 'John Doe', amount: 125.50, time: '2 min ago', status: 'completed' },
    { id: 2, customer: 'Jane Smith', amount: 89.99, time: '5 min ago', status: 'completed' },
    { id: 3, customer: 'Mike Johnson', amount: 234.75, time: '8 min ago', status: 'pending' },
  ]
}

export default function Dashboard() {
  const { data: metrics, isLoading, error, lastUpdated, refresh } = useDashboardMetrics()
  const {
    visibleWidgets,
    availableWidgets,
    isCustomizing,
    setIsCustomizing,
    saveLayout,
    getWidgetGridClass
  } = useDashboardLayout()

  // Enable global keyboard shortcuts
  useGlobalKeyboardShortcuts()

  const handleRefresh = () => {
    refresh()
    showToast.success('Dashboard data refreshed')
  }

  const handleError = () => {
    if (error) {
      showToast.error('Failed to load dashboard data')
    }
  }

  // Show error toast when error occurs
  if (error && !isLoading) {
    handleError()
  }



  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your business today.
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 flex items-center">
              <Activity className="w-4 h-4 mr-1" />
              Last updated: {formatDate(lastUpdated, 'PPpp')}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCustomizing(true)}
            className="btn-secondary-elegant"
          >
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-primary-elegant"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card-elegant p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">
              Failed to load dashboard data. Please try refreshing.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          value={mockMetrics.totalSales}
          growth={mockMetrics.salesGrowth}
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-green-500"
          prefix="$"
          onClick={() => showToast.info('Navigate to sales details')}
        />
        <MetricCard
          title="Total Orders"
          value={mockMetrics.totalOrders}
          growth={mockMetrics.ordersGrowth}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="bg-blue-500"
          onClick={() => showToast.info('Navigate to orders')}
        />
        <MetricCard
          title="Total Customers"
          value={mockMetrics.totalCustomers}
          growth={mockMetrics.customersGrowth}
          icon={<Users className="w-6 h-6" />}
          color="bg-purple-500"
          onClick={() => showToast.info('Navigate to customers')}
        />
        <MetricCard
          title="Total Products"
          value={mockMetrics.totalProducts}
          growth={mockMetrics.productsGrowth}
          icon={<Package className="w-6 h-6" />}
          color="bg-orange-500"
          onClick={() => showToast.info('Navigate to products')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <div className="card-elegant p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Recent Transactions
              </h3>
              <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {mockMetrics.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                      {transaction.customer.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.customer}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      ${transaction.amount}
                    </p>
                    <StatusBadge status={transaction.status === 'completed' ? 'success' : 'warning'}>
                      {transaction.status}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card-elegant p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Today's Sales</span>
                <span className="font-semibold text-green-600">$12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Pending Orders</span>
                <span className="font-semibold text-orange-600">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Low Stock Items</span>
                <span className="font-semibold text-red-600">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">New Customers</span>
                <span className="font-semibold text-blue-600">15</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-elegant p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full btn-primary-elegant justify-start">
                <ShoppingCart className="w-4 h-4 mr-2" />
                New Sale
              </button>
              <button className="w-full btn-secondary-elegant justify-start">
                <Package className="w-4 h-4 mr-2" />
                Add Product
              </button>
              <button className="w-full btn-secondary-elegant justify-start">
                <Users className="w-4 h-4 mr-2" />
                Add Customer
              </button>
              <button className="w-full btn-secondary-elegant justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customizable Dashboard Grid */}
      {visibleWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {visibleWidgets.map((widget) => {
            const WidgetComponent = widget.component
            return (
              <div
                key={widget.id}
                className={getWidgetGridClass(widget.size)}
              >
                <WidgetComponent {...(widget.props || {})} />
              </div>
            )
          })}
        </div>
      )}

      {visibleWidgets.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-luxury">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Customize Your Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Add widgets and organize your workspace to match your workflow and preferences.
          </p>
          <button
            onClick={() => setIsCustomizing(true)}
            className="btn-primary-elegant"
          >
            <Settings className="w-4 h-4 mr-2" />
            Customize Dashboard
          </button>
        </div>
      )}

      {/* Dashboard Layout Customizer Modal */}
      {isCustomizing && (
        <DashboardLayoutCustomizer
          widgets={visibleWidgets}
          availableWidgets={availableWidgets}
          onLayoutChange={saveLayout}
          onClose={() => setIsCustomizing(false)}
        />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={() => showToast.success('Quick action triggered!')}
        icon={<Plus className="w-6 h-6" />}
        tooltip="Quick Sale"
      />
    </div>
  )
}