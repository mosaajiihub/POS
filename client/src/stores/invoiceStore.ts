import { create } from 'zustand'

export interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxRate: number
  productId?: string
  product?: {
    id: string
    name: string
    sku: string
  }
}

export interface InvoicePayment {
  id: string
  amount: number
  paymentMethod: 'CASH' | 'CARD' | 'DIGITAL' | 'CREDIT'
  paymentDate: Date
  reference?: string
  notes?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  notes?: string
  terms?: string
  dueDate: Date
  issuedDate: Date
  sentDate?: Date
  viewedDate?: Date
  paidDate?: Date
  reminderCount: number
  lastReminderDate?: Date
  paymentMethod?: 'CASH' | 'CARD' | 'DIGITAL' | 'CREDIT'
  isRecurring: boolean
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly'
  nextInvoiceDate?: Date
  createdAt: Date
  updatedAt: Date
  customerId: string
  customer: {
    id: string
    firstName: string
    lastName: string
    email?: string
  }
  items: InvoiceItem[]
  payments: InvoicePayment[]
  _count?: {
    items: number
    payments: number
  }
  totalPaid?: number
  remainingAmount?: number
}

export interface InvoiceAnalytics {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  averageInvoiceValue: number
  statusBreakdown: Record<Invoice['status'], number>
  monthlyTrends: Array<{
    month: string
    totalInvoices: number
    totalAmount: number
    paidAmount: number
  }>
}

export interface CreateInvoiceData {
  customerId: string
  items: Omit<InvoiceItem, 'id' | 'totalPrice'>[]
  dueDate: Date
  notes?: string
  terms?: string
  discountAmount?: number
  isRecurring?: boolean
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly'
}

export interface UpdateInvoiceData {
  customerId?: string
  items?: Omit<InvoiceItem, 'id' | 'totalPrice'>[]
  dueDate?: Date
  notes?: string
  terms?: string
  discountAmount?: number
  status?: Invoice['status']
  isRecurring?: boolean
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly'
}

export interface InvoiceFilters {
  search?: string
  status?: Invoice['status']
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
  isOverdue?: boolean
  page?: number
  limit?: number
}

export interface PaymentReconciliation {
  totalInvoices: number
  totalInvoiceAmount: number
  totalPayments: number
  totalPaymentAmount: number
  fullyPaidInvoices: number
  partiallyPaidInvoices: number
  unpaidInvoices: number
  reconciliationDifference: number
  paymentsByMethod: Record<string, { count: number; amount: number }>
  overdueAmount: number
}

export interface PaymentLink {
  id: string
  url: string
  provider: string
  amount: number
  currency: string
  status: 'active' | 'expired' | 'completed' | 'cancelled'
  expiresAt?: Date
  createdAt: Date
}

export interface CreatePaymentLinkData {
  amount: number
  currency?: string
  description: string
  customerEmail?: string
  successUrl?: string
  cancelUrl?: string
  expiresAt?: Date
}

