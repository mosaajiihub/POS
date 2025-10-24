import { X, Edit, Trash2, FileText, Send, DollarSign, Calendar, User, Mail } from 'lucide-react'
import type { Invoice } from '../../stores/invoiceStore'

interface InvoiceDetailsModalProps {
  invoice: Invoice
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function InvoiceDetailsModal({ invoice, onClose, onEdit, onDelete }: InvoiceDetailsModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  const canEdit = invoice.status !== 'PAID'
  const canDelete = invoice.status !== 'PAID' && invoice.payments.length === 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Invoice Details
            </h2>
            <p className="text-gray-600">{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="btn-outline flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="btn-outline text-red-600 border-red-300 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Invoice Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Invoice Number:</span>
                    <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Issue Date:</span>
                    <span className="text-sm">{formatDate(invoice.issuedDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Due Date:</span>
                    <span className="text-sm">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {invoice.isRecurring && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recurring Settings</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Interval:</span>
                      <span className="text-sm capitalize">{invoice.recurringInterval}</span>
                    </div>
                    {invoice.nextInvoiceDate && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Next Invoice:</span>
                        <span className="text-sm">{formatDate(invoice.nextInvoiceDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </span>
                </div>
                {invoice.customer.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{invoice.customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.description}</div>
                          {item.product && (
                            <div className="text-gray-500 text-xs">
                              SKU: {item.product.sku}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {item.taxRate}%
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(item.totalPrice * (1 + item.taxRate / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.totalPaid && invoice.totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid:</span>
                      <span>{formatCurrency(invoice.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Remaining:</span>
                      <span>{formatCurrency(invoice.remainingAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {payment.reference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoice.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Terms</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Invoice created on {formatDate(invoice.createdAt)}
                </span>
              </div>
              {invoice.sentDate && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Invoice sent on {formatDate(invoice.sentDate)}
                  </span>
                </div>
              )}
              {invoice.viewedDate && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Invoice viewed on {formatDate(invoice.viewedDate)}
                  </span>
                </div>
              )}
              {invoice.paidDate && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Invoice paid on {formatDate(invoice.paidDate)}
                  </span>
                </div>
              )}
              {invoice.lastReminderDate && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Last reminder sent on {formatDate(invoice.lastReminderDate)} 
                    ({invoice.reminderCount} reminder{invoice.reminderCount !== 1 ? 's' : ''} sent)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}