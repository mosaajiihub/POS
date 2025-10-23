import React from 'react'
import { LowStockAlert } from '../../stores/stockStore'

interface LowStockAlertsTabProps {
  alerts: LowStockAlert[]
  isLoading: boolean
  onAdjustStock: (productId: string, productName: string, currentStock: number) => void
  onRefresh: () => void
}

export const LowStockAlertsTab: React.FC<LowStockAlertsTabProps> = ({
  alerts,
  isLoading,
  onAdjustStock,
  onRefresh
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'out_of_stock':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'out_of_stock':
        return (
          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'critical':
        return (
          <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'low':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'out_of_stock':
        return 'Out of Stock'
      case 'critical':
        return 'Critical Low'
      case 'low':
        return 'Low Stock'
      default:
        return severity
    }
  }

  return (
    <div>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
          <p className="text-sm text-gray-600">Products that need attention or restocking</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg className={`-ml-1 mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No low stock alerts</h3>
          <p className="mt-1 text-sm text-gray-500">All products have adequate stock levels.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.product.id}
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {alert.product.name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {getSeverityLabel(alert.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      SKU: {alert.product.sku} • Category: {alert.product.category.name}
                    </p>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Current Stock: </span>
                      <span className="font-medium text-gray-900">{alert.currentStock}</span>
                      <span className="text-gray-600 ml-4">Minimum Required: </span>
                      <span className="font-medium text-gray-900">{alert.minStockLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <button
                    onClick={() => onAdjustStock(
                      alert.product.id,
                      alert.product.name,
                      alert.currentStock
                    )}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Adjust Stock
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}