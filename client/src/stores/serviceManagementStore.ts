import { create } from 'zustand'

export interface ServiceType {
  id: string
  name: string
  description?: string
  basePrice: number
  estimatedDuration: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    appointments: number
  }
}

export interface Technician {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  specialties: string[]
  hourlyRate: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  availability?: TechnicianAvailability[]
  _count?: {
    appointments: number
  }
}

export interface TechnicianAvailability {
  id: string
  technicianId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ServiceAppointment {
  id: string
  appointmentNumber: string
  customerId: string
  technicianId: string
  serviceTypeId: string
  scheduledDate: Date
  scheduledTime: string
  estimatedDuration: number
  actualStartTime?: Date
  actualEndTime?: Date
  status: ServiceAppointmentStatus
  notes?: string
  customerNotes?: string
  internalNotes?: string
  laborCost: number
  partsCost: number
  totalCost: number
  warrantyPeriod?: number
  warrantyExpiry?: Date
  followUpDate?: Date
  reminderSent: boolean
  createdAt: Date
  updatedAt: Date
  customer?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  technician?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  serviceType?: {
    id: string
    name: string
    basePrice: number
    estimatedDuration: number
  }
  parts?: ServiceAppointmentPart[]
}

export interface ServiceAppointmentPart {
  id: string
  appointmentId: string
  productId: string
  quantity: number
  unitCost: number
  totalCost: number
  createdAt: Date
  product?: {
    id: string
    name: string
    sku: string
  }
}

export interface ServiceInvoice {
  id: string
  appointmentId: string
  invoiceId: string
  laborHours: number
  laborRate: number
  laborCost: number
  partsCost: number
  totalCost: number
  createdAt: Date
  updatedAt: Date
  appointment?: ServiceAppointment
  invoice?: {
    id: string
    invoiceNumber: string
    status: string
    totalAmount: number
  }
}

export interface ServiceAnalytics {
  summary: {
    totalAppointments: number
    completedAppointments: number
    cancelledAppointments: number
    completionRate: number
    totalRevenue: number
    averageServiceTime: number
  }
  topServiceTypes: Array<{
    serviceTypeId: string
    _count: { _all: number }
  }>
  topTechnicians: Array<{
    technicianId: string
    _count: { _all: number }
    _sum: { totalCost: number | null }
  }>
}

export type ServiceAppointmentStatus = 
  | 'SCHEDULED' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW'

interface ServiceManagementState {
  // Service Types
  serviceTypes: ServiceType[]
  serviceTypesLoading: boolean
  serviceTypesError: string | null

  // Technicians
  technicians: Technician[]
  techniciansLoading: boolean
  techniciansError: string | null

  // Service Appointments
  appointments: ServiceAppointment[]
  appointmentsLoading: boolean
  appointmentsError: string | null
  selectedAppointment: ServiceAppointment | null

  // Service Invoices
  serviceInvoices: ServiceInvoice[]
  serviceInvoicesLoading: boolean
  serviceInvoicesError: string | null

  // Analytics
  analytics: ServiceAnalytics | null
  analyticsLoading: boolean
  analyticsError: string | null

  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }

