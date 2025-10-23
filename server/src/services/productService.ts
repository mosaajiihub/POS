import { Product, Category, Supplier } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface CreateProductData {
  name: string
  description?: string
  sku: string
  barcode?: string
  costPrice: number
  sellingPrice: number
  wholesalePrice?: number
  stockLevel?: number
  minStockLevel?: number
  taxRate?: number
  categoryId: string
  supplierId: string
}

export interface UpdateProductData {
  name?: string
  description?: string
  sku?: string
  barcode?: string
  costPrice?: number
  sellingPrice?: number
  wholesalePrice?: number
  stockLevel?: number
  minStockLevel?: number
  taxRate?: number
  categoryId?: string
  supplierId?: string
  isActive?: boolean
}

export interface ProductFilters {
  categoryId?: string
  supplierId?: string
  search?: string
  isActive?: boolean
  lowStock?: boolean
  page?: number
  limit?: number
}

export interface ProductResult {
  success: boolean
  message: string
  product?: Product & { category: Category; supplier: Supplier }
}

export interface ProductListResult {
  success: boolean
  message: string
  products?: (Product & { category: Category; supplier: Supplier })[]
  total?: number
  page?: number
  limit?: number
}

/**
 * Product Management Service
 * Handles product CRUD operations with validation and business logic
 */
export class ProductService {
  /**
   * Create a new product
   */
  static async createProduct(productData: CreateProductData): Promise<ProductResult> {
    try {
      const {
        name,
        description,
        sku,
        barcode,
        costPrice,
        sellingPrice,
        wholesalePrice,
        stockLevel = 0,
        minStockLevel = 0,
        taxRate = 0,
        categoryId,
        supplierId
      } = productData

      // Validate category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      })

      if (!category || !category.isActive) {
        return {
          success: false,
          message: 'Invalid or inactive category'
        }
      }

      // Validate supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId }
      })

      if (!supplier || !supplier.isActive) {
        return {
          success: false,
          message: 'Invalid or inactive supplier'
        }
      }

      // Check if SKU already exists
      const existingSku = await prisma.product.findUnique({
        where: { sku }
      })

      if (existingSku) {
        return {
          success: false,
          message: 'Product with this SKU already exists'
        }
      }

      // Check if barcode already exists (if provided)
      if (barcode) {
        const existingBarcode = await prisma.product.findUnique({
          where: { barcode }
        })

        if (existingBarcode) {
          return {
            success: false,
            message: 'Product with this barcode already exists'
          }
        }

        // Validate barcode format (basic validation)
        if (!this.validateBarcode(barcode)) {
          return {
            success: false,
            message: 'Invalid barcode format'
          }
        }
      }

      // Validate pricing
      if (costPrice < 0 || sellingPrice < 0) {
        return {
          success: false,
          message: 'Prices cannot be negative'
        }
      }

      if (sellingPrice < costPrice) {
        return {
          success: false,
          message: 'Selling price cannot be less than cost price'
        }
      }

      if (wholesalePrice && wholesalePrice < costPrice) {
        return {
          success: false,
          message: 'Wholesale price cannot be less than cost price'
        }
      }