interface InvoiceStore {
  invoices: Invoice[]
  selectedInvoice: Invoice | null
  invoiceAnalytics: InvoiceAnalytics | null
  paymentReconciliation: PaymentReconciliation | null
  overdueInvoices: Invoice[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchInvoices: (filters?: InvoiceFilters) => Promise<void>
  fetchInvoice: (invoiceId: string) => Promise<void>
  createInvoice: (invoiceData: CreateInvoiceData) => Promise<void>
  updateInvoice: (invoiceId: string, updates: UpdateInvoiceData) => Promise<void>
  deleteInvoice: (invoiceId: string) => Promise<void>
  recordPayment: (invoiceId: string, paymentData: {
    amount: number
    paymentMethod: InvoicePayment['paymentMethod']
    reference?: string
    notes?: string
    paymentDate?: Date
  }) => Promise<void>
  sendPaymentReminder: (invoiceId: string) => Promise<void>
  sendAutomatedReminders: () => Promise<{ remindersSent: number }>
  updateInvoiceStatus: (invoiceId: string) => Promise<{ status: string }>
  updateAllInvoiceStatuses: () => Promise<{ updated: number }>
  fetchOverdueInvoices: () => Promise<void>
  generateRecurringInvoices: () => Promise<{ generated: number }>
  fetchInvoiceAnalytics: (dateFrom?: Date, dateTo?: Date) => Promise<void>
  fetchPaymentReconciliation: (dateFrom?: Date, dateTo?: Date) => Promise<void>
  createPaymentLink: (invoiceId: string, linkData: CreatePaymentLinkData) => Promise<PaymentLink>
  getPaymentLinks: (invoiceId: string) => Promise<PaymentLink[]>
  clearSelectedInvoice: () => void
}

// Mock data for development - will be replaced with API calls
const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-0001',
    status: 'SENT',
    subtotal: 100.00,
    taxAmount: 10.00,
    discountAmount: 0,
    totalAmount: 110.00,
    notes: 'Thank you for your business!',
    terms: 'Net 30 days',
    dueDate: new Date('2024-02-15'),
    issuedDate: new Date('2024-01-15'),
    sentDate: new Date('2024-01-15'),
    reminderCount: 0,
    isRecurring: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    customerId: '1',
    customer: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    items: [
      {
        id: '1',
        description: 'Web Development Services',
        quantity: 10,
        unitPrice: 10.00,
        totalPrice: 100.00,
        taxRate: 10
      }
    ],
    payments: [],
    _count: {
      items: 1,
      payments: 0
    },
    totalPaid: 0,
    remainingAmount: 110.00
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-0002',
    status: 'PAID',
    subtotal: 250.00,
    taxAmount: 25.00,
    discountAmount: 25.00,
    totalAmount: 250.00,
    notes: 'Discount applied for early payment',
    terms: 'Net 15 days',
    dueDate: new Date('2024-02-01'),
    issuedDate: new Date('2024-01-10'),
    sentDate: new Date('2024-01-10'),
    paidDate: new Date('2024-01-25'),
    paymentMethod: 'CARD',
    reminderCount: 0,
    isRecurring: true,
    recurringInterval: 'monthly',
    nextInvoiceDate: new Date('2024-02-10'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-25'),
    customerId: '2',
    customer: {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com'
    },
    items: [
      {
        id: '2',
        description: 'Monthly Consulting Services',
        quantity: 1,
        unitPrice: 250.00,
        totalPrice: 250.00,
        taxRate: 10
      }
    ],
    payments: [
      {
        id: '1',
        amount: 250.00,
        paymentMethod: 'CARD',
        paymentDate: new Date('2024-01-25'),
        reference: 'CARD-12345'
      }
    ],
    _count: {
      items: 1,
      payments: 1
    },
    totalPaid: 250.00,
    remainingAmount: 0
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-0003',
    status: 'OVERDUE',
    subtotal: 75.00,
    taxAmount: 7.50,
    discountAmount: 0,
    totalAmount: 82.50,
    notes: 'Payment overdue - please remit immediately',
    terms: 'Net 30 days',
    dueDate: new Date('2024-01-20'),
    issuedDate: new Date('2023-12-20'),
    sentDate: new Date('2023-12-20'),
    reminderCount: 2,
    lastReminderDate: new Date('2024-01-25'),
    isRecurring: false,
    createdAt: new Date('2023-12-20'),
    updatedAt: new Date('2024-01-25'),
    customerId: '3',
    customer: {
      id: '3',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com'
    },
    items: [
      {
        id: '3',
        description: 'Product Design Services',
        quantity: 5,
        unitPrice: 15.00,
        totalPrice: 75.00,
        taxRate: 10
      }
    ],
    payments: [],
    _count: {
      items: 1,
      payments: 0
    },
    totalPaid: 0,
    remainingAmount: 82.50
  }
]

