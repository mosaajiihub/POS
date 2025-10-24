import { useState } from 'react'
import { X, DollarSign, CreditCard, Banknote, Smartphone, Building } from 'lucide-react'
import { useInvoiceStore } from '../../stores/invoiceStore'
import type { Invoice, InvoicePayment } from '../../stores/invoiceStore'

interface PaymentModalProps {
  invoice: Invoice
  onClose: () => void
  onSuccess: () => void
}

export default function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const { recordPayment, isLoading } = useInvoiceStore()
  
  const [formData, setFormData] = useState({
    amount: invoice.remainingAmount || invoice.totalAmount,
    paymentMethod: 'CASH' as InvoicePayment['paymentMethod'],
    reference: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Payment amount must be greater than zero'
    }
    
    const remainingAmount = invoice.remainingAmount || invoice.totalAmount
    if (formData.amount > remainingAmount) {
      newErrors.amount = `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required'
    }
    
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required'
    } else if (new Date(formData.paymentDate) > new Date()) {
      newErrors.paymentDate = 'Payment date cannot be in the future'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      await recordPayment(invoice.id, {
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        paymentDate: new Date(formData.paymentDate)
      })
      
      onSuccess()
    } catch (error) {
      console.error('Error recording payment:', error)
    }
  }

  const getPaymentMethodIcon = (method: InvoicePayment['paymentMethod']) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-5 h-5" />
      case 'CARD':
        return <CreditCard className="w-5 h-5" />
      case 'DIGITAL':
        return <Smartphone className="w-5 h-5" />
      case 'CREDIT':
        return <Building className="w-5 h-5" />
      default:
        return <DollarSign className="w-5 h-5" />
    }
  }

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'CARD', label: 'Credit/Debit Card', icon: CreditCard },
    { value: 'DIGITAL', label: 'Digital Payment', icon: Smartphone },
    { value: 'CREDIT', label: 'Credit Account', icon: Building }
  ]

  const remainingAmount = invoice.remainingAmount || invoice.totalAmount
  const isFullPayment = formData.amount === remainingAmount

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Record Payment
            </h2>
            <p className="text-gray-600">{invoice.invoiceNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Invoice Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.totalPaid && invoice.totalPaid > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(invoice.totalPaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Amount Due:</span>
                <span>{formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount *
            </label>
            <div className="relative">
              <DollarSign className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={remainingAmount}
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className={`input pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                placeholder="0.00"
                required
              />
            </div>
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
            )}
            
            {/* Quick Amount Buttons */}
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={() => handleInputChange('amount', remainingAmount)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  isFullPayment 
                    ? 'bg-primary-100 text-primary-700 border-primary-300' 
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                Full Payment
              </button>
              {remainingAmount > 100 && (
                <button
                  type="button"
                  onClick={() => handleInputChange('amount', Math.round(remainingAmount / 2 * 100) / 100)}
                  className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                >
                  Half Payment
                </button>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                const isSelected = formData.paymentMethod === method.value
                
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => handleInputChange('paymentMethod', method.value)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                )
              })}
            </div>
            {errors.paymentMethod && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => handleInputChange('paymentDate', e.target.value)}
              className={`input ${errors.paymentDate ? 'border-red-500' : ''}`}
              required
            />
            {errors.paymentDate && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentDate}</p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              className="input"
              placeholder="Transaction ID, check number, etc."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="input"
              placeholder="Additional notes about this payment"
            />
          </div>

          {/* Payment Summary */}
          {formData.amount > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-blue-800">
                  <span>Payment Amount:</span>
                  <span className="font-medium">{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>Remaining Balance:</span>
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, remainingAmount - formData.amount))}
                  </span>
                </div>
                {isFullPayment && (
                  <div className="text-green-600 font-medium text-center mt-2">
                    ✓ This payment will mark the invoice as PAID
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={isLoading}
            >
              {getPaymentMethodIcon(formData.paymentMethod)}
              <span>{isLoading ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}