      // Create product and initial stock movement in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
          data: {
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
          },
          include: {
            category: true,
            supplier: true
          }
        })

        // Create initial stock movement if stock level > 0
        if (stockLevel > 0) {
          await tx.stockMovement.create({
            data: {
              productId: newProduct.id,
              type: 'ADJUSTMENT',
              quantity: stockLevel,
              previousStock: 0,
              newStock: stockLevel,
              reason: 'Initial stock entry'
            }
          })
        }

        return newProduct
      })

      logger.info(`New product created: ${result.id} - ${result.name}`)

      return {
        success: true,
        message: 'Product created successfully',
        product: result
      }
    } catch (error) {
      logger.error('Create product error:', error)
      return {
        success: false,
        message: 'An error occurred while creating product'
      }
    }
  }

  /**
   * Update product
   */
  static async updateProduct(productId: string, updateData: UpdateProductData): Promise<ProductResult> {
    try {
      // Find existing product
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!existingProduct) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      // Validate category if being updated
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: updateData.categoryId }
        })

        if (!category || !category.isActive) {
          return {
            success: false,
            message: 'Invalid or inactive category'
          }
        }
      }

      // Validate supplier if being updated
      if (updateData.supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: updateData.supplierId }
        })

        if (!supplier || !supplier.isActive) {
          return {
            success: false,
            message: 'Invalid or inactive supplier'
          }
        }
      }

      // Check SKU uniqueness if being updated
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku: updateData.sku }
        })

        if (existingSku) {
          return {
            success: false,
            message: 'Product with this SKU already exists'
          }
        }
      }

      // Check barcode uniqueness if being updated
      if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
        const existingBarcode = await prisma.product.findUnique({
          where: { barcode: updateData.barcode }
        })

        if (existingBarcode) {
          return {
            success: false,
            message: 'Product with this barcode already exists'
          }
        }

        // Validate barcode format
        if (!this.validateBarcode(updateData.barcode)) {
          return {
            success: false,
            message: 'Invalid barcode format'
          }
        }
      }

      // Validate pricing if being updated
      const costPrice = updateData.costPrice ?? existingProduct.costPrice
      const sellingPrice = updateData.sellingPrice ?? existingProduct.sellingPrice
      const wholesalePrice = updateData.wholesalePrice ?? existingProduct.wholesalePrice

      if (costPrice < 0 || sellingPrice < 0) {
        return {
          success: false,
          message: 'Prices cannot be negative'
        }
      }

      if (sellingPrice < costPrice) {
        return {
          success: false,
          message: 'Selling price cannot be less than cost price'
        }
      }

      if (wholesalePrice && wholesalePrice < costPrice) {
        return {
          success: false,
          message: 'Wholesale price cannot be less than cost price'
        }
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          category: true,
          supplier: true
        }
      })

      logger.info(`Product updated: ${productId} - ${updatedProduct.name}`)

      return {
        success: true,
        message: 'Product updated successfully',
        product: updatedProduct
      }
    } catch (error) {
      logger.error('Update product error:', error)
      return {
        success: false,
        message: 'An error occurred while updating product'
      }
    }
  }

  /**
   * Get product by ID
   */
  static async getProduct(productId: string): Promise<ProductResult> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          supplier: true
        }
      })

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      return {
        success: true,
        message: 'Product retrieved successfully',
        product
      }
    } catch (error) {
      logger.error('Get product error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving product'
      }
    }
  }

  /**
   * Get products with filtering and pagination
   */
  static async getProducts(filters: ProductFilters = {}): Promise<ProductListResult> {
    try {
      const {
        categoryId,
        supplierId,
        search,
        isActive,
        lowStock,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (categoryId) {
        where.categoryId = categoryId
      }

      if (supplierId) {
        where.supplierId = supplierId
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get products and total count
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            supplier: true
          },
          orderBy: lowStock ? { stockLevel: 'asc' } : { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({ where })
      ])

      // Filter for low stock if requested (post-query filtering for simplicity)
      let filteredProducts = products
      let filteredTotal = total

      if (lowStock) {
        filteredProducts = products.filter(product => product.stockLevel <= product.minStockLevel)
        filteredTotal = filteredProducts.length
      }

      return {
        success: true,
        message: 'Products retrieved successfully',
        products: filteredProducts,
        total: filteredTotal,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get products error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving products'
      }
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      // Check if product has any sales
      const productSales = await prisma.saleItem.count({
        where: { productId }
      })

      if (productSales > 0) {
        return {
          success: false,
          message: 'Cannot delete product with existing sales records. Consider deactivating instead.'
        }
      }

      // Check if product has any purchase orders
      const productPurchases = await prisma.purchaseOrderItem.count({
        where: { productId }
      })

      if (productPurchases > 0) {
        return {
          success: false,
          message: 'Cannot delete product with existing purchase orders. Consider deactivating instead.'
        }
      }

      // Delete product
      await prisma.product.delete({
        where: { id: productId }
      })

      logger.info(`Product deleted: ${productId}`)

      return {
        success: true,
        message: 'Product deleted successfully'
      }
    } catch (error) {
      logger.error('Delete product error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting product'
      }
    }
  }

  /**
   * Search products by barcode
   */
  static async getProductByBarcode(barcode: string): Promise<ProductResult> {
    try {
      const product = await prisma.product.findUnique({
        where: { barcode },
        include: {
          category: true,
          supplier: true
        }
      })

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      if (!product.isActive) {
        return {
          success: false,
          message: 'Product is inactive'
        }
      }

      return {
        success: true,
        message: 'Product retrieved successfully',
        product
      }
    } catch (error) {
      logger.error('Get product by barcode error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving product'
      }
    }
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(): Promise<ProductListResult> {
    try {
      const allProducts = await prisma.product.findMany({
        where: {
          isActive: true
        },
        include: {
          category: true,
          supplier: true
        },
        orderBy: { stockLevel: 'asc' }
      })

      // Filter products where stock level is less than or equal to minimum stock level
      const lowStockProducts = allProducts.filter(product => 
        product.stockLevel <= product.minStockLevel
      )

      return {
        success: true,
        message: 'Low stock products retrieved successfully',
        products: lowStockProducts,
        total: lowStockProducts.length
      }
    } catch (error) {
      logger.error('Get low stock products error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving low stock products'
      }
    }
  }

  /**
   * Validate barcode format
   */
  private static validateBarcode(barcode: string): boolean {
    // Basic barcode validation - can be enhanced based on specific barcode standards
    if (!barcode || barcode.length < 8 || barcode.length > 14) {
      return false
    }

    // Check if barcode contains only digits (for UPC/EAN)
    const isNumeric = /^\d+$/.test(barcode)
    
    // Check if barcode is alphanumeric (for Code 128, Code 39, etc.)
    const isAlphanumeric = /^[A-Z0-9\-\.\ \$\/\+\%]+$/i.test(barcode)

    return isNumeric || isAlphanumeric
  }
}