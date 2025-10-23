import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { Decimal } from '@prisma/client/runtime/library'

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface SalesAnalyticsFilters extends DateRange {
  categoryId?: string
  productId?: string
  customerId?: string
  cashierId?: string
  paymentMethod?: string
  groupBy?: 'day' | 'week' | 'month' | 'year'
}

export interface SalesMetrics {
  totalSales: number
  totalRevenue: number
  totalProfit: number
  averageOrderValue: number
  totalTransactions: number
  profitMargin: number
}

export interface ProductAnalytics {
  productId: string
  productName: string
  sku: string
  totalQuantitySold: number
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  averageSellingPrice: number
}

export interface CategoryAnalytics {
  categoryId: string
  categoryName: string
  totalQuantitySold: number
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  productCount: number
}

export interface TimeSeriesData {
  date: string
  totalSales: number
  totalRevenue: number
  totalProfit: number
  transactionCount: number
}

export interface ProfitAnalysis {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  topProducts: ProductAnalytics[]
  topCategories: CategoryAnalytics[]
  timeSeries: TimeSeriesData[]
}

export interface ExportData {
  format: 'pdf' | 'excel' | 'csv'
  data: any
  filename: string
}

/**
 * Analytics Service
 * Handles sales analytics, profit calculations, and reporting
 */
export class AnalyticsService {
  /**
   * Get sales metrics for a date range
   */
  static async getSalesMetrics(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    metrics?: SalesMetrics
  }> {
    try {
      const { startDate, endDate, categoryId, productId, customerId, cashierId, paymentMethod } = filters

      // Build where clause
      const where: any = {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        paymentStatus: 'COMPLETED'
      }

      if (customerId) where.customerId = customerId
      if (cashierId) where.cashierId = cashierId
      if (paymentMethod) where.paymentMethod = paymentMethod

      // Add product/category filters through sale items
      if (productId || categoryId) {
        where.items = {
          some: {
            ...(productId && { productId }),
            ...(categoryId && { product: { categoryId } })
          }
        }
      }

      // Get sales data with items and product details
      const sales = await prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Calculate metrics
      let totalRevenue = 0
      let totalCost = 0
      let totalQuantity = 0

      sales.forEach(sale => {
        totalRevenue += Number(sale.totalAmount)
        
        sale.items.forEach(item => {
          totalCost += Number(item.product.costPrice) * item.quantity
          totalQuantity += item.quantity
        })
      })

      const totalProfit = totalRevenue - totalCost
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      const averageOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0

      const metrics: SalesMetrics = {
        totalSales: totalQuantity,
        totalRevenue,
        totalProfit,
        averageOrderValue,
        totalTransactions: sales.length,
        profitMargin
      }

      return {
        success: true,
        message: 'Sales metrics retrieved successfully',
        metrics
      }
    } catch (error) {
      logger.error('Get sales metrics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving sales metrics'
      }
    }
  }

  /**
   * Get product analytics
   */
  static async getProductAnalytics(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    products?: ProductAnalytics[]
  }> {
    try {
      const { startDate, endDate, categoryId, productId } = filters

      const where: any = {
        sale: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'COMPLETED'
        }
      }

      if (productId) where.productId = productId
      if (categoryId) where.product = { categoryId }

      // Get sale items with product details
      const saleItems = await prisma.saleItem.findMany({
        where,
        include: {
          product: true,
          sale: true
        }
      })

      // Group by product and calculate analytics
      const productMap = new Map<string, {
        product: any
        totalQuantity: number
        totalRevenue: number
        totalCost: number
        transactions: number
      }>()

      saleItems.forEach(item => {
        const productId = item.productId
        const existing = productMap.get(productId)
        
        const revenue = Number(item.totalPrice)
        const cost = Number(item.product.costPrice) * item.quantity

        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalRevenue += revenue
          existing.totalCost += cost
          existing.transactions += 1
        } else {
          productMap.set(productId, {
            product: item.product,
            totalQuantity: item.quantity,
            totalRevenue: revenue,
            totalCost: cost,
            transactions: 1
          })
        }
      })

