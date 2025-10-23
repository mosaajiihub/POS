import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AnalyticsService } from './analyticsService'
import { ExpenseService } from './expenseService'

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
  targetDate: Date
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
  startDate: Date
  endDate: Date
}

/**
 * Financial Dashboard Service
 * Provides comprehensive financial metrics and insights
 */
export class FinancialDashboardService {
  /**
   * Get comprehensive financial dashboard data
   */
  static async getDashboardData(dateRange: DateRange): Promise<{
    success: boolean
    message: string
    data?: FinancialDashboardData
  }> {
    try {
      const { startDate, endDate } = dateRange

      // Get sales analytics
      const salesResult = await AnalyticsService.getSalesMetrics({
        startDate,
        endDate
      })

      if (!salesResult.success || !salesResult.metrics) {
        return {
          success: false,
          message: 'Failed to retrieve sales data'
        }
      }

      // Get expense report
      const expenseResult = await ExpenseService.generateExpenseReport(startDate, endDate)

      if (!expenseResult.success || !expenseResult.report) {
        return {
          success: false,
          message: 'Failed to retrieve expense data'
        }
      }

      const salesMetrics = salesResult.metrics
      const expenseReport = expenseResult.report

      // Calculate financial metrics
      const metrics: FinancialMetrics = {
        totalRevenue: salesMetrics.totalRevenue,
        totalExpenses: expenseReport.totalAmount,
        netProfit: salesMetrics.totalRevenue - expenseReport.totalAmount,
        profitMargin: salesMetrics.totalRevenue > 0 
          ? ((salesMetrics.totalRevenue - expenseReport.totalAmount) / salesMetrics.totalRevenue) * 100 
          : 0,
        grossProfit: salesMetrics.totalProfit,
        grossMargin: salesMetrics.profitMargin,
        totalTransactions: salesMetrics.totalTransactions,
        averageOrderValue: salesMetrics.averageOrderValue,
        expenseRatio: salesMetrics.totalRevenue > 0 
          ? (expenseReport.totalAmount / salesMetrics.totalRevenue) * 100 
          : 0
      }

      // Get trends data
      const trends = await this.getFinancialTrends(dateRange)
      
      // Get cash flow data
      const cashFlow = await this.getCashFlowData(dateRange)

      // Get performance indicators
      const performanceIndicators = await this.getPerformanceIndicators(dateRange, metrics)

      // Get financial goals (mock data for now)
      const goals = await this.getFinancialGoals()

      // Get top expense categories
      const topExpenseCategories = expenseReport.expensesByCategory
        .slice(0, 5)
        .map(cat => ({
          category: cat.category,
          amount: cat.totalAmount,
          percentage: cat.percentage
        }))

      // Get revenue by category
      const categoryResult = await AnalyticsService.getCategoryAnalytics({
        startDate,
        endDate
      })

      const revenueByCategory = categoryResult.success && categoryResult.categories
        ? categoryResult.categories.slice(0, 5).map(cat => ({
            category: cat.categoryName,
            amount: cat.totalRevenue,
            percentage: salesMetrics.totalRevenue > 0 
              ? (cat.totalRevenue / salesMetrics.totalRevenue) * 100 
              : 0
          }))
        : []

      const dashboardData: FinancialDashboardData = {
        metrics,
        trends,
        cashFlow,
        performanceIndicators,
        goals,
        topExpenseCategories,
        revenueByCategory
      }

      return {
        success: true,
        message: 'Financial dashboard data retrieved successfully',
        data: dashboardData
      }
    } catch (error) {
      logger.error('Get financial dashboard data error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving financial dashboard data'
      }
    }
  }

