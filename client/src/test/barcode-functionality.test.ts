import { describe, it, expect, beforeEach } from 'vitest'
import { useProductStore } from '../stores/productStore'

describe('Barcode Functionality', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const store = useProductStore.getState()
    store.products = [
      {
        id: '1',
        name: 'Test Product 1',
        price: 10.99,
        category: 'Test',
        sku: 'TEST001',
        barcode: '1234567890123',
        stockLevel: 50,
        taxRate: 0.08
      },
      {
        id: '2',
        name: 'Test Product 2',
        price: 5.99,
        category: 'Test',
        sku: 'TEST002',
        barcode: '9876543210987',
        stockLevel: 25,
        taxRate: 0.08
      },
      {
        id: '3',
        name: 'Test Product 3',
        price: 15.99,
        category: 'Test',
        sku: 'TEST003',
        // No barcode for this product
        stockLevel: 10,
        taxRate: 0.08
      }
    ]
  })

  describe('findProductByBarcode', () => {
    it('should find product by exact barcode match', () => {
      const store = useProductStore.getState()
      const product = store.findProductByBarcode('1234567890123')
      
      expect(product).toBeDefined()
      expect(product?.name).toBe('Test Product 1')
      expect(product?.sku).toBe('TEST001')
    })

    it('should return null for non-existent barcode', () => {
      const store = useProductStore.getState()
      const product = store.findProductByBarcode('0000000000000')
      
      expect(product).toBeNull()
    })

    it('should return null for empty barcode', () => {
      const store = useProductStore.getState()
      const product = store.findProductByBarcode('')
      
      expect(product).toBeNull()
    })
  })

  describe('searchProducts', () => {
    it('should find products by name', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('Test Product 1')
      
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Test Product 1')
    })

    it('should find products by SKU', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('TEST002')
      
      expect(results).toHaveLength(1)
      expect(results[0].sku).toBe('TEST002')
    })

    it('should find products by barcode', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('9876543210987')
      
      expect(results).toHaveLength(1)
      expect(results[0].barcode).toBe('9876543210987')
    })

    it('should find products by partial name match', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('Product')
      
      expect(results).toHaveLength(3) // All products contain "Product" in name
    })

    it('should return empty array for no matches', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('NonExistent')
      
      expect(results).toHaveLength(0)
    })

    it('should return all products for empty search', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('')
      
      expect(results).toHaveLength(3)
    })

    it('should be case insensitive', () => {
      const store = useProductStore.getState()
      const results = store.searchProducts('test product 1')
      
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Test Product 1')
    })
  })
})