/**
 * API Service - Centralized API communication layer
 * Handles all HTTP requests to the backend API
 */

interface ApiResponse<T = any> {
  success?: boolean
  message?: string
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

interface ApiError {
  code: string
  message: string
  details?: any
}

class ApiService {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor() {
    // Use Vite's environment variables instead of process.env
    this.baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType && contentType.includes('application/json')
    
    let data: any
    if (isJson) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      const error: ApiError = {
        code: data.error?.code || 'HTTP_ERROR',
        message: data.error?.message || data.message || `HTTP ${response.status}`,
        details: data.error?.details || data
      }
      throw error
    }

    return data
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeaders(),
      ...options.headers
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw {
          code: 'NETWORK_ERROR',
          message: 'Network error - please check your connection'
        }
      }
      throw error
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders()
      }
    })

    return await this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    })
  }

  // File upload
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    const headers = this.getAuthHeaders()
    // Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    })

    return await this.handleResponse<T>(response)
  }
}

// Create singleton instance
export const apiService = new ApiService()

// Product API endpoints
export const productApi = {
  getProducts: (filters?: {
    categoryId?: string
    supplierId?: string
    search?: string
    isActive?: boolean
    lowStock?: boolean
    page?: number
    limit?: number
  }) => apiService.get('/products', filters),

  getProduct: (id: string) => apiService.get(`/products/${id}`),

  createProduct: (data: {
    name: string
    description?: string
    sku: string
    barcode?: string
    costPrice: number
    sellingPrice: number
    wholesalePrice?: number
    stockLevel?: number
    minStockLevel?: number
    taxRate?: number
    categoryId: string
    supplierId: string
  }) => apiService.post('/products', data),

  updateProduct: (id: string, data: Partial<{
    name: string
    description: string
    sku: string
    barcode: string
    costPrice: number
    sellingPrice: number
    wholesalePrice: number
    stockLevel: number
    minStockLevel: number
    taxRate: number
    categoryId: string
    supplierId: string
    isActive: boolean
  }>) => apiService.put(`/products/${id}`, data),

  deleteProduct: (id: string) => apiService.delete(`/products/${id}`),

  getProductByBarcode: (barcode: string) => apiService.get(`/products/barcode/${barcode}`),

  getLowStockProducts: () => apiService.get('/products/low-stock')
}

// Stock API endpoints
export const stockApi = {
  getStockMovements: (filters?: {
    productId?: string
    type?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }) => apiService.get('/stock/movements', filters),

  adjustStock: (productId: string, data: {
    newStockLevel: number
    reason: string
  }) => apiService.post(`/stock/adjust/${productId}`, data),

  updateStock: (data: {
    productId: string
    quantity: number
    type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE'
    reason?: string
  }) => apiService.post('/stock/update', data),

  getLowStockAlerts: () => apiService.get('/stock/alerts'),

  generateStockReport: (days?: number) => apiService.get('/stock/report', { days }),

  updateStockThresholds: (productId: string, data: {
    minStockLevel: number
  }) => apiService.put(`/stock/thresholds/${productId}`, data),

  processSale: (saleItems: Array<{
    productId: string
    quantity: number
  }>) => apiService.post('/stock/process-sale', { saleItems })
}

// Analytics API endpoints
export const analyticsApi = {
  getDashboardMetrics: () => apiService.get('/analytics/dashboard'),
  
  getSalesAnalytics: (filters?: {
    startDate?: Date
    endDate?: Date
    groupBy?: 'day' | 'week' | 'month'
  }) => apiService.get('/analytics/sales', filters),

  getProductAnalytics: (filters?: {
    startDate?: Date
    endDate?: Date
    categoryId?: string
  }) => apiService.get('/analytics/products', filters),

  getCustomerAnalytics: (filters?: {
    startDate?: Date
    endDate?: Date
  }) => apiService.get('/analytics/customers', filters),

  getProfitAnalysis: (filters?: {
    startDate?: Date
    endDate?: Date
    groupBy?: 'day' | 'week' | 'month'
  }) => apiService.get('/analytics/profit', filters)
}

// Transaction API endpoints (assuming these exist)
export const transactionApi = {
  getTransactions: (filters?: {
    startDate?: Date
    endDate?: Date
    customerId?: string
    status?: string
    page?: number
    limit?: number
  }) => apiService.get('/transactions', filters),

  getTransaction: (id: string) => apiService.get(`/transactions/${id}`),

  createTransaction: (data: {
    customerId?: string
    items: Array<{
      productId: string
      quantity: number
      unitPrice: number
    }>
    paymentMethod: {
      type: 'cash' | 'card' | 'digital'
      details?: any
    }
    cashReceived?: number
  }) => apiService.post('/transactions', data),

  voidTransaction: (id: string, data: {
    reason: string
  }) => apiService.post(`/transactions/${id}/void`, data),

  processRefund: (id: string, data: {
    items: Array<{
      productId: string
      quantity: number
      refundAmount: number
    }>
    reason: string
  }) => apiService.post(`/transactions/${id}/refund`, data)
}

// Customer API endpoints
export const customerApi = {
  getCustomers: (filters?: {
    search?: string
    page?: number
    limit?: number
  }) => apiService.get('/customers', filters),

  getCustomer: (id: string) => apiService.get(`/customers/${id}`),

  createCustomer: (data: {
    name: string
    email?: string
    phone?: string
    address?: string
  }) => apiService.post('/customers', data),

  updateCustomer: (id: string, data: Partial<{
    name: string
    email: string
    phone: string
    address: string
  }>) => apiService.put(`/customers/${id}`, data),

  deleteCustomer: (id: string) => apiService.delete(`/customers/${id}`)
}

export default apiService