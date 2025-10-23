import { Router } from 'express'
import { ProductController, productValidation } from '../controllers/productController'
import { 
  requireAuth, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Product Management Routes
 */

// Get all products with filtering and pagination
router.get('/',
  requireAuth,
  requirePermission('products', 'read'),
  productValidation.getProducts,
  ProductController.getProducts
)

// Get product by ID
router.get('/:productId',
  requireAuth,
  requirePermission('products', 'read'),
  productValidation.getProduct,
  ProductController.getProduct
)

// Create new product
router.post('/',
  requireAuth,
  requirePermission('products', 'create'),
  productValidation.createProduct,
  auditLog('CREATE_PRODUCT', 'products'),
  ProductController.createProduct
)

// Update product
router.put('/:productId',
  requireAuth,
  requirePermission('products', 'update'),
  productValidation.updateProduct,
  auditLog('UPDATE_PRODUCT', 'products'),
  ProductController.updateProduct
)

// Delete product
router.delete('/:productId',
  requireAuth,
  requirePermission('products', 'delete'),
  productValidation.deleteProduct,
  auditLog('DELETE_PRODUCT', 'products'),
  ProductController.deleteProduct
)

// Get product by barcode (for POS scanning)
router.get('/barcode/:barcode',
  requireAuth,
  requirePermission('products', 'read'),
  productValidation.getProductByBarcode,
  ProductController.getProductByBarcode
)

// Get low stock products
router.get('/system/low-stock',
  requireAuth,
  requirePermission('products', 'read'),
  ProductController.getLowStockProducts
)

export default router