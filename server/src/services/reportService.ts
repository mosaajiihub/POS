import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import puppeteer from 'puppeteer'
import { createReadStream, createWriteStream, promises as fs } from 'fs'
import path from 'path'
import { logger } from '../utils/logger'
import { connectRedis } from '../config/redis'

const prisma = new PrismaClient()

export interface ReportFilter {
  startDate?: Date
  endDate?: Date
  categoryId?: string
  supplierId?: string
  customerId?: string
  productId?: string
  status?: string
  limit?: number
  offset?: number
}

export interface ReportData {
  title: string
  data: any[]
  columns: ReportColumn[]
  summary?: Record<string, any>
  filters?: ReportFilter
  generatedAt: Date
}

export interface ReportColumn {
  key: string
  title: string
  type: 'string' | 'number' | 'date' | 'currency'
  width?: number
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  filename?: string
  template?: string
}

export class ReportService {
  private static redis: any

  static async initialize() {
    this.redis = await connectRedis()
  }

  // Cache management
  private static getCacheKey(reportType: string, filters: ReportFilter): string {
    const filterString = JSON.stringify(filters)
    return `report:${reportType}:${Buffer.from(filterString).toString('base64')}`
  }

  private static async getCachedReport(cacheKey: string): Promise<ReportData | null> {
    try {
      if (!this.redis) return null
      const cached = await this.redis.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Error getting cached report:', error)
      return null
    }
  }

