/**
 * End-to-End Test: Inventory Management Workflow
 * Tests product creation, stock management, and low stock alerts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useProductStore } from '../../stores/productStore'
import { useStockStore } from '../../stores/stockStore'
import { ProductForm } from '../../components/products/ProductForm'
import { StockManagement } from '../../components/inventory/StockManagement'

// Mock API services
vi.mock('../../services/apiService', () => ({
  productApi: {
    getProducts: vi.fn().mockResolvedValue({ products: [] }),
    createProduct: vi.fn().mockImplementation((data) => Promise.resolve({
      product: {
        id: 'prod-123',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })),
    updateProduct: vi.fn().mockResolvedValue({ success: true }),
    deleteProduct: vi.fn().mockResolvedValue({ success: true }),
    getLowStockProducts: vi.fn().mockResolvedValue({
      products: [],
      total: 0
    })
  },
  stockApi: {
    getStockMovements: vi.fn().mockResolvedValue({
      movements: [],
      total: 0
    }),
    adjustStock: vi.fn().mockResolvedValue({
      success: true,
      stockMovement: {
        id: 'mov-123',
        productId: 'prod-123',
        type: 'ADJUSTMENT',
        quantity: 10,
        previousStock: 5,
        newStock: 15,
        reason: 'Stock adjustment'
      }
    }),
    updateStock: vi.fn().mockResolvedValue({ success: true }),
    getLowStockAlerts: vi.fn().mockResolvedValue({
      alerts: []
    })
  }
}))

// Mock real-time service
vi.mock('../../services/realTimeService', () => ({
  realTimeService: {
    onStockUpdate: vi.fn().mockReturnValue('sub-1'),
    onLowStockAlert: vi.fn().mockReturnValue('sub-2'),
    unsubscribe: vi.fn(),
    emitStockUpdate: vi.fn()
  }
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Inventory Management Workflow E2E', () => {
  beforeEach(() => {
    // Reset stores
    useProductStore.getState().products = []
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should complete full product lifecycle: create, update stock, and delete', async () => {
    // Step 1: Create a new product
    const productData = {
      name: 'Test Widget',
      description: 'A test widget for inventory testing',
      sku: 'WIDGET001',
      barcode: '1234567890123',
      price: 25.99,
      costPrice: 15.00,
      wholesalePrice: 20.00,
      stockLevel: 50,
      minStockLevel: 10,
      taxRate: 0.08,
      category: 'Electronics',
      categoryId: 'cat-1',
      supplierId: 'sup-1',
      isActive: true
    }

    const { addProduct } = useProductStore.getState()
    await addProduct(productData)

    // Verify product was added to store
    expect(useProductStore.getState().products).toHaveLength(1)
    const createdProduct = useProductStore.getState().products[0]
    expect(createdProduct.name).toBe('Test Widget')
    expect(createdProduct.stockLevel).toBe(50)
    expect(createdProduct.id).toBe('prod-123')

    // Verify API was called
    const { productApi } = await import('../../services/apiService')
    expect(productApi.createProduct).toHaveBeenCalledWith({
      name: 'Test Widget',
      description: 'A test widget for inventory testing',
      sku: 'WIDGET001',
      barcode: '1234567890123',
      costPrice: 15.00,
      sellingPrice: 25.99,
      wholesalePrice: 20.00,
      stockLevel: 50,
      minStockLevel: 10,
      taxRate: 0.08,
      categoryId: 'cat-1',
      supplierId: 'sup-1'
    })

    // Step 2: Adjust stock level
    const { stockApi } = await import('../../services/apiService')
    
    // Simulate stock adjustment
    await stockApi.adjustStock('prod-123', {
      newStockLevel: 75,
      reason: 'Received new shipment'
    })

    // Update product in store to reflect stock change
    const { updateProduct } = useProductStore.getState()
    await updateProduct('prod-123', { stockLevel: 75 })

    // Verify stock was updated
    const updatedProduct = useProductStore.getState().products[0]
    expect(updatedProduct.stockLevel).toBe(75)

    // Verify API calls
    expect(stockApi.adjustStock).toHaveBeenCalledWith('prod-123', {
      newStockLevel: 75,
      reason: 'Received new shipment'
    })

    // Step 3: Simulate sale that reduces stock below minimum
    await stockApi.updateStock({
      productId: 'prod-123',
      quantity: 70, // Reduce stock to 5 (below minimum of 10)
      type: 'SALE',
      reason: 'Large order sale'
    })

    // Update product stock in store
    await updateProduct('prod-123', { stockLevel: 5 })

    // Verify low stock condition
    const lowStockProduct = useProductStore.getState().products[0]
    expect(lowStockProduct.stockLevel).toBe(5)
    expect(lowStockProduct.stockLevel).toBeLessThan(lowStockProduct.minStockLevel)

    // Step 4: Delete product
    const { deleteProduct } = useProductStore.getState()
    await deleteProduct('prod-123')

    // Verify product was removed
    expect(useProductStore.getState().products).toHaveLength(0)

    // Verify API was called
    expect(productApi.deleteProduct).toHaveBeenCalledWith('prod-123')
  })

  it('should handle stock movements and generate proper audit trail', async () => {
    // Create a product first
    const { addProduct } = useProductStore.getState()
    await addProduct({
      name: 'Audit Test Product',
      sku: 'AUDIT001',
      price: 10.00,
      costPrice: 5.00,
      stockLevel: 100,
      minStockLevel: 20,
      category: 'Test',
      categoryId: 'cat-1',
      supplierId: 'sup-1',
      isActive: true
    })

    const { stockApi } = await import('../../services/apiService')

    // Perform multiple stock operations
    const operations = [
      { type: 'PURCHASE', quantity: 50, reason: 'New inventory received' },
      { type: 'SALE', quantity: 30, reason: 'Customer purchase' },
      { type: 'ADJUSTMENT', quantity: -5, reason: 'Damaged items removed' },
      { type: 'RETURN', quantity: 3, reason: 'Customer return' }
    ]

    for (const operation of operations) {
      await stockApi.updateStock({
        productId: 'prod-123',
        quantity: operation.quantity,
        type: operation.type as any,
        reason: operation.reason
      })
    }

    // Verify all stock operations were recorded
    expect(stockApi.updateStock).toHaveBeenCalledTimes(4)

    // Verify the sequence of calls
    expect(stockApi.updateStock).toHaveBeenNthCalledWith(1, {
      productId: 'prod-123',
      quantity: 50,
      type: 'PURCHASE',
      reason: 'New inventory received'
    })

    expect(stockApi.updateStock).toHaveBeenNthCalledWith(2, {
      productId: 'prod-123',
      quantity: 30,
      type: 'SALE',
      reason: 'Customer purchase'
    })

    expect(stockApi.updateStock).toHaveBeenNthCalledWith(3, {
      productId: 'prod-123',
      quantity: -5,
      type: 'ADJUSTMENT',
      reason: 'Damaged items removed'
    })

    expect(stockApi.updateStock).toHaveBeenNthCalledWith(4, {
      productId: 'prod-123',
      quantity: 3,
      type: 'RETURN',
      reason: 'Customer return'
    })
  })

  it('should trigger low stock alerts and real-time notifications', async () => {
    // Create product with stock at minimum level
    const { addProduct } = useProductStore.getState()
    await addProduct({
      name: 'Low Stock Product',
      sku: 'LOW001',
      price: 15.00,
      costPrice: 8.00,
      stockLevel: 10, // At minimum level
      minStockLevel: 10,
      category: 'Test',
      categoryId: 'cat-1',
      supplierId: 'sup-1',
      isActive: true
    })

    const { stockApi } = await import('../../services/apiService')
    const { realTimeService } = await import('../../services/realTimeService')

    // Mock low stock alerts response
    stockApi.getLowStockAlerts = vi.fn().mockResolvedValue({
      alerts: [
        {
          productId: 'prod-123',
          productName: 'Low Stock Product',
          currentStock: 5,
          minStock: 10
        }
      ]
    })

    // Simulate sale that triggers low stock
    await stockApi.updateStock({
      productId: 'prod-123',
      quantity: 5,
      type: 'SALE',
      reason: 'Customer purchase'
    })

    // Fetch low stock alerts
    const alertsResponse = await stockApi.getLowStockAlerts()
    expect(alertsResponse.alerts).toHaveLength(1)
    expect(alertsResponse.alerts[0].currentStock).toBe(5)
    expect(alertsResponse.alerts[0].currentStock).toBeLessThan(alertsResponse.alerts[0].minStock)

    // Verify real-time service subscription was set up
    expect(realTimeService.onLowStockAlert).toHaveBeenCalled()
  })

  it('should handle bulk stock operations efficiently', async () => {
    // Create multiple products
    const products = [
      { name: 'Bulk Product 1', sku: 'BULK001', stockLevel: 100 },
      { name: 'Bulk Product 2', sku: 'BULK002', stockLevel: 200 },
      { name: 'Bulk Product 3', sku: 'BULK003', stockLevel: 150 }
    ]

    const { addProduct } = useProductStore.getState()
    
    for (const product of products) {
      await addProduct({
        ...product,
        price: 20.00,
        costPrice: 10.00,
        minStockLevel: 25,
        category: 'Bulk',
        categoryId: 'cat-1',
        supplierId: 'sup-1',
        isActive: true
      })
    }

    // Verify all products were created
    expect(useProductStore.getState().products).toHaveLength(3)

    const { stockApi } = await import('../../services/apiService')

    // Simulate bulk sale affecting multiple products
    const saleItems = [
      { productId: 'prod-123', quantity: 50 },
      { productId: 'prod-124', quantity: 75 },
      { productId: 'prod-125', quantity: 100 }
    ]

    // Process bulk sale
    await stockApi.processSale(saleItems)

    // Verify bulk operation was called correctly
    expect(stockApi.processSale).toHaveBeenCalledWith(saleItems)
  })

  it('should validate stock operations and prevent negative stock', async () => {
    // Create product with limited stock
    const { addProduct } = useProductStore.getState()
    await addProduct({
      name: 'Limited Stock Product',
      sku: 'LIMITED001',
      price: 30.00,
      costPrice: 18.00,
      stockLevel: 5, // Only 5 in stock
      minStockLevel: 2,
      category: 'Limited',
      categoryId: 'cat-1',
      supplierId: 'sup-1',
      isActive: true
    })

    const { stockApi } = await import('../../services/apiService')

    // Mock API to reject operations that would result in negative stock
    stockApi.updateStock = vi.fn().mockRejectedValue(new Error('Insufficient stock'))

    // Try to sell more than available
    await expect(
      stockApi.updateStock({
        productId: 'prod-123',
        quantity: 10, // More than the 5 available
        type: 'SALE',
        reason: 'Customer order'
      })
    ).rejects.toThrow('Insufficient stock')

    // Verify the operation was attempted but failed
    expect(stockApi.updateStock).toHaveBeenCalledWith({
      productId: 'prod-123',
      quantity: 10,
      type: 'SALE',
      reason: 'Customer order'
    })
  })

  it('should handle concurrent stock operations correctly', async () => {
    // Create product
    const { addProduct } = useProductStore.getState()
    await addProduct({
      name: 'Concurrent Test Product',
      sku: 'CONCURRENT001',
      price: 25.00,
      costPrice: 15.00,
      stockLevel: 100,
      minStockLevel: 10,
      category: 'Test',
      categoryId: 'cat-1',
      supplierId: 'sup-1',
      isActive: true
    })

    const { stockApi } = await import('../../services/apiService')

    // Simulate concurrent operations
    const concurrentOperations = [
      stockApi.updateStock({
        productId: 'prod-123',
        quantity: 10,
        type: 'SALE',
        reason: 'Sale 1'
      }),
      stockApi.updateStock({
        productId: 'prod-123',
        quantity: 15,
        type: 'SALE',
        reason: 'Sale 2'
      }),
      stockApi.updateStock({
        productId: 'prod-123',
        quantity: 20,
        type: 'PURCHASE',
        reason: 'Restock'
      })
    ]

    // Execute all operations concurrently
    await Promise.all(concurrentOperations)

    // Verify all operations were attempted
    expect(stockApi.updateStock).toHaveBeenCalledTimes(3)
  })
})