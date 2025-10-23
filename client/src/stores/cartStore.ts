import { create } from 'zustand'
import { CartItem, Product } from '../pages/POS'

interface CartStore {
  items: CartItem[]
  total: number
  itemCount: number
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  calculateTotals: () => void
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,
  itemCount: 0,

  addItem: (product: Product, quantity = 1) => {
    const { items } = get()
    const existingItem = items.find(item => item.product.id === product.id)

    if (existingItem) {
      get().updateQuantity(product.id, existingItem.quantity + quantity)
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        subtotal: product.price * quantity
      }
      set(state => ({
        items: [...state.items, newItem]
      }))
      get().calculateTotals()
    }
  },

  removeItem: (productId: string) => {
    set(state => ({
      items: state.items.filter(item => item.product.id !== productId)
    }))
    get().calculateTotals()
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    set(state => ({
      items: state.items.map(item =>
        item.product.id === productId
          ? { ...item, quantity, subtotal: item.product.price * quantity }
          : item
      )
    }))
    get().calculateTotals()
  },

  clearCart: () => {
    set({ items: [], total: 0, itemCount: 0 })
  },

  calculateTotals: () => {
    const { items } = get()
    const total = items.reduce((sum, item) => sum + item.subtotal, 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    set({ total, itemCount })
  }
}))