import { create } from 'zustand'
import { Product } from '../pages/POS'

export interface ExtendedProduct extends Product {
  description?: string
  costPrice: number
  wholesalePrice?: number
  minStockLevel: number
  categoryId: string
  supplierId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface ProductStore {
  products: ExtendedProduct[]
  categories: string[]
  isLoading: boolean
  error: string | null
  fetchProducts: () => Promise<void>
  findProductByBarcode: (barcode: string) => ExtendedProduct | null
  searchProducts: (query: string) => ExtendedProduct[]
  addProduct: (product: Omit<ExtendedProduct, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProduct: (id: string, updates: Partial<ExtendedProduct>) => void
  deleteProduct: (id: string) => void
}

// Mock data for development - will be replaced with API calls
const mockProducts: ExtendedProduct[] = [
  {
    id: '1',
    name: 'Coffee - Espresso',
    description: 'Premium espresso coffee blend',
    price: 2.50,
    costPrice: 1.20,
    wholesalePrice: 2.00,
    category: 'Beverages',
    sku: 'BEV001',
    barcode: '1234567890123',
    stockLevel: 100,
    minStockLevel: 20,
    taxRate: 0.08,
    categoryId: '1',
    supplierId: '1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Sandwich - Club',
    description: 'Fresh club sandwich with turkey and bacon',
    price: 8.99,
    costPrice: 4.50,
    wholesalePrice: 7.50,
    category: 'Food',
    sku: 'FOOD001',
    barcode: '1234567890124',
    stockLevel: 25,
    minStockLevel: 10,
    taxRate: 0.08,
    categoryId: '2',
    supplierId: '2',
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    name: 'Notebook - A4',
    description: 'High-quality A4 lined notebook',
    price: 3.99,
    costPrice: 1.80,
    wholesalePrice: 3.20,
    category: 'Stationery',
    sku: 'STAT001',
    barcode: '1234567890125',
    stockLevel: 50,
    minStockLevel: 15,
    taxRate: 0.08,
    categoryId: '3',
    supplierId: '3',
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  },
  {
    id: '4',
    name: 'Water Bottle',
    description: 'Reusable stainless steel water bottle',
    price: 1.99,
    costPrice: 0.80,
    wholesalePrice: 1.60,
    category: 'Beverages',
    sku: 'BEV002',
    barcode: '1234567890126',
    stockLevel: 75,
    minStockLevel: 25,
    taxRate: 0.08,
    categoryId: '1',
    supplierId: '1',
    isActive: true,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04')
  },
  {
    id: '5',
    name: 'Pen - Blue',
    description: 'Smooth writing blue ballpoint pen',
    price: 1.25,
    costPrice: 0.50,
    wholesalePrice: 1.00,
    category: 'Stationery',
    sku: 'STAT002',
    barcode: '1234567890127',
    stockLevel: 200,
    minStockLevel: 50,
    taxRate: 0.08,
    categoryId: '3',
    supplierId: '3',
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  },
  {
    id: '6',
    name: 'Croissant',
    description: 'Buttery, flaky French croissant',
    price: 2.75,
    costPrice: 1.30,
    category: 'Food',
    sku: 'FOOD002',
    barcode: '1234567890128',
    stockLevel: 15,
    minStockLevel: 5,
    taxRate: 0.08,
    categoryId: '2',
    supplierId: '2',
    isActive: true,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-06')
  }
]

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In a real app, this would be an API call
      const products = mockProducts
      const categories = [...new Set(products.map(p => p.category))]
      
      set({ 
        products, 
        categories, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch products', 
        isLoading: false 
      })
    }
  },

  addProduct: (productData) => {
    const newProduct: ExtendedProduct = {
      ...productData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    set(state => ({
      products: [...state.products, newProduct],
      categories: [...new Set([...state.categories, newProduct.category])]
    }))
  },

  updateProduct: (id, updates) => {
    set(state => ({
      products: state.products.map(product =>
        product.id === id ? { ...product, ...updates, updatedAt: new Date() } : product
      )
    }))
  },

  deleteProduct: (id) => {
    set(state => ({
      products: state.products.filter(product => product.id !== id)
    }))
  },

  findProductByBarcode: (barcode) => {
    const { products } = get()
    return products.find(product => product.barcode === barcode) || null
  },

  searchProducts: (query) => {
    const { products } = get()
    if (!query.trim()) return products

    const searchTerm = query.toLowerCase()
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.sku.toLowerCase().includes(searchTerm) ||
      (product.barcode && product.barcode.includes(searchTerm))
    )
  }
}))