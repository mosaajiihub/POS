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
  loadTransactions: (filters?: { startDate?: Date; endDate?: Date; customerId?: string; status?: string }) => Promise<void>
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

      // Prepare transaction data for API
      const transactionData = {
        customerId: undefined, // Could be set if customer is selected
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.sellingPrice
        })),
        paymentMethod: {
          type: paymentMethod.type,
          details: paymentMethod.details || {}
        },
        cashReceived
      }

      // Create transaction via API
      const response = await transactionApi.createTransaction(transactionData)
      
      // Convert API response to local Transaction format
      const transaction: Transaction = {
        id: response.transaction.id,
        transactionNumber: response.transaction.transactionNumber,
        cashierId: response.transaction.cashierId,
        items: cartItems, // Keep the cart items format for UI consistency
        subtotal: Number(response.transaction.subtotal),
        taxAmount: Number(response.transaction.taxAmount),
        discountAmount: Number(response.transaction.discountAmount || 0),
        totalAmount: Number(response.transaction.totalAmount),
        paymentMethod,
        paymentStatus: response.transaction.status === 'COMPLETED' ? 'completed' : 'pending',
        cashReceived: response.transaction.cashReceived ? Number(response.transaction.cashReceived) : undefined,
        changeAmount: response.transaction.changeAmount ? Number(response.transaction.changeAmount) : 0,
        timestamp: new Date(response.transaction.createdAt),
        refunds: [],
        receiptGenerated: response.transaction.receiptGenerated
      }
      
      set(state => ({
        transactions: [...state.transactions, transaction],
        currentTransaction: transaction,
        isProcessing: false
      }))

      return transaction
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

      // Void transaction via API
      const response = await transactionApi.voidTransaction(transactionId, { reason })

      set(state => ({
        transactions: state.transactions.map(t =>
          t.id === transactionId
            ? {
                ...t,
                paymentStatus: 'voided' as const,
                voidReason: reason,
                voidedAt: new Date(response.transaction.voidedAt),
                voidedBy: response.transaction.voidedBy
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

      // Process refund via API
      const refundData = {
        items: refundItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          refundAmount: item.refundAmount
        })),
        reason
      }

      const response = await transactionApi.processRefund(transactionId, refundData)

      const refund: Refund = {
        id: response.refund.id,
        originalTransactionId: transactionId,
        items: refundItems,
        refundAmount: Number(response.refund.totalAmount),
        reason: response.refund.reason,
        timestamp: new Date(response.refund.createdAt),
        processedBy: response.refund.processedBy
      }

      set(state => ({
        transactions: state.transactions.map(t =>
          t.id === transactionId
            ? {
                ...t,
                refunds: [...t.refunds, refund],
                paymentStatus: response.transaction.status === 'REFUNDED' ? 'refunded' as const : t.paymentStatus
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

  loadTransactions: async (filters?: { startDate?: Date; endDate?: Date; customerId?: string; status?: string }) => {
    set({ isProcessing: true, error: null })

    try {
      const response = await transactionApi.getTransactions(filters)
      
      // Convert API transactions to local format
      const transactions: Transaction[] = response.transactions.map((apiTransaction: any) => ({
        id: apiTransaction.id,
        transactionNumber: apiTransaction.transactionNumber,
        cashierId: apiTransaction.cashierId,
        customerId: apiTransaction.customerId,
        items: apiTransaction.items.map((item: any) => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            sellingPrice: Number(item.unitPrice),
            taxRate: Number(item.product.taxRate || 0)
          },
          quantity: item.quantity,
          subtotal: Number(item.subtotal)
        })),
        subtotal: Number(apiTransaction.subtotal),
        taxAmount: Number(apiTransaction.taxAmount),
        discountAmount: Number(apiTransaction.discountAmount || 0),
        totalAmount: Number(apiTransaction.totalAmount),
        paymentMethod: {
          type: apiTransaction.paymentMethod,
          name: apiTransaction.paymentMethod,
          details: apiTransaction.paymentDetails
        },
        paymentStatus: apiTransaction.status === 'COMPLETED' ? 'completed' : 
                      apiTransaction.status === 'VOIDED' ? 'voided' :
                      apiTransaction.status === 'REFUNDED' ? 'refunded' : 'pending',
        cashReceived: apiTransaction.cashReceived ? Number(apiTransaction.cashReceived) : undefined,
        changeAmount: apiTransaction.changeAmount ? Number(apiTransaction.changeAmount) : 0,
        timestamp: new Date(apiTransaction.createdAt),
        voidReason: apiTransaction.voidReason,
        voidedAt: apiTransaction.voidedAt ? new Date(apiTransaction.voidedAt) : undefined,
        voidedBy: apiTransaction.voidedBy,
        refunds: apiTransaction.refunds?.map((refund: any) => ({
          id: refund.id,
          originalTransactionId: apiTransaction.id,
          items: refund.items.map((item: any) => ({
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            refundAmount: Number(item.refundAmount)
          })),
          refundAmount: Number(refund.totalAmount),
          reason: refund.reason,
          timestamp: new Date(refund.createdAt),
          processedBy: refund.processedBy
        })) || [],
        receiptGenerated: apiTransaction.receiptGenerated
      }))

      set({ transactions, isProcessing: false })
    } catch (error) {
      set({ 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to load transactions' 
      })
      throw error
    }
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


}))