import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface FinancialMetrics {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  grossProfit: number
  grossMargin: number
  totalTransactions: number
  averageOrderValue: number
  expenseRatio: number
}

export interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: 'revenue' | 'profit' | 'expenses' | 'custom'
  progress: number
  status: 'on_track' | 'behind' | 'achieved' | 'overdue'
}

export interface PerformanceIndicator {
  name: string
  value: number
  target?: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  status: 'good' | 'warning' | 'critical'
  unit: 'currency' | 'percentage' | 'number'
}

export interface FinancialTrend {
  period: string
  revenue: number
  expenses: number
  profit: number
  profitMargin: number
}

export interface CashFlowData {
  date: string
  cashIn: number
  cashOut: number
  netCashFlow: number
  runningBalance: number
}

export interface FinancialDashboardData {
  metrics: FinancialMetrics
  trends: FinancialTrend[]
  cashFlow: CashFlowData[]
  performanceIndicators: PerformanceIndicator[]
  goals: FinancialGoal[]
  topExpenseCategories: {
    category: string
    amount: number
    percentage: number
  }[]
  revenueByCategory: {
    category: string
    amount: number
    percentage: number
  }[]
}

export interface DateRange {
  startDate: string
  endDate: string
}

/**
 * Financial Dashboard API Service
 * Handles comprehensive financial dashboard API calls
 */
export class FinancialDashboardService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Get comprehensive financial dashboard data
   */
  static async getDashboardData(dateRange: DateRange): Promise<{
    success: boolean
    message: string
    data?: FinancialDashboardData
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', dateRange.startDate)
      params.append('endDate', dateRange.endDate)

      const response = await axios.get(
        `${API_BASE_URL}/financial-dashboard/overview?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get financial dashboard data error:', error)
      return {
        success: false,
        message: 'Failed to retrieve financial dashboard data'
      }
    }
  }
}