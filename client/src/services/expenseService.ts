import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  vendor?: string
  receiptUrl?: string
  expenseDate: string
  createdAt: string
  updatedAt: string
}

export interface CreateExpenseData {
  description: string
  amount: number
  category: string
  vendor?: string
  receiptUrl?: string
  expenseDate: string
}

export interface UpdateExpenseData {
  description?: string
  amount?: number
  category?: string
  vendor?: string
  receiptUrl?: string
  expenseDate?: string
}

export interface ExpenseFilters {
  category?: string
  vendor?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  search?: string
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

/**
 * Expense API Service
 * Handles all expense management API calls
 */
export class ExpenseService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Create new expense
   */
  static async createExpense(expenseData: CreateExpenseData): Promise<{
    success: boolean
    message: string
    expense?: Expense
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/expenses`,
        expenseData,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Create expense error:', error)
      return {
        success: false,
        message: 'Failed to create expense'
      }
    }
  }

  /**
   * Update expense
   */
  static async updateExpense(expenseId: string, updateData: UpdateExpenseData): Promise<{
    success: boolean
    message: string
    expense?: Expense
  }> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/expenses/${expenseId}`,
        updateData,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Update expense error:', error)
      return {
        success: false,
        message: 'Failed to update expense'
      }
    }
  }

  /**
   * Get expense by ID
   */
  static async getExpense(expenseId: string): Promise<{
    success: boolean
    message: string
    expense?: Expense
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/expenses/${expenseId}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get expense error:', error)
      return {
        success: false,
        message: 'Failed to retrieve expense'
      }
    }
  }

  /**
   * Get expenses with filtering and pagination
   */
  static async getExpenses(filters: ExpenseFilters = {}): Promise<{
    success: boolean
    message: string
    expenses?: Expense[]
    total?: number
    page?: number
    limit?: number
  }> {
    try {
      const params = new URLSearchParams()
      
      if (filters.category) params.append('category', filters.category)
      if (filters.vendor) params.append('vendor', filters.vendor)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.minAmount !== undefined) params.append('minAmount', filters.minAmount.toString())
      if (filters.maxAmount !== undefined) params.append('maxAmount', filters.maxAmount.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await axios.get(
        `${API_BASE_URL}/expenses?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get expenses error:', error)
      return {
        success: false,
        message: 'Failed to retrieve expenses'
      }
    }
  }

  /**
   * Delete expense
   */
  static async deleteExpense(expenseId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/expenses/${expenseId}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Delete expense error:', error)
      return {
        success: false,
        message: 'Failed to delete expense'
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
      const response = await axios.get(
        `${API_BASE_URL}/expenses/system/categories`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get expense categories error:', error)
      return {
        success: false,
        message: 'Failed to retrieve expense categories'
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
      const response = await axios.get(
        `${API_BASE_URL}/expenses/system/vendors`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Get expense vendors error:', error)
      return {
        success: false,
        message: 'Failed to retrieve expense vendors'
      }
    }
  }

  /**
   * Generate expense report
   */
  static async generateExpenseReport(startDate: string, endDate: string): Promise<{
    success: boolean
    message: string
    report?: ExpenseReport
  }> {
    try {
      const params = new URLSearchParams()
      params.append('startDate', startDate)
      params.append('endDate', endDate)

      const response = await axios.get(
        `${API_BASE_URL}/expenses/reports/summary?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      )

      return response.data
    } catch (error) {
      console.error('Generate expense report error:', error)
      return {
        success: false,
        message: 'Failed to generate expense report'
      }
    }
  }
}