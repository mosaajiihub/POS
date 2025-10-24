import { create } from 'zustand'
import { CartItem, PaymentMethod } from '../pages/POS'
import { transactionApi, stockApi } from '../services/apiService'

export interface Transaction {
  id: string
  transactionNumber: string
  customerId?: string
  cashierId: string
  items: CartItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: 'pending' | 'completed' | 'failed' | 'voided' | 'refunded'
  cashReceived?: number
  changeAmount?: number
  timestamp: Date
  voidReason?: string
  voidedAt?: Date
  voidedBy?: string
  refunds: Refund[]
  receiptGenerated: boolean
  receiptData?: any
}

export interface Refund {
  id: string
  originalTransactionId: string
  items: RefundItem[]
  refundAmount: number
  reason: string
  timestamp: Date
  processedBy: string
}

export interface RefundItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  refundAmount: number
}

interface TransactionStore {
  transactions: Transaction[]
  currentTransaction: Transaction | null
  isProcessing: boolean
  error: string | null
  
  // Transaction operations
  createTransaction: (cartItems: CartItem[], paymentMethod: PaymentMethod, cashReceived?: number) => Promise<Transaction>
  completeTransaction: (transactionId: string) => Promise<boolean>
  voidTransaction: (transactionId: string, reason: string) => Promise<boolean>
  processRefund: (transactionId: string, refundItems: RefundItem[], reason: string) => Promise<Refund>
  
  // Transaction queries
  getTransaction: (transactionId: string) => Transaction | undefined
  getTransactionsByDate: (date: Date) => Transaction[]
  getTodaysTransactions: () => Transaction[]
  
  // Receipt operations
  generateReceipt: (transactionId: string) => any
  printReceipt: (transactionId: string) => Promise<boolean>
  emailReceipt: (transactionId: string, email: string) => Promise<boolean>
  
  // Utility functions
  calculateTransactionTotals: (items: CartItem[]) => { subtotal: number; taxAmount: number; total: number }
  validatePayment: (paymentMethod: PaymentMethod, amount: number, cashReceived?: number) => { isValid: boolean; error?: string }
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  currentTransaction: null,
  isProcessing: false,
  error: null,

  createTransaction: async (cartItems: CartItem[], paymentMethod: PaymentMethod, cashReceived?: number) => {
    set({ isProcessing: true, error: null })

    try {
      const { subtotal, taxAmount, total } = get().calculateTransactionTotals(cartItems)
      
      // Validate payment
      const validation = get().validatePayment(paymentMethod, total, cashReceived)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const transaction: Transaction = {
        id: Date.now().toString(),
        transactionNumber: `TXN-${Date.now()}`,
        cashierId: 'current-user', // This would come from auth store
        items: cartItems,
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount: total,
        paymentMethod,
        paymentStatus: 'pending',
        cashReceived,
        changeAmount: paymentMethod.type === 'cash' && cashReceived ? cashReceived - total : 0,
        timestamp: new Date(),
        refunds: [],
        receiptGenerated: false
      }

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Process payment based on method
      const paymentResult = await get().processPayment(transaction)
      
      if (paymentResult.success) {
        transaction.paymentStatus = 'completed'
        
        // Update inventory (in a real app, this would be an API call)
        get().updateInventoryAfterSale(cartItems)
        
        set(state => ({
          transactions: [...state.transactions, transaction],
          currentTransaction: transaction,
          isProcessing: false
        }))

        return transaction
      } else {
        transaction.paymentStatus = 'failed'
        throw new Error(paymentResult.error || 'Payment processing failed')
      }
    } catch (error) {
      set({ 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Transaction failed' 
      })
      throw error
    }
  },

