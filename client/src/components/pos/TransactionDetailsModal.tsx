import { X, Printer, Download, Mail } from 'lucide-react'
import { Transaction, useTransactionStore } from '../../stores/transactionStore'

interface TransactionDetailsModalProps {
  transaction: Transaction
  onClose: () => void
}

export default function TransactionDetailsModal({ 
  transaction, 
  onClose 
}: TransactionDetailsModalProps) {
  const { generateReceipt, printReceipt, emailReceipt } = useTransactionStore()

  const handlePrint = async () => {
    try {
      await printReceipt(transaction.id)
    } catch (error) {
      console.error('Print failed:', error)
    }
  }

  const handleDownload = () => {
    // Generate and download receipt as PDF
    const receiptData = generateReceipt(transaction.id)
    console.log('Download receipt:', receiptData)
  }

  const handleEmail = async () => {
    const email = prompt('Enter email address:')
    if (email) {
      try {
        await emailReceipt(transaction.id, email)
        alert('Receipt sent successfully!')
      } catch (error) {
        console.error('Email failed:', error)
        alert('Failed to send receipt')
      }
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

  const getStatusColor = (status: Transaction['paymentStatus']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'voided':
        return 'bg-gray-100 text-gray-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Number</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{transaction.transactionNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(transaction.timestamp)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Cashier</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.cashierId}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{transaction.paymentMethod.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.paymentStatus)}`}>
                  {transaction.paymentStatus}
                </span>
              </div>
              
              {transaction.paymentMethod.type === 'cash' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cash Received</label>
                    <p className="mt-1 text-sm text-gray-900">${transaction.cashReceived?.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Change Given</label>
                    <p className="mt-1 text-sm text-gray-900">${transaction.changeAmount?.toFixed(2)}</p>
                  </div>
                </>
              )}
              
              {transaction.voidReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Void Reason</label>
                  <p className="mt-1 text-sm text-gray-900">{transaction.voidReason}</p>
                  <p className="text-xs text-gray-500">
                    Voided on {formatDate(transaction.voidedAt!)} by {transaction.voidedBy}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transaction.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.product.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">${item.product.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${transaction.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${transaction.taxAmount.toFixed(2)}</span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-${transaction.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${transaction.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Refunds */}
          {transaction.refunds.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Refunds</h3>
              <div className="space-y-3">
                {transaction.refunds.map((refund) => (
                  <div key={refund.id} className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Refund Amount: ${refund.refundAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-700">
                          {formatDate(refund.timestamp)} by {refund.processedBy}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-blue-800">Reason: {refund.reason}</p>
                    <div className="mt-2">
                      <p className="text-xs text-blue-700 font-medium">Refunded Items:</p>
                      <ul className="text-xs text-blue-600 mt-1">
                        {refund.items.map((item, index) => (
                          <li key={index}>
                            {item.productName} - Qty: {item.quantity} - ${item.refundAmount.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn-outline"
          >
            Close
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="btn-outline flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="btn-outline flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={handleEmail}
              className="btn-primary flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}