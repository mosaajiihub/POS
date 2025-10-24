import { useState } from 'react'
import { Search, Eye, RotateCcw, Trash2, Receipt, Calendar, RefreshCw, AlertCircle } from 'lucide-react'
import { Transaction, useTransactionStore } from '../../stores/transactionStore'
import TransactionDetailsModal from './TransactionDetailsModal'
import VoidTransactionModal from './VoidTransactionModal'
import RefundTransactionModal from './RefundTransactionModal'
import { LoadingSpinner } from '../ui/loading-spinner'
import { useConfirmationDialog } from '../ui/confirmation-dialog'
import { showToast } from '../../lib/toast'
import { formatCurrency } from '../../lib/utils'

export default function TransactionManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { transactions, getTransactionsByDate, voidTransaction } = useTransactionStore()
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  const filteredTransactions = getTransactionsByDate(new Date(selectedDate)).filter(transaction =>
    transaction.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.cashierId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(true)
  }

  const handleVoidTransaction = (transaction: Transaction) => {
    showConfirmation({
      title: 'Void Transaction',
      message: `Are you sure you want to void transaction ${transaction.transactionNumber}? This action cannot be undone and will restore inventory levels.`,
      variant: 'danger',
      confirmText: 'Void Transaction',
      onConfirm: async () => {
        try {
          setIsLoading(true)
          await voidTransaction(transaction.id, 'Voided by user')
          showToast.success(`Transaction ${transaction.transactionNumber} voided successfully`)
        } catch (error) {
          showToast.error('Failed to void transaction')
          throw error
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const handleRefundTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowRefundModal(true)
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

  const canVoid = (transaction: Transaction) => {
    return transaction.paymentStatus === 'completed' && transaction.refunds.length === 0
  }

  const canRefund = (transaction: Transaction) => {
    return transaction.paymentStatus === 'completed'
  }

  const handleRefresh = () => {
    setIsLoading(true)
    // Simulate refresh - in real app this would refetch from API
    setTimeout(() => {
      setIsLoading(false)
      showToast.success('Transactions refreshed')
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction Management</h2>
          <p className="text-gray-600">View, void, and refund transactions</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Transactions
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by transaction number or cashier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cashier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <LoadingSpinner text="Loading transactions..." />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No transactions found for the selected date</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.transactionNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.cashierId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {transaction.paymentMethod.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.paymentStatus)}`}>
                        {transaction.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {canVoid(transaction) && (
                          <button
                            onClick={() => handleVoidTransaction(transaction)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Void Transaction"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canRefund(transaction) && (
                          <button
                            onClick={() => handleRefundTransaction(transaction)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Process Refund"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showDetailsModal && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedTransaction(null)
          }}
        />
      )}

      {showVoidModal && selectedTransaction && (
        <VoidTransactionModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowVoidModal(false)
            setSelectedTransaction(null)
          }}
        />
      )}

      {showRefundModal && selectedTransaction && (
        <RefundTransactionModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowRefundModal(false)
            setSelectedTransaction(null)
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  )
}