import { useState } from 'react'
import { X, CreditCard, DollarSign, Smartphone, Calculator, AlertCircle } from 'lucide-react'
import { CartItem, PaymentMethod } from '../../pages/POS'
import { useTransactionStore } from '../../stores/transactionStore'

interface PaymentModalProps {
  cartItems: CartItem[]
  total: number
  onClose: () => void
  onPaymentComplete: (saleData: any) => void
}

const paymentMethods: PaymentMethod[] = [
  { id: 'cash', name: 'Cash', type: 'cash', icon: 'DollarSign' },
  { id: 'card', name: 'Credit/Debit Card', type: 'card', icon: 'CreditCard' },
  { id: 'digital', name: 'Digital Wallet', type: 'digital', icon: 'Smartphone' }
]

export default function PaymentModal({ 
  cartItems, 
  total, 
  onClose, 
  onPaymentComplete 
}: PaymentModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [cashReceived, setCashReceived] = useState('')
  const { createTransaction, isProcessing, error } = useTransactionStore()

  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
  const taxAmount = cartItems.reduce((sum, item) => sum + (item.subtotal * item.product.taxRate), 0)
  const finalTotal = subtotal + taxAmount

  const cashReceivedAmount = parseFloat(cashReceived) || 0
  const changeAmount = cashReceivedAmount - finalTotal

  const handlePayment = async () => {
    if (!selectedPaymentMethod) return

    try {
      const transaction = await createTransaction(
        cartItems,
        selectedPaymentMethod,
        selectedPaymentMethod.type === 'cash' ? cashReceivedAmount : undefined
      )

      const saleData = {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
        items: transaction.items,
        subtotal: transaction.subtotal,
        taxAmount: transaction.taxAmount,
        total: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        cashReceived: transaction.cashReceived || transaction.totalAmount,
        change: transaction.changeAmount || 0,
        timestamp: transaction.timestamp,
        cashier: transaction.cashierId
      }

      onPaymentComplete(saleData)
    } catch (error) {
      console.error('Payment failed:', error)
      // Error is handled by the store
    }
  }

  const canProcessPayment = () => {
    if (!selectedPaymentMethod) return false
    if (selectedPaymentMethod.type === 'cash') {
      return cashReceivedAmount >= finalTotal
    }
    return true
  }

  const getPaymentIcon = (iconName: string) => {
    switch (iconName) {
      case 'DollarSign':
        return <DollarSign className="w-6 h-6" />
      case 'CreditCard':
        return <CreditCard className="w-6 h-6" />
      case 'Smartphone':
        return <Smartphone className="w-6 h-6" />
      default:
        return <CreditCard className="w-6 h-6" />
    }
  }

  const quickCashAmounts = [
    finalTotal,
    Math.ceil(finalTotal / 5) * 5,
    Math.ceil(finalTotal / 10) * 10,
    Math.ceil(finalTotal / 20) * 20
  ].filter((amount, index, arr) => arr.indexOf(amount) === index)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Payment Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.length} items):</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-primary-600">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method)}
                  disabled={isProcessing}
                  className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    selectedPaymentMethod?.id === method.id
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {getPaymentIcon(method.icon)}
                  <span className="font-medium text-sm">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Details */}
          {selectedPaymentMethod?.type === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Received
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    min={finalTotal}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={finalTotal.toFixed(2)}
                    className="input pl-10"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Amount
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quickCashAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(amount.toFixed(2))}
                      disabled={isProcessing}
                      className="btn-outline text-sm"
                    >
                      ${amount.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculation */}
              {cashReceivedAmount > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Change:</span>
                    <span className={`text-lg font-bold ${
                      changeAmount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(changeAmount).toFixed(2)}
                      {changeAmount < 0 && ' (Insufficient)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card Payment Details */}
          {selectedPaymentMethod?.type === 'card' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-700">
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Card Payment</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Please insert, swipe, or tap your card on the payment terminal.
              </p>
            </div>
          )}

          {/* Digital Payment Details */}
          {selectedPaymentMethod?.type === 'digital' && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-purple-700">
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Digital Wallet</span>
              </div>
              <p className="text-sm text-purple-600 mt-1">
                Use Apple Pay, Google Pay, or other digital wallet methods.
              </p>
            </div>
          )}
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
            onClick={handlePayment}
            disabled={!canProcessPayment() || isProcessing}
            className="btn-primary flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Complete Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}