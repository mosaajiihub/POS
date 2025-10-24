import { useState, useEffect } from 'react'
import { useServiceManagementStore } from '../../stores/serviceManagementStore'

export default function ServiceTypeManagement() {
  const [showForm, setShowForm] = useState(false)
  const [editingServiceType, setEditingServiceType] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    serviceTypes,
    serviceTypesLoading,
    serviceTypesError,
    fetchServiceTypes,
    createServiceType,
    updateServiceType,
    deleteServiceType
  } = useServiceManagementStore()

  useEffect(() => {
    fetchServiceTypes()
  }, [fetchServiceTypes])

  const filteredServiceTypes = serviceTypes.filter(serviceType =>
    serviceType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serviceType.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      await deleteServiceType(id)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Service Type Management</h3>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Add Service Type
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search service types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Error Display */}
      {serviceTypesError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{serviceTypesError}</p>
        </div>
      )}

      {/* Service Types List */}
      {serviceTypesLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredServiceTypes.map((serviceType) => (
              <li key={serviceType.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">🔧</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {serviceType.name}
                        </p>
                        {!serviceType.isActive && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          {serviceType.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          Base Price: ${serviceType.basePrice} • Duration: {serviceType.estimatedDuration} min
                        </p>
                        <p className="text-sm text-gray-500">
                          {serviceType._count?.appointments || 0} appointments
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingServiceType(serviceType.id)
                        setShowForm(true)
                      }}
                      className="text-sm text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(serviceType.id, serviceType.name)}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {filteredServiceTypes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No service types found matching your search.' : 'No service types found. Add your first service type to get started.'}
            </div>
          )}
        </div>
      )}

      {/* Service Type Form Modal */}
      {showForm && (
        <ServiceTypeForm
          serviceTypeId={editingServiceType}
          onClose={() => {
            setShowForm(false)
            setEditingServiceType(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingServiceType(null)
            fetchServiceTypes()
          }}
        />
      )}
    </div>
  )
}

// Service Type Form Component
function ServiceTypeForm({
  serviceTypeId,
  onClose,
  onSuccess
}: {
  serviceTypeId: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    estimatedDuration: '',
    isActive: true
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { serviceTypes, createServiceType, updateServiceType } = useServiceManagementStore()

  useEffect(() => {
    if (serviceTypeId) {
      const serviceType = serviceTypes.find(st => st.id === serviceTypeId)
      if (serviceType) {
        setFormData({
          name: serviceType.name,
          description: serviceType.description || '',
          basePrice: serviceType.basePrice.toString(),
          estimatedDuration: serviceType.estimatedDuration.toString(),
          isActive: serviceType.isActive
        })
      }
    }
  }, [serviceTypeId, serviceTypes])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) newErrors.name = 'Service type name is required'
    if (!formData.basePrice || parseFloat(formData.basePrice) < 0) {
      newErrors.basePrice = 'Valid base price is required'
    }
    if (!formData.estimatedDuration || parseInt(formData.estimatedDuration) <= 0) {
      newErrors.estimatedDuration = 'Valid estimated duration is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const serviceTypeData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        basePrice: parseFloat(formData.basePrice),
        estimatedDuration: parseInt(formData.estimatedDuration),
        isActive: formData.isActive
      }

      if (serviceTypeId) {
        await updateServiceType(serviceTypeId, serviceTypeData)
      } else {
        await createServiceType(serviceTypeData)
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving service type:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {serviceTypeId ? 'Edit Service Type' : 'Add New Service Type'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Oil Change, Brake Repair, etc."
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Brief description of the service..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price ($) *
              </label>
              <input
                type="number"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.basePrice ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.basePrice && (
                <p className="mt-1 text-sm text-red-600">{errors.basePrice}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                min="1"
                placeholder="60"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.estimatedDuration ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.estimatedDuration && (
                <p className="mt-1 text-sm text-red-600">{errors.estimatedDuration}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Active (available for booking)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : serviceTypeId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}