  private static async setCachedReport(cacheKey: string, data: ReportData, ttl: number = 3600): Promise<void> {
    try {
      if (!this.redis) return
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data))
    } catch (error) {
      logger.error('Error caching report:', error)
    }
  }

  // Stock Reports
  static async generateStockLevelReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('stock-levels', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {}
      
      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId
      }
      
      if (filters.supplierId) {
        whereClause.supplierId = filters.supplierId
      }

      const products = await prisma.product.findMany({
        where: {
          ...whereClause,
          isActive: true
        },
        include: {
          category: true,
          supplier: true
        },
        orderBy: { name: 'asc' },
        take: filters.limit,
        skip: filters.offset
      })

      const data = products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        supplier: product.supplier.name,
        currentStock: product.stockLevel,
        minStock: product.minStockLevel,
        stockStatus: product.stockLevel <= product.minStockLevel ? 'Low Stock' : 'In Stock',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stockValue: product.stockLevel * product.costPrice
      }))

      const summary = {
        totalProducts: products.length,
        lowStockItems: products.filter(p => p.stockLevel <= p.minStockLevel).length,
        totalStockValue: data.reduce((sum, item) => sum + Number(item.stockValue), 0),
        averageStockLevel: data.length > 0 ? data.reduce((sum, item) => sum + item.currentStock, 0) / data.length : 0
      }

      const reportData: ReportData = {
        title: 'Stock Level Report',
        data,
        columns: [
          { key: 'name', title: 'Product Name', type: 'string', width: 200 },
          { key: 'sku', title: 'SKU', type: 'string', width: 120 },
          { key: 'category', title: 'Category', type: 'string', width: 150 },
          { key: 'supplier', title: 'Supplier', type: 'string', width: 150 },
          { key: 'currentStock', title: 'Current Stock', type: 'number', width: 120 },
          { key: 'minStock', title: 'Min Stock', type: 'number', width: 100 },
          { key: 'stockStatus', title: 'Status', type: 'string', width: 100 },
          { key: 'costPrice', title: 'Cost Price', type: 'currency', width: 120 },
          { key: 'sellingPrice', title: 'Selling Price', type: 'currency', width: 120 },
          { key: 'stockValue', title: 'Stock Value', type: 'currency', width: 120 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating stock level report:', error)
      throw new Error('Failed to generate stock level report')
    }
  }

  static async generateStockMovementReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('stock-movements', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {}
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }
      
      if (filters.productId) {
        whereClause.productId = filters.productId
      }

      const movements = await prisma.stockMovement.findMany({
        where: whereClause,
        include: {
          product: {
            include: {
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset
      })

      const data = movements.map(movement => ({
        id: movement.id,
        productName: movement.product.name,
        sku: movement.product.sku,
        category: movement.product.category.name,
        movementType: movement.type,
        quantity: movement.quantity,
        previousStock: movement.previousStock,
        newStock: movement.newStock,
        reason: movement.reason || '',
        date: movement.createdAt
      }))

      const summary = {
        totalMovements: movements.length,
        salesMovements: movements.filter(m => m.type === 'SALE').length,
        purchaseMovements: movements.filter(m => m.type === 'PURCHASE').length,
        adjustmentMovements: movements.filter(m => m.type === 'ADJUSTMENT').length,
        totalQuantityMoved: movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0)
      }

      const reportData: ReportData = {
        title: 'Stock Movement Report',
        data,
        columns: [
          { key: 'productName', title: 'Product', type: 'string', width: 200 },
          { key: 'sku', title: 'SKU', type: 'string', width: 120 },
          { key: 'category', title: 'Category', type: 'string', width: 150 },
          { key: 'movementType', title: 'Type', type: 'string', width: 120 },
          { key: 'quantity', title: 'Quantity', type: 'number', width: 100 },
          { key: 'previousStock', title: 'Previous Stock', type: 'number', width: 120 },
          { key: 'newStock', title: 'New Stock', type: 'number', width: 120 },
          { key: 'reason', title: 'Reason', type: 'string', width: 200 },
          { key: 'date', title: 'Date', type: 'date', width: 150 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating stock movement report:', error)
      throw new Error('Failed to generate stock movement report')
    }
  }

  static async generateLowStockReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('low-stock', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {
        isActive: true
      }
      
      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId
      }
      
      if (filters.supplierId) {
        whereClause.supplierId = filters.supplierId
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          supplier: true
        }
      })

      // Filter products where stock is at or below minimum level
      const lowStockProducts = products.filter(product => 
        product.stockLevel <= product.minStockLevel
      )

      const data = lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        supplier: product.supplier.name,
        currentStock: product.stockLevel,
        minStock: product.minStockLevel,
        shortage: product.minStockLevel - product.stockLevel,
        reorderSuggestion: Math.max(product.minStockLevel * 2, product.minStockLevel + 10),
        costPrice: product.costPrice,
        estimatedReorderCost: Math.max(product.minStockLevel * 2, product.minStockLevel + 10) * product.costPrice
      }))

      const summary = {
        totalLowStockItems: data.length,
        totalShortage: data.reduce((sum, item) => sum + Math.max(0, item.shortage), 0),
        estimatedReorderCost: data.reduce((sum, item) => sum + Number(item.estimatedReorderCost), 0),
        criticalItems: data.filter(item => item.currentStock === 0).length
      }

      const reportData: ReportData = {
        title: 'Low Stock Alert Report',
        data,
        columns: [
          { key: 'name', title: 'Product Name', type: 'string', width: 200 },
          { key: 'sku', title: 'SKU', type: 'string', width: 120 },
          { key: 'category', title: 'Category', type: 'string', width: 150 },
          { key: 'supplier', title: 'Supplier', type: 'string', width: 150 },
          { key: 'currentStock', title: 'Current Stock', type: 'number', width: 120 },
          { key: 'minStock', title: 'Min Stock', type: 'number', width: 100 },
          { key: 'shortage', title: 'Shortage', type: 'number', width: 100 },
          { key: 'reorderSuggestion', title: 'Suggested Reorder', type: 'number', width: 140 },
          { key: 'costPrice', title: 'Cost Price', type: 'currency', width: 120 },
          { key: 'estimatedReorderCost', title: 'Reorder Cost', type: 'currency', width: 140 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating low stock report:', error)
      throw new Error('Failed to generate low stock report')
    }
  }

  // Sales Reports
  static async generateSalesPerformanceReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('sales-performance', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {}
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }
      
      if (filters.customerId) {
        whereClause.customerId = filters.customerId
      }

      const sales = await prisma.sale.findMany({
        where: whereClause,
        include: {
          customer: true,
          cashier: true,
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset
      })

      const data = sales.map(sale => {
        const profit = sale.items.reduce((sum, item) => {
          const itemProfit = (Number(item.unitPrice) - Number(item.product.costPrice)) * item.quantity
          return sum + itemProfit
        }, 0)

        return {
          id: sale.id,
          transactionNumber: sale.transactionNumber,
          date: sale.createdAt,
          customerName: sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'Walk-in',
          cashierName: `${sale.cashier.firstName} ${sale.cashier.lastName}`,
          itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: sale.subtotal,
          taxAmount: sale.taxAmount,
          discountAmount: sale.discountAmount,
          totalAmount: sale.totalAmount,
          profit: profit,
          profitMargin: Number(sale.totalAmount) > 0 ? (profit / Number(sale.totalAmount)) * 100 : 0,
          paymentMethod: sale.paymentMethod
        }
      })

      const summary = {
        totalSales: sales.length,
        totalRevenue: data.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
        totalProfit: data.reduce((sum, sale) => sum + sale.profit, 0),
        averageOrderValue: data.length > 0 ? data.reduce((sum, sale) => sum + Number(sale.totalAmount), 0) / data.length : 0,
        averageProfitMargin: data.length > 0 ? data.reduce((sum, sale) => sum + sale.profitMargin, 0) / data.length : 0,
        totalItemsSold: data.reduce((sum, sale) => sum + sale.itemCount, 0)
      }

      const reportData: ReportData = {
        title: 'Sales Performance Report',
        data,
        columns: [
          { key: 'transactionNumber', title: 'Transaction #', type: 'string', width: 150 },
          { key: 'date', title: 'Date', type: 'date', width: 150 },
          { key: 'customerName', title: 'Customer', type: 'string', width: 180 },
          { key: 'cashierName', title: 'Cashier', type: 'string', width: 150 },
          { key: 'itemCount', title: 'Items', type: 'number', width: 80 },
          { key: 'subtotal', title: 'Subtotal', type: 'currency', width: 120 },
          { key: 'taxAmount', title: 'Tax', type: 'currency', width: 100 },
          { key: 'discountAmount', title: 'Discount', type: 'currency', width: 120 },
          { key: 'totalAmount', title: 'Total', type: 'currency', width: 120 },
          { key: 'profit', title: 'Profit', type: 'currency', width: 120 },
          { key: 'profitMargin', title: 'Profit %', type: 'number', width: 100 },
          { key: 'paymentMethod', title: 'Payment', type: 'string', width: 120 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating sales performance report:', error)
      throw new Error('Failed to generate sales performance report')
    }
  }

  static async generateInventoryValuationReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('inventory-valuation', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {}
      
      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId
      }
      
      if (filters.supplierId) {
        whereClause.supplierId = filters.supplierId
      }

      const products = await prisma.product.findMany({
        where: {
          ...whereClause,
          isActive: true
        },
        include: {
          category: true,
          supplier: true
        },
        orderBy: { name: 'asc' },
        take: filters.limit,
        skip: filters.offset
      })

      const data = products.map(product => {
        const costValue = product.stockLevel * Number(product.costPrice)
        const retailValue = product.stockLevel * Number(product.sellingPrice)
        const potentialProfit = retailValue - costValue

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category.name,
          supplier: product.supplier.name,
          stockLevel: product.stockLevel,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          costValue: costValue,
          retailValue: retailValue,
          potentialProfit: potentialProfit,
          profitMargin: retailValue > 0 ? (potentialProfit / retailValue) * 100 : 0
        }
      })

      const summary = {
        totalProducts: products.length,
        totalCostValue: data.reduce((sum, item) => sum + item.costValue, 0),
        totalRetailValue: data.reduce((sum, item) => sum + item.retailValue, 0),
        totalPotentialProfit: data.reduce((sum, item) => sum + item.potentialProfit, 0),
        averageProfitMargin: data.length > 0 ? data.reduce((sum, item) => sum + item.profitMargin, 0) / data.length : 0
      }

      const reportData: ReportData = {
        title: 'Inventory Valuation Report',
        data,
        columns: [
          { key: 'name', title: 'Product Name', type: 'string', width: 200 },
          { key: 'sku', title: 'SKU', type: 'string', width: 120 },
          { key: 'category', title: 'Category', type: 'string', width: 150 },
          { key: 'supplier', title: 'Supplier', type: 'string', width: 150 },
          { key: 'stockLevel', title: 'Stock Level', type: 'number', width: 120 },
          { key: 'costPrice', title: 'Cost Price', type: 'currency', width: 120 },
          { key: 'sellingPrice', title: 'Selling Price', type: 'currency', width: 120 },
          { key: 'costValue', title: 'Cost Value', type: 'currency', width: 120 },
          { key: 'retailValue', title: 'Retail Value', type: 'currency', width: 120 },
          { key: 'potentialProfit', title: 'Potential Profit', type: 'currency', width: 140 },
          { key: 'profitMargin', title: 'Profit Margin %', type: 'number', width: 140 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating inventory valuation report:', error)
      throw new Error('Failed to generate inventory valuation report')
    }
  }

  static async generateProductPerformanceReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('product-performance', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {}
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }

      const salesWithItems = await prisma.sale.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      })

      // Aggregate product performance data
      const productStats = new Map()

      salesWithItems.forEach(sale => {
        sale.items.forEach(item => {
          const productId = item.product.id
          const profit = (Number(item.unitPrice) - Number(item.product.costPrice)) * item.quantity
          
          if (!productStats.has(productId)) {
            productStats.set(productId, {
              product: item.product,
              totalQuantitySold: 0,
              totalRevenue: 0,
              totalProfit: 0,
              salesCount: 0
            })
          }
          
          const stats = productStats.get(productId)
          stats.totalQuantitySold += item.quantity
          stats.totalRevenue += Number(item.totalPrice)
          stats.totalProfit += profit
          stats.salesCount += 1
        })
      })

      const data = Array.from(productStats.values()).map(stats => ({
        id: stats.product.id,
        name: stats.product.name,
        sku: stats.product.sku,
        category: stats.product.category.name,
        totalQuantitySold: stats.totalQuantitySold,
        totalRevenue: stats.totalRevenue,
        totalProfit: stats.totalProfit,
        profitMargin: stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0,
        averageOrderValue: stats.salesCount > 0 ? stats.totalRevenue / stats.salesCount : 0,
        salesFrequency: stats.salesCount,
        currentStock: stats.product.stockLevel,
        turnoverRate: stats.product.stockLevel > 0 ? stats.totalQuantitySold / stats.product.stockLevel : 0
      })).sort((a, b) => b.totalRevenue - a.totalRevenue)

      const summary = {
        totalProductsSold: data.length,
        totalRevenue: data.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalProfit: data.reduce((sum, item) => sum + item.totalProfit, 0),
        totalQuantitySold: data.reduce((sum, item) => sum + item.totalQuantitySold, 0),
        averageProfitMargin: data.length > 0 ? data.reduce((sum, item) => sum + item.profitMargin, 0) / data.length : 0,
        topPerformingProduct: data.length > 0 ? data[0].name : 'N/A'
      }

      const reportData: ReportData = {
        title: 'Product Performance Report',
        data: data.slice(0, filters.limit || 100),
        columns: [
          { key: 'name', title: 'Product Name', type: 'string', width: 200 },
          { key: 'sku', title: 'SKU', type: 'string', width: 120 },
          { key: 'category', title: 'Category', type: 'string', width: 150 },
          { key: 'totalQuantitySold', title: 'Qty Sold', type: 'number', width: 100 },
          { key: 'totalRevenue', title: 'Revenue', type: 'currency', width: 120 },
          { key: 'totalProfit', title: 'Profit', type: 'currency', width: 120 },
          { key: 'profitMargin', title: 'Profit %', type: 'number', width: 100 },
          { key: 'averageOrderValue', title: 'Avg Order Value', type: 'currency', width: 140 },
          { key: 'salesFrequency', title: 'Sales Count', type: 'number', width: 120 },
          { key: 'currentStock', title: 'Current Stock', type: 'number', width: 120 },
          { key: 'turnoverRate', title: 'Turnover Rate', type: 'number', width: 120 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating product performance report:', error)
      throw new Error('Failed to generate product performance report')
    }
  }

  static async generateCustomerAnalyticsReport(filters: ReportFilter = {}): Promise<ReportData> {
    const cacheKey = this.getCacheKey('customer-analytics', filters)
    const cached = await this.getCachedReport(cacheKey)
    if (cached) return cached

    try {
      const whereClause: any = {}
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }
      
      if (filters.customerId) {
        whereClause.customerId = filters.customerId
      }

      const sales = await prisma.sale.findMany({
        where: {
          ...whereClause,
          customerId: { not: null }
        },
        include: {
          customer: true,
          items: true
        }
      })

      // Aggregate customer data
      const customerStats = new Map()

      sales.forEach(sale => {
        if (!sale.customer) return
        
        const customerId = sale.customer.id
        
        if (!customerStats.has(customerId)) {
          customerStats.set(customerId, {
            customer: sale.customer,
            totalPurchases: 0,
            totalSpent: 0,
            totalItems: 0,
            firstPurchase: sale.createdAt,
            lastPurchase: sale.createdAt,
            purchaseFrequency: 0
          })
        }
        
        const stats = customerStats.get(customerId)
        stats.totalPurchases += 1
        stats.totalSpent += Number(sale.totalAmount)
        stats.totalItems += sale.items.reduce((sum, item) => sum + item.quantity, 0)
        
        if (sale.createdAt < stats.firstPurchase) {
          stats.firstPurchase = sale.createdAt
        }
        if (sale.createdAt > stats.lastPurchase) {
          stats.lastPurchase = sale.createdAt
        }
      })

      const data = Array.from(customerStats.values()).map(stats => {
        const daysSinceFirst = Math.max(1, Math.floor((Date.now() - stats.firstPurchase.getTime()) / (1000 * 60 * 60 * 24)))
        const purchaseFrequency = stats.totalPurchases / daysSinceFirst * 30 // purchases per month
        
        return {
          id: stats.customer.id,
          name: `${stats.customer.firstName} ${stats.customer.lastName}`,
          email: stats.customer.email || 'N/A',
          phone: stats.customer.phone || 'N/A',
          totalPurchases: stats.totalPurchases,
          totalSpent: stats.totalSpent,
          averageOrderValue: stats.totalPurchases > 0 ? stats.totalSpent / stats.totalPurchases : 0,
          totalItems: stats.totalItems,
          firstPurchase: stats.firstPurchase,
          lastPurchase: stats.lastPurchase,
          purchaseFrequency: purchaseFrequency,
          loyaltyPoints: stats.customer.loyaltyPoints,
          customerSegment: stats.totalSpent > 1000 ? 'VIP' : stats.totalSpent > 500 ? 'Regular' : 'New'
        }
      }).sort((a, b) => b.totalSpent - a.totalSpent)

      const summary = {
        totalCustomers: data.length,
        totalRevenue: data.reduce((sum, customer) => sum + customer.totalSpent, 0),
        averageOrderValue: data.length > 0 ? data.reduce((sum, customer) => sum + customer.averageOrderValue, 0) / data.length : 0,
        averagePurchaseFrequency: data.length > 0 ? data.reduce((sum, customer) => sum + customer.purchaseFrequency, 0) / data.length : 0,
        vipCustomers: data.filter(c => c.customerSegment === 'VIP').length,
        regularCustomers: data.filter(c => c.customerSegment === 'Regular').length,
        newCustomers: data.filter(c => c.customerSegment === 'New').length
      }

      const reportData: ReportData = {
        title: 'Customer Analytics Report',
        data: data.slice(0, filters.limit || 100),
        columns: [
          { key: 'name', title: 'Customer Name', type: 'string', width: 180 },
          { key: 'email', title: 'Email', type: 'string', width: 200 },
          { key: 'phone', title: 'Phone', type: 'string', width: 150 },
          { key: 'totalPurchases', title: 'Total Purchases', type: 'number', width: 140 },
          { key: 'totalSpent', title: 'Total Spent', type: 'currency', width: 120 },
          { key: 'averageOrderValue', title: 'Avg Order Value', type: 'currency', width: 140 },
          { key: 'totalItems', title: 'Total Items', type: 'number', width: 120 },
          { key: 'purchaseFrequency', title: 'Purchases/Month', type: 'number', width: 140 },
          { key: 'loyaltyPoints', title: 'Loyalty Points', type: 'number', width: 120 },
          { key: 'customerSegment', title: 'Segment', type: 'string', width: 100 },
          { key: 'lastPurchase', title: 'Last Purchase', type: 'date', width: 150 }
        ],
        summary,
        filters,
        generatedAt: new Date()
      }

      await this.setCachedReport(cacheKey, reportData)
      return reportData
    } catch (error) {
      logger.error('Error generating customer analytics report:', error)
      throw new Error('Failed to generate customer analytics report')
    }
  }

  // Scheduled reporting functionality
  static async scheduleReport(config: {
    reportType: string
    schedule: string
    recipients: string[]
    format: 'pdf' | 'excel' | 'csv'
    filters: ReportFilter
  }) {
    try {
      // This would typically be stored in database
      // For now, we'll use a simple in-memory storage or file system
      const scheduledReport = {
        id: Date.now().toString(),
        ...config,
        createdAt: new Date(),
        isActive: true,
        lastRun: null,
        nextRun: this.calculateNextRun(config.schedule)
      }

      // Store in Redis or database
      if (this.redis) {
        await this.redis.hset('scheduled_reports', scheduledReport.id, JSON.stringify(scheduledReport))
      }

      return scheduledReport
    } catch (error) {
      logger.error('Error scheduling report:', error)
      throw new Error('Failed to schedule report')
    }
  }

  static async getScheduledReports() {
    try {
      if (!this.redis) return []
      
      const reports = await this.redis.hgetall('scheduled_reports')
      return Object.values(reports).map(report => JSON.parse(report as string))
    } catch (error) {
      logger.error('Error getting scheduled reports:', error)
      throw new Error('Failed to get scheduled reports')
    }
  }

  static async updateScheduledReport(id: string, updates: any) {
    try {
      if (!this.redis) throw new Error('Redis not available')
      
      const existingReport = await this.redis.hget('scheduled_reports', id)
      if (!existingReport) throw new Error('Scheduled report not found')
      
      const report = JSON.parse(existingReport)
      const updatedReport = { ...report, ...updates, updatedAt: new Date() }
      
      await this.redis.hset('scheduled_reports', id, JSON.stringify(updatedReport))
      return updatedReport
    } catch (error) {
      logger.error('Error updating scheduled report:', error)
      throw new Error('Failed to update scheduled report')
    }
  }

  static async deleteScheduledReport(id: string) {
    try {
      if (!this.redis) throw new Error('Redis not available')
      await this.redis.hdel('scheduled_reports', id)
    } catch (error) {
      logger.error('Error deleting scheduled report:', error)
      throw new Error('Failed to delete scheduled report')
    }
  }

  private static calculateNextRun(schedule: string): Date {
    const now = new Date()
    
    switch (schedule) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      case 'monthly':
        const nextMonth = new Date(now)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        return nextMonth
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
  }

  // Export functionality
  static async exportToExcel(reportData: ReportData, options: ExportOptions = { format: 'excel' }): Promise<string> {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(reportData.title)

      // Add title
      worksheet.mergeCells('A1:' + String.fromCharCode(65 + reportData.columns.length - 1) + '1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = reportData.title
      titleCell.font = { size: 16, bold: true }
      titleCell.alignment = { horizontal: 'center' }

      // Add generation date
      worksheet.mergeCells('A2:' + String.fromCharCode(65 + reportData.columns.length - 1) + '2')
      const dateCell = worksheet.getCell('A2')
      dateCell.value = `Generated on: ${reportData.generatedAt.toLocaleString()}`
      dateCell.font = { size: 10, italic: true }
      dateCell.alignment = { horizontal: 'center' }

      // Add headers
      const headerRow = worksheet.getRow(4)
      reportData.columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1)
        cell.value = column.title
        cell.font = { bold: true }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        }
        if (column.width) {
          worksheet.getColumn(index + 1).width = column.width / 8 // Convert pixels to Excel width
        }
      })

      // Add data
      reportData.data.forEach((row, rowIndex) => {
        const dataRow = worksheet.getRow(rowIndex + 5)
        reportData.columns.forEach((column, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1)
          let value = row[column.key]
          
          if (column.type === 'currency' && typeof value === 'number') {
            cell.value = value
            cell.numFmt = '$#,##0.00'
          } else if (column.type === 'date' && value instanceof Date) {
            cell.value = value
            cell.numFmt = 'mm/dd/yyyy hh:mm'
          } else {
            cell.value = value
          }
        })
      })

      // Add summary if available
      if (reportData.summary) {
        const summaryStartRow = reportData.data.length + 7
        worksheet.getCell(`A${summaryStartRow}`).value = 'Summary:'
        worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 }
        
        let summaryRow = summaryStartRow + 1
        Object.entries(reportData.summary).forEach(([key, value]) => {
          worksheet.getCell(`A${summaryRow}`).value = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          worksheet.getCell(`B${summaryRow}`).value = typeof value === 'number' ? value : String(value)
          summaryRow++
        })
      }

      // Save file
      const filename = options.filename || `${reportData.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
      const filepath = path.join(process.cwd(), 'temp', filename)
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true })
      
      await workbook.xlsx.writeFile(filepath)
      return filepath
    } catch (error) {
      logger.error('Error exporting to Excel:', error)
      throw new Error('Failed to export report to Excel')
    }
  }

  static async exportToPDF(reportData: ReportData, options: ExportOptions = { format: 'pdf' }): Promise<string> {
    try {
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()

      // Generate HTML content
      const html = this.generateHTMLReport(reportData)
      await page.setContent(html, { waitUntil: 'networkidle0' })

      // Generate PDF
      const filename = options.filename || `${reportData.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`
      const filepath = path.join(process.cwd(), 'temp', filename)
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true })

      await page.pdf({
        path: filepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      })

      await browser.close()
      return filepath
    } catch (error) {
      logger.error('Error exporting to PDF:', error)
      throw new Error('Failed to export report to PDF')
    }
  }

  static async exportToCSV(reportData: ReportData, options: ExportOptions = { format: 'csv' }): Promise<string> {
    try {
      const filename = options.filename || `${reportData.title.replace(/\s+/g, '_')}_${Date.now()}.csv`
      const filepath = path.join(process.cwd(), 'temp', filename)
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true })

      // Generate CSV content
      const headers = reportData.columns.map(col => col.title).join(',')
      const rows = reportData.data.map(row => 
        reportData.columns.map(col => {
          let value = row[col.key]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        }).join(',')
      )

      const csvContent = [
        `"${reportData.title}"`,
        `"Generated on: ${reportData.generatedAt.toLocaleString()}"`,
        '',
        headers,
        ...rows
      ].join('\n')

      await fs.writeFile(filepath, csvContent, 'utf8')
      return filepath
    } catch (error) {
      logger.error('Error exporting to CSV:', error)
      throw new Error('Failed to export report to CSV')
    }
  }

  private static generateHTMLReport(reportData: ReportData): string {
    const tableRows = reportData.data.map(row => {
      const cells = reportData.columns.map(col => {
        let value = row[col.key]
        if (col.type === 'currency' && typeof value === 'number') {
          value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        } else if (col.type === 'date' && value instanceof Date) {
          value = value.toLocaleDateString()
        }
        return `<td>${value || ''}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
    }).join('')

    const summaryRows = reportData.summary ? Object.entries(reportData.summary).map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      return `<tr><td><strong>${label}:</strong></td><td>${value}</td></tr>`
    }).join('') : ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportData.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          .meta { text-align: center; color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { margin-top: 30px; }
          .summary table { width: auto; }
        </style>
      </head>
      <body>
        <h1>${reportData.title}</h1>
        <div class="meta">Generated on: ${reportData.generatedAt.toLocaleString()}</div>
        
        <table>
          <thead>
            <tr>
              ${reportData.columns.map(col => `<th>${col.title}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        ${summaryRows ? `
          <div class="summary">
            <h2>Summary</h2>
            <table>
              ${summaryRows}
            </table>
          </div>
        ` : ''}
      </body>
      </html>
    `
  }
}