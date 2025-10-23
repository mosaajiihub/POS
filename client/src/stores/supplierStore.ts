import { create } from 'zustand'

export interface Supplier {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  paymentTerms?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
    purchaseOrders: number
  }
}

export interface SupplierPerformance {
  supplierId: string
  supplierName: string
  totalOrders: number
  totalValue: number
  averageOrderValue: number
  onTimeDeliveryRate: number
  qualityRating: number
  lastOrderDate?: Date
  topProducts: Array<{
    productId: string
    productName: string
    totalQuantity: number
    totalValue: number
  }>
}

interface SupplierStore {
  suppliers: Supplier[]
  selectedSupplier: Supplier | null
  supplierPerformance: SupplierPerformance | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchSuppliers: (filters?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
  fetchSupplier: (supplierId: string) => Promise<void>
  createSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | '_count'>) => Promise<void>
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<void>
  deleteSupplier: (supplierId: string) => Promise<void>
  fetchSupplierPerformance: (supplierId: string) => Promise<void>
  getActiveSuppliers: () => Promise<Supplier[]>
  clearSelectedSupplier: () => void
}

// Mock data for development - will be replaced with API calls
const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Coffee Beans Co.',
    contactPerson: 'John Smith',
    email: 'john@coffeebeans.com',
    phone: '+1234567890',
    address: '123 Coffee St',
    city: 'Seattle',
    postalCode: '98101',
    paymentTerms: 'Net 30',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    _count: {
      products: 15,
      purchaseOrders: 25
    }
  },
  {
    id: '2',
    name: 'Fresh Foods Ltd.',
    contactPerson: 'Sarah Johnson',
    email: 'sarah@freshfoods.com',
    phone: '+1234567891',
    address: '456 Fresh Ave',
    city: 'Portland',
    postalCode: '97201',
    paymentTerms: 'Net 15',
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    _count: {
      products: 8,
      purchaseOrders: 12
    }
  },
  {
    id: '3',
    name: 'Office Supplies Inc.',
    contactPerson: 'Mike Brown',
    email: 'mike@officesupplies.com',
    phone: '+1234567892',
    address: '789 Business Blvd',
    city: 'San Francisco',
    postalCode: '94102',
    paymentTerms: 'Net 45',
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    _count: {
      products: 22,
      purchaseOrders: 18
    }
  },
  {
    id: '4',
    name: 'Inactive Supplier',
    contactPerson: 'Jane Doe',
    email: 'jane@inactive.com',
    phone: '+1234567893',
    paymentTerms: 'Net 30',
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    _count: {
      products: 0,
      purchaseOrders: 5
    }
  }
]

const mockPerformance: SupplierPerformance = {
  supplierId: '1',
  supplierName: 'Coffee Beans Co.',
  totalOrders: 25,
  totalValue: 15750.00,
  averageOrderValue: 630.00,
  onTimeDeliveryRate: 92,
  qualityRating: 4.5,
  lastOrderDate: new Date('2024-01-20'),
  topProducts: [
    {
      productId: '1',
      productName: 'Coffee - Espresso',
      totalQuantity: 500,
      totalValue: 1250.00
    },
    {
      productId: '4',
      productName: 'Water Bottle',
      totalQuantity: 200,
      totalValue: 400.00
    }
  ]
}

export const useSupplierStore = create<SupplierStore>((set, get) => ({
  suppliers: [],
  selectedSupplier: null,
  supplierPerformance: null,
  isLoading: false,
  error: null,

  fetchSuppliers: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In a real app, this would be an API call
      let filteredSuppliers = [...mockSuppliers]
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredSuppliers = filteredSuppliers.filter(supplier =>
          supplier.name.toLowerCase().includes(searchTerm) ||
          supplier.contactPerson?.toLowerCase().includes(searchTerm) ||
          supplier.email?.toLowerCase().includes(searchTerm) ||
          supplier.phone?.includes(searchTerm)
        )
      }
      
      if (filters.isActive !== undefined) {
        filteredSuppliers = filteredSuppliers.filter(supplier => supplier.isActive === filters.isActive)
      }
      
      set({ 
        suppliers: filteredSuppliers, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch suppliers', 
        isLoading: false 
      })
    }
  },

  fetchSupplier: async (supplierId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const supplier = mockSuppliers.find(s => s.id === supplierId)
      if (!supplier) {
        throw new Error('Supplier not found')
      }
      
      set({ 
        selectedSupplier: supplier, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch supplier', 
        isLoading: false 
      })
    }
  },

  createSupplier: async (supplierData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newSupplier: Supplier = {
        ...supplierData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          products: 0,
          purchaseOrders: 0
        }
      }
      
      set(state => ({
        suppliers: [...state.suppliers, newSupplier],
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to create supplier', 
        isLoading: false 
      })
    }
  },

  updateSupplier: async (supplierId: string, updates: Partial<Supplier>) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        suppliers: state.suppliers.map(supplier =>
          supplier.id === supplierId 
            ? { ...supplier, ...updates, updatedAt: new Date() } 
            : supplier
        ),
        selectedSupplier: state.selectedSupplier?.id === supplierId 
          ? { ...state.selectedSupplier, ...updates, updatedAt: new Date() }
          : state.selectedSupplier,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to update supplier', 
        isLoading: false 
      })
    }
  },

  deleteSupplier: async (supplierId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        suppliers: state.suppliers.filter(supplier => supplier.id !== supplierId),
        selectedSupplier: state.selectedSupplier?.id === supplierId ? null : state.selectedSupplier,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to delete supplier', 
        isLoading: false 
      })
    }
  },

  fetchSupplierPerformance: async (supplierId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      set({ 
        supplierPerformance: mockPerformance, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch supplier performance', 
        isLoading: false 
      })
    }
  },

  getActiveSuppliers: async () => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 200))
      
      return mockSuppliers.filter(supplier => supplier.isActive)
    } catch (error) {
      throw new Error('Failed to fetch active suppliers')
    }
  },

  clearSelectedSupplier: () => {
    set({ selectedSupplier: null, supplierPerformance: null })
  }
}))