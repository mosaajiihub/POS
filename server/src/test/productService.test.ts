import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ProductService } from '../services/productService'
import { CategoryService } from '../services/categoryService'
import { SupplierService } from '../services/supplierService'
import { prisma } from '../config/database'

describe('ProductService', () => {
  let testCategoryId: string
  let testSupplierId: string

  beforeEach(async () => {
    // Create test category
    const categoryResult = await CategoryService.createCategory({
      name: 'Test Category',
      description: 'Test category for product tests'
    })
    testCategoryId = categoryResult.category!.id

    // Create test supplier
    const supplierResult = await SupplierService.createSupplier({
      name: 'Test Supplier',
      contactPerson: 'John Doe',
      email: 'test@supplier.com',
      phone: '+1234567890'
    })
    testSupplierId = supplierResult.supplier!.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.product.deleteMany({
      where: {
        OR: [
          { categoryId: testCategoryId },
          { supplierId: testSupplierId }
        ]
      }
    })
    
    if (testCategoryId) {
      await prisma.category.delete({ where: { id: testCategoryId } })
    }
    
    if (testSupplierId) {
      await prisma.supplier.delete({ where: { id: testSupplierId } })
    }
  })

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product',
        sku: 'TEST-001',
        barcode: '1234567890123',
        costPrice: 10.00,
        sellingPrice: 15.00,
        wholesalePrice: 12.00,
        stockLevel: 100,
        minStockLevel: 10,
        taxRate: 10.00,
        categoryId: testCategoryId,
        supplierId: testSupplierId
      }

      const result = await ProductService.createProduct(productData)

      expect(result.success).toBe(true)
      expect(result.product).toBeDefined()
      expect(result.product!.name).toBe(productData.name)
      expect(result.product!.sku).toBe(productData.sku)
      expect(result.product!.barcode).toBe(productData.barcode)
    })

    it('should fail to create product with duplicate SKU', async () => {
      const productData = {
        name: 'Test Product 1',
        sku: 'DUPLICATE-SKU',
        costPrice: 10.00,
        sellingPrice: 15.00,
        categoryId: testCategoryId,
        supplierId: testSupplierId
      }

      // Create first product
      await ProductService.createProduct(productData)

      // Try to create second product with same SKU
      const duplicateData = {
        ...productData,
        name: 'Test Product 2'
      }

      const result = await ProductService.createProduct(duplicateData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('SKU already exists')
    })

    it('should fail to create product with duplicate barcode', async () => {
      const productData = {
        name: 'Test Product 1',
        sku: 'TEST-001',
        barcode: '1234567890123',
        costPrice: 10.00,
        sellingPrice: 15.00,
        categoryId: testCategoryId,
        supplierId: testSupplierId
      }

      // Create first product
      await ProductService.createProduct(productData)

      // Try to create second product with same barcode
      const duplicateData = {
        ...productData,
        name: 'Test Product 2',
        sku: 'TEST-002'
      }

      const result = await ProductService.createProduct(duplicateData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('barcode already exists')
    })

    it('should fail when selling price is less than cost price', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        costPrice: 15.00,
        sellingPrice: 10.00, // Less than cost price
        categoryId: testCategoryId,
        supplierId: testSupplierId
      }

      const result = await ProductService.createProduct(productData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Selling price cannot be less than cost price')
    })
  })

  describe('getProducts', () => {
    it('should retrieve products with pagination', async () => {
      // Create test products
      const products = []
      for (let i = 1; i <= 5; i++) {
        const productData = {
          name: `Test Product ${i}`,
          sku: `TEST-00${i}`,
          costPrice: 10.00,
          sellingPrice: 15.00,
          categoryId: testCategoryId,
          supplierId: testSupplierId
        }
        const result = await ProductService.createProduct(productData)
        products.push(result.product!)
      }

      const result = await ProductService.getProducts({
        page: 1,
        limit: 3
      })

      expect(result.success).toBe(true)
      expect(result.products).toBeDefined()
      expect(result.products!.length).toBeLessThanOrEqual(3)
      expect(result.total).toBeGreaterThanOrEqual(5)
    })

    it('should filter products by category', async () => {
      // Create product in test category
      await ProductService.createProduct({
        name: 'Category Product',
        sku: 'CAT-001',
        costPrice: 10.00,
        sellingPrice: 15.00,
        categoryId: testCategoryId,
        supplierId: testSupplierId
      })

      const result = await ProductService.getProducts({
        categoryId: testCategoryId
      })

      expect(result.success).toBe(true)
      expect(result.products).toBeDefined()
      expect(result.products!.every(p => p.categoryId === testCategoryId)).toBe(true)
    })

    it('should search products by name', async () => {
      await ProductService.createProduct({
        name: 'Searchable Product',
        sku: 'SEARCH-001',
        costPrice: 10.00,
        sellingPrice: 15.00,
        categoryId: testCategoryId,
        supplierId: testSupplierId
      })

      const result = await ProductService.getProducts({
        search: 'Searchable'
      })

      expect(result.success).toBe(true)
      expect(result.products).toBeDefined()
      expect(result.products!.some(p => p.name.includes('Searchable'))).toBe(true)
    })
  })

  describe('getProductByBarcode', () => {
    it('should retrieve product by barcode', async () => {
      const barcode = '1234567890123'
      await ProductService.createProduct({
        name: 'Barcode Product',
        sku: 'BARCODE-001',
        barcode,
        costPrice: 10.00,
        sellingPrice: 15.00,
        categoryId: testCategoryId,
        supplierId: testSupplierId
      })

      const result = await ProductService.getProductByBarcode(barcode)

      expect(result.success).toBe(true)
      expect(result.product).toBeDefined()
      expect(result.product!.barcode).toBe(barcode)
    })

    it('should fail to find product with non-existent barcode', async () => {
      const result = await ProductService.getProductByBarcode('9999999999999')

      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })
  })

  describe('getLowStockProducts', () => {
    it('should retrieve products with low stock', async () => {
      // Create product with low stock
      await ProductService.createProduct({
        name: 'Low Stock Product',
        sku: 'LOW-001',
        costPrice: 10.00,
        sellingPrice: 15.00,
        stockLevel: 5,
        minStockLevel: 10, // Stock is below minimum
        categoryId: testCategoryId,
        supplierId: testSupplierId
      })

      // Create product with normal stock
      await ProductService.createProduct({
        name: 'Normal Stock Product',
        sku: 'NORMAL-001',
        costPrice: 10.00,
        sellingPrice: 15.00,
        stockLevel: 50,
        minStockLevel: 10, // Stock is above minimum
        categoryId: testCategoryId,
        supplierId: testSupplierId
      })

      const result = await ProductService.getLowStockProducts()

      expect(result.success).toBe(true)
      expect(result.products).toBeDefined()
      expect(result.products!.some(p => p.name === 'Low Stock Product')).toBe(true)
      expect(result.products!.every(p => p.stockLevel <= p.minStockLevel)).toBe(true)
    })
  })
})