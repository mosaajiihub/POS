import React from 'react'
import { StockMovement } from '../../stores/stockStore'

interface StockMovementsTabProps {
  movements: StockMovement[]
  isLoading: boolean
  onRefresh: () => void
}

export const StockMovementsTab: React.FC<StockMovementsTabProps> = ({
  movements,
  isLoading,
  onRefresh
}) => {
  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'bg-red-100 text-red-800'
      case 'PURCHASE':
        return 'bg-green-100 text-green-800'
      case 'ADJUSTMENT':
        return 'bg-blue-100 text-blue-800'
      case 'RETURN':
        return 'bg-yellow-100 text-yellow-800'
      case 'DAMAGE':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'SALE':
        return '↓'
      case 'PURCHASE':
        return '↑'
      case 'ADJUSTMENT':
        return '⚡'
      case 'RETURN':
        return '↩'
      case 'DAMAGE':
        return '⚠'
      default:
        return '•'
    }
  }

  return (
    <div>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
          <p className="text-sm text-gray-600">Track all inventory changes and transactions</p>
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

      {/* Movements Table */}
      {movements.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stock movements</h3>
          <p className="mt-1 text-sm text-gray-500">Stock movements will appear here as they occur.</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {movement.product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {movement.product.sku} • {movement.product.category.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                      <span className="mr-1">{getMovementIcon(movement.type)}</span>
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-gray-500">{movement.previousStock}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-medium text-gray-900">{movement.newStock}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {movement.reason || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(movement.createdAt).toLocaleDateString()} {new Date(movement.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}