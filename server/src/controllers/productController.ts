import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { ProductService } from '../services/productService'
import { logger } from '../utils/logger'

/**
 * Product Management Controller
 * Handles HTTP requests for product management operations
 */
export class ProductController {
  /**
   * Get all products with filtering and pagination
   */
  static async getProducts(req: Request, res: Response) {
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
        categoryId,
        supplierId,
        search,
        isActive,
        lowStock,
        page = 1,
        limit = 20
      } = req.query

      const filters = {
        categoryId: categoryId as string,
        supplierId: supplierId as string,
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        lowStock: lowStock === 'true',
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }

      const result = await ProductService.getProducts(filters)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_PRODUCTS_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        products: result.products,
        total: result.total,
        page: result.page,
        limit: result.limit
      })
    } catch (error) {
      logger.error('Get products controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get product by ID
   */
  static async getProduct(req: Request, res: Response) {
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

      const { productId } = req.params

      const result = await ProductService.getProduct(productId)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        product: result.product
      })
    } catch (error) {
      logger.error('Get product controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Create new product
   */
  static async createProduct(req: Request, res: Response) {
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
        name,
        description,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        wholesalePrice,
        stockLevel,
        minStockLevel,
        taxRate,
        categoryId,
        supplierId
      } = req.body

      const result = await ProductService.createProduct({
        name,
        description,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        wholesalePrice,
        stockLevel,
        minStockLevel,
        taxRate,
        categoryId,
        supplierId
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'CREATE_PRODUCT_FAILED',
            message: result.message
          }
        })
      }

      res.status(201).json({
        message: result.message,
        product: result.product
      })
    } catch (error) {
      logger.error('Create product controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Update product
   */
  static async updateProduct(req: Request, res: Response) {
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

      const { productId } = req.params
      const {
        name,
        description,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        wholesalePrice,
        stockLevel,
        minStockLevel,
        taxRate,
        categoryId,
        supplierId,
        isActive
      } = req.body

      const result = await ProductService.updateProduct(productId, {
        name,
        description,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        wholesalePrice,
        stockLevel,
        minStockLevel,
        taxRate,
        categoryId,
        supplierId,
        isActive
      })

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'UPDATE_PRODUCT_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        product: result.product
      })
    } catch (error) {
      logger.error('Update product controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req: Request, res: Response) {
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

      const { productId } = req.params

      const result = await ProductService.deleteProduct(productId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'DELETE_PRODUCT_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message
      })
    } catch (error) {
      logger.error('Delete product controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get product by barcode
   */
  static async getProductByBarcode(req: Request, res: Response) {
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

      const { barcode } = req.params

      const result = await ProductService.getProductByBarcode(barcode)

      if (!result.success) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        product: result.product
      })
    } catch (error) {
      logger.error('Get product by barcode controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(req: Request, res: Response) {
    try {
      const result = await ProductService.getLowStockProducts()

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GET_LOW_STOCK_FAILED',
            message: result.message
          }
        })
      }

      res.status(200).json({
        message: result.message,
        products: result.products,
        total: result.total
      })
    } catch (error) {
      logger.error('Get low stock products controller error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      })
    }
  }
}

/**
 * Validation rules for product endpoints
 */
export const productValidation = {
  getProducts: [
    query('categoryId')
      .optional()
      .isString()
      .withMessage('Category ID must be a string'),
    query('supplierId')
      .optional()
      .isString()
      .withMessage('Supplier ID must be a string'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters'),
    query('isActive')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isActive must be true or false'),
    query('lowStock')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('lowStock must be true or false'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  getProduct: [
    param('productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required')
  ],

  createProduct: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Product name is required and must be less than 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('sku')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('SKU is required and must be less than 50 characters'),
    body('barcode')
      .optional()
      .trim()
      .isLength({ min: 8, max: 14 })
      .withMessage('Barcode must be between 8 and 14 characters'),
    body('costPrice')
      .isFloat({ min: 0 })
      .withMessage('Cost price must be a positive number'),
    body('sellingPrice')
      .isFloat({ min: 0 })
      .withMessage('Selling price must be a positive number'),
    body('wholesalePrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Wholesale price must be a positive number'),
    body('stockLevel')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock level must be a non-negative integer'),
    body('minStockLevel')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum stock level must be a non-negative integer'),
    body('taxRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Tax rate must be between 0 and 100'),
    body('categoryId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Category ID is required'),
    body('supplierId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Supplier ID is required')
  ],

  updateProduct: [
    param('productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Product name must be less than 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('sku')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('SKU must be less than 50 characters'),
    body('barcode')
      .optional()
      .trim()
      .isLength({ min: 8, max: 14 })
      .withMessage('Barcode must be between 8 and 14 characters'),
    body('costPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost price must be a positive number'),
    body('sellingPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Selling price must be a positive number'),
    body('wholesalePrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Wholesale price must be a positive number'),
    body('stockLevel')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock level must be a non-negative integer'),
    body('minStockLevel')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum stock level must be a non-negative integer'),
    body('taxRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Tax rate must be between 0 and 100'),
    body('categoryId')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Category ID is required'),
    body('supplierId')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Supplier ID is required'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],

  deleteProduct: [
    param('productId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Product ID is required')
  ],

  getProductByBarcode: [
    param('barcode')
      .trim()
      .isLength({ min: 8, max: 14 })
      .withMessage('Barcode must be between 8 and 14 characters')
  ]
}