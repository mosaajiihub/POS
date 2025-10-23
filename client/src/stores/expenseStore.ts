import { create } from 'zustand'
import { 
  ExpenseService, 
  Expense, 
  CreateExpenseData, 
  UpdateExpenseData, 
  ExpenseFilters,
  ExpenseReport
} from '../services/expenseService'

interface ExpenseState {
  // Data
  expenses: Expense[]
  currentExpense: Expense | null
  categories: string[]
  vendors: string[]
  expenseReport: ExpenseReport | null
  
  // Pagination
  total: number
  page: number
  limit: number

  // Loading states
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isLoadingCategories: boolean
  isLoadingVendors: boolean
  isGeneratingReport: boolean

  // Error state
  error: string | null

  // Actions
  getExpenses: (filters?: ExpenseFilters) => Promise<void>
  getExpense: (expenseId: string) => Promise<void>
  createExpense: (expenseData: CreateExpenseData) => Promise<boolean>
  updateExpense: (expenseId: string, updateData: UpdateExpenseData) => Promise<boolean>
  deleteExpense: (expenseId: string) => Promise<boolean>
  getExpenseCategories: () => Promise<void>
  getExpenseVendors: () => Promise<void>
  generateExpenseReport: (startDate: string, endDate: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  // Initial state
  expenses: [],
  currentExpense: null,
  categories: [],
  vendors: [],
  expenseReport: null,
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isLoadingCategories: false,
  isLoadingVendors: false,
  isGeneratingReport: false,
  error: null,

  // Actions
  getExpenses: async (filters?: ExpenseFilters) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await ExpenseService.getExpenses(filters)
      
      if (result.success && result.expenses) {
        set({ 
          expenses: result.expenses,
          total: result.total || 0,
          page: result.page || 1,
          limit: result.limit || 20,
          isLoading: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoading: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load expenses',
        isLoading: false 
      })
    }
  },

  getExpense: async (expenseId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await ExpenseService.getExpense(expenseId)
      
      if (result.success && result.expense) {
        set({ 
          currentExpense: result.expense,
          isLoading: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoading: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load expense',
        isLoading: false 
      })
    }
  },

  createExpense: async (expenseData: CreateExpenseData) => {
    set({ isCreating: true, error: null })
    
    try {
      const result = await ExpenseService.createExpense(expenseData)
      
      if (result.success && result.expense) {
        // Add new expense to the list
        const { expenses } = get()
        set({ 
          expenses: [result.expense, ...expenses],
          total: get().total + 1,
          isCreating: false 
        })
        return true
      } else {
        set({ 
          error: result.message,
          isCreating: false 
        })
        return false
      }
    } catch (error) {
      set({ 
        error: 'Failed to create expense',
        isCreating: false 
      })
      return false
    }
  },

  updateExpense: async (expenseId: string, updateData: UpdateExpenseData) => {
    set({ isUpdating: true, error: null })
    
    try {
      const result = await ExpenseService.updateExpense(expenseId, updateData)
      
      if (result.success && result.expense) {
        // Update expense in the list
        const { expenses } = get()
        const updatedExpenses = expenses.map(expense => 
          expense.id === expenseId ? result.expense! : expense
        )
        
        set({ 
          expenses: updatedExpenses,
          currentExpense: result.expense,
          isUpdating: false 
        })
        return true
      } else {
        set({ 
          error: result.message,
          isUpdating: false 
        })
        return false
      }
    } catch (error) {
      set({ 
        error: 'Failed to update expense',
        isUpdating: false 
      })
      return false
    }
  },

  deleteExpense: async (expenseId: string) => {
    set({ isDeleting: true, error: null })
    
    try {
      const result = await ExpenseService.deleteExpense(expenseId)
      
      if (result.success) {
        // Remove expense from the list
        const { expenses } = get()
        const filteredExpenses = expenses.filter(expense => expense.id !== expenseId)
        
        set({ 
          expenses: filteredExpenses,
          total: get().total - 1,
          isDeleting: false 
        })
        return true
      } else {
        set({ 
          error: result.message,
          isDeleting: false 
        })
        return false
      }
    } catch (error) {
      set({ 
        error: 'Failed to delete expense',
        isDeleting: false 
      })
      return false
    }
  },

  getExpenseCategories: async () => {
    set({ isLoadingCategories: true, error: null })
    
    try {
      const result = await ExpenseService.getExpenseCategories()
      
      if (result.success && result.categories) {
        set({ 
          categories: result.categories,
          isLoadingCategories: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingCategories: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load expense categories',
        isLoadingCategories: false 
      })
    }
  },

  getExpenseVendors: async () => {
    set({ isLoadingVendors: true, error: null })
    
    try {
      const result = await ExpenseService.getExpenseVendors()
      
      if (result.success && result.vendors) {
        set({ 
          vendors: result.vendors,
          isLoadingVendors: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingVendors: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load expense vendors',
        isLoadingVendors: false 
      })
    }
  },

  generateExpenseReport: async (startDate: string, endDate: string) => {
    set({ isGeneratingReport: true, error: null })
    
    try {
      const result = await ExpenseService.generateExpenseReport(startDate, endDate)
      
      if (result.success && result.report) {
        set({ 
          expenseReport: result.report,
          isGeneratingReport: false 
        })
      } else {
        set({ 
          error: result.message,
          isGeneratingReport: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to generate expense report',
        isGeneratingReport: false 
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set({
      expenses: [],
      currentExpense: null,
      categories: [],
      vendors: [],
      expenseReport: null,
      total: 0,
      page: 1,
      limit: 20,
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isLoadingCategories: false,
      isLoadingVendors: false,
      isGeneratingReport: false,
      error: null
    })
  }
}))