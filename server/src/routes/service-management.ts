import { Router } from 'express'
import { ServiceManagementController, serviceManagementValidation } from '../controllers/serviceManagementController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

/**
 * Service Type Management Routes
 */

// GET /api/service-management/service-types - Get all service types
router.get(
  '/service-types',
  serviceManagementValidation.getServiceTypes,
  ServiceManagementController.getServiceTypes
)

// POST /api/service-management/service-types - Create new service type
router.post(
  '/service-types',
  serviceManagementValidation.createServiceType,
  ServiceManagementController.createServiceType
)

// PUT /api/service-management/service-types/:serviceTypeId - Update service type
router.put(
  '/service-types/:serviceTypeId',
  serviceManagementValidation.updateServiceType,
  ServiceManagementController.updateServiceType
)

// DELETE /api/service-management/service-types/:serviceTypeId - Delete service type
router.delete(
  '/service-types/:serviceTypeId',
  serviceManagementValidation.deleteServiceType,
  ServiceManagementController.deleteServiceType
)

/**
 * Technician Management Routes
 */

// GET /api/service-management/technicians - Get all technicians
router.get(
  '/technicians',
  serviceManagementValidation.getTechnicians,
  ServiceManagementController.getTechnicians
)

// POST /api/service-management/technicians - Create new technician
router.post(
  '/technicians',
  serviceManagementValidation.createTechnician,
  ServiceManagementController.createTechnician
)

// PUT /api/service-management/technicians/:technicianId - Update technician
router.put(
  '/technicians/:technicianId',
  serviceManagementValidation.updateTechnician,
  ServiceManagementController.updateTechnician
)

// PUT /api/service-management/technicians/:technicianId/availability - Set technician availability
router.put(
  '/technicians/:technicianId/availability',
  serviceManagementValidation.setTechnicianAvailability,
  ServiceManagementController.setTechnicianAvailability
)

/**
 * Service Appointment Management Routes
 */

// GET /api/service-management/appointments - Get all service appointments
router.get(
  '/appointments',
  serviceManagementValidation.getServiceAppointments,
  ServiceManagementController.getServiceAppointments
)

// POST /api/service-management/appointments - Create new service appointment
router.post(
  '/appointments',
  serviceManagementValidation.createServiceAppointment,
  ServiceManagementController.createServiceAppointment
)

// PUT /api/service-management/appointments/:appointmentId - Update service appointment
router.put(
  '/appointments/:appointmentId',
  serviceManagementValidation.updateServiceAppointment,
  ServiceManagementController.updateServiceAppointment
)

// POST /api/service-management/appointments/:appointmentId/parts - Add part to service appointment
router.post(
  '/appointments/:appointmentId/parts',
  serviceManagementValidation.addServiceAppointmentPart,
  ServiceManagementController.addServiceAppointmentPart
)

/**
 * Service Billing and Invoicing Routes
 */

// GET /api/service-management/service-invoices - Get all service invoices
router.get(
  '/service-invoices',
  serviceManagementValidation.getServiceInvoices,
  ServiceManagementController.getServiceInvoices
)

// POST /api/service-management/service-invoices - Create new service invoice
router.post(
  '/service-invoices',
  serviceManagementValidation.createServiceInvoice,
  ServiceManagementController.createServiceInvoice
)

/**
 * Analytics and Reporting Routes
 */

// GET /api/service-management/analytics - Get service analytics
router.get(
  '/analytics',
  serviceManagementValidation.getServiceAnalytics,
  ServiceManagementController.getServiceAnalytics
)

export default router