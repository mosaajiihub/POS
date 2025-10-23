import { MovementType, Product, StockMovement } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface StockAdjustmentData {
  productId: string
  quantity: number
  type: MovementType
  reason?: string
  userId: string
}

export interface StockAlertThreshold {
  productId: string
  minStockLevel: number
  alertThreshold?: number
}

export interface StockMovementFilters {
  productId?: string
  type?: MovementType
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface StockReport {
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalStockValue: number
  recentMovements: StockMovement[]
  topMovingProducts: Array<{
    product: Product
    totalMovements: number
    netChange: number
  }>
}

export interface StockResult {
  success: boolean
  message: string
  stockMovement?: StockMovement & { product: Product }
}

export interface StockListResult {
  success: boolean
  message: string
  movements?: (StockMovement & { product: Product })[]
  total?: number
  page?: number
  limit?: number
}

export interface LowStockAlert {
  product: Product
  currentStock: number
  minStockLevel: number
  alertThreshold: number
  severity: 'low' | 'critical' | 'out_of_stock'
}

/**
 * Stock Management Service
 * Handles real-time stock tracking, adjustments, and reporting
 */
export class StockService {
  /**
   * Update stock level for a product
   */
  static async updateStock(adjustmentData: StockAdjustmentData): Promise<StockResult> {
    try {
      const { productId, quantity, type, reason, userId } = adjustmentData

      // Get current product stock
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      const previousStock = product.stockLevel
      let newStock: number

      // Calculate new stock based on movement type
      switch (type) {
        case MovementType.SALE:
          newStock = previousStock - Math.abs(quantity)
          break
        case MovementType.PURCHASE:
          newStock = previousStock + Math.abs(quantity)
          break
        case MovementType.ADJUSTMENT:
          // For adjustments, quantity can be positive or negative
          newStock = previousStock + quantity
          break
        case MovementType.RETURN:
          newStock = previousStock + Math.abs(quantity)
          break
        case MovementType.DAMAGE:
          newStock = previousStock - Math.abs(quantity)
          break
        default:
          return {
            success: false,
            message: 'Invalid movement type'
          }
      }

      // Ensure stock doesn't go negative
      if (newStock < 0) {
        return {
          success: false,
          message: 'Insufficient stock for this operation'
        }
      }

      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Update product stock level
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stockLevel: newStock }
        })

        // Create stock movement record
        const stockMovement = await tx.stockMovement.create({
          data: {
            productId,
            type,
            quantity: Math.abs(quantity),
            previousStock,
            newStock,
            reason
          },
          include: {
            product: true
          }
        })

