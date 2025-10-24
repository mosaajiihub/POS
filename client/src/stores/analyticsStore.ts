import { create } from 'zustand'
import { 
  AnalyticsService, 
  SalesMetrics, 
  ProductAnalytics, 
  CategoryAnalytics, 
  TimeSeriesData, 
  ProfitAnalysis,
  AnalyticsFilters,
  ExportRequest,
  DemandForecast,
  SeasonalTrend,
  BusinessIntelligence
} from '../services/analyticsService'

interface AnalyticsState {
  // Data
  salesMetrics: SalesMetrics | null
  productAnalytics: ProductAnalytics[]
  categoryAnalytics: CategoryAnalytics[]
  timeSeriesData: TimeSeriesData[]
  profitAnalysis: ProfitAnalysis | null
  demandForecasts: DemandForecast[]
  seasonalTrends: SeasonalTrend[]
  businessIntelligence: BusinessIntelligence | null

  // Loading states
  isLoadingMetrics: boolean
  isLoadingProducts: boolean
  isLoadingCategories: boolean
  isLoadingTimeSeries: boolean
  isLoadingProfitAnalysis: boolean
  isLoadingForecasts: boolean
  isLoadingTrends: boolean
  isLoadingIntelligence: boolean
  isExporting: boolean

  // Error states
  error: string | null

  // Actions
  getSalesMetrics: (filters: AnalyticsFilters) => Promise<void>
  getProductAnalytics: (filters: AnalyticsFilters) => Promise<void>
  getCategoryAnalytics: (filters: AnalyticsFilters) => Promise<void>
  getTimeSeriesData: (filters: AnalyticsFilters) => Promise<void>
  getProfitAnalysis: (filters: AnalyticsFilters) => Promise<void>
  getDemandForecasts: (filters: AnalyticsFilters) => Promise<void>
  getSeasonalTrends: (filters: AnalyticsFilters) => Promise<void>
  getBusinessIntelligence: (filters: AnalyticsFilters) => Promise<void>
  exportData: (request: ExportRequest) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  salesMetrics: null,
  productAnalytics: [],
  categoryAnalytics: [],
  timeSeriesData: [],
  profitAnalysis: null,
  demandForecasts: [],
  seasonalTrends: [],
  businessIntelligence: null,
  isLoadingMetrics: false,
  isLoadingProducts: false,
  isLoadingCategories: false,
  isLoadingTimeSeries: false,
  isLoadingProfitAnalysis: false,
  isLoadingForecasts: false,
  isLoadingTrends: false,
  isLoadingIntelligence: false,
  isExporting: false,
  error: null,

  // Actions
  getSalesMetrics: async (filters: AnalyticsFilters) => {
    set({ isLoadingMetrics: true, error: null })
    
    try {
      const result = await AnalyticsService.getSalesMetrics(filters)
      
      if (result.success && result.metrics) {
        set({ 
          salesMetrics: result.metrics,
          isLoadingMetrics: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingMetrics: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load sales metrics',
        isLoadingMetrics: false 
      })
    }
  },

  getProductAnalytics: async (filters: AnalyticsFilters) => {
    set({ isLoadingProducts: true, error: null })
    
    try {
      const result = await AnalyticsService.getProductAnalytics(filters)
      
      if (result.success && result.products) {
        set({ 
          productAnalytics: result.products,
          isLoadingProducts: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingProducts: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load product analytics',
        isLoadingProducts: false 
      })
    }
  },

  getCategoryAnalytics: async (filters: AnalyticsFilters) => {
    set({ isLoadingCategories: true, error: null })
    
    try {
      const result = await AnalyticsService.getCategoryAnalytics(filters)
      
      if (result.success && result.categories) {
        set({ 
          categoryAnalytics: result.categories,
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
        error: 'Failed to load category analytics',
        isLoadingCategories: false 
      })
    }
  },

  getTimeSeriesData: async (filters: AnalyticsFilters) => {
    set({ isLoadingTimeSeries: true, error: null })
    
    try {
      const result = await AnalyticsService.getTimeSeriesData(filters)
      
      if (result.success && result.timeSeries) {
        set({ 
          timeSeriesData: result.timeSeries,
          isLoadingTimeSeries: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingTimeSeries: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load time series data',
        isLoadingTimeSeries: false 
      })
    }
  },

  getProfitAnalysis: async (filters: AnalyticsFilters) => {
    set({ isLoadingProfitAnalysis: true, error: null })
    
    try {
      const result = await AnalyticsService.getProfitAnalysis(filters)
      
      if (result.success && result.analysis) {
        set({ 
          profitAnalysis: result.analysis,
          isLoadingProfitAnalysis: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingProfitAnalysis: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load profit analysis',
        isLoadingProfitAnalysis: false 
      })
    }
  },

  getDemandForecasts: async (filters: AnalyticsFilters) => {
    set({ isLoadingForecasts: true, error: null })
    
    try {
      const result = await AnalyticsService.getDemandForecast(filters)
      
      if (result.success && result.forecasts) {
        set({ 
          demandForecasts: result.forecasts,
          isLoadingForecasts: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingForecasts: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load demand forecasts',
        isLoadingForecasts: false 
      })
    }
  },

  getSeasonalTrends: async (filters: AnalyticsFilters) => {
    set({ isLoadingTrends: true, error: null })
    
    try {
      const result = await AnalyticsService.getSeasonalTrends(filters)
      
      if (result.success && result.trends) {
        set({ 
          seasonalTrends: result.trends,
          isLoadingTrends: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingTrends: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load seasonal trends',
        isLoadingTrends: false 
      })
    }
  },

  getBusinessIntelligence: async (filters: AnalyticsFilters) => {
    set({ isLoadingIntelligence: true, error: null })
    
    try {
      const result = await AnalyticsService.getBusinessIntelligence(filters)
      
      if (result.success && result.intelligence) {
        set({ 
          businessIntelligence: result.intelligence,
          isLoadingIntelligence: false 
        })
      } else {
        set({ 
          error: result.message,
          isLoadingIntelligence: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to load business intelligence',
        isLoadingIntelligence: false 
      })
    }
  },

  exportData: async (request: ExportRequest) => {
    set({ isExporting: true, error: null })
    
    try {
      const result = await AnalyticsService.exportData(request)
      
      if (result.success) {
        // In a real implementation, you would handle file download here
        // For now, we'll just log the success
        console.log('Export successful:', result.filename)
        set({ isExporting: false })
      } else {
        set({ 
          error: result.message,
          isExporting: false 
        })
      }
    } catch (error) {
      set({ 
        error: 'Failed to export data',
        isExporting: false 
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set({
      salesMetrics: null,
      productAnalytics: [],
      categoryAnalytics: [],
      timeSeriesData: [],
      profitAnalysis: null,
      demandForecasts: [],
      seasonalTrends: [],
      businessIntelligence: null,
      isLoadingMetrics: false,
      isLoadingProducts: false,
      isLoadingCategories: false,
      isLoadingTimeSeries: false,
      isLoadingProfitAnalysis: false,
      isLoadingForecasts: false,
      isLoadingTrends: false,
      isLoadingIntelligence: false,
      isExporting: false,
      error: null
    })
  }
}))