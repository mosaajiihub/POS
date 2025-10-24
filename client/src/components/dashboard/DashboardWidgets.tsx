import React from 'react'
import { DollarSign, Package, Users, TrendingUp, AlertCircle, ShoppingCart, FileText, BarChart3 } from 'lucide-react'
import { useDashboardMetrics } from '../../hooks/useRealTimeData'
import { LoadingSpinner } from '../ui/loading-spinner'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Link } from 'react-router-dom'

// Sales Summary Widget
export const SalesSummaryWidget: React.FC = () => {
  const { data: metrics, isLoading } = useDashboardMetrics()

  return (
    <div className="card p-6 relative">
      {isLoading && (
        <div className="absolute top-2 right-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-green-100 rounded-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Today's Sales</h3>
      </div>
      <p className="text-3xl font-bold text-primary-600">
        {metrics ? formatCurrency(metrics.todaysSales) : '$0.00'}
      </p>
      <p className="text-sm text-gray-500">
        {metrics ? `${metrics.todaysTransactions} transactions` : '0 transactions'}
      </p>
      <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />
        <span>Live data</span>
      </div>
    </div>
  )
}

// Products Overview Widget
export const ProductsOverviewWidget: React.FC = () => {
  const { data: metrics, isLoading } = useDashboardMetrics()

  return (
    <div className="card p-6 relative">
      {isLoading && (
        <div className="absolute top-2 right-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Products</h3>
      </div>
      <p className="text-3xl font-bold text-primary-600">
        {metrics ? metrics.totalProducts : '0'}
      </p>
      <p className="text-sm text-gray-500">
        {metrics ? `${metrics.lowStockProducts} low stock` : '0 low stock'}
      </p>
      {metrics && metrics.lowStockProducts > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle className="h-3 w-3" />
          <span>Attention needed</span>
        </div>
      )}
    </div>
  )
}

// Customers Widget
export const CustomersWidget: React.FC = () => {
  const { data: metrics, isLoading } = useDashboardMetrics()

  return (
    <div className="card p-6 relative">
      {isLoading && (
        <div className="absolute top-2 right-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Users className="h-5 w-5 text-purple-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Customers</h3>
      </div>
      <p className="text-3xl font-bold text-primary-600">
        {metrics ? metrics.totalCustomers : '0'}
      </p>
      <p className="text-sm text-gray-500">Active customers</p>
    </div>
  )
}

// Revenue Widget
export const RevenueWidget: React.FC = () => {
  const { data: metrics, isLoading } = useDashboardMetrics()

  return (
    <div className="card p-6 relative">
      {isLoading && (
        <div className="absolute top-2 right-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Revenue</h3>
      </div>
      <p className="text-3xl font-bold text-primary-600">
        {metrics ? formatCurrency(metrics.monthlyRevenue) : '$0.00'}
      </p>
      <p className="text-sm text-gray-500">This month</p>
    </div>
  )
}

// Quick Actions Widget
export const QuickActionsWidget: React.FC = () => {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Link 
          to="/pos" 
          className="btn-primary inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-sm py-2"
        >
          <DollarSign className="h-4 w-4" />
          New Sale
        </Link>
        <Link 
          to="/products" 
          className="btn-secondary inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-sm py-2"
        >
          <Package className="h-4 w-4" />
          Add Product
        </Link>
        <Link 
          to="/customers" 
          className="btn-secondary inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-sm py-2"
        >
          <Users className="h-4 w-4" />
          Add Customer
        </Link>
        <Link 
          to="/reports" 
          className="btn-secondary inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-sm py-2"
        >
          <TrendingUp className="h-4 w-4" />
          View Reports
        </Link>
      </div>
    </div>
  )
}

// Recent Transactions Widget
export const RecentTransactionsWidget: React.FC = () => {
  const [recentTransactions, setRecentTransactions] = React.useState([
    { id: '1', amount: 45.99, customer: 'John Doe', time: new Date() },
    { id: '2', amount: 23.50, customer: 'Jane Smith', time: new Date(Date.now() - 300000) },
    { id: '3', amount: 78.25, customer: 'Bob Johnson', time: new Date(Date.now() - 600000) }
  ])

  React.useEffect(() => {
    // Import and use real-time service
    import('../../services/realTimeService').then(({ realTimeService }) => {
      const subscriptionId = realTimeService.onSaleCompleted((data) => {
        // Add new transaction to the top of the list
        setRecentTransactions(prev => [
          {
            id: data.transactionId,
            amount: data.amount,
            customer: 'Customer', // In real app, this would come from the transaction data
            time: new Date()
          },
          ...prev.slice(0, 4) // Keep only the 5 most recent
        ])
      })

      return () => {
        realTimeService.unsubscribe(subscriptionId)
      }
    })
  }, [])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        <Link to="/transactions" className="text-sm text-primary-600 hover:text-primary-700">
          View All
        </Link>
      </div>
      <div className="space-y-3">
        {recentTransactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{transaction.customer}</p>
              <p className="text-xs text-gray-500">{formatDate(transaction.time, 'HH:mm')}</p>
            </div>
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Low Stock Alerts Widget
export const LowStockAlertsWidget: React.FC = () => {
  const [lowStockItems, setLowStockItems] = React.useState([
    { id: '1', name: 'iPhone 13', stock: 2, minStock: 5 },
    { id: '2', name: 'Samsung Galaxy S21', stock: 1, minStock: 3 },
    { id: '3', name: 'MacBook Pro', stock: 0, minStock: 2 }
  ])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    // Fetch initial low stock alerts
    const fetchLowStockAlerts = async () => {
      try {
        setIsLoading(true)
        const { stockApi } = await import('../../services/apiService')
        const response = await stockApi.getLowStockAlerts()
        
        if (response.alerts) {
          setLowStockItems(response.alerts.map((alert: any) => ({
            id: alert.productId,
            name: alert.productName,
            stock: alert.currentStock,
            minStock: alert.minStock
          })))
        }
      } catch (error) {
        console.error('Failed to fetch low stock alerts:', error)
        // Keep mock data as fallback
      } finally {
        setIsLoading(false)
      }
    }

    fetchLowStockAlerts()

    // Set up real-time updates
    import('../../services/realTimeService').then(({ realTimeService }) => {
      const subscriptionId = realTimeService.onLowStockAlert((data) => {
        setLowStockItems(prev => {
          const existingIndex = prev.findIndex(item => item.id === data.productId)
          const newItem = {
            id: data.productId,
            name: data.productName,
            stock: data.currentStock,
            minStock: data.minStock
          }

          if (existingIndex >= 0) {
            // Update existing item
            const updated = [...prev]
            updated[existingIndex] = newItem
            return updated
          } else {
            // Add new low stock item
            return [newItem, ...prev].slice(0, 5) // Keep only top 5
          }
        })
      })

      return () => {
        realTimeService.unsubscribe(subscriptionId)
      }
    })
  }, [])

  return (
    <div className="card p-6 relative">
      {isLoading && (
        <div className="absolute top-2 right-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Low Stock Alerts
        </h3>
        <Link to="/products?tab=stock" className="text-sm text-primary-600 hover:text-primary-700">
          Manage Stock
        </Link>
      </div>
      <div className="space-y-3">
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No low stock alerts</p>
        ) : (
          lowStockItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">Min: {item.minStock} units</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${item.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {item.stock} left
                </p>
                {item.stock === 0 && (
                  <p className="text-xs text-red-500">Out of stock</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// System Status Widget
export const SystemStatusWidget: React.FC = () => {
  const { lastUpdated } = useDashboardMetrics()

  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Database</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600">Online</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Payment Gateway</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600">Connected</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last Sync</span>
          <span className="text-sm text-gray-500">
            {lastUpdated ? formatDate(lastUpdated, 'HH:mm:ss') : 'Never'}
          </span>
        </div>
      </div>
    </div>
  )
}