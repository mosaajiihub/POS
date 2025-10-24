import { create } from 'zustand'
import { Product } from '../pages/POS'
import { productApi } from '../services/apiService'

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
  addProduct: (product: Omit<ExtendedProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProduct: (id: string, updates: Partial<ExtendedProduct>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
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
      const response = await productApi.getProducts()
      const products = response.products || []
      const categories = [...new Set(products.map((p: any) => p.category?.name || p.category))]
      
      // Transform API response to match our interface
      const transformedProducts: ExtendedProduct[] = products.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.sellingPrice,
        costPrice: product.costPrice,
        wholesalePrice: product.wholesalePrice,
        category: product.category?.name || product.category || 'Uncategorized',
        sku: product.sku,
        barcode: product.barcode,
        stockLevel: product.stockLevel || 0,
        minStockLevel: product.minStockLevel || 0,
        taxRate: product.taxRate || 0,
        categoryId: product.categoryId,
        supplierId: product.supplierId,
        isActive: product.isActive !== false,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt)
      }))
      
      set({ 
        products: transformedProducts, 
        categories, 
        isLoading: false 
      })
    } catch (error: any) {
      console.error('Failed to fetch products:', error)
      
      // Fallback to mock data if API fails
      const products = mockProducts
      const categories = [...new Set(products.map(p => p.category))]
      
      set({ 
        products, 
        categories,
        error: error.message || 'Failed to fetch products', 
        isLoading: false 
      })
    }
  },

  addProduct: async (productData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await productApi.createProduct({
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        barcode: productData.barcode,
        costPrice: productData.costPrice,
        sellingPrice: productData.price,
        wholesalePrice: productData.wholesalePrice,
        stockLevel: productData.stockLevel,
        minStockLevel: productData.minStockLevel,
        taxRate: productData.taxRate,
        categoryId: productData.categoryId,
        supplierId: productData.supplierId
      })

      const newProduct: ExtendedProduct = {
        ...productData,
        id: response.product.id,
        price: response.product.sellingPrice,
        createdAt: new Date(response.product.createdAt),
        updatedAt: new Date(response.product.updatedAt)
      }
      
      set(state => ({
        products: [...state.products, newProduct],
        categories: [...new Set([...state.categories, newProduct.category])],
        isLoading: false
      }))
    } catch (error: any) {
      console.error('Failed to add product:', error)
      
      // Fallback to local addition if API fails
      const newProduct: ExtendedProduct = {
        ...productData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      set(state => ({
        products: [...state.products, newProduct],
        categories: [...new Set([...state.categories, newProduct.category])],
        error: error.message || 'Failed to add product',
        isLoading: false
      }))
    }
  },

  updateProduct: async (id, updates) => {
    set({ isLoading: true, error: null })
    
    try {
      const updateData: any = {}
      if (updates.name) updateData.name = updates.name
      if (updates.description) updateData.description = updates.description
      if (updates.sku) updateData.sku = updates.sku
      if (updates.barcode) updateData.barcode = updates.barcode
      if (updates.costPrice !== undefined) updateData.costPrice = updates.costPrice
      if (updates.price !== undefined) updateData.sellingPrice = updates.price
      if (updates.wholesalePrice !== undefined) updateData.wholesalePrice = updates.wholesalePrice
      if (updates.stockLevel !== undefined) updateData.stockLevel = updates.stockLevel
      if (updates.minStockLevel !== undefined) updateData.minStockLevel = updates.minStockLevel
      if (updates.taxRate !== undefined) updateData.taxRate = updates.taxRate
      if (updates.categoryId) updateData.categoryId = updates.categoryId
      if (updates.supplierId) updateData.supplierId = updates.supplierId
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive

      await productApi.updateProduct(id, updateData)
      
      set(state => ({
        products: state.products.map(product =>
          product.id === id ? { ...product, ...updates, updatedAt: new Date() } : product
        ),
        isLoading: false
      }))
    } catch (error: any) {
      console.error('Failed to update product:', error)
      
      // Fallback to local update if API fails
      set(state => ({
        products: state.products.map(product =>
          product.id === id ? { ...product, ...updates, updatedAt: new Date() } : product
        ),
        error: error.message || 'Failed to update product',
        isLoading: false
      }))
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      await productApi.deleteProduct(id)
      
      set(state => ({
        products: state.products.filter(product => product.id !== id),
        isLoading: false
      }))
    } catch (error: any) {
      console.error('Failed to delete product:', error)
      
      // Fallback to local deletion if API fails
      set(state => ({
        products: state.products.filter(product => product.id !== id),
        error: error.message || 'Failed to delete product',
        isLoading: false
      }))
    }
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