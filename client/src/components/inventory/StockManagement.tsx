import React, { useState, useEffect } from 'react'
import { useStockStore } from '../../stores/stockStore'
import { StockMovementsTab } from './StockMovementsTab'
import { LowStockAlertsTab } from './LowStockAlertsTab'
import { StockReportTab } from './StockReportTab'
import { StockAdjustmentModal } from './StockAdjustmentModal'

interface StockManagementProps {
  className?: string
}

export const StockManagement: React.FC<StockManagementProps> = ({ className = '' }) => {
  const {
    movements,
    alerts,
    report,
    isLoading,
    error,
    fetchStockMovements,
    fetchLowStockAlerts,
    generateStockReport,
    adjustStock,
    updateStockThresholds,
    clearError
  } = useStockStore()

  const [activeTab, setActiveTab] = useState<'movements' | 'alerts' | 'report'>('movements')
  const [adjustmentModal, setAdjustmentModal] = useState<{
    isOpen: boolean
    productId?: string
    productName?: string
    currentStock?: number
  }>({ isOpen: false })
  const [adjustmentForm, setAdjustmentForm] = useState({
    newStockLevel: 0,
    reason: ''
  })

  useEffect(() => {
    fetchStockMovements()
    fetchLowStockAlerts()
    generateStockReport()
  }, [])

  const handleAdjustStock = async () => {
    if (!adjustmentModal.productId) return

    const success = await adjustStock(
      adjustmentModal.productId,
      adjustmentForm.newStockLevel,
      adjustmentForm.reason
    )

    if (success) {
      setAdjustmentModal({ isOpen: false })
      setAdjustmentForm({ newStockLevel: 0, reason: '' })
    }
  }

  const openAdjustmentModal = (productId: string, productName: string, currentStock: number) => {
    setAdjustmentModal({
      isOpen: true,
      productId,
      productName,
      currentStock
    })
    setAdjustmentForm({
      newStockLevel: currentStock,
      reason: ''
    })
  }

  if (isLoading && movements.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }  r
eturn (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Stock Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Monitor inventory levels, track stock movements, and manage alerts
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { key: 'movements', label: 'Stock Movements', count: movements.length },
            { key: 'alerts', label: 'Low Stock Alerts', count: alerts.length },
            { key: 'report', label: 'Stock Report', count: null }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'movements' && (
          <StockMovementsTab 
            movements={movements} 
            isLoading={isLoading}
            onRefresh={() => fetchStockMovements()}
          />
        )}
        
        {activeTab === 'alerts' && (
          <LowStockAlertsTab 
            alerts={alerts} 
            isLoading={isLoading}
            onAdjustStock={openAdjustmentModal}
            onRefresh={() => fetchLowStockAlerts()}
          />
        )}
        
        {activeTab === 'report' && (
          <StockReportTab 
            report={report} 
            isLoading={isLoading}
            onRefresh={() => generateStockReport()}
          />
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustmentModal.isOpen && (
        <StockAdjustmentModal
          isOpen={adjustmentModal.isOpen}
          productName={adjustmentModal.productName || ''}
          currentStock={adjustmentModal.currentStock || 0}
          newStockLevel={adjustmentForm.newStockLevel}
          reason={adjustmentForm.reason}
          onStockLevelChange={(value) => 
            setAdjustmentForm(prev => ({ ...prev, newStockLevel: value }))
          }
          onReasonChange={(value) => 
            setAdjustmentForm(prev => ({ ...prev, reason: value }))
          }
          onConfirm={handleAdjustStock}
          onCancel={() => setAdjustmentModal({ isOpen: false })}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}