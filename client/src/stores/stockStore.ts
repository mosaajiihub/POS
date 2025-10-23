import { create } from 'zustand'

export interface StockMovement {
  id: string
  productId: string
  type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'
  quantity: number
  previousStock: number
  newStock: number
  reason?: string
  createdAt: Date
  product: {
    id: string
    name: string
    sku: string
    category: {
      name: string
    }
    supplier: {
      name: string
    }
  }
}

export interface LowStockAlert {
  product: {
    id: string
    name: string
    sku: string
    stockLevel: number
    minStockLevel: number
    category: {
      name: string
    }
    supplier: {
      name: string
    }
  }
  currentStock: number
  minStockLevel: number
  alertThreshold: number
  severity: 'low' | 'critical' | 'out_of_stock'
}

export interface StockReport {
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalStockValue: number
  recentMovements: StockMovement[]
  topMovingProducts: Array<{
    product: {
      id: string
      name: string
      sku: string
    }
    totalMovements: number
    netChange: number
  }>
}

export interface StockFilters {
  productId?: string
  type?: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

interface StockStore {
  // State
  movements: StockMovement[]
  alerts: LowStockAlert[]
  report: StockReport | null
  isLoading: boolean
  error: string | null
  
  // Pagination
  currentPage: number
  totalPages: number
  totalMovements: number
  
  // Actions
  fetchStockMovements: (filters?: StockFilters) => Promise<void>
  fetchLowStockAlerts: () => Promise<void>
  generateStockReport: (days?: number) => Promise<void>
  adjustStock: (productId: string, newStockLevel: number, reason: string) => Promise<boolean>
  updateStockThresholds: (productId: string, minStockLevel: number) => Promise<boolean>
  processSale: (saleItems: Array<{ productId: string; quantity: number }>) => Promise<boolean>
  
  // Real-time updates
  addStockMovement: (movement: StockMovement) => void
  updateProductStock: (productId: string, newStock: number) => void
  
  // Utility functions
  getMovementsByProduct: (productId: string) => StockMovement[]
  getAlertsBySeverity: (severity: 'low' | 'critical' | 'out_of_stock') => LowStockAlert[]
  clearError: () => void
}

// Mock API functions - in a real app, these would be actual API calls
const mockApi = {
  async fetchMovements(filters: StockFilters = {}) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock data
    const movements: StockMovement[] = [
      {
        id: '1',
        productId: '1',
        type: 'SALE',
        quantity: 5,
        previousStock: 100,
        newStock: 95,
        reason: 'POS Sale',
        createdAt: new Date(),
        product: {
          id: '1',
          name: 'Coffee - Espresso',
          sku: 'BEV001',
          category: { name: 'Beverages' },
          supplier: { name: 'Coffee Suppliers Inc' }
        }
      },
      {
        id: '2',
        productId: '2',
        type: 'PURCHASE',
        quantity: 50,
        previousStock: 25,
        newStock: 75,
        reason: 'Stock replenishment',
        createdAt: new Date(Date.now() - 3600000),
        product: {
          id: '2',
          name: 'Sandwich - Club',
          sku: 'FOOD001',
          category: { name: 'Food' },
          supplier: { name: 'Fresh Foods Ltd' }
        }
      },
      {
        id: '3',
        productId: '3',
        type: 'ADJUSTMENT',
        quantity: 2,
        previousStock: 50,
        newStock: 48,
        reason: 'Damaged items removed',
        createdAt: new Date(Date.now() - 7200000),
        product: {
          id: '3',
          name: 'Notebook - A4',
          sku: 'STAT001',
          category: { name: 'Stationery' },
          supplier: { name: 'Office Supplies Co' }
        }
      }
    ]
    
    return {
      movements,
      total: movements.length,
      page: filters.page || 1,
      limit: filters.limit || 50
    }
  },

  async fetchAlerts() {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const alerts: LowStockAlert[] = [
      {
        product: {
          id: '6',
          name: 'Croissant',
          sku: 'FOOD002',
          stockLevel: 3,
          minStockLevel: 5,
          category: { name: 'Food' },
          supplier: { name: 'Fresh Foods Ltd' }
        },
        currentStock: 3,
        minStockLevel: 5,
        alertThreshold: 8,
        severity: 'critical'
      },
      {
        product: {
          id: '4',
          name: 'Water Bottle',
          sku: 'BEV002',
          stockLevel: 20,
          minStockLevel: 25,
          category: { name: 'Beverages' },
          supplier: { name: 'Beverage Distributors' }
        },
        currentStock: 20,
        minStockLevel: 25,
        alertThreshold: 38,
        severity: 'low'
      }
    ]
    
    return alerts
  },