  completeTransaction: async (transactionId: string) => {
    const transaction = get().getTransaction(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    if (transaction.paymentStatus !== 'completed') {
      throw new Error('Transaction is not in completed status')
    }

    // Generate receipt
    const receiptData = get().generateReceipt(transactionId)
    
    set(state => ({
      transactions: state.transactions.map(t =>
        t.id === transactionId
          ? { ...t, receiptGenerated: true, receiptData }
          : t
      )
    }))

    return true
  },

  voidTransaction: async (transactionId: string, reason: string) => {
    set({ isProcessing: true, error: null })

    try {
      const transaction = get().getTransaction(transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      if (transaction.paymentStatus === 'voided') {
        throw new Error('Transaction is already voided')
      }

      if (transaction.refunds.length > 0) {
        throw new Error('Cannot void transaction with existing refunds')
      }

      // Simulate void processing
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Restore inventory
      get().restoreInventoryAfterVoid(transaction.items)

      set(state => ({
        transactions: state.transactions.map(t =>
          t.id === transactionId
            ? {
                ...t,
                paymentStatus: 'voided' as const,
                voidReason: reason,
                voidedAt: new Date(),
                voidedBy: 'current-user'
              }
            : t
        ),
        isProcessing: false
      }))

      return true
    } catch (error) {
      set({ 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Void failed' 
      })
      throw error
    }
  },

  processRefund: async (transactionId: string, refundItems: RefundItem[], reason: string) => {
    set({ isProcessing: true, error: null })

    try {
      const transaction = get().getTransaction(transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      if (transaction.paymentStatus !== 'completed') {
        throw new Error('Can only refund completed transactions')
      }

      const refundAmount = refundItems.reduce((sum, item) => sum + item.refundAmount, 0)
      
      if (refundAmount <= 0) {
        throw new Error('Refund amount must be greater than zero')
      }

      const totalRefunded = transaction.refunds.reduce((sum, refund) => sum + refund.refundAmount, 0)
      if (totalRefunded + refundAmount > transaction.totalAmount) {
        throw new Error('Refund amount exceeds transaction total')
      }

      // Simulate refund processing
      await new Promise(resolve => setTimeout(resolve, 1500))

      const refund: Refund = {
        id: Date.now().toString(),
        originalTransactionId: transactionId,
        items: refundItems,
        refundAmount,
        reason,
        timestamp: new Date(),
        processedBy: 'current-user'
      }

      // Restore inventory for refunded items
      get().restoreInventoryAfterRefund(refundItems)

      set(state => ({
        transactions: state.transactions.map(t =>
          t.id === transactionId
            ? {
                ...t,
                refunds: [...t.refunds, refund],
                paymentStatus: totalRefunded + refundAmount >= t.totalAmount ? 'refunded' as const : t.paymentStatus
              }
            : t
        ),
        isProcessing: false
      }))

      return refund
    } catch (error) {
      set({ 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Refund failed' 
      })
      throw error
    }
  },

  getTransaction: (transactionId: string) => {
    return get().transactions.find(t => t.id === transactionId)
  },

  getTransactionsByDate: (date: Date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return get().transactions.filter(t => 
      t.timestamp >= startOfDay && t.timestamp <= endOfDay
    )
  },

  getTodaysTransactions: () => {
    return get().getTransactionsByDate(new Date())
  },

  generateReceipt: (transactionId: string) => {
    const transaction = get().getTransaction(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    return {
      transactionNumber: transaction.transactionNumber,
      timestamp: transaction.timestamp,
      cashier: transaction.cashierId,
      items: transaction.items,
      subtotal: transaction.subtotal,
      taxAmount: transaction.taxAmount,
      total: transaction.totalAmount,
      paymentMethod: transaction.paymentMethod,
      cashReceived: transaction.cashReceived,
      change: transaction.changeAmount,
      businessInfo: {
        name: 'Mosaajii POS',
        address: '123 Business Street',
        city: 'City, State 12345',
        phone: '(555) 123-4567'
      }
    }
  },

  printReceipt: async (transactionId: string) => {
    // In a real app, this would interface with a printer
    console.log(`Printing receipt for transaction ${transactionId}`)
    return true
  },

  emailReceipt: async (transactionId: string, email: string) => {
    // In a real app, this would send an email
    console.log(`Emailing receipt for transaction ${transactionId} to ${email}`)
    return true
  },

  calculateTransactionTotals: (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxAmount = items.reduce((sum, item) => sum + (item.subtotal * item.product.taxRate), 0)
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  },

  validatePayment: (paymentMethod: PaymentMethod, amount: number, cashReceived?: number) => {
    if (amount <= 0) {
      return { isValid: false, error: 'Transaction amount must be greater than zero' }
    }

    if (paymentMethod.type === 'cash') {
      if (!cashReceived || cashReceived < amount) {
        return { isValid: false, error: 'Insufficient cash received' }
      }
    }

    return { isValid: true }
  },

  // Helper methods (in a real app, these would be API calls)
  processPayment: async (transaction: Transaction) => {
    // Simulate different payment processing scenarios
    const random = Math.random()
    
    if (random < 0.05) { // 5% failure rate for demo
      return { success: false, error: 'Payment declined' }
    }

    return { success: true }
  },

  updateInventoryAfterSale: async (items: CartItem[]) => {
    try {
      // Convert cart items to sale items format for stock service
      const saleItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))

      await stockApi.processSale(saleItems)
      console.log('Inventory updated successfully after sale')
    } catch (error) {
      console.error('Error updating inventory after sale:', error)
      // In a real app, you might want to handle this error more gracefully
      // For now, we'll just log it and continue
    }
  },

  restoreInventoryAfterVoid: async (items: CartItem[]) => {
    try {
      // For void transactions, we need to add the stock back
      for (const item of items) {
        await stockApi.updateStock({
          productId: item.product.id,
          quantity: item.quantity,
          type: 'RETURN',
          reason: 'Transaction voided'
        })
      }

      console.log('Inventory restored successfully after void')
    } catch (error) {
      console.error('Error restoring inventory after void:', error)
    }
  },

  restoreInventoryAfterRefund: async (items: RefundItem[]) => {
    try {
      // For refunds, we need to add the refunded quantity back to stock
      for (const item of items) {
        await stockApi.updateStock({
          productId: item.productId,
          quantity: item.quantity,
          type: 'RETURN',
          reason: 'Product refunded'
        })
      }

      console.log('Inventory restored successfully after refund')
    } catch (error) {
      console.error('Error restoring inventory after refund:', error)
    }
  }
}))