import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Send, 
  RefreshCw,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Building
} from 'lucide-react'
import { useInvoiceStore } from '../../stores/invoiceStore'

export default function InvoiceManagementDashboard() {
  const {
    invoiceAnalytics,
    paymentReconciliation,
    isLoading,
    error,
    fetchInvoiceAnalytics,
    fetchPaymentReconciliation,
    sendAutomatedReminders,
    updateAllInvoiceStatuses
  } = useInvoiceStore()

  const [dateRange, setDateRange] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0]
  })

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fromDate = new Date(dateRange.dateFrom)
    const toDate = new Date(dateRange.dateTo)
    
    fetchInvoiceAnalytics(fromDate, toDate)
    fetchPaymentReconciliation(fromDate, toDate)
  }, [dateRange, fetchInvoiceAnalytics, fetchPaymentReconciliation])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const handleSendAutomatedReminders = async () => {
    setActionLoading('reminders')
    try {
      const result = await sendAutomatedReminders()
      alert(`Successfully sent ${result.remindersSent} automated reminders`)
    } catch (error) {
      alert('Failed to send automated reminders')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateAllStatuses = async () => {
    setActionLoading('statuses')
    try {
      const result = await updateAllInvoiceStatuses()
      alert(`Successfully updated ${result.updated} invoice statuses`)
    } catch (error) {
      alert('Failed to update invoice statuses')
    } finally {
      setActionLoading(null)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-4 h-4" />
      case 'CARD':
        return <CreditCard className="w-4 h-4" />
      case 'DIGITAL':
        return <Smartphone className="w-4 h-4" />
      case 'CREDIT':
        return <Building className="w-4 h-4" />
      default:
        return <DollarSign className="w-4 h-4" />
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Invoice Management Dashboard</h2>
          <p className="text-gray-600">Track invoice status, payments, and automated processes</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.dateFrom}
              onChange={(e) => setDateRange(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="input text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.dateTo}
              onChange={(e) => setDateRange(prev => ({ ...prev, dateTo: e.target.value }))}
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleSendAutomatedReminders}
          disabled={actionLoading === 'reminders'}
          className="btn-primary flex items-center space-x-2"
        >
          {actionLoading === 'reminders' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Send Automated Reminders</span>
        </button>
        
        <button
          onClick={handleUpdateAllStatuses}
          disabled={actionLoading === 'statuses'}
          className="btn-outline flex items-center space-x-2"
        >
          {actionLoading === 'statuses' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Update All Statuses</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Analytics */}
          {invoiceAnalytics && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Analytics</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Total Invoices</p>
                      <p className="text-2xl font-semibold text-blue-900">{invoiceAnalytics.totalInvoices}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Total Amount</p>
                      <p className="text-2xl font-semibold text-green-900">
                        {formatCurrency(invoiceAnalytics.totalAmount)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600">Paid Amount</p>
                      <p className="text-2xl font-semibold text-purple-900">
                        {formatCurrency(invoiceAnalytics.paidAmount)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Overdue Amount</p>
                      <p className="text-2xl font-semibold text-red-900">
                        {formatCurrency(invoiceAnalytics.overdueAmount)}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Status Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(invoiceAnalytics.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{status.toLowerCase()}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-gray-500">
                          ({formatPercentage(count, invoiceAnalytics.totalInvoices)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment Reconciliation */}
          {paymentReconciliation && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Reconciliation</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total Invoice Amount</span>
                  <span className="font-semibold">{formatCurrency(paymentReconciliation.totalInvoiceAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-600">Total Payments Received</span>
                  <span className="font-semibold text-green-900">{formatCurrency(paymentReconciliation.totalPaymentAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-yellow-600">Outstanding Balance</span>
                  <span className="font-semibold text-yellow-900">{formatCurrency(paymentReconciliation.reconciliationDifference)}</span>
                </div>
              </div>

              {/* Payment Status Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Status</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-semibold text-green-900">{paymentReconciliation.fullyPaidInvoices}</p>
                    <p className="text-xs text-green-600">Fully Paid</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-semibold text-yellow-900">{paymentReconciliation.partiallyPaidInvoices}</p>
                    <p className="text-xs text-yellow-600">Partially Paid</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-lg font-semibold text-red-900">{paymentReconciliation.unpaidInvoices}</p>
                    <p className="text-xs text-red-600">Unpaid</p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payments by Method</h4>
                <div className="space-y-2">
                  {Object.entries(paymentReconciliation.paymentsByMethod).map(([method, data]) => (
                    <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(method)}
                        <span className="text-sm text-gray-700 capitalize">{method.toLowerCase()}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(data.amount)}</p>
                        <p className="text-xs text-gray-500">{data.count} payments</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Trends Chart */}
      {invoiceAnalytics?.monthlyTrends && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoices
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoiceAnalytics.monthlyTrends.slice(-6).map((trend) => {
                  const collectionRate = trend.totalAmount > 0 ? (trend.paidAmount / trend.totalAmount) * 100 : 0
                  
                  return (
                    <tr key={trend.month}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trend.month + '-01').toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short' 
                        })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trend.totalInvoices}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(trend.totalAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(trend.paidAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(collectionRate, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{collectionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}