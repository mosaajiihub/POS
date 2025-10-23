import { useState } from 'react'
import { X, RotateCcw, Plus, Minus } from 'lucide-react'
import { Transaction, RefundItem, useTransactionStore } from '../../stores/transactionStore'

interface RefundTransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

interface RefundItemState extends RefundItem {
  maxQuantity: number
  selected: boolean
}

export default function RefundTransactionModal({ 
  transaction, 
  onClose 
}: RefundTransactionModalProps) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const { processRefund, isProcessing, error } = useTransactionStore()

  // Initialize refund items from transaction items
  const [refundItems, setRefundItems] = useState<RefundItemState[]>(() =>
    transaction.items.map(item => {
      // Calculate how many of this item have already been refunded
      const alreadyRefunded = transaction.refunds.reduce((sum, refund) => {
        const refundedItem = refund.items.find(ri => ri.productId === item.product.id)
        return sum + (refundedItem?.quantity || 0)
      }, 0)

      const maxQuantity = item.quantity - alreadyRefunded

      return {
        productId: item.product.id,
        productName: item.product.name,
        quantity: 0,
        unitPrice: item.product.price,
        refundAmount: 0,
        maxQuantity,
        selected: false
      }
    }).filter(item => item.maxQuantity > 0) // Only show items that can be refunded
  )

  const predefinedReasons = [
    'Customer request',
    'Defective product',
    'Wrong item',
    'Pricing error',
    'Customer not satisfied',
    'Other'
  ]

  const updateRefundItem = (index: number, quantity: number) => {
    setRefundItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQuantity = Math.max(0, Math.min(quantity, item.maxQuantity))
        return {
          ...item,
          quantity: newQuantity,
          refundAmount: newQuantity * item.unitPrice,
          selected: newQuantity > 0
        }
      }
      return item
    }))
  }

  const toggleItemSelection = (index: number) => {
    setRefundItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newSelected = !item.selected
        return {
          ...item,
          selected: newSelected,
          quantity: newSelected ? 1 : 0,
          refundAmount: newSelected ? item.unitPrice : 0
        }
      }
      return item
    }))
  }

  const selectedItems = refundItems.filter(item => item.selected && item.quantity > 0)
  const totalRefundAmount = selectedItems.reduce((sum, item) => sum + item.refundAmount, 0)

  const handleRefund = async () => {
    const refundReason = reason === 'Other' ? customReason : reason
    
    if (!refundReason.trim()) {
      alert('Please provide a reason for this refund')
      return
    }

    if (selectedItems.length === 0) {
      alert('Please select at least one item to refund')
      return
    }

    try {
      await processRefund(transaction.id, selectedItems, refundReason)
      onClose()
    } catch (error) {
      console.error('Refund failed:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <RotateCcw className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">Process Refund</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Transaction #:</span>
                <p className="font-mono">{transaction.transactionNumber}</p>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <p>{formatDate(transaction.timestamp)}</p>
              </div>
              <div>
                <span className="text-gray-600">Original Total:</span>
                <p className="font-medium">${transaction.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Already Refunded:</span>
                <p className="font-medium">
                  ${transaction.refunds.reduce((sum, refund) => sum + refund.refundAmount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Items to Refund */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Select Items to Refund</h3>
            <div className="space-y-3">
              {refundItems.map((item, index) => (
                <div key={item.productId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelection(index)}
                        disabled={isProcessing}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">
                          Unit Price: ${item.unitPrice.toFixed(2)} | Available to refund: {item.maxQuantity}
                        </p>
                      </div>
                    </div>
                    
                    {item.selected && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateRefundItem(index, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isProcessing}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <span className="font-medium text-sm min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => updateRefundItem(index, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity || isProcessing}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        
                        <div className="ml-4 text-right">
                          <p className="font-medium text-gray-900">
                            ${item.refundAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Summary */}
          {selectedItems.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-2">Refund Summary</h3>
              <div className="space-y-1 text-sm">
                {selectedItems.map((item) => (
                  <div key={item.productId} className="flex justify-between text-orange-800">
                    <span>{item.productName} (x{item.quantity})</span>
                    <span>${item.refundAmount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-orange-900 border-t pt-2">
                  <span>Total Refund:</span>
                  <span>${totalRefundAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Refund Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for refund *
            </label>
            <div className="space-y-2">
              {predefinedReasons.map((predefinedReason) => (
                <label key={predefinedReason} className="flex items-center">
                  <input
                    type="radio"
                    name="reason"
                    value={predefinedReason}
                    checked={reason === predefinedReason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isProcessing}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{predefinedReason}</span>
                </label>
              ))}
            </div>
            
            {reason === 'Other' && (
              <div className="mt-3">
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  disabled={isProcessing}
                  className="input min-h-[80px] resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="btn-outline"
          >
            Cancel
          </button>
          
          <button
            onClick={handleRefund}
            disabled={
              isProcessing || 
              selectedItems.length === 0 || 
              !reason || 
              (reason === 'Other' && !customReason.trim())
            }
            className="btn-primary bg-orange-600 hover:bg-orange-700 flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Process Refund (${totalRefundAmount.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}