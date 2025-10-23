import { create } from 'zustand'
import { 
  FinancialDashboardService, 
  FinancialDashboardData,
  DateRange
} from '../services/financialDashboardService'

interface FinancialDashboardState {
  // Data
  dashboardData: FinancialDashboardData | null

  // Loading state
  isLoading: boolean

  // Error state
  error: string | null

  // Actions
  getDashboardData: (dateRange: DateRange) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useFinancialDashboardStore = create<FinancialDashboardState>((set) => ({
  // Initial state
  dashboardData: null,
  isLoading: false,
  error: null,

  // Actions
  getDashboardData: async (dateRange: DateRange) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await FinancialDashboardService.getDashboardData(dateRange)
      
      if (result.success && result.data) {
        set({ 
          dashboardData: result.data,
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
        error: 'Failed to load financial dashboard data',
        isLoading: false 
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set({
      dashboardData: null,
      isLoading: false,
      error: null
    })
  }
}))