      // Convert to analytics format
      const products: ProductAnalytics[] = Array.from(productMap.values()).map(data => {
        const totalProfit = data.totalRevenue - data.totalCost
        const profitMargin = data.totalRevenue > 0 ? (totalProfit / data.totalRevenue) * 100 : 0
        const averageSellingPrice = data.totalQuantity > 0 ? data.totalRevenue / data.totalQuantity : 0

        return {
          productId: data.product.id,
          productName: data.product.name,
          sku: data.product.sku,
          totalQuantitySold: data.totalQuantity,
          totalRevenue: data.totalRevenue,
          totalProfit,
          profitMargin,
          averageSellingPrice
        }
      })

      // Sort by total revenue descending
      products.sort((a, b) => b.totalRevenue - a.totalRevenue)

      return {
        success: true,
        message: 'Product analytics retrieved successfully',
        products
      }
    } catch (error) {
      logger.error('Get product analytics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving product analytics'
      }
    }
  }

  /**
   * Get category analytics
   */
  static async getCategoryAnalytics(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    categories?: CategoryAnalytics[]
  }> {
    try {
      const { startDate, endDate, categoryId } = filters

      const where: any = {
        sale: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'COMPLETED'
        }
      }

      if (categoryId) where.product = { categoryId }

      // Get sale items with product and category details
      const saleItems = await prisma.saleItem.findMany({
        where,
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      })

      // Group by category and calculate analytics
      const categoryMap = new Map<string, {
        category: any
        totalQuantity: number
        totalRevenue: number
        totalCost: number
        productIds: Set<string>
      }>()

      saleItems.forEach(item => {
        const categoryId = item.product.categoryId
        const existing = categoryMap.get(categoryId)
        
        const revenue = Number(item.totalPrice)
        const cost = Number(item.product.costPrice) * item.quantity

        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalRevenue += revenue
          existing.totalCost += cost
          existing.productIds.add(item.productId)
        } else {
          categoryMap.set(categoryId, {
            category: item.product.category,
            totalQuantity: item.quantity,
            totalRevenue: revenue,
            totalCost: cost,
            productIds: new Set([item.productId])
          })
        }
      })

      // Convert to analytics format
      const categories: CategoryAnalytics[] = Array.from(categoryMap.values()).map(data => {
        const totalProfit = data.totalRevenue - data.totalCost
        const profitMargin = data.totalRevenue > 0 ? (totalProfit / data.totalRevenue) * 100 : 0

        return {
          categoryId: data.category.id,
          categoryName: data.category.name,
          totalQuantitySold: data.totalQuantity,
          totalRevenue: data.totalRevenue,
          totalProfit,
          profitMargin,
          productCount: data.productIds.size
        }
      })

      // Sort by total revenue descending
      categories.sort((a, b) => b.totalRevenue - a.totalRevenue)

      return {
        success: true,
        message: 'Category analytics retrieved successfully',
        categories
      }
    } catch (error) {
      logger.error('Get category analytics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving category analytics'
      }
    }
  }

  /**
   * Get time series data for charts
   */
  static async getTimeSeriesData(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    timeSeries?: TimeSeriesData[]
  }> {
    try {
      const { startDate, endDate, groupBy = 'day' } = filters

      // Get sales data
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'COMPLETED'
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Group sales by time period
      const timeSeriesMap = new Map<string, {
        totalSales: number
        totalRevenue: number
        totalCost: number
        transactionCount: number
      }>()

      sales.forEach(sale => {
        const dateKey = this.getDateKey(sale.createdAt, groupBy)
        const existing = timeSeriesMap.get(dateKey)
        
        let totalCost = 0
        let totalQuantity = 0
        
        sale.items.forEach(item => {
          totalCost += Number(item.product.costPrice) * item.quantity
          totalQuantity += item.quantity
        })

        const revenue = Number(sale.totalAmount)

        if (existing) {
          existing.totalSales += totalQuantity
          existing.totalRevenue += revenue
          existing.totalCost += totalCost
          existing.transactionCount += 1
        } else {
          timeSeriesMap.set(dateKey, {
            totalSales: totalQuantity,
            totalRevenue: revenue,
            totalCost,
            transactionCount: 1
          })
        }
      })

      // Convert to time series format
      const timeSeries: TimeSeriesData[] = Array.from(timeSeriesMap.entries()).map(([date, data]) => ({
        date,
        totalSales: data.totalSales,
        totalRevenue: data.totalRevenue,
        totalProfit: data.totalRevenue - data.totalCost,
        transactionCount: data.transactionCount
      }))

      // Sort by date
      timeSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return {
        success: true,
        message: 'Time series data retrieved successfully',
        timeSeries
      }
    } catch (error) {
      logger.error('Get time series data error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving time series data'
      }
    }
  }

  /**
   * Get comprehensive profit analysis
   */
  static async getProfitAnalysis(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    analysis?: ProfitAnalysis
  }> {
    try {
      // Get all analytics data
      const [metricsResult, productsResult, categoriesResult, timeSeriesResult] = await Promise.all([
        this.getSalesMetrics(filters),
        this.getProductAnalytics({ ...filters }),
        this.getCategoryAnalytics({ ...filters }),
        this.getTimeSeriesData(filters)
      ])

      if (!metricsResult.success || !productsResult.success || !categoriesResult.success || !timeSeriesResult.success) {
        return {
          success: false,
          message: 'Failed to retrieve complete profit analysis data'
        }
      }

      const analysis: ProfitAnalysis = {
        totalRevenue: metricsResult.metrics!.totalRevenue,
        totalCost: metricsResult.metrics!.totalRevenue - metricsResult.metrics!.totalProfit,
        totalProfit: metricsResult.metrics!.totalProfit,
        profitMargin: metricsResult.metrics!.profitMargin,
        topProducts: productsResult.products!.slice(0, 10), // Top 10 products
        topCategories: categoriesResult.categories!.slice(0, 10), // Top 10 categories
        timeSeries: timeSeriesResult.timeSeries!
      }

      return {
        success: true,
        message: 'Profit analysis retrieved successfully',
        analysis
      }
    } catch (error) {
      logger.error('Get profit analysis error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving profit analysis'
      }
    }
  }

  /**
   * Generate export data for reports
   */
  static async generateExportData(
    type: 'sales' | 'products' | 'categories' | 'profit',
    filters: SalesAnalyticsFilters,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<{
    success: boolean
    message: string
    exportData?: ExportData
  }> {
    try {
      let data: any
      let filename: string

      switch (type) {
        case 'sales':
          const metricsResult = await this.getSalesMetrics(filters)
          if (!metricsResult.success) throw new Error(metricsResult.message)
          data = metricsResult.metrics
          filename = `sales-report-${this.formatDateForFilename(filters.startDate)}-${this.formatDateForFilename(filters.endDate)}`
          break

        case 'products':
          const productsResult = await this.getProductAnalytics(filters)
          if (!productsResult.success) throw new Error(productsResult.message)
          data = productsResult.products
          filename = `product-analytics-${this.formatDateForFilename(filters.startDate)}-${this.formatDateForFilename(filters.endDate)}`
          break

        case 'categories':
          const categoriesResult = await this.getCategoryAnalytics(filters)
          if (!categoriesResult.success) throw new Error(categoriesResult.message)
          data = categoriesResult.categories
          filename = `category-analytics-${this.formatDateForFilename(filters.startDate)}-${this.formatDateForFilename(filters.endDate)}`
          break

        case 'profit':
          const profitResult = await this.getProfitAnalysis(filters)
          if (!profitResult.success) throw new Error(profitResult.message)
          data = profitResult.analysis
          filename = `profit-analysis-${this.formatDateForFilename(filters.startDate)}-${this.formatDateForFilename(filters.endDate)}`
          break

        default:
          throw new Error('Invalid export type')
      }

      return {
        success: true,
        message: 'Export data generated successfully',
        exportData: {
          format,
          data,
          filename: `${filename}.${format}`
        }
      }
    } catch (error) {
      logger.error('Generate export data error:', error)
      return {
        success: false,
        message: 'An error occurred while generating export data'
      }
    }
  }

  /**
   * Helper method to get date key for grouping
   */
  private static getDateKey(date: Date, groupBy: string): string {
    const d = new Date(date)
    
    switch (groupBy) {
      case 'day':
        return d.toISOString().split('T')[0] // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        return weekStart.toISOString().split('T')[0]
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      case 'year':
        return String(d.getFullYear())
      default:
        return d.toISOString().split('T')[0]
    }
  }

  /**
   * Helper method to format date for filename
   */
  private static formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}