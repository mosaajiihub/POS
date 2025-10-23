import React from 'react'

interface StockAdjustmentModalProps {
  isOpen: boolean
  productName: string
  currentStock: number
  newStockLevel: number
  reason: string
  onStockLevelChange: (value: number) => void
  onReasonChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  productName,
  currentStock,
  newStockLevel,
  reason,
  onStockLevelChange,
  onReasonChange,
  onConfirm,
  onCancel,
  isLoading
}) => {
  if (!isOpen) return null

  const stockDifference = newStockLevel - currentStock
  const isIncrease = stockDifference > 0
  const isDecrease = stockDifference < 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6v10h6V6H9z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Adjust Stock Level
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Adjust the stock level for <span className="font-medium">{productName}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Current Stock Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Current Stock:</span>
                <span className="text-lg font-semibold text-gray-900">{currentStock}</span>
              </div>
            </div>

            {/* New Stock Level Input */}
            <div>
              <label htmlFor="newStockLevel" className="block text-sm font-medium text-gray-700">
                New Stock Level
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="newStockLevel"
                  min="0"
                  value={newStockLevel}
                  onChange={(e) => onStockLevelChange(parseInt(e.target.value) || 0)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter new stock level"
                />
              </div>
            </div>

            {/* Stock Change Indicator */}
            {stockDifference !== 0 && (
              <div className={`rounded-lg p-3 ${
                isIncrease ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {isIncrease ? (
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isIncrease ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {isIncrease ? 'Increase' : 'Decrease'} by {Math.abs(stockDifference)} units
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Input */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter reason for stock adjustment..."
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This will be recorded in the audit trail
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || !reason.trim() || stockDifference === 0}
              className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adjusting...
                </div>
              ) : (
                'Confirm Adjustment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}