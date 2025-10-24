import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { ServiceManagementService } from '../services/serviceManagementService'
import { ServiceAppointmentStatus } from '@prisma/client'
import { logger } from '../utils/logger'

/**
 * Service Management Controller
 * Handles HTTP requests for service management operations
 */
export class ServiceManagementController {
  /**
   * Service Type Management
   */
  static async createServiceType(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const result = await ServiceManagementService.createServiceType(req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_SERVICE_TYPE_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: 'Service type created successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in createServiceType controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async getServiceTypes(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { search, isActive, page = 1, limit = 20 } = req.query

      const filters = {
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await ServiceManagementService.getServiceTypes(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_SERVICE_TYPES_FAILED',
            message: result.message
          }
        })
      }

      res.json(result.data)
    } catch (error) {
      logger.error('Error in getServiceTypes controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async updateServiceType(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { serviceTypeId } = req.params
      const result = await ServiceManagementService.updateServiceType(serviceTypeId, req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_SERVICE_TYPE_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        message: 'Service type updated successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in updateServiceType controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async deleteServiceType(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { serviceTypeId } = req.params
      const result = await ServiceManagementService.deleteServiceType(serviceTypeId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_SERVICE_TYPE_FAILED',
            message: result.message
          }
        })
      }

      res.json({ message: result.message })
    } catch (error) {
      logger.error('Error in deleteServiceType controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  /**
   * Technician Management
   */
  static async createTechnician(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const result = await ServiceManagementService.createTechnician(req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_TECHNICIAN_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: 'Technician created successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in createTechnician controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async getTechnicians(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { search, isActive, specialty, page = 1, limit = 20 } = req.query

      const filters = {
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        specialty: specialty as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await ServiceManagementService.getTechnicians(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_TECHNICIANS_FAILED',
            message: result.message
          }
        })
      }

      res.json(result.data)
    } catch (error) {
      logger.error('Error in getTechnicians controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async updateTechnician(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { technicianId } = req.params
      const result = await ServiceManagementService.updateTechnician(technicianId, req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_TECHNICIAN_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        message: 'Technician updated successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in updateTechnician controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async setTechnicianAvailability(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { technicianId } = req.params
      const result = await ServiceManagementService.setTechnicianAvailability({
        technicianId,
        ...req.body
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'SET_AVAILABILITY_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        message: 'Technician availability set successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in setTechnicianAvailability controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  /**
   * Service Appointment Management
   */
  static async createServiceAppointment(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const result = await ServiceManagementService.createServiceAppointment(req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_APPOINTMENT_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: 'Service appointment created successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in createServiceAppointment controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async getServiceAppointments(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const {
        customerId,
        technicianId,
        serviceTypeId,
        status,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        customerId: customerId as string,
        technicianId: technicianId as string,
        serviceTypeId: serviceTypeId as string,
        status: status as ServiceAppointmentStatus,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await ServiceManagementService.getServiceAppointments(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_APPOINTMENTS_FAILED',
            message: result.message
          }
        })
      }

      res.json(result.data)
    } catch (error) {
      logger.error('Error in getServiceAppointments controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async updateServiceAppointment(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { appointmentId } = req.params
      const result = await ServiceManagementService.updateServiceAppointment(appointmentId, req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_APPOINTMENT_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        message: 'Service appointment updated successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in updateServiceAppointment controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async addServiceAppointmentPart(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { appointmentId } = req.params
      const result = await ServiceManagementService.addServiceAppointmentPart({
        appointmentId,
        ...req.body
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'ADD_PART_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: 'Service appointment part added successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in addServiceAppointmentPart controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  /**
   * Service Billing and Invoicing
   */
  static async createServiceInvoice(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const result = await ServiceManagementService.createServiceInvoice(req.body)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_SERVICE_INVOICE_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: 'Service invoice created successfully',
        data: result.data
      })
    } catch (error) {
      logger.error('Error in createServiceInvoice controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  static async getServiceInvoices(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { appointmentId, page = 1, limit = 20 } = req.query

      const filters = {
        appointmentId: appointmentId as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await ServiceManagementService.getServiceInvoices(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_SERVICE_INVOICES_FAILED',
            message: result.message
          }
        })
      }

      res.json(result.data)
    } catch (error) {
      logger.error('Error in getServiceInvoices controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }

  /**
   * Analytics and Reporting
   */
  static async getServiceAnalytics(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        })
      }

      const { dateFrom, dateTo, technicianId, serviceTypeId } = req.query

      const filters = {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        technicianId: technicianId as string,
        serviceTypeId: serviceTypeId as string
      }

      const result = await ServiceManagementService.getServiceAnalytics(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_SERVICE_ANALYTICS_FAILED',
            message: result.message
          }
        })
      }

      res.json(result.data)
    } catch (error) {
      logger.error('Error in getServiceAnalytics controller:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      })
    }
  }
}

/**
 * Validation middleware for service management endpoints
 */
export const serviceManagementValidation = {
  // Service Type validations
  createServiceType: [
    body('name').notEmpty().withMessage('Service type name is required'),
    body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('estimatedDuration').isInt({ min: 1 }).withMessage('Estimated duration must be a positive integer'),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean()
  ],

  updateServiceType: [
    param('serviceTypeId').isString().notEmpty().withMessage('Service type ID is required'),
    body('name').optional().notEmpty().withMessage('Service type name cannot be empty'),
    body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('estimatedDuration').optional().isInt({ min: 1 }).withMessage('Estimated duration must be a positive integer'),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean()
  ],

  deleteServiceType: [
    param('serviceTypeId').isString().notEmpty().withMessage('Service type ID is required')
  ],

  getServiceTypes: [
    query('search').optional().isString(),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],

  // Technician validations
  createTechnician: [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('specialties').isArray().withMessage('Specialties must be an array'),
    body('hourlyRate').isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('isActive').optional().isBoolean()
  ],

  updateTechnician: [
    param('technicianId').isString().notEmpty().withMessage('Technician ID is required'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('specialties').optional().isArray().withMessage('Specialties must be an array'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    body('isActive').optional().isBoolean()
  ],

  setTechnicianAvailability: [
    param('technicianId').isString().notEmpty().withMessage('Technician ID is required'),
    body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0-6'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
    body('isAvailable').optional().isBoolean()
  ],

  getTechnicians: [
    query('search').optional().isString(),
    query('isActive').optional().isBoolean(),
    query('specialty').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],

  // Service Appointment validations
  createServiceAppointment: [
    body('customerId').isString().notEmpty().withMessage('Customer ID is required'),
    body('technicianId').isString().notEmpty().withMessage('Technician ID is required'),
    body('serviceTypeId').isString().notEmpty().withMessage('Service type ID is required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
    body('scheduledTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Scheduled time must be in HH:MM format'),
    body('estimatedDuration').optional().isInt({ min: 1 }),
    body('notes').optional().isString(),
    body('customerNotes').optional().isString(),
    body('internalNotes').optional().isString()
  ],

  updateServiceAppointment: [
    param('appointmentId').isString().notEmpty().withMessage('Appointment ID is required'),
    body('scheduledDate').optional().isISO8601().withMessage('Valid scheduled date is required'),
    body('scheduledTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Scheduled time must be in HH:MM format'),
    body('estimatedDuration').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    body('actualStartTime').optional().isISO8601(),
    body('actualEndTime').optional().isISO8601(),
    body('laborCost').optional().isFloat({ min: 0 }),
    body('partsCost').optional().isFloat({ min: 0 }),
    body('totalCost').optional().isFloat({ min: 0 }),
    body('warrantyPeriod').optional().isInt({ min: 1 }),
    body('followUpDate').optional().isISO8601(),
    body('notes').optional().isString(),
    body('customerNotes').optional().isString(),
    body('internalNotes').optional().isString()
  ],

  addServiceAppointmentPart: [
    param('appointmentId').isString().notEmpty().withMessage('Appointment ID is required'),
    body('productId').isString().notEmpty().withMessage('Product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number')
  ],

  getServiceAppointments: [
    query('customerId').optional().isString(),
    query('technicianId').optional().isString(),
    query('serviceTypeId').optional().isString(),
    query('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],

  // Service Invoice validations
  createServiceInvoice: [
    body('appointmentId').isString().notEmpty().withMessage('Appointment ID is required'),
    body('invoiceId').isString().notEmpty().withMessage('Invoice ID is required'),
    body('laborHours').isFloat({ min: 0 }).withMessage('Labor hours must be a positive number'),
    body('laborRate').isFloat({ min: 0 }).withMessage('Labor rate must be a positive number'),
    body('laborCost').isFloat({ min: 0 }).withMessage('Labor cost must be a positive number'),
    body('partsCost').isFloat({ min: 0 }).withMessage('Parts cost must be a positive number'),
    body('totalCost').isFloat({ min: 0 }).withMessage('Total cost must be a positive number')
  ],

  getServiceInvoices: [
    query('appointmentId').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],

  // Analytics validations
  getServiceAnalytics: [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('technicianId').optional().isString(),
    query('serviceTypeId').optional().isString()
  ]
}