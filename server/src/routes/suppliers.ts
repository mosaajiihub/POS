import { Router } from 'express'
import { SupplierController, supplierValidation } from '../controllers/supplierController'
import { 
  requireAuth, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Supplier Management Routes
 */

// Get all suppliers with filtering and pagination
router.get('/',
  requireAuth,
  requirePermission('suppliers', 'read'),
  supplierValidation.getSuppliers,
  SupplierController.getSuppliers
)

// Get supplier by ID
router.get('/:supplierId',
  requireAuth,
  requirePermission('suppliers', 'read'),
  supplierValidation.getSupplier,
  SupplierController.getSupplier
)

// Create new supplier
router.post('/',
  requireAuth,
  requirePermission('suppliers', 'create'),
  supplierValidation.createSupplier,
  auditLog('CREATE_SUPPLIER', 'suppliers'),
  SupplierController.createSupplier
)

// Update supplier
router.put('/:supplierId',
  requireAuth,
  requirePermission('suppliers', 'update'),
  supplierValidation.updateSupplier,
  auditLog('UPDATE_SUPPLIER', 'suppliers'),
  SupplierController.updateSupplier
)

// Delete supplier
router.delete('/:supplierId',
  requireAuth,
  requirePermission('suppliers', 'delete'),
  supplierValidation.deleteSupplier,
  auditLog('DELETE_SUPPLIER', 'suppliers'),
  SupplierController.deleteSupplier
)

// Get active suppliers (for dropdowns)
router.get('/system/active',
  requireAuth,
  requirePermission('suppliers', 'read'),
  SupplierController.getActiveSuppliers
)

export default router