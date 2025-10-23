import { Router } from 'express'
import { StockController, stockValidation } from '../controllers/stockController'
import { 
  requireAuth, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Stock Management Routes
 */

// Get stock movements with filtering
router.get('/movements',
  requireAuth,
  requirePermission('inventory', 'read'),
  stockValidation.getStockMovements,
  StockController.getStockMovements
)

// Get low stock alerts
router.get('/alerts',
  requireAuth,
  requirePermission('inventory', 'read'),
  StockController.getLowStockAlerts
)

// Generate stock report
router.get('/report',
  requireAuth,
  requirePermission('inventory', 'read'),
  stockValidation.generateStockReport,
  StockController.generateStockReport
)

// Adjust stock level for a product
router.post('/adjust/:productId',
  requireAuth,
  requirePermission('inventory', 'update'),
  stockValidation.adjustStock,
  auditLog('ADJUST_STOCK', 'stock_movements'),
  StockController.adjustStock
)

// Update stock (generic stock movement)
router.post('/update',
  requireAuth,
  requirePermission('inventory', 'update'),
  stockValidation.updateStock,
  auditLog('UPDATE_STOCK', 'stock_movements'),
  StockController.updateStock
)

// Update stock thresholds for a product
router.put('/thresholds/:productId',
  requireAuth,
  requirePermission('inventory', 'update'),
  stockValidation.updateStockThresholds,
  auditLog('UPDATE_STOCK_THRESHOLDS', 'products'),
  StockController.updateStockThresholds
)

// Process sale and update stock (used by POS)
router.post('/process-sale',
  requireAuth,
  requirePermission('sales', 'create'),
  stockValidation.processSale,
  auditLog('PROCESS_SALE_STOCK', 'stock_movements'),
  StockController.processSale
)

export default router