import { useState, useEffect } from 'react'
import { useServiceManagementStore } from '../../stores/serviceManagementStore'

export default function TechnicianManagement() {
  const [showForm, setShowForm] = useState(false)
  const [editingTechnician, setEditingTechnician] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<string | null>(null)

  const {
    technicians,
    techniciansLoading,
    techniciansError,
    fetchTechnicians,
    createTechnician,
    updateTechnician,
    setTechnicianAvailability
  } = useServiceManagementStore()

  useEffect(() => {
    fetchTechnicians()
  }, [fetchTechnicians])

  const filteredTechnicians = technicians.filter(technician =>
    `${technician.firstName} ${technician.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    technician.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    technician.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Technician Management</h3>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Add Technician
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search technicians..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Error Display */}
      {techniciansError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{techniciansError}</p>
        </div>
      )}

      {/* Technicians List */}
      {techniciansLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTechnicians.map((technician) => (
              <li key={technician.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {technician.firstName[0]}{technician.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {technician.firstName} {technician.lastName}
                        </p>
                        {!technician.isActive && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          {technician.email} • ${technician.hourlyRate}/hr
                        </p>
                        <p className="text-sm text-gray-500">
                          Specialties: {technician.specialties.join(', ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {technician._count?.appointments || 0} appointments
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowAvailabilityModal(technician.id)}
                      className="text-sm text-primary-600 hover:text-primary-900"
                    >
                      Availability
                    </button>
                    <button
                      onClick={() => {
                        setEditingTechnician(technician.id)
                        setShowForm(true)
                      }}
                      className="text-sm text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {filteredTechnicians.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No technicians found matching your search.' : 'No technicians found. Add your first technician to get started.'}
            </div>
          )}
        </div>
      )}

      {/* Technician Form Modal */}
      {showForm && (
        <TechnicianForm
          technicianId={editingTechnician}
          onClose={() => {
            setShowForm(false)
            setEditingTechnician(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingTechnician(null)
            fetchTechnicians()
          }}
        />
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <TechnicianAvailabilityModal
          technicianId={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(null)}
          onSuccess={() => {
            setShowAvailabilityModal(null)
            fetchTechnicians()
          }}
        />
      )}
    </div>
  )
}

// Technician Form Component
function TechnicianForm({
  technicianId,
  onClose,
  onSuccess
}: {
  technicianId: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialties: [''],
    hourlyRate: '',
    isActive: true
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { technicians, createTechnician, updateTechnician } = useServiceManagementStore()

  useEffect(() => {
    if (technicianId) {
      const technician = technicians.find(t => t.id === technicianId)
      if (technician) {
        setFormData({
          firstName: technician.firstName,
          lastName: technician.lastName,
          email: technician.email || '',
          phone: technician.phone || '',
          specialties: technician.specialties.length > 0 ? technician.specialties : [''],
          hourlyRate: technician.hourlyRate.toString(),
          isActive: technician.isActive
        })
      }
    }
  }, [technicianId, technicians])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSpecialtyChange = (index: number, value: string) => {
    const newSpecialties = [...formData.specialties]
    newSpecialties[index] = value
    setFormData(prev => ({ ...prev, specialties: newSpecialties }))
  }

  const addSpecialty = () => {
    setFormData(prev => ({ ...prev, specialties: [...prev.specialties, ''] }))
  }

  const removeSpecialty = (index: number) => {
    if (formData.specialties.length > 1) {
      const newSpecialties = formData.specialties.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, specialties: newSpecialties }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email is required'
    }
    if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
      newErrors.hourlyRate = 'Valid hourly rate is required'
    }
    if (formData.specialties.filter(s => s.trim()).length === 0) {
      newErrors.specialties = 'At least one specialty is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const technicianData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        specialties: formData.specialties.filter(s => s.trim()).map(s => s.trim()),
        hourlyRate: parseFloat(formData.hourlyRate),
        isActive: formData.isActive
      }

      if (technicianId) {
        await updateTechnician(technicianId, technicianData)
      } else {
        await createTechnician(technicianData)
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving technician:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {technicianId ? 'Edit Technician' : 'Add New Technician'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate *
            </label>
            <input
              type="number"
              name="hourlyRate"
              value={formData.hourlyRate}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                errors.hourlyRate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.hourlyRate && (
              <p className="mt-1 text-sm text-red-600">{errors.hourlyRate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialties *
            </label>
            {formData.specialties.map((specialty, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => handleSpecialtyChange(index, e.target.value)}
                  placeholder="Enter specialty"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
                {formData.specialties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSpecialty(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addSpecialty}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              + Add Specialty
            </button>
            {errors.specialties && (
              <p className="mt-1 text-sm text-red-600">{errors.specialties}</p>
            )}
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
              Active
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
              {isSubmitting ? 'Saving...' : technicianId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Technician Availability Modal Component
function TechnicianAvailabilityModal({
  technicianId,
  onClose,
  onSuccess
}: {
  technicianId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [availability, setAvailability] = useState<{ [key: number]: { startTime: string; endTime: string; isAvailable: boolean } }>({
    0: { startTime: '09:00', endTime: '17:00', isAvailable: false }, // Sunday
    1: { startTime: '09:00', endTime: '17:00', isAvailable: true },  // Monday
    2: { startTime: '09:00', endTime: '17:00', isAvailable: true },  // Tuesday
    3: { startTime: '09:00', endTime: '17:00', isAvailable: true },  // Wednesday
    4: { startTime: '09:00', endTime: '17:00', isAvailable: true },  // Thursday
    5: { startTime: '09:00', endTime: '17:00', isAvailable: true },  // Friday
    6: { startTime: '09:00', endTime: '17:00', isAvailable: false }  // Saturday
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { technicians, setTechnicianAvailability } = useServiceManagementStore()

  const technician = technicians.find(t => t.id === technicianId)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  useEffect(() => {
    if (technician?.availability) {
      const availabilityMap: { [key: number]: { startTime: string; endTime: string; isAvailable: boolean } } = {}
      
      // Initialize with defaults
      for (let i = 0; i < 7; i++) {
        availabilityMap[i] = { startTime: '09:00', endTime: '17:00', isAvailable: i >= 1 && i <= 5 }
      }
      
      // Override with existing availability
      technician.availability.forEach(avail => {
        availabilityMap[avail.dayOfWeek] = {
          startTime: avail.startTime,
          endTime: avail.endTime,
          isAvailable: avail.isAvailable
        }
      })
      
      setAvailability(availabilityMap)
    }
  }, [technician])

  const handleAvailabilityChange = (dayOfWeek: number, field: string, value: string | boolean) => {
    setAvailability(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Save availability for each day
      for (const [dayOfWeek, avail] of Object.entries(availability)) {
        await setTechnicianAvailability(technicianId, {
          dayOfWeek: parseInt(dayOfWeek),
          startTime: avail.startTime,
          endTime: avail.endTime,
          isAvailable: avail.isAvailable
        })
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving availability:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Set Availability - {technician?.firstName} {technician?.lastName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {dayNames.map((dayName, dayOfWeek) => (
            <div key={dayOfWeek} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{dayName}</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availability[dayOfWeek]?.isAvailable || false}
                    onChange={(e) => handleAvailabilityChange(dayOfWeek, 'isAvailable', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Available</span>
                </label>
              </div>
              
              {availability[dayOfWeek]?.isAvailable && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={availability[dayOfWeek]?.startTime || '09:00'}
                      onChange={(e) => handleAvailabilityChange(dayOfWeek, 'startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={availability[dayOfWeek]?.endTime || '17:00'}
                      onChange={(e) => handleAvailabilityChange(dayOfWeek, 'endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

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
              {isSubmitting ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}