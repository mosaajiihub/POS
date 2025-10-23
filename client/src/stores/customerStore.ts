import { create } from 'zustand'

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  loyaltyPoints: number
  creditLimit: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  totalSpent?: number
  lastPurchase?: Date
  _count?: {
    sales: number
    invoices: number
  }
}

export interface CustomerAnalytics {
  totalSpent: number
  totalOrders: number
  averageOrderValue: number
  lastPurchaseDate?: Date
  loyaltyPointsEarned: number
  loyaltyPointsUsed: number
  favoriteProducts: Array<{
    productId: string
    productName: string
    totalQuantity: number
    totalSpent: number
  }>
}

export interface PurchaseHistoryItem {
  id: string
  transactionNumber: string
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    product: {
      id: string
      name: string
      sku: string
    }
  }>
  cashier: {
    id: string
    firstName: string
    lastName: string
  }
}

interface CustomerStore {
  customers: Customer[]
  selectedCustomer: Customer | null
  customerAnalytics: CustomerAnalytics | null
  purchaseHistory: PurchaseHistoryItem[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchCustomers: (filters?: {
    search?: string
    isActive?: boolean
    hasLoyaltyPoints?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
  fetchCustomer: (customerId: string) => Promise<void>
  createCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'loyaltyPoints' | '_count'>) => Promise<void>
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>
  deleteCustomer: (customerId: string) => Promise<void>
  fetchCustomerAnalytics: (customerId: string) => Promise<void>
  fetchPurchaseHistory: (customerId: string, page?: number, limit?: number) => Promise<void>
  updateLoyaltyPoints: (customerId: string, pointsChange: number, reason: string) => Promise<void>
  searchCustomers: (query: string, limit?: number) => Promise<Customer[]>
  clearSelectedCustomer: () => void
}

// Mock data for development - will be replaced with API calls
const mockCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    city: 'New York',
    postalCode: '10001',
    loyaltyPoints: 150,
    creditLimit: 500,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    totalSpent: 1250.75,
    lastPurchase: new Date('2024-01-20'),
    _count: {
      sales: 12,
      invoices: 3
    }
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567891',
    address: '456 Oak Ave',
    city: 'Los Angeles',
    postalCode: '90210',
    loyaltyPoints: 75,
    creditLimit: 300,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    totalSpent: 875.50,
    lastPurchase: new Date('2024-01-18'),
    _count: {
      sales: 8,
      invoices: 1
    }
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1234567892',
    address: '789 Pine St',
    city: 'Chicago',
    postalCode: '60601',
    loyaltyPoints: 200,
    creditLimit: 1000,
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    totalSpent: 2100.25,
    lastPurchase: new Date('2024-01-22'),
    _count: {
      sales: 18,
      invoices: 5
    }
  },
  {
    id: '4',
    firstName: 'Alice',
    lastName: 'Brown',
    email: 'alice.brown@example.com',
    phone: '+1234567893',
    loyaltyPoints: 25,
    creditLimit: 200,
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    totalSpent: 125.00,
    lastPurchase: new Date('2024-01-02'),
    _count: {
      sales: 2,
      invoices: 0
    }
  }
]

const mockAnalytics: CustomerAnalytics = {
  totalSpent: 1250.75,
  totalOrders: 12,
  averageOrderValue: 104.23,
  lastPurchaseDate: new Date('2024-01-20'),
  loyaltyPointsEarned: 125,
  loyaltyPointsUsed: 25,
  favoriteProducts: [
    {
      productId: '1',
      productName: 'Coffee - Espresso',
      totalQuantity: 24,
      totalSpent: 60.00
    },
    {
      productId: '2',
      productName: 'Sandwich - Club',
      totalQuantity: 8,
      totalSpent: 71.92
    }
  ]
}

