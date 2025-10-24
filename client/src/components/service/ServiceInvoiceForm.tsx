import { useState, useEffect } from 'react'
import { useServiceManagementStore } from '../../stores/serviceManagementStore'
import { useInvoiceStore } from '../../stores/invoiceStore'

interface ServiceInvoiceFormProps {
  appointmentId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ServiceInvoiceForm({
  appointmentId,
  onClose,
  onSuccess
}: ServiceInvoiceFormProps) {
  const [formData, setFormData] = useState({
    laborHours: '',
    laborRate: '',
    laborCost: '',
    partsCost: '',
    totalCost: '',
    notes: '',
    terms: '',
    dueDate: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>>([])

  const {
    appointments,
    createServiceInvoice,
    selectedAppointment
  } = useServiceManagementStore()

  const { createInvoice } = useInvoiceStore()

  const appointment = appointments.find(a => a.id === appointmentId) || selectedAppointment

  useEffect(() => {
    if (appointment) {
      // Pre-populate with appointment data
      const technician = appointment.technician
      const laborRate = technician?.hourlyRate || 0
      const estimatedHours = (appointment.estimatedDuration || 60) / 60
      const laborCost = laborRate * estimatedHours
      const partsCost = appointment.partsCost || 0
      const totalCost = laborCost + partsCost

      setFormData({
        laborHours: estimatedHours.toString(),
        laborRate: laborRate.toString(),
        laborCost: laborCost.toFixed(2),
        partsCost: partsCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        notes: appointment.notes || '',
        terms: 'Payment due within 30 days',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })

      // Create invoice items
      const items = []
      
      // Add labor item
      if (laborCost > 0) {
        items.push({
          description: `${appointment.serviceType?.name} - Labor`,
          quantity: estimatedHours,
          unitPrice: laborRate,
          totalPrice: laborCost
        })
      }

      // Add parts items
      if (appointment.parts && appointment.parts.length > 0) {
        appointment.parts.forEach(part => {
          items.push({
            description: `${part.product?.name} (${part.product?.sku})`,
            quantity: part.quantity,
            unitPrice: part.unitCost,
            totalPrice: part.totalCost
          })
        })
      }

      setInvoiceItems(items)
    }
  }, [appointment])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-calculate costs
    if (name === 'laborHours' || name === 'laborRate') {
      const hours = name === 'laborHours' ? parseFloat(value) || 0 : parseFloat(formData.laborHours) || 0
      const rate = name === 'laborRate' ? parseFloat(value) || 0 : parseFloat(formData.laborRate) || 0
      const laborCost = hours * rate
      const partsCost = parseFloat(formData.partsCost) || 0
      const totalCost = laborCost + partsCost

      setFormData(prev => ({
        ...prev,
        laborCost: laborCost.toFixed(2),
        totalCost: totalCost.toFixed(2)
      }))

      // Update labor item in invoice items
      setInvoiceItems(prev => {
        const newItems = [...prev]
        const laborItemIndex = newItems.findIndex(item => item.description.includes('Labor'))
        if (laborItemIndex >= 0) {
          newItems[laborItemIndex] = {
            ...newItems[laborItemIndex],
            quantity: hours,
            unitPrice: rate,
            totalPrice: laborCost
          }
        }
        return newItems
      })
    }

    if (name === 'partsCost') {
      const partsCost = parseFloat(value) || 0
      const laborCost = parseFloat(formData.laborCost) || 0
      const totalCost = laborCost + partsCost

      setFormData(prev => ({
        ...prev,
        totalCost: totalCost.toFixed(2)
      }))
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.laborHours || parseFloat(formData.laborHours) < 0) {
      newErrors.laborHours = 'Valid labor hours is required'
    }
    if (!formData.laborRate || parseFloat(formData.laborRate) < 0) {
      newErrors.laborRate = 'Valid labor rate is required'
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !appointment) return

    setIsSubmitting(true)
    try {
      // First create the invoice
      const invoiceData = {
        customerId: appointment.customerId,
        subtotal: parseFloat(formData.totalCost),
        taxAmount: 0, // Can be calculated based on business rules
        discountAmount: 0,
        totalAmount: parseFloat(formData.totalCost),
        notes: formData.notes,
        terms: formData.terms,
        dueDate: new Date(formData.dueDate),
        items: invoiceItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: 0
        }))
      }

      const invoiceResult = await createInvoice(invoiceData)
      
      if (invoiceResult && invoiceResult.id) {
        // Then create the service invoice link
        const serviceInvoiceData = {
          appointmentId: appointmentId,
          invoiceId: invoiceResult.id,
          laborHours: parseFloat(formData.laborHours),
          laborRate: parseFloat(formData.laborRate),
          laborCost: parseFloat(formData.laborCost),
          partsCost: parseFloat(formData.partsCost),
          totalCost: parseFloat(formData.totalCost)
        }

        await createServiceInvoice(serviceInvoiceData)
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating service invoice:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!appointment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <p className="text-center text-gray-500">Appointment not found</p>
          <div className="flex justify-center mt-4">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Create Service Invoice - {appointment.appointmentNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Appointment Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <span className="ml-2 font-medium">
                  {appointment.customer?.firstName} {appointment.customer?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Service:</span>
                <span className="ml-2 font-medium">{appointment.serviceType?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Technician:</span>
                <span className="ml-2 font-medium">
                  {appointment.technician?.firstName} {appointment.technician?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(appointment.scheduledDate).toLocaleDateString()} at {appointment.scheduledTime}
                </span>
              </div>
            </div>
          </div>

          {/* Labor Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Hours *
              </label>
              <input
                type="number"
                name="laborHours"
                value={formData.laborHours}
                onChange={handleInputChange}
                min="0"
                step="0.25"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.laborHours ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.laborHours && (
                <p className="mt-1 text-sm text-red-600">{errors.laborHours}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Rate ($/hour) *
              </label>
              <input
                type="number"
                name="laborRate"
                value={formData.laborRate}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.laborRate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.laborRate && (
                <p className="mt-1 text-sm text-red-600">{errors.laborRate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost
              </label>
              <input
                type="text"
                name="laborCost"
                value={`$${formData.laborCost}`}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
              />
            </div>
          </div>

          {/* Parts and Total */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parts Cost
              </label>
              <input
                type="number"
                name="partsCost"
                value={formData.partsCost}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost
              </label>
              <input
                type="text"
                name="totalCost"
                value={`$${formData.totalCost}`}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 font-medium"
              />
            </div>
          </div>

          {/* Invoice Items Preview */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Invoice Items</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms
              </label>
              <input
                type="text"
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                placeholder="Payment terms..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Additional notes for the invoice..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Invoice...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}