        return { updatedProduct, stockMovement }
      })

      // Check for low stock alerts after update
      await this.checkLowStockAlert(productId)

      logger.info(`Stock updated for product ${productId}: ${previousStock} -> ${newStock} (${type})`)

      return {
        success: true,
        message: 'Stock updated successfully',
        stockMovement: result.stockMovement
      }
    } catch (error) {
      logger.error('Update stock error:', error)
      return {
        success: false,
        message: 'An error occurred while updating stock'
      }
    }
  }

  /**
   * Process stock adjustment with audit trail
   */
  static async adjustStock(
    productId: string,
    newStockLevel: number,
    reason: string,
    userId: string
  ): Promise<StockResult> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      const adjustmentQuantity = newStockLevel - product.stockLevel

      if (adjustmentQuantity === 0) {
        return {
          success: false,
          message: 'No adjustment needed - stock level is already at target value'
        }
      }

      return await this.updateStock({
        productId,
        quantity: adjustmentQuantity,
        type: MovementType.ADJUSTMENT,
        reason: reason || 'Manual stock adjustment',
        userId
      })
    } catch (error) {
      logger.error('Adjust stock error:', error)
      return {
        success: false,
        message: 'An error occurred while adjusting stock'
      }
    }
  }

  /**
   * Get stock movements with filtering
   */
  static async getStockMovements(filters: StockMovementFilters = {}): Promise<StockListResult> {
    try {
      const {
        productId,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (productId) {
        where.productId = productId
      }

      if (type) {
        where.type = type
      }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt.gte = startDate
        }
        if (endDate) {
          where.createdAt.lte = endDate
        }
      }

      // Get movements and total count
      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              include: {
                category: true,
                supplier: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.stockMovement.count({ where })
      ])

      return {
        success: true,
        message: 'Stock movements retrieved successfully',
        movements,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get stock movements error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving stock movements'
      }
    }
  }

  /**
   * Get low stock alerts
   */
  static async getLowStockAlerts(): Promise<{
    success: boolean
    message: string
    alerts?: LowStockAlert[]
  }> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true
        },
        include: {
          category: true,
          supplier: true
        }
      })

      const alerts: LowStockAlert[] = []

      for (const product of products) {
        const alertThreshold = Math.max(product.minStockLevel, Math.ceil(product.minStockLevel * 1.5))
        
        let severity: 'low' | 'critical' | 'out_of_stock'
        
        if (product.stockLevel === 0) {
          severity = 'out_of_stock'
        } else if (product.stockLevel <= product.minStockLevel) {
          severity = 'critical'
        } else if (product.stockLevel <= alertThreshold) {
          severity = 'low'
        } else {
          continue // Skip products with adequate stock
        }

        alerts.push({
          product,
          currentStock: product.stockLevel,
          minStockLevel: product.minStockLevel,
          alertThreshold,
          severity
        })
      }

      // Sort by severity (out_of_stock first, then critical, then low)
      alerts.sort((a, b) => {
        const severityOrder = { out_of_stock: 0, critical: 1, low: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })

      return {
        success: true,
        message: 'Low stock alerts retrieved successfully',
        alerts
      }
    } catch (error) {
      logger.error('Get low stock alerts error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving low stock alerts'
      }
    }
  }

  /**
   * Generate comprehensive stock report
   */
  static async generateStockReport(days: number = 30): Promise<{
    success: boolean
    message: string
    report?: StockReport
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get all active products
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
          supplier: true
        }
      })

      // Calculate stock statistics
      const totalProducts = products.length
      const lowStockProducts = products.filter(p => p.stockLevel <= p.minStockLevel).length
      const outOfStockProducts = products.filter(p => p.stockLevel === 0).length
      const totalStockValue = products.reduce((sum, p) => sum + (p.stockLevel * Number(p.costPrice)), 0)

      // Get recent movements
      const recentMovements = await prisma.stockMovement.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          product: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })

      // Calculate top moving products
      const movementsByProduct = new Map<string, { product: Product; movements: StockMovement[] }>()
      
      for (const movement of recentMovements) {
        if (!movementsByProduct.has(movement.productId)) {
          movementsByProduct.set(movement.productId, {
            product: movement.product,
            movements: []
          })
        }
        movementsByProduct.get(movement.productId)!.movements.push(movement)
      }

      const topMovingProducts = Array.from(movementsByProduct.entries())
        .map(([productId, data]) => {
          const totalMovements = data.movements.length
          const netChange = data.movements.reduce((sum, m) => {
            const quantity = m.type === MovementType.SALE || m.type === MovementType.DAMAGE 
              ? -m.quantity 
              : m.quantity
            return sum + quantity
          }, 0)

          return {
            product: data.product,
            totalMovements,
            netChange
          }
        })
        .sort((a, b) => b.totalMovements - a.totalMovements)
        .slice(0, 10)

      const report: StockReport = {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue,
        recentMovements: recentMovements.slice(0, 20),
        topMovingProducts
      }

      return {
        success: true,
        message: 'Stock report generated successfully',
        report
      }
    } catch (error) {
      logger.error('Generate stock report error:', error)
      return {
        success: false,
        message: 'An error occurred while generating stock report'
      }
    }
  }

  /**
   * Update stock thresholds for a product
   */
  static async updateStockThresholds(
    productId: string,
    minStockLevel: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      if (minStockLevel < 0) {
        return {
          success: false,
          message: 'Minimum stock level cannot be negative'
        }
      }

      await prisma.product.update({
        where: { id: productId },
        data: { minStockLevel }
      })

      // Check if this creates a new low stock alert
      await this.checkLowStockAlert(productId)

      logger.info(`Stock thresholds updated for product ${productId}: minStock=${minStockLevel}`)

      return {
        success: true,
        message: 'Stock thresholds updated successfully'
      }
    } catch (error) {
      logger.error('Update stock thresholds error:', error)
      return {
        success: false,
        message: 'An error occurred while updating stock thresholds'
      }
    }
  }

  /**
   * Process sale and update stock
   */
  static async processSale(saleItems: Array<{ productId: string; quantity: number }>): Promise<{
    success: boolean
    message: string
    insufficientStock?: string[]
  }> {
    try {
      const insufficientStock: string[] = []

      // Check stock availability for all items first
      for (const item of saleItems) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) {
          return {
            success: false,
            message: `Product not found: ${item.productId}`
          }
        }

        if (product.stockLevel < item.quantity) {
          insufficientStock.push(product.name)
        }
      }

      if (insufficientStock.length > 0) {
        return {
          success: false,
          message: 'Insufficient stock for some items',
          insufficientStock
        }
      }

      // Process all stock updates in a transaction
      await prisma.$transaction(async (tx) => {
        for (const item of saleItems) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          })

          if (product) {
            const newStock = product.stockLevel - item.quantity

            // Update product stock
            await tx.product.update({
              where: { id: item.productId },
              data: { stockLevel: newStock }
            })

            // Create stock movement record
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: MovementType.SALE,
                quantity: item.quantity,
                previousStock: product.stockLevel,
                newStock,
                reason: 'POS Sale'
              }
            })
          }
        }
      })

      // Check for low stock alerts for all affected products
      for (const item of saleItems) {
        await this.checkLowStockAlert(item.productId)
      }

      logger.info(`Stock updated for sale: ${saleItems.length} items`)

      return {
        success: true,
        message: 'Stock updated successfully for sale'
      }
    } catch (error) {
      logger.error('Process sale stock update error:', error)
      return {
        success: false,
        message: 'An error occurred while updating stock for sale'
      }
    }
  }

  /**
   * Check and trigger low stock alert for a product
   */
  private static async checkLowStockAlert(productId: string): Promise<void> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })

      if (!product) return

      const alertThreshold = Math.max(product.minStockLevel, Math.ceil(product.minStockLevel * 1.5))

      if (product.stockLevel <= alertThreshold) {
        // In a real application, this would trigger notifications
        // For now, we'll just log the alert
        const severity = product.stockLevel === 0 ? 'OUT_OF_STOCK' : 
                        product.stockLevel <= product.minStockLevel ? 'CRITICAL' : 'LOW'
        
        logger.warn(`Low stock alert for ${product.name} (${product.sku}): ${product.stockLevel} units remaining (${severity})`)
        
        // Here you could:
        // - Send email notifications
        // - Create system notifications
        // - Update dashboard alerts
        // - Trigger automatic reorder processes
      }
    } catch (error) {
      logger.error('Check low stock alert error:', error)
    }
  }
}