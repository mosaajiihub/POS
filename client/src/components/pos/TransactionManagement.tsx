import { useState } from 'react'
import { Search, Eye, RotateCcw, Trash2, Receipt, Calendar } from 'lucide-react'
import { Transaction, useTransactionStore } from '../../stores/transactionStore'
import TransactionDetailsModal from './TransactionDetailsModal'
import VoidTransactionModal from './VoidTransactionModal'
import RefundTransactionModal from './RefundTransactionModal'

export default function TransactionManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)

  const { transactions, getTransactionsByDate } = useTransactionStore()

  const filteredTransactions = getTransactionsByDate(new Date(selectedDate)).filter(transaction =>
    transaction.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.cashierId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailsModal(true)
  }

  const handleVoidTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowVoidModal(true)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Transaction Management</h2>
        <p className="text-gray-600">View, void, and refund transactions</p>
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No transactions found for the selected date
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
                      ${transaction.totalAmount.toFixed(2)}
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
                            className="text-red-600 hover:text-red-900"
                            title="Void Transaction"
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
    </div>
  )
}