  // Actions
  fetchServiceTypes: (filters?: { search?: string; isActive?: boolean; page?: number; limit?: number }) => Promise<void>
  createServiceType: (data: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt' | '_count'>) => Promise<void>
  updateServiceType: (id: string, data: Partial<ServiceType>) => Promise<void>
  deleteServiceType: (id: string) => Promise<void>

  fetchTechnicians: (filters?: { search?: string; isActive?: boolean; specialty?: string; page?: number; limit?: number }) => Promise<void>
  createTechnician: (data: Omit<Technician, 'id' | 'createdAt' | 'updatedAt' | 'availability' | '_count'>) => Promise<void>
  updateTechnician: (id: string, data: Partial<Technician>) => Promise<void>
  setTechnicianAvailability: (technicianId: string, data: Omit<TechnicianAvailability, 'id' | 'technicianId' | 'createdAt' | 'updatedAt'>) => Promise<void>

  fetchAppointments: (filters?: {
    customerId?: string
    technicianId?: string
    serviceTypeId?: string
    status?: ServiceAppointmentStatus
    dateFrom?: Date
    dateTo?: Date
    search?: string
    page?: number
    limit?: number
  }) => Promise<void>
  createAppointment: (data: {
    customerId: string
    technicianId: string
    serviceTypeId: string
    scheduledDate: Date
    scheduledTime: string
    estimatedDuration?: number
    notes?: string
    customerNotes?: string
    internalNotes?: string
  }) => Promise<void>
  updateAppointment: (id: string, data: Partial<ServiceAppointment>) => Promise<void>
  setSelectedAppointment: (appointment: ServiceAppointment | null) => void
  addAppointmentPart: (appointmentId: string, data: {
    productId: string
    quantity: number
    unitCost: number
  }) => Promise<void>

  fetchServiceInvoices: (filters?: { appointmentId?: string; page?: number; limit?: number }) => Promise<void>
  createServiceInvoice: (data: Omit<ServiceInvoice, 'id' | 'createdAt' | 'updatedAt' | 'appointment' | 'invoice'>) => Promise<void>

  fetchAnalytics: (filters?: {
    dateFrom?: Date
    dateTo?: Date
    technicianId?: string
    serviceTypeId?: string
  }) => Promise<void>

  clearErrors: () => void
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const useServiceManagementStore = create<ServiceManagementState>((set, get) => ({
  // Initial state
  serviceTypes: [],
  serviceTypesLoading: false,
  serviceTypesError: null,

  technicians: [],
  techniciansLoading: false,
  techniciansError: null,

  appointments: [],
  appointmentsLoading: false,
  appointmentsError: null,
  selectedAppointment: null,

  serviceInvoices: [],
  serviceInvoicesLoading: false,
  serviceInvoicesError: null,

  analytics: null,
  analyticsLoading: false,
  analyticsError: null,

  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },

  // Service Types Actions
  fetchServiceTypes: async (filters = {}) => {
    set({ serviceTypesLoading: true, serviceTypesError: null })
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`${API_BASE_URL}/service-management/service-types?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch service types')
      }

      const data = await response.json()
      set({
        serviceTypes: data.serviceTypes,
        pagination: data.pagination,
        serviceTypesLoading: false
      })
    } catch (error) {
      set({
        serviceTypesError: error instanceof Error ? error.message : 'Unknown error',
        serviceTypesLoading: false
      })
    }
  },

  createServiceType: async (data) => {
    set({ serviceTypesLoading: true, serviceTypesError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/service-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create service type')
      }

      // Refresh the list
      await get().fetchServiceTypes()
    } catch (error) {
      set({
        serviceTypesError: error instanceof Error ? error.message : 'Unknown error',
        serviceTypesLoading: false
      })
    }
  },

  updateServiceType: async (id, data) => {
    set({ serviceTypesLoading: true, serviceTypesError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/service-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update service type')
      }

      // Refresh the list
      await get().fetchServiceTypes()
    } catch (error) {
      set({
        serviceTypesError: error instanceof Error ? error.message : 'Unknown error',
        serviceTypesLoading: false
      })
    }
  },

  deleteServiceType: async (id) => {
    set({ serviceTypesLoading: true, serviceTypesError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/service-types/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete service type')
      }

      // Refresh the list
      await get().fetchServiceTypes()
    } catch (error) {
      set({
        serviceTypesError: error instanceof Error ? error.message : 'Unknown error',
        serviceTypesLoading: false
      })
    }
  },

  // Technicians Actions
  fetchTechnicians: async (filters = {}) => {
    set({ techniciansLoading: true, techniciansError: null })
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      if (filters.specialty) params.append('specialty', filters.specialty)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`${API_BASE_URL}/service-management/technicians?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch technicians')
      }

      const data = await response.json()
      set({
        technicians: data.technicians,
        pagination: data.pagination,
        techniciansLoading: false
      })
    } catch (error) {
      set({
        techniciansError: error instanceof Error ? error.message : 'Unknown error',
        techniciansLoading: false
      })
    }
  },

  createTechnician: async (data) => {
    set({ techniciansLoading: true, techniciansError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/technicians`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create technician')
      }

      // Refresh the list
      await get().fetchTechnicians()
    } catch (error) {
      set({
        techniciansError: error instanceof Error ? error.message : 'Unknown error',
        techniciansLoading: false
      })
    }
  },

  updateTechnician: async (id, data) => {
    set({ techniciansLoading: true, techniciansError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/technicians/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update technician')
      }

      // Refresh the list
      await get().fetchTechnicians()
    } catch (error) {
      set({
        techniciansError: error instanceof Error ? error.message : 'Unknown error',
        techniciansLoading: false
      })
    }
  },

  setTechnicianAvailability: async (technicianId, data) => {
    set({ techniciansLoading: true, techniciansError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/technicians/${technicianId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to set technician availability')
      }

      // Refresh the list
      await get().fetchTechnicians()
    } catch (error) {
      set({
        techniciansError: error instanceof Error ? error.message : 'Unknown error',
        techniciansLoading: false
      })
    }
  },

  // Service Appointments Actions
  fetchAppointments: async (filters = {}) => {
    set({ appointmentsLoading: true, appointmentsError: null })
    try {
      const params = new URLSearchParams()
      if (filters.customerId) params.append('customerId', filters.customerId)
      if (filters.technicianId) params.append('technicianId', filters.technicianId)
      if (filters.serviceTypeId) params.append('serviceTypeId', filters.serviceTypeId)
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`${API_BASE_URL}/service-management/appointments?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }

      const data = await response.json()
      set({
        appointments: data.appointments.map((apt: any) => ({
          ...apt,
          scheduledDate: new Date(apt.scheduledDate),
          actualStartTime: apt.actualStartTime ? new Date(apt.actualStartTime) : undefined,
          actualEndTime: apt.actualEndTime ? new Date(apt.actualEndTime) : undefined,
          warrantyExpiry: apt.warrantyExpiry ? new Date(apt.warrantyExpiry) : undefined,
          followUpDate: apt.followUpDate ? new Date(apt.followUpDate) : undefined,
          createdAt: new Date(apt.createdAt),
          updatedAt: new Date(apt.updatedAt)
        })),
        pagination: data.pagination,
        appointmentsLoading: false
      })
    } catch (error) {
      set({
        appointmentsError: error instanceof Error ? error.message : 'Unknown error',
        appointmentsLoading: false
      })
    }
  },

  createAppointment: async (data) => {
    set({ appointmentsLoading: true, appointmentsError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          scheduledDate: data.scheduledDate.toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create appointment')
      }

      // Refresh the list
      await get().fetchAppointments()
    } catch (error) {
      set({
        appointmentsError: error instanceof Error ? error.message : 'Unknown error',
        appointmentsLoading: false
      })
    }
  },

  updateAppointment: async (id, data) => {
    set({ appointmentsLoading: true, appointmentsError: null })
    try {
      const updateData = { ...data }
      if (updateData.scheduledDate) {
        updateData.scheduledDate = updateData.scheduledDate.toISOString() as any
      }
      if (updateData.actualStartTime) {
        updateData.actualStartTime = updateData.actualStartTime.toISOString() as any
      }
      if (updateData.actualEndTime) {
        updateData.actualEndTime = updateData.actualEndTime.toISOString() as any
      }
      if (updateData.followUpDate) {
        updateData.followUpDate = updateData.followUpDate.toISOString() as any
      }

      const response = await fetch(`${API_BASE_URL}/service-management/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update appointment')
      }

      // Refresh the list
      await get().fetchAppointments()
    } catch (error) {
      set({
        appointmentsError: error instanceof Error ? error.message : 'Unknown error',
        appointmentsLoading: false
      })
    }
  },

  setSelectedAppointment: (appointment) => {
    set({ selectedAppointment: appointment })
  },

  addAppointmentPart: async (appointmentId, data) => {
    set({ appointmentsLoading: true, appointmentsError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/appointments/${appointmentId}/parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to add appointment part')
      }

      // Refresh the appointments list
      await get().fetchAppointments()
    } catch (error) {
      set({
        appointmentsError: error instanceof Error ? error.message : 'Unknown error',
        appointmentsLoading: false
      })
    }
  },

  // Service Invoices Actions
  fetchServiceInvoices: async (filters = {}) => {
    set({ serviceInvoicesLoading: true, serviceInvoicesError: null })
    try {
      const params = new URLSearchParams()
      if (filters.appointmentId) params.append('appointmentId', filters.appointmentId)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await fetch(`${API_BASE_URL}/service-management/service-invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch service invoices')
      }

      const data = await response.json()
      set({
        serviceInvoices: data.serviceInvoices,
        pagination: data.pagination,
        serviceInvoicesLoading: false
      })
    } catch (error) {
      set({
        serviceInvoicesError: error instanceof Error ? error.message : 'Unknown error',
        serviceInvoicesLoading: false
      })
    }
  },

  createServiceInvoice: async (data) => {
    set({ serviceInvoicesLoading: true, serviceInvoicesError: null })
    try {
      const response = await fetch(`${API_BASE_URL}/service-management/service-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create service invoice')
      }

      // Refresh the list
      await get().fetchServiceInvoices()
    } catch (error) {
      set({
        serviceInvoicesError: error instanceof Error ? error.message : 'Unknown error',
        serviceInvoicesLoading: false
      })
    }
  },

  // Analytics Actions
  fetchAnalytics: async (filters = {}) => {
    set({ analyticsLoading: true, analyticsError: null })
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString())
      if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString())
      if (filters.technicianId) params.append('technicianId', filters.technicianId)
      if (filters.serviceTypeId) params.append('serviceTypeId', filters.serviceTypeId)

      const response = await fetch(`${API_BASE_URL}/service-management/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      set({
        analytics: data,
        analyticsLoading: false
      })
    } catch (error) {
      set({
        analyticsError: error instanceof Error ? error.message : 'Unknown error',
        analyticsLoading: false
      })
    }
  },

  clearErrors: () => {
    set({
      serviceTypesError: null,
      techniciansError: null,
      appointmentsError: null,
      serviceInvoicesError: null,
      analyticsError: null
    })
  }
}))