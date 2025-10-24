import { create } from 'zustand'

export interface Subscription {
  id: string
  customerId: string
  planName: string
  planDescription?: string
  amount: number
  currency: string
  interval: 'monthly' | 'quarterly' | 'yearly'
  status: 'active' | 'paused' | 'cancelled' | 'expired'
  startDate: Date
  endDate?: Date
  nextBillingDate: Date
  lastBillingDate?: Date
  trialEndDate?: Date
  cancelledAt?: Date
  cancellationReason?: string
  createdAt: Date
  updatedAt: Date
  customer: {
    id: string
    firstName: string
    lastName: string
    email?: string
  }
  _count?: {
    invoices: number
  }
}

export interface CreateSubscriptionData {
  customerId: string
  planName: string
  planDescription?: string
  amount: number
  currency?: string
  interval: 'monthly' | 'quarterly' | 'yearly'
  startDate?: Date
  trialEndDate?: Date
  metadata?: any
}

export interface UpdateSubscriptionData {
  planName?: string
  planDescription?: string
  amount?: number
  currency?: string
  interval?: 'monthly' | 'quarterly' | 'yearly'
  status?: 'active' | 'paused' | 'cancelled' | 'expired'
  endDate?: Date
  cancellationReason?: string
  metadata?: any
}

