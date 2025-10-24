import { useState, useEffect } from 'react'
import { useServiceManagementStore } from '../../stores/serviceManagementStore'
import { useCustomerStore } from '../../stores/customerStore'

interface ServiceAppointmentFormProps {
  onClose: () => void
  onSuccess: () => void
  appointmentId?: string
}

export default function ServiceAppointmentForm({
  onClose,
  onSuccess,
  appointmentId
}: ServiceAppointmentFormProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    technicianId: '',
    serviceTypeId: '',
    scheduledDate: '',
    scheduledTime: '',
    estimatedDuration: '',
    notes: '',
    customerNotes: '',
    internalNotes: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    serviceTypes,
    technicians,
    createAppointment,
    updateAppointment,
    selectedAppointment,
    fetchServiceTypes,
    fetchTechnicians
  } = useServiceManagementStore()

  const { customers, fetchCustomers } = useCustomerStore()

  useEffect(() => {
    // Load required data
    fetchServiceTypes()
    fetchTechnicians()
    fetchCustomers()

    // If editing, populate form
    if (appointmentId && selectedAppointment) {
      setFormData({
        customerId: selectedAppointment.customerId,
        technicianId: selectedAppointment.technicianId,
        serviceTypeId: selectedAppointment.serviceTypeId,
        scheduledDate: selectedAppointment.scheduledDate.toISOString().split('T')[0],
        scheduledTime: selectedAppointment.scheduledTime,
        estimatedDuration: selectedAppointment.estimatedDuration.toString(),
        notes: selectedAppointment.notes || '',
        customerNotes: selectedAppointment.customerNotes || '',
        internalNotes: selectedAppointment.internalNotes || ''
      })
    }
  }, [appointmentId, selectedAppointment, fetchServiceTypes, fetchTechnicians, fetchCustomers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.customerId) newErrors.customerId = 'Customer is required'
    if (!formData.technicianId) newErrors.technicianId = 'Technician is required'
    if (!formData.serviceTypeId) newErrors.serviceTypeId = 'Service type is required'
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Scheduled date is required'
    if (!formData.scheduledTime) newErrors.scheduledTime = 'Scheduled time is required'

    // Validate date is not in the past
    const selectedDate = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
    if (selectedDate < new Date()) {
      newErrors.scheduledDate = 'Appointment cannot be scheduled in the past'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const appointmentData = {
        customerId: formData.customerId,
        technicianId: formData.technicianId,
        serviceTypeId: formData.serviceTypeId,
        scheduledDate: new Date(formData.scheduledDate),
        scheduledTime: formData.scheduledTime,
        estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined,
        notes: formData.notes || undefined,
        customerNotes: formData.customerNotes || undefined,
        internalNotes: formData.internalNotes || undefined
      }

      if (appointmentId) {
        await updateAppointment(appointmentId, appointmentData)
      } else {
        await createAppointment(appointmentData)
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving appointment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected service type for duration
  const selectedServiceType = serviceTypes.find(st => st.id === formData.serviceTypeId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {appointmentId ? 'Edit Appointment' : 'New Service Appointment'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
              Customer *
            </label>
            <select
              id="customerId"
              name="customerId"
              value={formData.customerId}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.customerId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName} {customer.email && `(${customer.email})`}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
            )}
          </div>

          {/* Service Type Selection */}
          <div>
            <label htmlFor="serviceTypeId" className="block text-sm font-medium text-gray-700 mb-1">
              Service Type *
            </label>
            <select
              id="serviceTypeId"
              name="serviceTypeId"
              value={formData.serviceTypeId}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.serviceTypeId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a service type</option>
              {serviceTypes.filter(st => st.isActive).map(serviceType => (
                <option key={serviceType.id} value={serviceType.id}>
                  {serviceType.name} - ${serviceType.basePrice} ({serviceType.estimatedDuration} min)
                </option>
              ))}
            </select>
            {errors.serviceTypeId && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceTypeId}</p>
            )}
          </div>

          {/* Technician Selection */}
          <div>
            <label htmlFor="technicianId" className="block text-sm font-medium text-gray-700 mb-1">
              Technician *
            </label>
            <select
              id="technicianId"
              name="technicianId"
              value={formData.technicianId}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.technicianId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a technician</option>
              {technicians.filter(t => t.isActive).map(technician => (
                <option key={technician.id} value={technician.id}>
                  {technician.firstName} {technician.lastName} - ${technician.hourlyRate}/hr
                </option>
              ))}
            </select>
            {errors.technicianId && (
              <p className="mt-1 text-sm text-red-600">{errors.technicianId}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                id="scheduledDate"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.scheduledDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.scheduledDate && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                id="scheduledTime"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.scheduledTime ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.scheduledTime && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>
              )}
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <label htmlFor="estimatedDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              id="estimatedDuration"
              name="estimatedDuration"
              value={formData.estimatedDuration}
              onChange={handleInputChange}
              placeholder={selectedServiceType ? `Default: ${selectedServiceType.estimatedDuration} minutes` : 'Enter duration in minutes'}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              General Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="General notes about the appointment..."
            />
          </div>

          {/* Customer Notes */}
          <div>
            <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Notes
            </label>
            <textarea
              id="customerNotes"
              name="customerNotes"
              value={formData.customerNotes}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Notes from or for the customer..."
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              id="internalNotes"
              name="internalNotes"
              value={formData.internalNotes}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Internal notes for staff only..."
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
              {isSubmitting ? 'Saving...' : appointmentId ? 'Update Appointment' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}