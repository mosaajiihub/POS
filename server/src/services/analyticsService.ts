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

export interface DemandForecast {
  productId: string
  productName: string
  sku: string
  currentStock: number
  averageDemand: number
  forecastedDemand: number
  recommendedOrder: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface SeasonalTrend {
  period: string
  metric: 'revenue' | 'sales' | 'profit'
  value: number
  previousValue: number
  change: number
  changePercent: number
  seasonalIndex: number
}

export interface BusinessIntelligence {
  kpis: {
    name: string
    value: number
    target?: number
    trend: 'up' | 'down' | 'stable'
    changePercent: number
  }[]
  insights: {
    type: 'opportunity' | 'warning' | 'info'
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
    actionable: boolean
  }[]
  recommendations: {
    category: 'inventory' | 'pricing' | 'marketing' | 'operations'
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    estimatedImpact: string
  }[]
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
   * Get dashboard metrics for real-time display
   */
  static async getDashboardMetrics(): Promise<{
    success: boolean
    message: string
    data?: {
      todaysSales: number
      todaysTransactions: number
      totalProducts: number
      lowStockProducts: number
      totalCustomers: number
      monthlyRevenue: number
    }
  }> {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

      // Get today's sales data
      const todaysSalesData = await prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: 'COMPLETED'
        },
        _sum: {
          totalAmount: true
        },
        _count: {
          id: true
        }
      })

      // Get monthly revenue
      const monthlyRevenueData = await prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: 'COMPLETED'
        },
        _sum: {
          totalAmount: true
        }
      })

      // Get product counts
      const productCounts = await prisma.product.aggregate({
        _count: {
          id: true
        }
      })

      // Get low stock products count
      const lowStockCount = await prisma.product.count({
        where: {
          stockLevel: {
            lte: prisma.product.fields.minStockLevel
          },
          isActive: true
        }
      })

      // Get total customers
      const customerCount = await prisma.customer.count({
        where: {
          isActive: true
        }
      })

      const metrics = {
        todaysSales: Number(todaysSalesData._sum.totalAmount || 0),
        todaysTransactions: todaysSalesData._count.id || 0,
        totalProducts: productCounts._count.id || 0,
        lowStockProducts: lowStockCount || 0,
        totalCustomers: customerCount || 0,
        monthlyRevenue: Number(monthlyRevenueData._sum.totalAmount || 0)
      }

      return {
        success: true,
        message: 'Dashboard metrics retrieved successfully',
        data: metrics
      }
    } catch (error) {
      logger.error('Get dashboard metrics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving dashboard metrics'
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
   * Generate demand forecasting for products
   */
  static async getDemandForecast(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    forecasts?: DemandForecast[]
  }> {
    try {
      const { startDate, endDate, categoryId, productId } = filters

      // Get historical sales data for the past 90 days
      const historicalStartDate = new Date(startDate)
      historicalStartDate.setDate(historicalStartDate.getDate() - 90)

      const where: any = {
        sale: {
          createdAt: {
            gte: historicalStartDate,
            lte: endDate
          },
          paymentStatus: 'COMPLETED'
        }
      }

      if (productId) where.productId = productId
      if (categoryId) where.product = { categoryId }

      // Get historical sales data
      const saleItems = await prisma.saleItem.findMany({
        where,
        include: {
          product: {
            include: {
              stock: true
            }
          },
          sale: true
        }
      })

      // Group by product and calculate demand patterns
      const productMap = new Map<string, {
        product: any
        dailySales: Map<string, number>
        totalSales: number
        salesDays: number
      }>()

      saleItems.forEach(item => {
        const productId = item.productId
        const saleDate = item.sale.createdAt.toISOString().split('T')[0]
        
        const existing = productMap.get(productId)
        
        if (existing) {
          existing.totalSales += item.quantity
          const currentDaySales = existing.dailySales.get(saleDate) || 0
          existing.dailySales.set(saleDate, currentDaySales + item.quantity)
        } else {
          const dailySales = new Map<string, number>()
          dailySales.set(saleDate, item.quantity)
          
          productMap.set(productId, {
            product: item.product,
            dailySales,
            totalSales: item.quantity,
            salesDays: 1
          })
        }
      })

      // Calculate forecasts
      const forecasts: DemandForecast[] = Array.from(productMap.values()).map(data => {
        const salesDays = data.dailySales.size
        const averageDemand = salesDays > 0 ? data.totalSales / salesDays : 0
        
        // Simple linear trend calculation
        const salesArray = Array.from(data.dailySales.values())
        const trend = this.calculateTrend(salesArray)
        
        // Forecast for next 30 days
        const forecastPeriod = 30
        let forecastedDemand = averageDemand * forecastPeriod
        
        // Apply trend adjustment
        if (trend === 'increasing') {
          forecastedDemand *= 1.2
        } else if (trend === 'decreasing') {
          forecastedDemand *= 0.8
        }
        
        const currentStock = data.product.stock?.quantity || 0
        const recommendedOrder = Math.max(0, Math.ceil(forecastedDemand - currentStock))
        
        // Calculate confidence based on data consistency
        const variance = this.calculateVariance(salesArray)
        const confidence = Math.max(0.3, Math.min(0.95, 1 - (variance / (averageDemand + 1))))

        return {
          productId: data.product.id,
          productName: data.product.name,
          sku: data.product.sku,
          currentStock,
          averageDemand,
          forecastedDemand: Math.round(forecastedDemand),
          recommendedOrder,
          confidence,
          trend
        }
      })

      // Sort by forecasted demand descending
      forecasts.sort((a, b) => b.forecastedDemand - a.forecastedDemand)

      return {
        success: true,
        message: 'Demand forecast generated successfully',
        forecasts
      }
    } catch (error) {
      logger.error('Get demand forecast error:', error)
      return {
        success: false,
        message: 'An error occurred while generating demand forecast'
      }
    }
  }

  /**
   * Generate seasonal trend analysis
   */
  static async getSeasonalTrends(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    trends?: SeasonalTrend[]
  }> {
    try {
      const { startDate, endDate } = filters

      // Get data for the same period last year for comparison
      const lastYearStart = new Date(startDate)
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
      const lastYearEnd = new Date(endDate)
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

      // Get current period data
      const currentPeriodResult = await this.getTimeSeriesData({
        ...filters,
        groupBy: 'month'
      })

      // Get last year data
      const lastYearResult = await this.getTimeSeriesData({
        ...filters,
        startDate: lastYearStart,
        endDate: lastYearEnd,
        groupBy: 'month'
      })

      if (!currentPeriodResult.success || !lastYearResult.success) {
        throw new Error('Failed to retrieve seasonal data')
      }

      const currentData = currentPeriodResult.timeSeries || []
      const lastYearData = lastYearResult.timeSeries || []

      // Create seasonal trends
      const trends: SeasonalTrend[] = []

      // Revenue trends
      currentData.forEach((current, index) => {
        const lastYear = lastYearData[index]
        if (lastYear) {
          const change = current.totalRevenue - lastYear.totalRevenue
          const changePercent = lastYear.totalRevenue > 0 ? (change / lastYear.totalRevenue) * 100 : 0
          const seasonalIndex = lastYear.totalRevenue > 0 ? current.totalRevenue / lastYear.totalRevenue : 1

          trends.push({
            period: current.date,
            metric: 'revenue',
            value: current.totalRevenue,
            previousValue: lastYear.totalRevenue,
            change,
            changePercent,
            seasonalIndex
          })
        }
      })

      // Sales volume trends
      currentData.forEach((current, index) => {
        const lastYear = lastYearData[index]
        if (lastYear) {
          const change = current.totalSales - lastYear.totalSales
          const changePercent = lastYear.totalSales > 0 ? (change / lastYear.totalSales) * 100 : 0
          const seasonalIndex = lastYear.totalSales > 0 ? current.totalSales / lastYear.totalSales : 1

          trends.push({
            period: current.date,
            metric: 'sales',
            value: current.totalSales,
            previousValue: lastYear.totalSales,
            change,
            changePercent,
            seasonalIndex
          })
        }
      })

      // Profit trends
      currentData.forEach((current, index) => {
        const lastYear = lastYearData[index]
        if (lastYear) {
          const change = current.totalProfit - lastYear.totalProfit
          const changePercent = lastYear.totalProfit > 0 ? (change / lastYear.totalProfit) * 100 : 0
          const seasonalIndex = lastYear.totalProfit > 0 ? current.totalProfit / lastYear.totalProfit : 1

          trends.push({
            period: current.date,
            metric: 'profit',
            value: current.totalProfit,
            previousValue: lastYear.totalProfit,
            change,
            changePercent,
            seasonalIndex
          })
        }
      })

      return {
        success: true,
        message: 'Seasonal trends generated successfully',
        trends
      }
    } catch (error) {
      logger.error('Get seasonal trends error:', error)
      return {
        success: false,
        message: 'An error occurred while generating seasonal trends'
      }
    }
  }

  /**
   * Generate business intelligence insights and recommendations
   */
  static async getBusinessIntelligence(filters: SalesAnalyticsFilters): Promise<{
    success: boolean
    message: string
    intelligence?: BusinessIntelligence
  }> {
    try {
      // Get comprehensive analytics data
      const [metricsResult, productsResult, categoriesResult, forecastResult] = await Promise.all([
        this.getSalesMetrics(filters),
        this.getProductAnalytics(filters),
        this.getCategoryAnalytics(filters),
        this.getDemandForecast(filters)
      ])

      if (!metricsResult.success || !productsResult.success || !categoriesResult.success) {
        throw new Error('Failed to retrieve business intelligence data')
      }

      const metrics = metricsResult.metrics!
      const products = productsResult.products!
      const categories = categoriesResult.categories!
      const forecasts = forecastResult.forecasts || []

      // Calculate KPIs
      const kpis = [
        {
          name: 'Revenue Growth',
          value: metrics.totalRevenue,
          trend: 'up' as const,
          changePercent: 12.5 // This would be calculated from historical data
        },
        {
          name: 'Profit Margin',
          value: metrics.profitMargin,
          target: 25,
          trend: metrics.profitMargin >= 25 ? 'up' as const : 'down' as const,
          changePercent: 2.3
        },
        {
          name: 'Average Order Value',
          value: metrics.averageOrderValue,
          trend: 'stable' as const,
          changePercent: 0.8
        },
        {
          name: 'Customer Retention',
          value: 78.5, // This would be calculated from customer data
          target: 80,
          trend: 'down' as const,
          changePercent: -1.2
        }
      ]

      // Generate insights
      const insights = []

      // Low stock insights
      const lowStockProducts = forecasts.filter(f => f.currentStock < f.averageDemand * 7)
      if (lowStockProducts.length > 0) {
        insights.push({
          type: 'warning' as const,
          title: 'Low Stock Alert',
          description: `${lowStockProducts.length} products are running low on stock and may need restocking soon.`,
          impact: 'high' as const,
          actionable: true
        })
      }

      // High demand products
      const highDemandProducts = products.filter(p => p.totalQuantitySold > 100)
      if (highDemandProducts.length > 0) {
        insights.push({
          type: 'opportunity' as const,
          title: 'High Demand Products',
          description: `${highDemandProducts.length} products show strong demand. Consider increasing inventory or promotional focus.`,
          impact: 'medium' as const,
          actionable: true
        })
      }

      // Profit margin insights
      const lowMarginProducts = products.filter(p => p.profitMargin < 15)
      if (lowMarginProducts.length > 0) {
        insights.push({
          type: 'warning' as const,
          title: 'Low Profit Margins',
          description: `${lowMarginProducts.length} products have profit margins below 15%. Review pricing strategy.`,
          impact: 'medium' as const,
          actionable: true
        })
      }

      // Category performance
      const topCategory = categories[0]
      if (topCategory) {
        insights.push({
          type: 'info' as const,
          title: 'Top Performing Category',
          description: `${topCategory.categoryName} is your best performing category with ${topCategory.profitMargin.toFixed(1)}% profit margin.`,
          impact: 'low' as const,
          actionable: false
        })
      }

      // Generate recommendations
      const recommendations = []

      // Inventory recommendations
      const stockoutRisk = forecasts.filter(f => f.recommendedOrder > 0)
      if (stockoutRisk.length > 0) {
        recommendations.push({
          category: 'inventory' as const,
          title: 'Restock High-Demand Products',
          description: `Consider restocking ${stockoutRisk.length} products based on demand forecasting to avoid stockouts.`,
          priority: 'high' as const,
          estimatedImpact: 'Prevent potential revenue loss of $5,000-$15,000'
        })
      }

      // Pricing recommendations
      if (lowMarginProducts.length > 0) {
        recommendations.push({
          category: 'pricing' as const,
          title: 'Optimize Product Pricing',
          description: `Review pricing for ${lowMarginProducts.length} products with low profit margins. Consider price increases or cost reduction.`,
          priority: 'medium' as const,
          estimatedImpact: 'Potential profit increase of 5-10%'
        })
      }

      // Marketing recommendations
      if (highDemandProducts.length > 0) {
        recommendations.push({
          category: 'marketing' as const,
          title: 'Promote High-Demand Products',
          description: `Focus marketing efforts on ${highDemandProducts.length} high-performing products to maximize revenue.`,
          priority: 'medium' as const,
          estimatedImpact: 'Potential revenue increase of 8-12%'
        })
      }

      // Operations recommendations
      if (metrics.averageOrderValue < 50) {
        recommendations.push({
          category: 'operations' as const,
          title: 'Increase Average Order Value',
          description: 'Implement upselling strategies, bundle offers, or minimum order incentives to increase average order value.',
          priority: 'medium' as const,
          estimatedImpact: 'Potential revenue increase of 15-20%'
        })
      }

      const intelligence: BusinessIntelligence = {
        kpis,
        insights,
        recommendations
      }

      return {
        success: true,
        message: 'Business intelligence generated successfully',
        intelligence
      }
    } catch (error) {
      logger.error('Get business intelligence error:', error)
      return {
        success: false,
        message: 'An error occurred while generating business intelligence'
      }
    }
  }

  /**
   * Calculate trend direction from sales data
   */
  private static calculateTrend(salesArray: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (salesArray.length < 2) return 'stable'
    
    const firstHalf = salesArray.slice(0, Math.floor(salesArray.length / 2))
    const secondHalf = salesArray.slice(Math.floor(salesArray.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    
    if (changePercent > 10) return 'increasing'
    if (changePercent < -10) return 'decreasing'
    return 'stable'
  }

  /**
   * Calculate variance for confidence calculation
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Helper method to format date for filename
   */
  private static formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}