const mockAnalytics: InvoiceAnalytics = {
  totalInvoices: 3,
  totalAmount: 442.50,
  paidAmount: 250.00,
  pendingAmount: 192.50,
  overdueAmount: 82.50,
  averageInvoiceValue: 147.50,
  statusBreakdown: {
    DRAFT: 0,
    SENT: 1,
    VIEWED: 0,
    PAID: 1,
    OVERDUE: 1,
    CANCELLED: 0
  },
  monthlyTrends: [
    {
      month: '2024-01',
      totalInvoices: 3,
      totalAmount: 442.50,
      paidAmount: 250.00
    }
  ]
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  selectedInvoice: null,
  invoiceAnalytics: null,
  paymentReconciliation: null,
  overdueInvoices: [],
  isLoading: false,
  error: null,

  fetchInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In a real app, this would be an API call
      let filteredInvoices = [...mockInvoices]
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredInvoices = filteredInvoices.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
          invoice.customer.firstName.toLowerCase().includes(searchTerm) ||
          invoice.customer.lastName.toLowerCase().includes(searchTerm) ||
          invoice.customer.email?.toLowerCase().includes(searchTerm)
        )
      }
      
      if (filters.status) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.status === filters.status)
      }
      
      if (filters.customerId) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.customerId === filters.customerId)
      }
      
      if (filters.isOverdue) {
        filteredInvoices = filteredInvoices.filter(invoice => 
          ['SENT', 'VIEWED'].includes(invoice.status) && invoice.dueDate < new Date()
        )
      }
      
      if (filters.dateFrom) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.createdAt >= filters.dateFrom!)
      }
      
      if (filters.dateTo) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.createdAt <= filters.dateTo!)
      }
      
      set({ 
        invoices: filteredInvoices, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch invoices', 
        isLoading: false 
      })
    }
  },

  fetchInvoice: async (invoiceId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const invoice = mockInvoices.find(i => i.id === invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }
      
      set({ 
        selectedInvoice: invoice, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch invoice', 
        isLoading: false 
      })
    }
  },

  createInvoice: async (invoiceData: CreateInvoiceData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Calculate totals
      let subtotal = 0
      let taxAmount = 0
      
      const processedItems = invoiceData.items.map(item => {
        const itemTotal = item.quantity * item.unitPrice
        const itemTax = itemTotal * (item.taxRate || 0) / 100
        
        subtotal += itemTotal
        taxAmount += itemTax
        
        return {
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          totalPrice: itemTotal
        }
      })
      
      const totalAmount = subtotal + taxAmount - (invoiceData.discountAmount || 0)
      
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(mockInvoices.length + 1).padStart(4, '0')}`
      
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        invoiceNumber,
        status: 'DRAFT',
        subtotal,
        taxAmount,
        discountAmount: invoiceData.discountAmount || 0,
        totalAmount,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        dueDate: invoiceData.dueDate,
        issuedDate: new Date(),
        reminderCount: 0,
        isRecurring: invoiceData.isRecurring || false,
        recurringInterval: invoiceData.recurringInterval,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerId: invoiceData.customerId,
        customer: {
          id: invoiceData.customerId,
          firstName: 'Customer',
          lastName: 'Name',
          email: 'customer@example.com'
        },
        items: processedItems,
        payments: [],
        _count: {
          items: processedItems.length,
          payments: 0
        },
        totalPaid: 0,
        remainingAmount: totalAmount
      }
      
      set(state => ({
        invoices: [...state.invoices, newInvoice],
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to create invoice', 
        isLoading: false 
      })
    }
  },

  updateInvoice: async (invoiceId: string, updates: UpdateInvoiceData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        invoices: state.invoices.map(invoice => {
          if (invoice.id === invoiceId) {
            let updatedInvoice = { ...invoice, ...updates, updatedAt: new Date() }
            
            // Recalculate totals if items are updated
            if (updates.items) {
              let subtotal = 0
              let taxAmount = 0
              
              const processedItems = updates.items.map(item => {
                const itemTotal = item.quantity * item.unitPrice
                const itemTax = itemTotal * (item.taxRate || 0) / 100
                
                subtotal += itemTotal
                taxAmount += itemTax
                
                return {
                  ...item,
                  id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  totalPrice: itemTotal
                }
              })
              
              const totalAmount = subtotal + taxAmount - (updates.discountAmount ?? invoice.discountAmount)
              
              updatedInvoice = {
                ...updatedInvoice,
                subtotal,
                taxAmount,
                totalAmount,
                items: processedItems,
                remainingAmount: totalAmount - (invoice.totalPaid || 0)
              }
            }
            
            return updatedInvoice
          }
          return invoice
        }),
        selectedInvoice: state.selectedInvoice?.id === invoiceId 
          ? { ...state.selectedInvoice, ...updates, updatedAt: new Date() }
          : state.selectedInvoice,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to update invoice', 
        isLoading: false 
      })
    }
  },

  deleteInvoice: async (invoiceId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        invoices: state.invoices.filter(invoice => invoice.id !== invoiceId),
        selectedInvoice: state.selectedInvoice?.id === invoiceId ? null : state.selectedInvoice,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to delete invoice', 
        isLoading: false 
      })
    }
  },

  recordPayment: async (invoiceId: string, paymentData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newPayment: InvoicePayment = {
        id: Date.now().toString(),
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate || new Date(),
        reference: paymentData.reference,
        notes: paymentData.notes
      }
      
      set(state => ({
        invoices: state.invoices.map(invoice => {
          if (invoice.id === invoiceId) {
            const newTotalPaid = (invoice.totalPaid || 0) + paymentData.amount
            const remainingAmount = invoice.totalAmount - newTotalPaid
            const isFullyPaid = remainingAmount <= 0
            
            return {
              ...invoice,
              payments: [...invoice.payments, newPayment],
              totalPaid: newTotalPaid,
              remainingAmount,
              status: isFullyPaid ? 'PAID' : invoice.status,
              paidDate: isFullyPaid ? new Date() : invoice.paidDate,
              paymentMethod: isFullyPaid ? paymentData.paymentMethod : invoice.paymentMethod,
              updatedAt: new Date()
            }
          }
          return invoice
        }),
        selectedInvoice: state.selectedInvoice?.id === invoiceId 
          ? {
              ...state.selectedInvoice,
              payments: [...state.selectedInvoice.payments, newPayment],
              totalPaid: (state.selectedInvoice.totalPaid || 0) + paymentData.amount,
              remainingAmount: state.selectedInvoice.totalAmount - ((state.selectedInvoice.totalPaid || 0) + paymentData.amount),
              updatedAt: new Date()
            }
          : state.selectedInvoice,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to record payment', 
        isLoading: false 
      })
    }
  },

  sendPaymentReminder: async (invoiceId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      set(state => ({
        invoices: state.invoices.map(invoice =>
          invoice.id === invoiceId 
            ? { 
                ...invoice, 
                reminderCount: invoice.reminderCount + 1,
                lastReminderDate: new Date(),
                updatedAt: new Date()
              }
            : invoice
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to send payment reminder', 
        isLoading: false 
      })
    }
  },

  fetchOverdueInvoices: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const overdue = mockInvoices.filter(invoice => 
        ['SENT', 'VIEWED'].includes(invoice.status) && invoice.dueDate < new Date()
      )
      
      set({ 
        overdueInvoices: overdue, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch overdue invoices', 
        isLoading: false 
      })
    }
  },

  generateRecurringInvoices: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real app, this would generate new invoices based on recurring settings
      const generated = Math.floor(Math.random() * 5) + 1
      
      set({ isLoading: false })
      
      return { generated }
    } catch (error) {
      set({ 
        error: 'Failed to generate recurring invoices', 
        isLoading: false 
      })
      throw error
    }
  },

  fetchInvoiceAnalytics: async (dateFrom?: Date, dateTo?: Date) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set({ 
        invoiceAnalytics: mockAnalytics, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch invoice analytics', 
        isLoading: false 
      })
    }
  },

  sendAutomatedReminders: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real app, this would call the API
      const remindersSent = Math.floor(Math.random() * 10) + 1
      
      set({ isLoading: false })
      
      return { remindersSent }
    } catch (error) {
      set({ 
        error: 'Failed to send automated reminders', 
        isLoading: false 
      })
      throw error
    }
  },

  updateInvoiceStatus: async (invoiceId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In a real app, this would call the API
      const status = 'OVERDUE' // Mock status update
      
      set(state => ({
        invoices: state.invoices.map(invoice =>
          invoice.id === invoiceId 
            ? { ...invoice, status: status as Invoice['status'], updatedAt: new Date() }
            : invoice
        ),
        selectedInvoice: state.selectedInvoice?.id === invoiceId 
          ? { ...state.selectedInvoice, status: status as Invoice['status'], updatedAt: new Date() }
          : state.selectedInvoice,
        isLoading: false
      }))
      
      return { status }
    } catch (error) {
      set({ 
        error: 'Failed to update invoice status', 
        isLoading: false 
      })
      throw error
    }
  },

  updateAllInvoiceStatuses: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real app, this would call the API
      const updated = Math.floor(Math.random() * 5) + 1
      
      set({ isLoading: false })
      
      return { updated }
    } catch (error) {
      set({ 
        error: 'Failed to update invoice statuses', 
        isLoading: false 
      })
      throw error
    }
  },

  fetchPaymentReconciliation: async (dateFrom?: Date, dateTo?: Date) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock reconciliation data
      const mockReconciliation: PaymentReconciliation = {
        totalInvoices: 25,
        totalInvoiceAmount: 12500.00,
        totalPayments: 18,
        totalPaymentAmount: 9750.00,
        fullyPaidInvoices: 15,
        partiallyPaidInvoices: 3,
        unpaidInvoices: 7,
        reconciliationDifference: 2750.00,
        paymentsByMethod: {
          CASH: { count: 8, amount: 3200.00 },
          CARD: { count: 7, amount: 4550.00 },
          DIGITAL: { count: 2, amount: 1500.00 },
          CREDIT: { count: 1, amount: 500.00 }
        },
        overdueAmount: 1850.00
      }
      
      set({ 
        paymentReconciliation: mockReconciliation, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch payment reconciliation', 
        isLoading: false 
      })
    }
  },

  createPaymentLink: async (invoiceId: string, linkData: CreatePaymentLinkData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock payment link creation
      const paymentLink: PaymentLink = {
        id: `pl_${Date.now()}`,
        url: `https://checkout.stripe.com/pay/${Date.now()}`,
        provider: 'stripe',
        amount: linkData.amount,
        currency: linkData.currency || 'USD',
        status: 'active',
        expiresAt: linkData.expiresAt,
        createdAt: new Date()
      }
      
      set({ isLoading: false })
      
      return paymentLink
    } catch (error) {
      set({ 
        error: 'Failed to create payment link', 
        isLoading: false 
      })
      throw error
    }
  },

  getPaymentLinks: async (invoiceId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Mock payment links
      const paymentLinks: PaymentLink[] = [
        {
          id: `pl_${Date.now()}`,
          url: `https://checkout.stripe.com/pay/${Date.now()}`,
          provider: 'stripe',
          amount: 110.00,
          currency: 'USD',
          status: 'active',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdAt: new Date()
        }
      ]
      
      set({ isLoading: false })
      
      return paymentLinks
    } catch (error) {
      set({ 
        error: 'Failed to fetch payment links', 
        isLoading: false 
      })
      throw error
    }
  },

  clearSelectedInvoice: () => {
    set({ selectedInvoice: null })
  }
}))