  /**
   * Get financial trends over time
   */
  private static async getFinancialTrends(dateRange: DateRange): Promise<FinancialTrend[]> {
    try {
      // Get monthly trends for the date range
      const { startDate, endDate } = dateRange
      
      // Get sales by month
      const salesByMonth = await prisma.sale.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'COMPLETED'
        },
        _sum: {
          totalAmount: true
        }
      })

      // Get expenses by month
      const expensesByMonth = await prisma.expense.groupBy({
        by: ['expenseDate'],
        where: {
          expenseDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      })

      // Group by month and calculate trends
      const monthlyData = new Map<string, { revenue: number; expenses: number }>()

      // Process sales data
      salesByMonth.forEach(sale => {
        const monthKey = sale.createdAt.toISOString().substring(0, 7) // YYYY-MM
        const existing = monthlyData.get(monthKey)
        const revenue = Number(sale._sum.totalAmount || 0)
        
        if (existing) {
          existing.revenue += revenue
        } else {
          monthlyData.set(monthKey, { revenue, expenses: 0 })
        }
      })

      // Process expense data
      expensesByMonth.forEach(expense => {
        const monthKey = expense.expenseDate.toISOString().substring(0, 7) // YYYY-MM
        const existing = monthlyData.get(monthKey)
        const expenses = Number(expense._sum.amount || 0)
        
        if (existing) {
          existing.expenses += expenses
        } else {
          monthlyData.set(monthKey, { revenue: 0, expenses })
        }
      })

      // Convert to trends array
      const trends: FinancialTrend[] = Array.from(monthlyData.entries())
        .map(([period, data]) => ({
          period,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
          profitMargin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0
        }))
        .sort((a, b) => a.period.localeCompare(b.period))

      return trends
    } catch (error) {
      logger.error('Get financial trends error:', error)
      return []
    }
  }

  /**
   * Get cash flow data
   */
  private static async getCashFlowData(dateRange: DateRange): Promise<CashFlowData[]> {
    try {
      const { startDate, endDate } = dateRange

      // Get daily cash flow data
      const dailyData = new Map<string, { cashIn: number; cashOut: number }>()

      // Get sales (cash in)
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'COMPLETED'
        },
        select: {
          createdAt: true,
          totalAmount: true
        }
      })

      sales.forEach(sale => {
        const dateKey = sale.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
        const existing = dailyData.get(dateKey)
        const amount = Number(sale.totalAmount)
        
        if (existing) {
          existing.cashIn += amount
        } else {
          dailyData.set(dateKey, { cashIn: amount, cashOut: 0 })
        }
      })

      // Get expenses (cash out)
      const expenses = await prisma.expense.findMany({
        where: {
          expenseDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          expenseDate: true,
          amount: true
        }
      })

      expenses.forEach(expense => {
        const dateKey = expense.expenseDate.toISOString().split('T')[0] // YYYY-MM-DD
        const existing = dailyData.get(dateKey)
        const amount = Number(expense.amount)
        
        if (existing) {
          existing.cashOut += amount
        } else {
          dailyData.set(dateKey, { cashIn: 0, cashOut: amount })
        }
      })

      // Convert to cash flow array with running balance
      let runningBalance = 0
      const cashFlow: CashFlowData[] = Array.from(dailyData.entries())
        .map(([date, data]) => {
          const netCashFlow = data.cashIn - data.cashOut
          runningBalance += netCashFlow
          
          return {
            date,
            cashIn: data.cashIn,
            cashOut: data.cashOut,
            netCashFlow,
            runningBalance
          }
        })
        .sort((a, b) => a.date.localeCompare(b.date))

      return cashFlow
    } catch (error) {
      logger.error('Get cash flow data error:', error)
      return []
    }
  }

  /**
   * Get performance indicators
   */
  private static async getPerformanceIndicators(
    dateRange: DateRange, 
    currentMetrics: FinancialMetrics
  ): Promise<PerformanceIndicator[]> {
    try {
      // Get previous period metrics for comparison
      const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime()
      const previousStartDate = new Date(dateRange.startDate.getTime() - periodLength)
      const previousEndDate = new Date(dateRange.startDate.getTime() - 1)

      const previousSalesResult = await AnalyticsService.getSalesMetrics({
        startDate: previousStartDate,
        endDate: previousEndDate
      })

      const previousExpenseResult = await ExpenseService.generateExpenseReport(
        previousStartDate, 
        previousEndDate
      )

      const indicators: PerformanceIndicator[] = []

      if (previousSalesResult.success && previousSalesResult.metrics) {
        const prevMetrics = previousSalesResult.metrics
        const prevExpenses = previousExpenseResult.success && previousExpenseResult.report 
          ? previousExpenseResult.report.totalAmount 
          : 0

        // Revenue growth
        const revenueGrowth = prevMetrics.totalRevenue > 0 
          ? ((currentMetrics.totalRevenue - prevMetrics.totalRevenue) / prevMetrics.totalRevenue) * 100 
          : 0

        indicators.push({
          name: 'Revenue Growth',
          value: revenueGrowth,
          trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
          trendPercentage: Math.abs(revenueGrowth),
          status: revenueGrowth >= 10 ? 'good' : revenueGrowth >= 0 ? 'warning' : 'critical',
          unit: 'percentage'
        })

        // Profit margin
        indicators.push({
          name: 'Net Profit Margin',
          value: currentMetrics.profitMargin,
          target: 20, // 20% target
          trend: currentMetrics.profitMargin > (prevMetrics.totalRevenue > 0 
            ? ((prevMetrics.totalRevenue - prevExpenses) / prevMetrics.totalRevenue) * 100 
            : 0) ? 'up' : 'down',
          trendPercentage: Math.abs(currentMetrics.profitMargin - (prevMetrics.totalRevenue > 0 
            ? ((prevMetrics.totalRevenue - prevExpenses) / prevMetrics.totalRevenue) * 100 
            : 0)),
          status: currentMetrics.profitMargin >= 20 ? 'good' : currentMetrics.profitMargin >= 10 ? 'warning' : 'critical',
          unit: 'percentage'
        })

        // Expense ratio
        indicators.push({
          name: 'Expense Ratio',
          value: currentMetrics.expenseRatio,
          target: 70, // Keep expenses below 70% of revenue
          trend: currentMetrics.expenseRatio < (prevMetrics.totalRevenue > 0 
            ? (prevExpenses / prevMetrics.totalRevenue) * 100 
            : 0) ? 'down' : 'up',
          trendPercentage: Math.abs(currentMetrics.expenseRatio - (prevMetrics.totalRevenue > 0 
            ? (prevExpenses / prevMetrics.totalRevenue) * 100 
            : 0)),
          status: currentMetrics.expenseRatio <= 70 ? 'good' : currentMetrics.expenseRatio <= 80 ? 'warning' : 'critical',
          unit: 'percentage'
        })

        // Average order value
        const prevAOV = prevMetrics.averageOrderValue
        const aovGrowth = prevAOV > 0 ? ((currentMetrics.averageOrderValue - prevAOV) / prevAOV) * 100 : 0

        indicators.push({
          name: 'Average Order Value',
          value: currentMetrics.averageOrderValue,
          trend: aovGrowth > 0 ? 'up' : aovGrowth < 0 ? 'down' : 'stable',
          trendPercentage: Math.abs(aovGrowth),
          status: aovGrowth >= 5 ? 'good' : aovGrowth >= 0 ? 'warning' : 'critical',
          unit: 'currency'
        })
      }

      return indicators
    } catch (error) {
      logger.error('Get performance indicators error:', error)
      return []
    }
  }

  /**
   * Get financial goals (mock implementation)
   */
  private static async getFinancialGoals(): Promise<FinancialGoal[]> {
    // In a real implementation, this would fetch from a goals table
    // For now, return mock data
    return [
      {
        id: '1',
        name: 'Monthly Revenue Target',
        targetAmount: 50000,
        currentAmount: 42500,
        targetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        category: 'revenue',
        progress: 85,
        status: 'on_track'
      },
      {
        id: '2',
        name: 'Quarterly Profit Goal',
        targetAmount: 15000,
        currentAmount: 8200,
        targetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0),
        category: 'profit',
        progress: 55,
        status: 'behind'
      }
    ]
  }
}