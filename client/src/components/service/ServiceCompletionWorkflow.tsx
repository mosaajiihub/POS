import { useState, useEffect } from 'react'
import { useServiceManagementStore, ServiceAppointment } from '../../stores/serviceManagementStore'
import { useProductStore } from '../../stores/productStore'
import ServiceInvoiceForm from './ServiceInvoiceForm'

interface ServiceCompletionWorkflowProps {
  appointment: ServiceAppointment
  onClose: () => void
  onSuccess: () => void
}

export default function ServiceCompletionWorkflow({
  appointment,
  onClose,
  onSuccess
}: ServiceCompletionWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [completionData, setCompletionData] = useState({
    actualStartTime: '',
    actualEndTime: '',
    laborCost: '',
    notes: '',
    internalNotes: '',
    warrantyPeriod: '',
    followUpDate: ''
  })
  const [selectedParts, setSelectedParts] = useState<Array<{
    productId: string
    quantity: number
    unitCost: number
  }>>([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    updateAppointment,
    addAppointmentPart,
    setSelectedAppointment
  } = useServiceManagementStore()

  const { products, fetchProducts } = useProductStore()

  useEffect(() => {
    fetchProducts()
    setSelectedAppointment(appointment)

    // Pre-populate with existing data
    if (appointment.actualStartTime) {
      setCompletionData(prev => ({
        ...prev,
        actualStartTime: new Date(appointment.actualStartTime!).toISOString().slice(0, 16)
      }))
    }
    if (appointment.actualEndTime) {
      setCompletionData(prev => ({
        ...prev,
        actualEndTime: new Date(appointment.actualEndTime!).toISOString().slice(0, 16)
      }))
    }
  }, [appointment, fetchProducts, setSelectedAppointment])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCompletionData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const addPart = () => {
    setSelectedParts(prev => [...prev, { productId: '', quantity: 1, unitCost: 0 }])
  }

  const updatePart = (index: number, field: string, value: string | number) => {
    setSelectedParts(prev => {
      const newParts = [...prev]
      newParts[index] = { ...newParts[index], [field]: value }
      
      // Auto-populate unit cost when product is selected
      if (field === 'productId' && typeof value === 'string') {
        const product = products.find(p => p.id === value)
        if (product) {
          newParts[index].unitCost = product.costPrice
        }
      }
      
      return newParts
    })
  }

  const removePart = (index: number) => {
    setSelectedParts(prev => prev.filter((_, i) => i !== index))
  }

  const validateStep = (step: number) => {
    const newErrors: { [key: string]: string } = {}

    if (step === 1) {
      if (!completionData.actualStartTime) {
        newErrors.actualStartTime = 'Actual start time is required'
      }
      if (!completionData.actualEndTime) {
        newErrors.actualEndTime = 'Actual end time is required'
      }
      if (completionData.actualStartTime && completionData.actualEndTime) {
        const startTime = new Date(completionData.actualStartTime)
        const endTime = new Date(completionData.actualEndTime)
        if (endTime <= startTime) {
          newErrors.actualEndTime = 'End time must be after start time'
        }
      }
    }

    if (step === 2) {
      // Validate parts
      selectedParts.forEach((part, index) => {
        if (part.productId && (!part.quantity || part.quantity <= 0)) {
          newErrors[`part_${index}_quantity`] = 'Valid quantity is required'
        }
        if (part.productId && (!part.unitCost || part.unitCost < 0)) {
          newErrors[`part_${index}_unitCost`] = 'Valid unit cost is required'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleCompleteService = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      // Calculate total parts cost
      const totalPartsCost = selectedParts.reduce((sum, part) => {
        return sum + (part.quantity * part.unitCost)
      }, 0)

      // Update appointment with completion data
      const updateData = {
        status: 'COMPLETED' as const,
        actualStartTime: new Date(completionData.actualStartTime),
        actualEndTime: new Date(completionData.actualEndTime),
        laborCost: parseFloat(completionData.laborCost) || 0,
        partsCost: totalPartsCost,
        totalCost: (parseFloat(completionData.laborCost) || 0) + totalPartsCost,
        notes: completionData.notes || undefined,
        internalNotes: completionData.internalNotes || undefined,
        warrantyPeriod: completionData.warrantyPeriod ? parseInt(completionData.warrantyPeriod) : undefined,
        followUpDate: completionData.followUpDate ? new Date(completionData.followUpDate) : undefined
      }

      await updateAppointment(appointment.id, updateData)

      // Add parts to appointment
      for (const part of selectedParts) {
        if (part.productId && part.quantity > 0) {
          await addAppointmentPart(appointment.id, part)
        }
      }

      // Show invoice creation form
      setShowInvoiceForm(true)
    } catch (error) {
      console.error('Error completing service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { id: 1, name: 'Service Details', description: 'Record service completion details' },
    { id: 2, name: 'Parts Used', description: 'Add parts used during service' },
    { id: 3, name: 'Review & Complete', description: 'Review and complete the service' }
  ]

  if (showInvoiceForm) {
    return (
      <ServiceInvoiceForm
        appointmentId={appointment.id}
        onClose={() => {
          setShowInvoiceForm(false)
          onSuccess()
        }}
        onSuccess={() => {
          setShowInvoiceForm(false)
          onSuccess()
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Complete Service - {appointment.appointmentNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li key={step.id} className={`${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}>
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      step.id < currentStep
                        ? 'bg-primary-600 text-white'
                        : step.id === currentStep
                        ? 'bg-primary-100 text-primary-600 border-2 border-primary-600'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step.id < currentStep ? '✓' : step.id}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-medium ${
                        step.id <= currentStep ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </div>
                      <div className="text-sm text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="p-6">
          {/* Step 1: Service Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Service Completion Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="actualStartTime"
                      value={completionData.actualStartTime}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.actualStartTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.actualStartTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.actualStartTime}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual End Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="actualEndTime"
                      value={completionData.actualEndTime}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.actualEndTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.actualEndTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.actualEndTime}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Labor Cost ($)
                    </label>
                    <input
                      type="number"
                      name="laborCost"
                      value={completionData.laborCost}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Period (days)
                    </label>
                    <input
                      type="number"
                      name="warrantyPeriod"
                      value={completionData.warrantyPeriod}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={completionData.followUpDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Notes
                  </label>
                  <textarea
                    name="notes"
                    value={completionData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Notes about the completed service..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    name="internalNotes"
                    value={completionData.internalNotes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Internal notes for staff only..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Parts Used */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">Parts Used</h4>
                <button
                  onClick={addPart}
                  className="btn-secondary"
                >
                  Add Part
                </button>
              </div>

              {selectedParts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No parts added. Click "Add Part" to add parts used during the service.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedParts.map((part, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                          </label>
                          <select
                            value={part.productId}
                            onChange={(e) => updatePart(index, 'productId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select a product</option>
                            {products.filter(p => p.isActive).map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.sku}) - ${product.costPrice}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={part.quantity}
                            onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                              errors[`part_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {errors[`part_${index}_quantity`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`part_${index}_quantity`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Cost ($)
                          </label>
                          <div className="flex">
                            <input
                              type="number"
                              value={part.unitCost}
                              onChange={(e) => updatePart(index, 'unitCost', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className={`flex-1 px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                                errors[`part_${index}_unitCost`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            <button
                              onClick={() => removePart(index)}
                              className="px-3 py-2 bg-red-600 text-white rounded-r-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              ✕
                            </button>
                          </div>
                          {errors[`part_${index}_unitCost`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`part_${index}_unitCost`]}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          Total: ${(part.quantity * part.unitCost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="text-right border-t pt-4">
                    <span className="text-lg font-medium text-gray-900">
                      Total Parts Cost: ${selectedParts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Complete */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Review & Complete Service</h4>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Service Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Service Duration:</span>
                    <span className="ml-2 font-medium">
                      {completionData.actualStartTime && completionData.actualEndTime
                        ? `${Math.round((new Date(completionData.actualEndTime).getTime() - new Date(completionData.actualStartTime).getTime()) / (1000 * 60))} minutes`
                        : 'Not specified'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Labor Cost:</span>
                    <span className="ml-2 font-medium">${completionData.laborCost || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Parts Cost:</span>
                    <span className="ml-2 font-medium">
                      ${selectedParts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Cost:</span>
                    <span className="ml-2 font-medium">
                      ${(parseFloat(completionData.laborCost) || 0 + selectedParts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0)).toFixed(2)}
                    </span>
                  </div>
                  {completionData.warrantyPeriod && (
                    <div>
                      <span className="text-gray-500">Warranty:</span>
                      <span className="ml-2 font-medium">{completionData.warrantyPeriod} days</span>
                    </div>
                  )}
                  {completionData.followUpDate && (
                    <div>
                      <span className="text-gray-500">Follow-up:</span>
                      <span className="ml-2 font-medium">
                        {new Date(completionData.followUpDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedParts.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Parts Used</h5>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Cost
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedParts.filter(part => part.productId).map((part, index) => {
                          const product = products.find(p => p.id === part.productId)
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {product?.name} ({product?.sku})
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {part.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${part.unitCost.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${(part.quantity * part.unitCost).toFixed(2)}
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
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <button
              onClick={currentStep === 1 ? onClose : handlePreviousStep}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCompleteService}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Completing...' : 'Complete Service & Create Invoice'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}