export interface SubscriptionFilters {
  customerId?: string
  status?: string
  interval?: string
  planName?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

export interface BillingCycleResult {
  processed: number
  failed: number
  details: Array<{
    subscriptionId: string
    status: 'success' | 'failed'
    invoiceId?: string
    error?: string
  }>
}

interface SubscriptionStore {
  subscriptions: Subscription[]
  selectedSubscription: Subscription | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchSubscriptions: (filters?: SubscriptionFilters) => Promise<void>
  fetchSubscription: (subscriptionId: string) => Promise<void>
  createSubscription: (subscriptionData: CreateSubscriptionData) => Promise<void>
  updateSubscription: (subscriptionId: string, updates: UpdateSubscriptionData) => Promise<void>
  cancelSubscription: (subscriptionId: string, reason?: string) => Promise<void>
  processBillingCycle: () => Promise<BillingCycleResult>
  clearSelectedSubscription: () => void
}

// Mock data for development - will be replaced with API calls
const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    customerId: '1',
    planName: 'Basic Plan',
    planDescription: 'Basic monthly subscription',
    amount: 29.99,
    currency: 'USD',
    interval: 'monthly',
    status: 'active',
    startDate: new Date('2024-01-01'),
    nextBillingDate: new Date('2024-02-01'),
    lastBillingDate: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customer: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    },
    _count: {
      invoices: 3
    }
  },
  {
    id: '2',
    customerId: '2',
    planName: 'Premium Plan',
    planDescription: 'Premium quarterly subscription with advanced features',
    amount: 199.99,
    currency: 'USD',
    interval: 'quarterly',
    status: 'active',
    startDate: new Date('2023-10-01'),
    nextBillingDate: new Date('2024-04-01'),
    lastBillingDate: new Date('2024-01-01'),
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2024-01-01'),
    customer: {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com'
    },
    _count: {
      invoices: 6
    }
  },
  {
    id: '3',
    customerId: '3',
    planName: 'Enterprise Plan',
    planDescription: 'Enterprise yearly subscription',
    amount: 999.99,
    currency: 'USD',
    interval: 'yearly',
    status: 'cancelled',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2024-01-01'),
    nextBillingDate: new Date('2024-01-01'),
    lastBillingDate: new Date('2023-01-01'),
    cancelledAt: new Date('2023-12-15'),
    cancellationReason: 'Customer requested cancellation',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-12-15'),
    customer: {
      id: '3',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com'
    },
    _count: {
      invoices: 1
    }
  }
]

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscriptions: [],
  selectedSubscription: null,
  isLoading: false,
  error: null,

  fetchSubscriptions: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // In a real app, this would be an API call
      let filteredSubscriptions = [...mockSubscriptions]
      
      if (filters.customerId) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => sub.customerId === filters.customerId)
      }
      
      if (filters.status) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => sub.status === filters.status)
      }
      
      if (filters.interval) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => sub.interval === filters.interval)
      }
      
      if (filters.planName) {
        const searchTerm = filters.planName.toLowerCase()
        filteredSubscriptions = filteredSubscriptions.filter(sub =>
          sub.planName.toLowerCase().includes(searchTerm)
        )
      }
      
      if (filters.dateFrom) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => sub.createdAt >= filters.dateFrom!)
      }
      
      if (filters.dateTo) {
        filteredSubscriptions = filteredSubscriptions.filter(sub => sub.createdAt <= filters.dateTo!)
      }
      
      set({ 
        subscriptions: filteredSubscriptions, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch subscriptions', 
        isLoading: false 
      })
    }
  },

  fetchSubscription: async (subscriptionId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const subscription = mockSubscriptions.find(s => s.id === subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }
      
      set({ 
        selectedSubscription: subscription, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: 'Failed to fetch subscription', 
        isLoading: false 
      })
    }
  },

  createSubscription: async (subscriptionData: CreateSubscriptionData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Calculate next billing date
      const startDate = subscriptionData.startDate || new Date()
      const nextBillingDate = new Date(startDate)
      
      switch (subscriptionData.interval) {
        case 'monthly':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
          break
        case 'quarterly':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
          break
        case 'yearly':
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
          break
      }
      
      const newSubscription: Subscription = {
        id: Date.now().toString(),
        customerId: subscriptionData.customerId,
        planName: subscriptionData.planName,
        planDescription: subscriptionData.planDescription,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'USD',
        interval: subscriptionData.interval,
        status: 'active',
        startDate,
        nextBillingDate,
        trialEndDate: subscriptionData.trialEndDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: subscriptionData.customerId,
          firstName: 'Customer',
          lastName: 'Name',
          email: 'customer@example.com'
        },
        _count: {
          invoices: 0
        }
      }
      
      set(state => ({
        subscriptions: [...state.subscriptions, newSubscription],
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to create subscription', 
        isLoading: false 
      })
    }
  },

  updateSubscription: async (subscriptionId: string, updates: UpdateSubscriptionData) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        subscriptions: state.subscriptions.map(subscription => {
          if (subscription.id === subscriptionId) {
            const updatedSubscription = { 
              ...subscription, 
              ...updates, 
              updatedAt: new Date() 
            }
            
            // Handle status changes
            if (updates.status === 'cancelled') {
              updatedSubscription.cancelledAt = new Date()
              updatedSubscription.cancellationReason = updates.cancellationReason
            }
            
            if (updates.status === 'expired') {
              updatedSubscription.endDate = updates.endDate || new Date()
            }
            
            return updatedSubscription
          }
          return subscription
        }),
        selectedSubscription: state.selectedSubscription?.id === subscriptionId 
          ? { ...state.selectedSubscription, ...updates, updatedAt: new Date() }
          : state.selectedSubscription,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to update subscription', 
        isLoading: false 
      })
    }
  },

  cancelSubscription: async (subscriptionId: string, reason?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        subscriptions: state.subscriptions.map(subscription =>
          subscription.id === subscriptionId 
            ? { 
                ...subscription, 
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: reason,
                updatedAt: new Date()
              }
            : subscription
        ),
        selectedSubscription: state.selectedSubscription?.id === subscriptionId 
          ? { 
              ...state.selectedSubscription, 
              status: 'cancelled',
              cancelledAt: new Date(),
              cancellationReason: reason,
              updatedAt: new Date()
            }
          : state.selectedSubscription,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: 'Failed to cancel subscription', 
        isLoading: false 
      })
    }
  },

  processBillingCycle: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock billing cycle processing
      const processed = Math.floor(Math.random() * 10) + 1
      const failed = Math.floor(Math.random() * 3)
      
      const details = Array.from({ length: processed + failed }, (_, i) => ({
        subscriptionId: `sub_${i + 1}`,
        status: i < processed ? 'success' : 'failed',
        invoiceId: i < processed ? `inv_${Date.now()}_${i}` : undefined,
        error: i >= processed ? 'Payment method declined' : undefined
      })) as BillingCycleResult['details']
      
      set({ isLoading: false })
      
      return { processed, failed, details }
    } catch (error) {
      set({ 
        error: 'Failed to process billing cycle', 
        isLoading: false 
      })
      throw error
    }
  },

  clearSelectedSubscription: () => {
    set({ selectedSubscription: null })
  }
}))