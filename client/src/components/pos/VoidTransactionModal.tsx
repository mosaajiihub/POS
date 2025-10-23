import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Transaction, useTransactionStore } from '../../stores/transactionStore'

interface VoidTransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

export default function VoidTransactionModal({ 
  transaction, 
  onClose 
}: VoidTransactionModalProps) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const { voidTransaction, isProcessing, error } = useTransactionStore()

  const predefinedReasons = [
    'Customer request',
    'Pricing error',
    'Wrong item scanned',
    'Payment issue',
    'System error',
    'Other'
  ]

  const handleVoid = async () => {
    const voidReason = reason === 'Other' ? customReason : reason
    
    if (!voidReason.trim()) {
      alert('Please provide a reason for voiding this transaction')
      return
    }

    try {
      await voidTransaction(transaction.id, voidReason)
      onClose()
    } catch (error) {
      console.error('Void failed:', error)
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Void Transaction</h2>
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
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Warning</h3>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone. The transaction will be permanently voided and inventory will be restored.
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction #:</span>
                <span className="font-mono">{transaction.transactionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{formatDate(transaction.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">${transaction.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span>{transaction.items.length}</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Void Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reason for voiding this transaction *
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
            onClick={handleVoid}
            disabled={isProcessing || !reason || (reason === 'Other' && !customReason.trim())}
            className="btn-primary bg-red-600 hover:bg-red-700 flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Voiding...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Void Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}