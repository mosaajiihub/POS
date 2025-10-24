import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface DateRange {
  startDate: string
  endDate: string
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

export interface AnalyticsFilters extends DateRange {
  categoryId?: string
  productId?: string
  customerId?: string
  cashierId?: string
  paymentMethod?: string
  groupBy?: 'day' | 'week' | 'month' | 'year'
  limit?: number
}

export interface ExportRequest {
  type: 'sales' | 'products' | 'categories' | 'profit'
  format: 'pdf' | 'excel' | 'csv'
  startDate: string
  endDate: string
  categoryId?: string
  productId?: string
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
 * Analytics API Service
 * Handles all analytics and reporting API calls
 */
export class AnalyticsService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Get sales metrics
   */
  static async getSalesMetrics(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    metrics?: SalesMetrics
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)
      if (filters.customerId) params.append('customerId', filters.customerId)
      if (filters.cashierId) params.append('cashierId', filters.cashierId)
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod)
      if (filters.groupBy) params.append('groupBy', filters.groupBy)

      const response = await axios.get(
        `${API_BASE_URL}/analytics/sales/metrics?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get sales metrics error:', error)
      return {
        success: false,
        message: 'Failed to retrieve sales metrics'
      }
    }
  }

  /**
   * Get product analytics
   */
  static async getProductAnalytics(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    products?: ProductAnalytics[]
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await axios.get(
        `${API_BASE_URL}/analytics/products?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get product analytics error:', error)
      return {
        success: false,
        message: 'Failed to retrieve product analytics'
      }
    }
  }

  /**
   * Get category analytics
   */
  static async getCategoryAnalytics(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    categories?: CategoryAnalytics[]
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await axios.get(
        `${API_BASE_URL}/analytics/categories?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get category analytics error:', error)
      return {
        success: false,
        message: 'Failed to retrieve category analytics'
      }
    }
  }

  /**
   * Get time series data for charts
   */
  static async getTimeSeriesData(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    timeSeries?: TimeSeriesData[]
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      params.append('groupBy', filters.groupBy || 'day')
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)

      const response = await axios.get(
        `${API_BASE_URL}/analytics/time-series?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get time series data error:', error)
      return {
        success: false,
        message: 'Failed to retrieve time series data'
      }
    }
  }

  /**
   * Get comprehensive profit analysis
   */
  static async getProfitAnalysis(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    analysis?: ProfitAnalysis
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)

      const response = await axios.get(
        `${API_BASE_URL}/analytics/profit-analysis?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get profit analysis error:', error)
      return {
        success: false,
        message: 'Failed to retrieve profit analysis'
      }
    }
  }

  /**
   * Export analytics data
   */
  static async exportData(request: ExportRequest): Promise<{
    success: boolean
    message: string
    data?: any
    filename?: string
    format?: string
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/analytics/export`,
        request,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Export data error:', error)
      return {
        success: false,
        message: 'Failed to export data'
      }
    }
  }

  /**
   * Get demand forecasting
   */
  static async getDemandForecast(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    forecasts?: DemandForecast[]
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)

      const response = await axios.get(
        `${API_BASE_URL}/analytics/demand-forecast?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get demand forecast error:', error)
      return {
        success: false,
        message: 'Failed to retrieve demand forecast'
      }
    }
  }

  /**
   * Get seasonal trends
   */
  static async getSeasonalTrends(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    trends?: SeasonalTrend[]
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)

      const response = await axios.get(
        `${API_BASE_URL}/analytics/seasonal-trends?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get seasonal trends error:', error)
      return {
        success: false,
        message: 'Failed to retrieve seasonal trends'
      }
    }
  }

  /**
   * Get business intelligence
   */
  static async getBusinessIntelligence(filters: AnalyticsFilters): Promise<{
    success: boolean
    message: string
    intelligence?: BusinessIntelligence
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', filters.startDate)
      params.append('endDate', filters.endDate)
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.productId) params.append('productId', filters.productId)

      const response = await axios.get(
        `${API_BASE_URL}/analytics/business-intelligence?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get business intelligence error:', error)
      return {
        success: false,
        message: 'Failed to retrieve business intelligence'
      }
    }
  }
}