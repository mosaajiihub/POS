import { useState, useEffect } from 'react'
import { Plus, Search, Filter, FileText, Eye, Send, DollarSign, AlertCircle, BarChart3 } from 'lucide-react'
import { useInvoiceStore } from '../stores/invoiceStore'
import { useCustomerStore } from '../stores/customerStore'
import InvoiceForm from '../components/invoices/InvoiceForm'
import InvoiceDetailsModal from '../components/invoices/InvoiceDetailsModal'
import InvoicePreviewModal from '../components/invoices/InvoicePreviewModal'
import PaymentModal from '../components/invoices/PaymentModal'
import InvoiceManagementDashboard from '../components/invoices/InvoiceManagementDashboard'
import type { Invoice, InvoiceFilters } from '../stores/invoiceStore'

export default function Invoices() {
  const {
    invoices,
    isLoading,
    error,
    fetchInvoices,
    deleteInvoice,
    sendPaymentReminder
  } = useInvoiceStore()
  
  const { customers, fetchCustomers } = useCustomerStore()
  
  const [activeTab, setActiveTab] = useState<'invoices' | 'dashboard'>('invoices')
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    status: undefined,
    customerId: undefined,
    isOverdue: false,
    page: 1,
    limit: 20
  })

  useEffect(() => {
    fetchInvoices(filters)
    fetchCustomers()
  }, [fetchInvoices, fetchCustomers, filters])

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setShowInvoiceForm(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setShowInvoiceForm(true)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowDetailsModal(true)
  }

  const handlePreviewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPreviewModal(true)
  }

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowPaymentModal(true)
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      await deleteInvoice(invoiceId)
    }
  }

  const handleSendReminder = async (invoiceId: string) => {
    await sendPaymentReminder(invoiceId)
  }

  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'SENT':
        return 'bg-blue-100 text-blue-800'
      case 'VIEWED':
        return 'bg-yellow-100 text-yellow-800'
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage your invoices and billing</p>
        </div>
        <button
          onClick={handleCreateInvoice}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Invoice List</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Management Dashboard</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' ? (
        <InvoiceManagementDashboard />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input pl-10"
                />
              </div>
              
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="input"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="VIEWED">Viewed</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              
              <select
                value={filters.customerId || ''}
                onChange={(e) => handleFilterChange('customerId', e.target.value || undefined)}
                className="input"
              >
                <option value="">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName}
                  </option>
                ))}
              </select>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.isOverdue || false}
                  onChange={(e) => handleFilterChange('isOverdue', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Overdue only</span>
              </label>
            </div>
          </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first invoice.</p>
            <button
              onClick={handleCreateInvoice}
              className="btn-primary"
            >
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(invoice.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.customer.firstName} {invoice.customer.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                      {invoice.totalPaid && invoice.totalPaid > 0 && (
                        <div className="text-sm text-gray-500">
                          Paid: {formatCurrency(invoice.totalPaid)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.dueDate)}
                      {invoice.status !== 'PAID' && new Date(invoice.dueDate) < new Date() && (
                        <div className="text-red-600 text-xs">Overdue</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Preview PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {invoice.status !== 'PAID' && (
                          <button
                            onClick={() => handleRecordPayment(invoice)}
                            className="text-green-600 hover:text-green-900"
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {['SENT', 'VIEWED'].includes(invoice.status) && (
                          <button
                            onClick={() => handleSendReminder(invoice)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Send Reminder"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modals */}
      {showInvoiceForm && (
        <InvoiceForm
          invoice={editingInvoice}
          onClose={() => {
            setShowInvoiceForm(false)
            setEditingInvoice(null)
          }}
          onSuccess={() => {
            setShowInvoiceForm(false)
            setEditingInvoice(null)
            fetchInvoices(filters)
          }}
        />
      )}

      {showDetailsModal && selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedInvoice(null)
          }}
          onEdit={() => {
            setShowDetailsModal(false)
            handleEditInvoice(selectedInvoice)
          }}
          onDelete={() => {
            setShowDetailsModal(false)
            handleDeleteInvoice(selectedInvoice.id)
            setSelectedInvoice(null)
          }}
        />
      )}

      {showPreviewModal && selectedInvoice && (
        <InvoicePreviewModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedInvoice(null)
          }}
        />
      )}

      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedInvoice(null)
          }}
          onSuccess={() => {
            setShowPaymentModal(false)
            setSelectedInvoice(null)
            fetchInvoices(filters)
          }}
        />
      )}
    </div>
  )
}