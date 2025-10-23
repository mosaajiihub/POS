import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StockService } from '../services/stockService'
import { MovementType } from '@prisma/client'

// Mock Prisma
vi.mock('../config/database', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn()
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

describe('StockService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateStock', () => {
    it('should successfully update stock for a sale', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        stockLevel: 100
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          product: {
            update: vi.fn().mockResolvedValue({ ...mockProduct, stockLevel: 95 })
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({
              id: '1',
              productId: '1',
              type: MovementType.SALE,
              quantity: 5,
              previousStock: 100,
              newStock: 95,
              product: mockProduct
            })
          }
        })
      })

      const { prisma } = await import('../config/database')
      prisma.product.findUnique = vi.fn().mockResolvedValue(mockProduct)
      prisma.$transaction = mockTransaction

      const result = await StockService.updateStock({
        productId: '1',
        quantity: 5,
        type: MovementType.SALE,
        reason: 'Test sale',
        userId: 'user1'
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Stock updated successfully')
      expect(result.stockMovement).toBeDefined()
    })

    it('should fail when product is not found', async () => {
      const { prisma } = await import('../config/database')
      prisma.product.findUnique = vi.fn().mockResolvedValue(null)

      const result = await StockService.updateStock({
        productId: 'nonexistent',
        quantity: 5,
        type: MovementType.SALE,
        reason: 'Test sale',
        userId: 'user1'
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Product not found')
    })

    it('should fail when insufficient stock for sale', async () => {
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        stockLevel: 3
      }

      const { prisma } = await import('../config/database')
      prisma.product.findUnique = vi.fn().mockResolvedValue(mockProduct)

      const result = await StockService.updateStock({
        productId: '1',
        quantity: 5,
        type: MovementType.SALE,
        reason: 'Test sale',
        userId: 'user1'
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Insufficient stock for this operation')
    })
  })

  describe('processSale', () => {
    it('should successfully process sale with sufficient stock', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', stockLevel: 100 },
        { id: '2', name: 'Product 2', stockLevel: 50 }
      ]

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          product: {
            findUnique: vi.fn()
              .mockResolvedValueOnce(mockProducts[0])
              .mockResolvedValueOnce(mockProducts[1]),
            update: vi.fn().mockResolvedValue({})
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({})
          }
        })
      })

      const { prisma } = await import('../config/database')
      prisma.product.findUnique = vi.fn()
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1])
      prisma.$transaction = mockTransaction

      const saleItems = [
        { productId: '1', quantity: 5 },
        { productId: '2', quantity: 3 }
      ]

      const result = await StockService.processSale(saleItems)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Stock updated successfully for sale')
    })

    it('should fail when insufficient stock for sale items', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', stockLevel: 2 }, // Insufficient stock
        { id: '2', name: 'Product 2', stockLevel: 50 }
      ]

      const { prisma } = await import('../config/database')
      prisma.product.findUnique = vi.fn()
        .mockResolvedValueOnce(mockProducts[0])
        .mockResolvedValueOnce(mockProducts[1])

      const saleItems = [
        { productId: '1', quantity: 5 }, // More than available
        { productId: '2', quantity: 3 }
      ]

      const result = await StockService.processSale(saleItems)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Insufficient stock for some items')
      expect(result.insufficientStock).toContain('Product 1')
    })
  })

  describe('getLowStockAlerts', () => {
    it('should return low stock alerts correctly', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Low Stock Product',
          stockLevel: 5,
          minStockLevel: 10,
          isActive: true,
          category: { name: 'Category 1' },
          supplier: { name: 'Supplier 1' }
        },
        {
          id: '2',
          name: 'Out of Stock Product',
          stockLevel: 0,
          minStockLevel: 5,
          isActive: true,
          category: { name: 'Category 2' },
          supplier: { name: 'Supplier 2' }
        },
        {
          id: '3',
          name: 'Normal Stock Product',
          stockLevel: 100,
          minStockLevel: 10,
          isActive: true,
          category: { name: 'Category 3' },
          supplier: { name: 'Supplier 3' }
        }
      ]

      const { prisma } = await import('../config/database')
      prisma.product.findMany = vi.fn().mockResolvedValue(mockProducts)

      const result = await StockService.getLowStockAlerts()

      expect(result.success).toBe(true)
      expect(result.alerts).toHaveLength(2) // Only low stock and out of stock products
      expect(result.alerts?.[0].severity).toBe('out_of_stock') // Out of stock should be first
      expect(result.alerts?.[1].severity).toBe('critical') // Low stock should be second
    })
  })
})