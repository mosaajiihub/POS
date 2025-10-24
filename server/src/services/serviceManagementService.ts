import { PrismaClient, ServiceAppointmentStatus, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface ServiceTypeData {
  name: string
  description?: string
  basePrice: number
  estimatedDuration: number
  isActive?: boolean
}

export interface TechnicianData {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  specialties: string[]
  hourlyRate: number
  isActive?: boolean
}

export interface TechnicianAvailabilityData {
  technicianId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable?: boolean
}

export interface ServiceAppointmentData {
  customerId: string
  technicianId: string
  serviceTypeId: string
  scheduledDate: Date
  scheduledTime: string
  estimatedDuration?: number
  notes?: string
  customerNotes?: string
  internalNotes?: string
}

export interface ServiceAppointmentPartData {
  appointmentId: string
  productId: string
  quantity: number
  unitCost: number
}

export interface ServiceAppointmentFilters {
  customerId?: string
  technicianId?: string
  serviceTypeId?: string
  status?: ServiceAppointmentStatus
  dateFrom?: Date
  dateTo?: Date
  search?: string
  page?: number
  limit?: number
}

export interface ServiceInvoiceData {
  appointmentId: string
  invoiceId: string
  laborHours: number
  laborRate: number
  laborCost: number
  partsCost: number
  totalCost: number
}

/**
 * Service Management Service
 * Handles all service-related business logic
 */
export class ServiceManagementService {
  /**
   * Service Type Management
   */
  static async createServiceType(data: ServiceTypeData) {
    try {
      const serviceType = await prisma.serviceType.create({
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          estimatedDuration: data.estimatedDuration,
          isActive: data.isActive ?? true
        }
      })

      logger.info(`Service type created: ${serviceType.id}`)
      return { success: true, data: serviceType }
    } catch (error) {
      logger.error('Error creating service type:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { success: false, message: 'Service type name already exists' }
        }
      }
      return { success: false, message: 'Failed to create service type' }
    }
  }

  static async getServiceTypes(filters: { search?: string; isActive?: boolean; page?: number; limit?: number } = {}) {
    try {
      const { search, isActive, page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

      const where: Prisma.ServiceTypeWhereInput = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      const [serviceTypes, total] = await Promise.all([
        prisma.serviceType.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { appointments: true }
            }
          }
        }),
        prisma.serviceType.count({ where })
      ])

      return {
        success: true,
        data: {
          serviceTypes,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      }
    } catch (error) {
      logger.error('Error getting service types:', error)
      return { success: false, message: 'Failed to get service types' }
    }
  }

  static async updateServiceType(id: string, data: Partial<ServiceTypeData>) {
    try {
      const serviceType = await prisma.serviceType.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.basePrice && { basePrice: data.basePrice }),
          ...(data.estimatedDuration && { estimatedDuration: data.estimatedDuration }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      })

      logger.info(`Service type updated: ${id}`)
      return { success: true, data: serviceType }
    } catch (error) {
      logger.error('Error updating service type:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { success: false, message: 'Service type not found' }
        }
        if (error.code === 'P2002') {
          return { success: false, message: 'Service type name already exists' }
        }
      }
      return { success: false, message: 'Failed to update service type' }
    }
  }

  static async deleteServiceType(id: string) {
    try {
      await prisma.serviceType.delete({
        where: { id }
      })

      logger.info(`Service type deleted: ${id}`)
      return { success: true, message: 'Service type deleted successfully' }
    } catch (error) {
      logger.error('Error deleting service type:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { success: false, message: 'Service type not found' }
        }
        if (error.code === 'P2003') {
          return { success: false, message: 'Cannot delete service type with existing appointments' }
        }
      }
      return { success: false, message: 'Failed to delete service type' }
    }
  }

  /**
   * Technician Management
   */
  static async createTechnician(data: TechnicianData) {
    try {
      const technician = await prisma.technician.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          specialties: data.specialties,
          hourlyRate: data.hourlyRate,
          isActive: data.isActive ?? true
        }
      })

      logger.info(`Technician created: ${technician.id}`)
      return { success: true, data: technician }
    } catch (error) {
      logger.error('Error creating technician:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { success: false, message: 'Technician email already exists' }
        }
      }
      return { success: false, message: 'Failed to create technician' }
    }
  }

  static async getTechnicians(filters: { search?: string; isActive?: boolean; specialty?: string; page?: number; limit?: number } = {}) {
    try {
      const { search, isActive, specialty, page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

      const where: Prisma.TechnicianWhereInput = {}

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (specialty) {
        where.specialties = {
          has: specialty
        }
      }

      const [technicians, total] = await Promise.all([
        prisma.technician.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          include: {
            availability: true,
            _count: {
              select: { appointments: true }
            }
          }
        }),
        prisma.technician.count({ where })
      ])

      return {
        success: true,
        data: {
          technicians,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      }
    } catch (error) {
      logger.error('Error getting technicians:', error)
      return { success: false, message: 'Failed to get technicians' }
    }
  }

  static async updateTechnician(id: string, data: Partial<TechnicianData>) {
    try {
      const technician = await prisma.technician.update({
        where: { id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.specialties && { specialties: data.specialties }),
          ...(data.hourlyRate && { hourlyRate: data.hourlyRate }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      })

      logger.info(`Technician updated: ${id}`)
      return { success: true, data: technician }
    } catch (error) {
      logger.error('Error updating technician:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { success: false, message: 'Technician not found' }
        }
        if (error.code === 'P2002') {
          return { success: false, message: 'Technician email already exists' }
        }
      }
      return { success: false, message: 'Failed to update technician' }
    }
  }

  static async setTechnicianAvailability(data: TechnicianAvailabilityData) {
    try {
      const availability = await prisma.technicianAvailability.upsert({
        where: {
          technicianId_dayOfWeek: {
            technicianId: data.technicianId,
            dayOfWeek: data.dayOfWeek
          }
        },
        update: {
          startTime: data.startTime,
          endTime: data.endTime,
          isAvailable: data.isAvailable ?? true
        },
        create: {
          technicianId: data.technicianId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          isAvailable: data.isAvailable ?? true
        }
      })

      logger.info(`Technician availability set: ${data.technicianId}`)
      return { success: true, data: availability }
    } catch (error) {
      logger.error('Error setting technician availability:', error)
      return { success: false, message: 'Failed to set technician availability' }
    }
  }

  /**
   * Service Appointment Management
   */
  static async createServiceAppointment(data: ServiceAppointmentData) {
    try {
      // Generate unique appointment number
      const appointmentNumber = `SA-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      // Get service type for estimated duration
      const serviceType = await prisma.serviceType.findUnique({
        where: { id: data.serviceTypeId }
      })

      if (!serviceType) {
        return { success: false, message: 'Service type not found' }
      }

      const appointment = await prisma.serviceAppointment.create({
        data: {
          appointmentNumber,
          customerId: data.customerId,
          technicianId: data.technicianId,
          serviceTypeId: data.serviceTypeId,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          estimatedDuration: data.estimatedDuration || serviceType.estimatedDuration,
          notes: data.notes,
          customerNotes: data.customerNotes,
          internalNotes: data.internalNotes,
          status: ServiceAppointmentStatus.SCHEDULED
        },
        include: {
          customer: true,
          technician: true,
          serviceType: true
        }
      })

      logger.info(`Service appointment created: ${appointment.id}`)
      return { success: true, data: appointment }
    } catch (error) {
      logger.error('Error creating service appointment:', error)
      return { success: false, message: 'Failed to create service appointment' }
    }
  }

  static async getServiceAppointments(filters: ServiceAppointmentFilters = {}) {
    try {
      const { customerId, technicianId, serviceTypeId, status, dateFrom, dateTo, search, page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

      const where: Prisma.ServiceAppointmentWhereInput = {}

      if (customerId) where.customerId = customerId
      if (technicianId) where.technicianId = technicianId
      if (serviceTypeId) where.serviceTypeId = serviceTypeId
      if (status) where.status = status

      if (dateFrom || dateTo) {
        where.scheduledDate = {}
        if (dateFrom) where.scheduledDate.gte = dateFrom
        if (dateTo) where.scheduledDate.lte = dateTo
      }

      if (search) {
        where.OR = [
          { appointmentNumber: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { customer: { firstName: { contains: search, mode: 'insensitive' } } },
          { customer: { lastName: { contains: search, mode: 'insensitive' } } },
          { technician: { firstName: { contains: search, mode: 'insensitive' } } },
          { technician: { lastName: { contains: search, mode: 'insensitive' } } }
        ]
      }

      const [appointments, total] = await Promise.all([
        prisma.serviceAppointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
          include: {
            customer: true,
            technician: true,
            serviceType: true,
            parts: {
              include: {
                product: true
              }
            }
          }
        }),
        prisma.serviceAppointment.count({ where })
      ])

      return {
        success: true,
        data: {
          appointments,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      }
    } catch (error) {
      logger.error('Error getting service appointments:', error)
      return { success: false, message: 'Failed to get service appointments' }
    }
  }

  static async updateServiceAppointment(id: string, data: Partial<ServiceAppointmentData & { status: ServiceAppointmentStatus; actualStartTime?: Date; actualEndTime?: Date; laborCost?: number; partsCost?: number; totalCost?: number; warrantyPeriod?: number; followUpDate?: Date }>) {
    try {
      const updateData: any = {}

      if (data.scheduledDate) updateData.scheduledDate = data.scheduledDate
      if (data.scheduledTime) updateData.scheduledTime = data.scheduledTime
      if (data.estimatedDuration) updateData.estimatedDuration = data.estimatedDuration
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.customerNotes !== undefined) updateData.customerNotes = data.customerNotes
      if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes
      if (data.status) updateData.status = data.status
      if (data.actualStartTime) updateData.actualStartTime = data.actualStartTime
      if (data.actualEndTime) updateData.actualEndTime = data.actualEndTime
      if (data.laborCost !== undefined) updateData.laborCost = data.laborCost
      if (data.partsCost !== undefined) updateData.partsCost = data.partsCost
      if (data.totalCost !== undefined) updateData.totalCost = data.totalCost
      if (data.warrantyPeriod) {
        updateData.warrantyPeriod = data.warrantyPeriod
        updateData.warrantyExpiry = new Date(Date.now() + data.warrantyPeriod * 24 * 60 * 60 * 1000)
      }
      if (data.followUpDate) updateData.followUpDate = data.followUpDate

      const appointment = await prisma.serviceAppointment.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          technician: true,
          serviceType: true,
          parts: {
            include: {
              product: true
            }
          }
        }
      })

      logger.info(`Service appointment updated: ${id}`)
      return { success: true, data: appointment }
    } catch (error) {
      logger.error('Error updating service appointment:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return { success: false, message: 'Service appointment not found' }
        }
      }
      return { success: false, message: 'Failed to update service appointment' }
    }
  }

  static async addServiceAppointmentPart(data: ServiceAppointmentPartData) {
    try {
      const part = await prisma.serviceAppointmentPart.create({
        data: {
          appointmentId: data.appointmentId,
          productId: data.productId,
          quantity: data.quantity,
          unitCost: data.unitCost,
          totalCost: data.quantity * data.unitCost
        },
        include: {
          product: true
        }
      })

      // Update appointment parts cost
      const totalPartsCost = await prisma.serviceAppointmentPart.aggregate({
        where: { appointmentId: data.appointmentId },
        _sum: { totalCost: true }
      })

      await prisma.serviceAppointment.update({
        where: { id: data.appointmentId },
        data: {
          partsCost: totalPartsCost._sum.totalCost || 0,
          totalCost: {
            increment: data.quantity * data.unitCost
          }
        }
      })

      logger.info(`Service appointment part added: ${part.id}`)
      return { success: true, data: part }
    } catch (error) {
      logger.error('Error adding service appointment part:', error)
      return { success: false, message: 'Failed to add service appointment part' }
    }
  }

  /**
   * Service Billing and Invoicing
   */
  static async createServiceInvoice(data: ServiceInvoiceData) {
    try {
      const serviceInvoice = await prisma.serviceInvoice.create({
        data: {
          appointmentId: data.appointmentId,
          invoiceId: data.invoiceId,
          laborHours: data.laborHours,
          laborRate: data.laborRate,
          laborCost: data.laborCost,
          partsCost: data.partsCost,
          totalCost: data.totalCost
        },
        include: {
          appointment: {
            include: {
              customer: true,
              technician: true,
              serviceType: true
            }
          },
          invoice: true
        }
      })

      logger.info(`Service invoice created: ${serviceInvoice.id}`)
      return { success: true, data: serviceInvoice }
    } catch (error) {
      logger.error('Error creating service invoice:', error)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { success: false, message: 'Service invoice already exists for this appointment' }
        }
      }
      return { success: false, message: 'Failed to create service invoice' }
    }
  }

  static async getServiceInvoices(filters: { appointmentId?: string; page?: number; limit?: number } = {}) {
    try {
      const { appointmentId, page = 1, limit = 20 } = filters
      const skip = (page - 1) * limit

      const where: Prisma.ServiceInvoiceWhereInput = {}
      if (appointmentId) where.appointmentId = appointmentId

      const [serviceInvoices, total] = await Promise.all([
        prisma.serviceInvoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            appointment: {
              include: {
                customer: true,
                technician: true,
                serviceType: true
              }
            },
            invoice: true
          }
        }),
        prisma.serviceInvoice.count({ where })
      ])

      return {
        success: true,
        data: {
          serviceInvoices,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      }
    } catch (error) {
      logger.error('Error getting service invoices:', error)
      return { success: false, message: 'Failed to get service invoices' }
    }
  }

  /**
   * Analytics and Reporting
   */
  static async getServiceAnalytics(filters: { dateFrom?: Date; dateTo?: Date; technicianId?: string; serviceTypeId?: string } = {}) {
    try {
      const { dateFrom, dateTo, technicianId, serviceTypeId } = filters

      const where: Prisma.ServiceAppointmentWhereInput = {}

      if (dateFrom || dateTo) {
        where.scheduledDate = {}
        if (dateFrom) where.scheduledDate.gte = dateFrom
        if (dateTo) where.scheduledDate.lte = dateTo
      }

      if (technicianId) where.technicianId = technicianId
      if (serviceTypeId) where.serviceTypeId = serviceTypeId

      const [
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
        averageServiceTime,
        topServiceTypes,
        topTechnicians
      ] = await Promise.all([
        prisma.serviceAppointment.count({ where }),
        prisma.serviceAppointment.count({ where: { ...where, status: ServiceAppointmentStatus.COMPLETED } }),
        prisma.serviceAppointment.count({ where: { ...where, status: ServiceAppointmentStatus.CANCELLED } }),
        prisma.serviceAppointment.aggregate({
          where: { ...where, status: ServiceAppointmentStatus.COMPLETED },
          _sum: { totalCost: true }
        }),
        prisma.serviceAppointment.aggregate({
          where: { ...where, status: ServiceAppointmentStatus.COMPLETED, actualStartTime: { not: null }, actualEndTime: { not: null } },
          _avg: { estimatedDuration: true }
        }),
        prisma.serviceAppointment.groupBy({
          by: ['serviceTypeId'],
          where,
          _count: { _all: true },
          orderBy: { _count: { _all: 'desc' } },
          take: 5
        }),
        prisma.serviceAppointment.groupBy({
          by: ['technicianId'],
          where,
          _count: { _all: true },
          _sum: { totalCost: true },
          orderBy: { _count: { _all: 'desc' } },
          take: 5
        })
      ])

      return {
        success: true,
        data: {
          summary: {
            totalAppointments,
            completedAppointments,
            cancelledAppointments,
            completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
            totalRevenue: totalRevenue._sum.totalCost || 0,
            averageServiceTime: averageServiceTime._avg.estimatedDuration || 0
          },
          topServiceTypes,
          topTechnicians
        }
      }
    } catch (error) {
      logger.error('Error getting service analytics:', error)
      return { success: false, message: 'Failed to get service analytics' }
    }
  }
}