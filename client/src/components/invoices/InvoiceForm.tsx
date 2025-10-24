import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calculator } from 'lucide-react'
import { useInvoiceStore } from '../../stores/invoiceStore'
import { useCustomerStore } from '../../stores/customerStore'
import { useProductStore } from '../../stores/productStore'
import type { Invoice, CreateInvoiceData, UpdateInvoiceData, InvoiceItem } from '../../stores/invoiceStore'

interface InvoiceFormProps {
  invoice?: Invoice | null
  onClose: () => void
  onSuccess: () => void
}

export default function InvoiceForm({ invoice, onClose, onSuccess }: InvoiceFormProps) {
  const { createInvoice, updateInvoice, isLoading } = useInvoiceStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { products, fetchProducts } = useProductStore()
  
  const [formData, setFormData] = useState({
    customerId: invoice?.customerId || '',
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
    notes: invoice?.notes || '',
    terms: invoice?.terms || 'Net 30 days',
    discountAmount: invoice?.discountAmount || 0,
    isRecurring: invoice?.isRecurring || false,
    recurringInterval: invoice?.recurringInterval || 'monthly'
  })
  
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'totalPrice'>[]>(
    invoice?.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      productId: item.productId
    })) || [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 10,
        productId: undefined
      }
    ]
  )
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [fetchCustomers, fetchProducts])

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

  const handleItemChange = (index: number, field: keyof typeof items[0], value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      handleItemChange(index, 'productId', productId)
      handleItemChange(index, 'description', product.name)
      handleItemChange(index, 'unitPrice', product.sellingPrice)
    }
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 10,
      productId: undefined
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    let subtotal = 0
    let taxAmount = 0
    
    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice
      const itemTax = itemTotal * (item.taxRate / 100)
      subtotal += itemTotal
      taxAmount += itemTax
    })
    
    const totalAmount = subtotal + taxAmount - formData.discountAmount
    
    return { subtotal, taxAmount, totalAmount }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required'
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required'
    } else if (new Date(formData.dueDate) < new Date()) {
      newErrors.dueDate = 'Due date cannot be in the past'
    }
    
    if (formData.discountAmount < 0) {
      newErrors.discountAmount = 'Discount amount cannot be negative'
    }
    
    if (formData.isRecurring && !formData.recurringInterval) {
      newErrors.recurringInterval = 'Recurring interval is required for recurring invoices'
    }
    
    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item_${index}_description`] = 'Description is required'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than zero'
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = 'Unit price cannot be negative'
      }
      if (item.taxRate < 0 || item.taxRate > 100) {
        newErrors[`item_${index}_taxRate`] = 'Tax rate must be between 0 and 100'
      }
    })
    
    const { totalAmount } = calculateTotals()
    if (totalAmount < 0) {
      newErrors.totalAmount = 'Total amount cannot be negative'
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
      const invoiceData = {
        ...formData,
        dueDate: new Date(formData.dueDate),
        items
      }
      
      if (invoice) {
        await updateInvoice(invoice.id, invoiceData as UpdateInvoiceData)
      } else {
        await createInvoice(invoiceData as CreateInvoiceData)
      }
      
      onSuccess()
    } catch (error) {
      console.error('Error saving invoice:', error)
    }
  }

  const { subtotal, taxAmount, totalAmount } = calculateTotals()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {invoice ? 'Edit Invoice' : 'Create Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleInputChange('customerId', e.target.value)}
                className={`input ${errors.customerId ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={`input ${errors.dueDate ? 'border-red-500' : ''}`}
                required
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="btn-outline flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product (Optional)
                      </label>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="input"
                      >
                        <option value="">Select a product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.sellingPrice}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className={`input ${errors[`item_${index}_description`] ? 'border-red-500' : ''}`}
                        placeholder="Item description"
                        required
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_description`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className={`input ${errors[`item_${index}_quantity`] ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className={`input ${errors[`item_${index}_unitPrice`] ? 'border-red-500' : ''}`}
                        required
                      />
                      {errors[`item_${index}_unitPrice`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_unitPrice`]}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        className={`input ${errors[`item_${index}_taxRate`] ? 'border-red-500' : ''}`}
                      />
                      {errors[`item_${index}_taxRate`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_taxRate`]}</p>
                      )}
                    </div>
                    
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        <div>Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}</div>
                        <div>Tax: ${((item.quantity * item.unitPrice) * (item.taxRate / 100)).toFixed(2)}</div>
                        <div className="font-medium">Total: ${((item.quantity * item.unitPrice) * (1 + item.taxRate / 100)).toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="input"
                placeholder="Additional notes for the invoice"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => handleInputChange('terms', e.target.value)}
                rows={3}
                className="input"
                placeholder="Payment terms and conditions"
              />
            </div>
          </div>

          {/* Discount and Recurring */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discountAmount}
                onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                className={`input ${errors.discountAmount ? 'border-red-500' : ''}`}
              />
              {errors.discountAmount && (
                <p className="text-red-500 text-sm mt-1">{errors.discountAmount}</p>
              )}
            </div>
            
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Recurring Invoice</span>
              </label>
              
              {formData.isRecurring && (
                <select
                  value={formData.recurringInterval}
                  onChange={(e) => handleInputChange('recurringInterval', e.target.value)}
                  className={`input ${errors.recurringInterval ? 'border-red-500' : ''}`}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
              {errors.recurringInterval && (
                <p className="text-red-500 text-sm mt-1">{errors.recurringInterval}</p>
              )}
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Invoice Totals</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              {formData.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${formData.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
            {errors.totalAmount && (
              <p className="text-red-500 text-sm mt-2">{errors.totalAmount}</p>
            )}
          </div>

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
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (invoice ? 'Update Invoice' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}