const mockPurchaseHistory: PurchaseHistoryItem[] = [
  {
    id: '1',
    transactionNumber: 'TXN-001',
    totalAmount: 15.50,
    paymentMethod: 'CARD',
    paymentStatus: 'COMPLETED',
    createdAt: new Date('2024-01-20'),
    items: [
      {
        id: '1',
        quantity: 2,
        unitPrice: 2.50,
        totalPrice: 5.00,
        product: {
          id: '1',
          name: 'Coffee - Espresso',
          sku: 'BEV001'
        }
      },
      {
        id: '2',
        quantity: 1,
        unitPrice: 8.99,
        totalPrice: 8.99,
        product: {
          id: '2',
          name: 'Sandwich - Club',
          sku: 'FOOD001'
        }
      }
    ],
    cashier: {
      id: '1',
      firstName: 'Admin',
      lastName: 'User'
    }
  }
]

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  customerAnalytics: null,
  purchaseHistory: [],
  isLoading: false,
  error: null,

  fetchCustomers: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In a real app, this would be an API call
      let filteredCustomers = [...mockCustomers]
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.firstName.toLowerCase().includes(searchTerm) ||
          customer.lastName.toLowerCase().includes(searchTerm) ||
          customer.email?.toLowerCase().includes(searchTerm) ||
          customer.phone?.includes(searchTerm)
        )
      }
      
      if (filters.isActive !== undefined) {
        filteredCustomers = filteredCustomers.filter(customer => customer.isActive === filters.isActive)
      }
      
      if (filters.hasLoyaltyPoints) {
        filteredCustomers = filteredCustomers.filter(customer => customer.loyaltyPoints > 0)
      }
      
      set({ 
        customers: filteredCustomers, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch customers', 
        isLoading: false 
      })
    }
  },

  fetchCustomer: async (customerId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const customer = mockCustomers.find(c => c.id === customerId)
      if (!customer) {
        throw new Error('Customer not found')
      }
      
      set({ 
        selectedCustomer: customer, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch customer', 
        isLoading: false 
      })
    }
  },

  createCustomer: async (customerData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newCustomer: Customer = {
        ...customerData,
        id: Date.now().toString(),
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          sales: 0,
          invoices: 0
        }
      }
      
      set(state => ({
        customers: [...state.customers, newCustomer],
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to create customer', 
        isLoading: false 
      })
    }
  },

  updateCustomer: async (customerId: string, updates: Partial<Customer>) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        customers: state.customers.map(customer =>
          customer.id === customerId 
            ? { ...customer, ...updates, updatedAt: new Date() } 
            : customer
        ),
        selectedCustomer: state.selectedCustomer?.id === customerId 
          ? { ...state.selectedCustomer, ...updates, updatedAt: new Date() }
          : state.selectedCustomer,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to update customer', 
        isLoading: false 
      })
    }
  },

  deleteCustomer: async (customerId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        customers: state.customers.filter(customer => customer.id !== customerId),
        selectedCustomer: state.selectedCustomer?.id === customerId ? null : state.selectedCustomer,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to delete customer', 
        isLoading: false 
      })
    }
  },

  fetchCustomerAnalytics: async (customerId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      set({ 
        customerAnalytics: mockAnalytics, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch customer analytics', 
        isLoading: false 
      })
    }
  },

  fetchPurchaseHistory: async (customerId: string, page = 1, limit = 20) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      set({ 
        purchaseHistory: mockPurchaseHistory, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch purchase history', 
        isLoading: false 
      })
    }
  },

  updateLoyaltyPoints: async (customerId: string, pointsChange: number, reason: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      set(state => ({
        customers: state.customers.map(customer =>
          customer.id === customerId 
            ? { ...customer, loyaltyPoints: customer.loyaltyPoints + pointsChange, updatedAt: new Date() }
            : customer
        ),
        selectedCustomer: state.selectedCustomer?.id === customerId 
          ? { ...state.selectedCustomer, loyaltyPoints: state.selectedCustomer.loyaltyPoints + pointsChange, updatedAt: new Date() }
          : state.selectedCustomer,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to update loyalty points', 
        isLoading: false 
      })
    }
  },

  searchCustomers: async (query: string, limit = 10) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const searchTerm = query.toLowerCase()
      const results = mockCustomers
        .filter(customer =>
          customer.isActive &&
          (customer.firstName.toLowerCase().includes(searchTerm) ||
           customer.lastName.toLowerCase().includes(searchTerm) ||
           customer.email?.toLowerCase().includes(searchTerm) ||
           customer.phone?.includes(searchTerm))
        )
        .slice(0, limit)
      
      return results
    } catch (error) {
      throw new Error('Failed to search customers')
    }
  },

  clearSelectedCustomer: () => {
    set({ selectedCustomer: null, customerAnalytics: null, purchaseHistory: [] })
  }
}))