  async generateReport(days: number = 30) {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const report: StockReport = {
      totalProducts: 150,
      lowStockProducts: 12,
      outOfStockProducts: 3,
      totalStockValue: 25430.50,
      recentMovements: [
        {
          id: '1',
          productId: '1',
          type: 'SALE',
          quantity: 5,
          previousStock: 100,
          newStock: 95,
          reason: 'POS Sale',
          createdAt: new Date(),
          product: {
            id: '1',
            name: 'Coffee - Espresso',
            sku: 'BEV001',
            category: { name: 'Beverages' },
            supplier: { name: 'Coffee Suppliers Inc' }
          }
        }
      ],
      topMovingProducts: [
        {
          product: {
            id: '1',
            name: 'Coffee - Espresso',
            sku: 'BEV001'
          },
          totalMovements: 45,
          netChange: -120
        },
        {
          product: {
            id: '2',
            name: 'Sandwich - Club',
            sku: 'FOOD001'
          },
          totalMovements: 32,
          netChange: -85
        }
      ]
    }
    
    return report
  },

  async adjustStock(productId: string, newStockLevel: number, reason: string) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true }
  },

  async updateThresholds(productId: string, minStockLevel: number) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { success: true }
  },

  async processSale(saleItems: Array<{ productId: string; quantity: number }>) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { success: true }
  }
}

export const useStockStore = create<StockStore>((set, get) => ({
  // Initial state
  movements: [],
  alerts: [],
  report: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  totalMovements: 0,

  // Fetch stock movements with filtering
  fetchStockMovements: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await mockApi.fetchMovements(filters)
      
      set({
        movements: result.movements,
        totalMovements: result.total,
        currentPage: result.page,
        totalPages: Math.ceil(result.total / result.limit),
        isLoading: false
      })
    } catch (error) {
      set({
        error: 'Failed to fetch stock movements',
        isLoading: false
      })
    }
  },

  // Fetch low stock alerts
  fetchLowStockAlerts: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const alerts = await mockApi.fetchAlerts()
      
      set({
        alerts,
        isLoading: false
      })
    } catch (error) {
      set({
        error: 'Failed to fetch low stock alerts',
        isLoading: false
      })
    }
  },

  // Generate comprehensive stock report
  generateStockReport: async (days = 30) => {
    set({ isLoading: true, error: null })
    
    try {
      const report = await mockApi.generateReport(days)
      
      set({
        report,
        isLoading: false
      })
    } catch (error) {
      set({
        error: 'Failed to generate stock report',
        isLoading: false
      })
    }
  },

  // Adjust stock level for a product
  adjustStock: async (productId: string, newStockLevel: number, reason: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await mockApi.adjustStock(productId, newStockLevel, reason)
      
      if (result.success) {
        // Refresh movements to show the new adjustment
        await get().fetchStockMovements()
        
        // Update alerts in case this adjustment affects low stock status
        await get().fetchLowStockAlerts()
        
        set({ isLoading: false })
        return true
      } else {
        throw new Error('Stock adjustment failed')
      }
    } catch (error) {
      set({
        error: 'Failed to adjust stock',
        isLoading: false
      })
      return false
    }
  },

  // Update stock thresholds for a product
  updateStockThresholds: async (productId: string, minStockLevel: number) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await mockApi.updateThresholds(productId, minStockLevel)
      
      if (result.success) {
        // Refresh alerts to reflect new thresholds
        await get().fetchLowStockAlerts()
        
        set({ isLoading: false })
        return true
      } else {
        throw new Error('Threshold update failed')
      }
    } catch (error) {
      set({
        error: 'Failed to update stock thresholds',
        isLoading: false
      })
      return false
    }
  },

  // Process sale and update stock
  processSale: async (saleItems: Array<{ productId: string; quantity: number }>) => {
    try {
      const result = await mockApi.processSale(saleItems)
      
      if (result.success) {
        // Add stock movements for each sale item
        const newMovements = saleItems.map((item, index) => ({
          id: `sale-${Date.now()}-${index}`,
          productId: item.productId,
          type: 'SALE' as const,
          quantity: item.quantity,
          previousStock: 0, // Would be fetched from API
          newStock: 0, // Would be calculated
          reason: 'POS Sale',
          createdAt: new Date(),
          product: {
            id: item.productId,
            name: 'Product Name', // Would be fetched from API
            sku: 'SKU',
            category: { name: 'Category' },
            supplier: { name: 'Supplier' }
          }
        }))
        
        set(state => ({
          movements: [...newMovements, ...state.movements]
        }))
        
        // Refresh alerts in case sale created low stock situations
        await get().fetchLowStockAlerts()
        
        return true
      } else {
        throw new Error('Sale processing failed')
      }
    } catch (error) {
      set({ error: 'Failed to process sale' })
      return false
    }
  },

  // Add a new stock movement (for real-time updates)
  addStockMovement: (movement: StockMovement) => {
    set(state => ({
      movements: [movement, ...state.movements]
    }))
  },

  // Update product stock level (for real-time updates)
  updateProductStock: (productId: string, newStock: number) => {
    set(state => ({
      alerts: state.alerts.map(alert => 
        alert.product.id === productId 
          ? { ...alert, currentStock: newStock }
          : alert
      )
    }))
  },

  // Get movements for a specific product
  getMovementsByProduct: (productId: string) => {
    return get().movements.filter(movement => movement.productId === productId)
  },

  // Get alerts by severity level
  getAlertsBySeverity: (severity: 'low' | 'critical' | 'out_of_stock') => {
    return get().alerts.filter(alert => alert.severity === severity)
  },

  // Clear error state
  clearError: () => {
    set({ error: null })
  }
}))