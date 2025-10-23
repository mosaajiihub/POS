import { Expense } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface CreateExpenseData {
  description: string
  amount: number
  category: string
  vendor?: string
  receiptUrl?: string
  expenseDate: Date
}

export interface UpdateExpenseData {
  description?: string
  amount?: number
  category?: string
  vendor?: string
  receiptUrl?: string
  expenseDate?: Date
}

export interface ExpenseFilters {
  category?: string
  vendor?: string
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
  search?: string
  page?: number
  limit?: number
}

export interface ExpenseResult {
  success: boolean
  message: string
  expense?: Expense
}

export interface ExpenseListResult {
  success: boolean
  message: string
  expenses?: Expense[]
  total?: number
  page?: number
  limit?: number
}

export interface ExpenseReport {
  totalExpenses: number
  totalAmount: number
  averageExpense: number
  expensesByCategory: {
    category: string
    count: number
    totalAmount: number
    percentage: number
  }[]
  expensesByVendor: {
    vendor: string
    count: number
    totalAmount: number
    percentage: number
  }[]
  monthlyTrend: {
    month: string
    totalAmount: number
    count: number
  }[]
}

export interface RecurringExpense {
  id: string
  description: string
  amount: number
  category: string
  vendor?: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  nextDueDate: Date
  isActive: boolean
}

/**
 * Expense Management Service
 * Handles expense CRUD operations, categorization, and reporting
 */
export class ExpenseService {
  /**
   * Create a new expense
   */
  static async createExpense(expenseData: CreateExpenseData): Promise<ExpenseResult> {
    try {
      const {
        description,
        amount,
        category,
        vendor,
        receiptUrl,
        expenseDate
      } = expenseData

      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          message: 'Expense amount must be greater than zero'
        }
      }

      // Validate expense date (not in the future)
      if (expenseDate > new Date()) {
        return {
          success: false,
          message: 'Expense date cannot be in the future'
        }
      }

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          description,
          amount,
          category,
          vendor,
          receiptUrl,
          expenseDate
        }
      })

      logger.info(`New expense created: ${expense.id} - ${expense.description}`)

      return {
        success: true,
        message: 'Expense created successfully',
        expense
      }
    } catch (error) {
      logger.error('Create expense error:', error)
      return {
        success: false,
        message: 'An error occurred while creating expense'
      }
    }
  }

  /**
   * Update expense
   */
  static async updateExpense(expenseId: string, updateData: UpdateExpenseData): Promise<ExpenseResult> {
    try {
      // Check if expense exists
      const existingExpense = await prisma.expense.findUnique({
        where: { id: expenseId }
      })

      if (!existingExpense) {
        return {
          success: false,
          message: 'Expense not found'
        }
      }

      // Validate amount if being updated
      if (updateData.amount !== undefined && updateData.amount <= 0) {
        return {
          success: false,
          message: 'Expense amount must be greater than zero'
        }
      }

      // Validate expense date if being updated
      if (updateData.expenseDate && updateData.expenseDate > new Date()) {
        return {
          success: false,
          message: 'Expense date cannot be in the future'
        }
      }

      // Update expense
      const expense = await prisma.expense.update({
        where: { id: expenseId },
        data: updateData
      })

      logger.info(`Expense updated: ${expenseId} - ${expense.description}`)

      return {
        success: true,
        message: 'Expense updated successfully',
        expense
      }
    } catch (error) {
      logger.error('Update expense error:', error)
      return {
        success: false,
        message: 'An error occurred while updating expense'
      }
    }
  }

  /**
   * Get expense by ID
   */
  static async getExpense(expenseId: string): Promise<ExpenseResult> {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId }
      })

      if (!expense) {
        return {
          success: false,
          message: 'Expense not found'
        }
      }

      return {
        success: true,
        message: 'Expense retrieved successfully',
        expense
      }
    } catch (error) {
      logger.error('Get expense error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving expense'
      }
    }
  }

  /**
   * Get expenses with filtering and pagination
   */
  static async getExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListResult> {
    try {
      const {
        category,
        vendor,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (category) {
        where.category = { contains: category, mode: 'insensitive' }
      }

      if (vendor) {
        where.vendor = { contains: vendor, mode: 'insensitive' }
      }

      if (startDate || endDate) {
        where.expenseDate = {}
        if (startDate) where.expenseDate.gte = startDate
        if (endDate) where.expenseDate.lte = endDate
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amount = {}
        if (minAmount !== undefined) where.amount.gte = minAmount
        if (maxAmount !== undefined) where.amount.lte = maxAmount
      }

      if (search) {
        where.OR = [
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { vendor: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get expenses and total count
      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          orderBy: { expenseDate: 'desc' },
          skip,
          take: limit
        }),
        prisma.expense.count({ where })
      ])

      return {
        success: true,
        message: 'Expenses retrieved successfully',
        expenses,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get expenses error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving expenses'
      }
    }
  }

  /**
   * Delete expense
   */
  static async deleteExpense(expenseId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if expense exists
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId }
      })

      if (!expense) {
        return {
          success: false,
          message: 'Expense not found'
        }
      }

      // Delete expense
      await prisma.expense.delete({
        where: { id: expenseId }
      })

      logger.info(`Expense deleted: ${expenseId}`)

      return {
        success: true,
        message: 'Expense deleted successfully'
      }
    } catch (error) {
      logger.error('Delete expense error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting expense'
      }
    }
  }

  /**
   * Get expense categories
   */
  static async getExpenseCategories(): Promise<{
    success: boolean
    message: string
    categories?: string[]
  }> {
    try {
      const categories = await prisma.expense.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' }
      })

      return {
        success: true,
        message: 'Expense categories retrieved successfully',
        categories: categories.map(c => c.category)
      }
    } catch (error) {
      logger.error('Get expense categories error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving expense categories'
      }
    }
  }

  /**
   * Get expense vendors
   */
  static async getExpenseVendors(): Promise<{
    success: boolean
    message: string
    vendors?: string[]
  }> {
    try {
      const vendors = await prisma.expense.findMany({
        select: { vendor: true },
        where: { vendor: { not: null } },
        distinct: ['vendor'],
        orderBy: { vendor: 'asc' }
      })

      return {
        success: true,
        message: 'Expense vendors retrieved successfully',
        vendors: vendors.map(v => v.vendor!).filter(Boolean)
      }
    } catch (error) {
      logger.error('Get expense vendors error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving expense vendors'
      }
    }
  }

  /**
   * Generate expense report
   */
  static async generateExpenseReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    success: boolean
    message: string
    report?: ExpenseReport
  }> {
    try {
      // Get expenses for the period
      const expenses = await prisma.expense.findMany({
        where: {
          expenseDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { expenseDate: 'desc' }
      })

      const totalExpenses = expenses.length
      const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
      const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0

      // Group by category
      const categoryMap = new Map<string, { count: number; totalAmount: number }>()
      expenses.forEach(expense => {
        const existing = categoryMap.get(expense.category)
        if (existing) {
          existing.count += 1
          existing.totalAmount += Number(expense.amount)
        } else {
          categoryMap.set(expense.category, {
            count: 1,
            totalAmount: Number(expense.amount)
          })
        }
      })

      const expensesByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.totalAmount,
        percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0
      })).sort((a, b) => b.totalAmount - a.totalAmount)

      // Group by vendor
      const vendorMap = new Map<string, { count: number; totalAmount: number }>()
      expenses.forEach(expense => {
        if (expense.vendor) {
          const existing = vendorMap.get(expense.vendor)
          if (existing) {
            existing.count += 1
            existing.totalAmount += Number(expense.amount)
          } else {
            vendorMap.set(expense.vendor, {
              count: 1,
              totalAmount: Number(expense.amount)
            })
          }
        }
      })

      const expensesByVendor = Array.from(vendorMap.entries()).map(([vendor, data]) => ({
        vendor,
        count: data.count,
        totalAmount: data.totalAmount,
        percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0
      })).sort((a, b) => b.totalAmount - a.totalAmount)

      // Group by month
      const monthMap = new Map<string, { totalAmount: number; count: number }>()
      expenses.forEach(expense => {
        const monthKey = expense.expenseDate.toISOString().substring(0, 7) // YYYY-MM
        const existing = monthMap.get(monthKey)
        if (existing) {
          existing.totalAmount += Number(expense.amount)
          existing.count += 1
        } else {
          monthMap.set(monthKey, {
            totalAmount: Number(expense.amount),
            count: 1
          })
        }
      })

      const monthlyTrend = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        totalAmount: data.totalAmount,
        count: data.count
      })).sort((a, b) => a.month.localeCompare(b.month))

      const report: ExpenseReport = {
        totalExpenses,
        totalAmount,
        averageExpense,
        expensesByCategory,
        expensesByVendor,
        monthlyTrend
      }

      return {
        success: true,
        message: 'Expense report generated successfully',
        report
      }
    } catch (error) {
      logger.error('Generate expense report error:', error)
      return {
        success: false,
        message: 'An error occurred while generating expense report'
      }
    }
  }
}