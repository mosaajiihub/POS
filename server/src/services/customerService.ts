import { Customer } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface CreateCustomerData {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  creditLimit?: number
}

export interface UpdateCustomerData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  creditLimit?: number
  loyaltyPoints?: number
  isActive?: boolean
}

export interface CustomerFilters {
  search?: string
  isActive?: boolean
  hasLoyaltyPoints?: boolean
  page?: number
  limit?: number
}

export interface CustomerResult {
  success: boolean
  message: string
  customer?: Customer & { 
    _count?: { 
      sales: number
      invoices: number 
    }
    totalSpent?: number
    lastPurchase?: Date
  }
}

export interface CustomerListResult {
  success: boolean
  message: string
  customers?: (Customer & { 
    _count?: { 
      sales: number
      invoices: number 
    }
    totalSpent?: number
    lastPurchase?: Date
  })[]
  total?: number
  page?: number
  limit?: number
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

export interface CustomerAnalyticsResult {
  success: boolean
  message: string
  analytics?: CustomerAnalytics
}

/**
 * Customer Management Service
 * Handles customer CRUD operations, purchase history tracking, and loyalty points
 */
export class CustomerService {
  /**
   * Create a new customer
   */
  static async createCustomer(customerData: CreateCustomerData): Promise<CustomerResult> {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        creditLimit = 0
      } = customerData

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await prisma.customer.findUnique({
          where: { email: email.toLowerCase() }
        })

        if (existingEmail) {
          return {
            success: false,
            message: 'Customer with this email already exists'
          }
        }

        // Validate email format
        if (!this.validateEmail(email)) {
          return {
            success: false,
            message: 'Invalid email format'
          }
        }
      }

      // Validate phone format (if provided)
      if (phone && !this.validatePhone(phone)) {
        return {
          success: false,
          message: 'Invalid phone number format'
        }
      }

      // Validate credit limit
      if (creditLimit < 0) {
        return {
          success: false,
          message: 'Credit limit cannot be negative'
        }
      }

      // Create customer
      const newCustomer = await prisma.customer.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email?.toLowerCase(),
          phone: phone?.trim(),
          address: address?.trim(),
          city: city?.trim(),
          postalCode: postalCode?.trim(),
          creditLimit
        },
        include: {
          _count: {
            select: { 
              sales: true,
              invoices: true
            }
          }
        }
      })

      logger.info(`New customer created: ${newCustomer.id} - ${newCustomer.firstName} ${newCustomer.lastName}`)

      return {
        success: true,
        message: 'Customer created successfully',
        customer: {
          ...newCustomer,
          totalSpent: 0,
          lastPurchase: undefined
        }
      }
    } catch (error) {
      logger.error('Create customer error:', error)
      return {
        success: false,
        message: 'An error occurred while creating customer'
      }
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(customerId: string, updateData: UpdateCustomerData): Promise<CustomerResult> {
    try {
      // Find existing customer
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (!existingCustomer) {
        return {
          success: false,
          message: 'Customer not found'
        }
      }

      // Check email uniqueness if being updated
      if (updateData.email && updateData.email.toLowerCase() !== existingCustomer.email) {
        const emailExists = await prisma.customer.findUnique({
          where: { email: updateData.email.toLowerCase() }
        })

        if (emailExists) {
          return {
            success: false,
            message: 'Customer with this email already exists'
          }
        }

        // Validate email format
        if (!this.validateEmail(updateData.email)) {
          return {
            success: false,
            message: 'Invalid email format'
          }
        }
      }

      // Validate phone format if being updated
      if (updateData.phone && !this.validatePhone(updateData.phone)) {
        return {
          success: false,
          message: 'Invalid phone number format'
        }
      }

      // Validate credit limit
      if (updateData.creditLimit !== undefined && updateData.creditLimit < 0) {
        return {
          success: false,
          message: 'Credit limit cannot be negative'
        }
      }

      // Validate loyalty points
      if (updateData.loyaltyPoints !== undefined && updateData.loyaltyPoints < 0) {
        return {
          success: false,
          message: 'Loyalty points cannot be negative'
        }
      }

      // Prepare update data
      const updatePayload: any = {}

      if (updateData.firstName) {
        updatePayload.firstName = updateData.firstName.trim()
      }

      if (updateData.lastName) {
        updatePayload.lastName = updateData.lastName.trim()
      }

      if (updateData.email !== undefined) {
        updatePayload.email = updateData.email?.toLowerCase()
      }

      if (updateData.phone !== undefined) {
        updatePayload.phone = updateData.phone?.trim()
      }

      if (updateData.address !== undefined) {
        updatePayload.address = updateData.address?.trim()
      }

      if (updateData.city !== undefined) {
        updatePayload.city = updateData.city?.trim()
      }

      if (updateData.postalCode !== undefined) {
        updatePayload.postalCode = updateData.postalCode?.trim()
      }

      if (updateData.creditLimit !== undefined) {
        updatePayload.creditLimit = updateData.creditLimit
      }

      if (updateData.loyaltyPoints !== undefined) {
        updatePayload.loyaltyPoints = updateData.loyaltyPoints
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive
      }

      // Update customer
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: updatePayload,
        include: {
          _count: {
            select: { 
              sales: true,
              invoices: true
            }
          }
        }
      })

      // Get purchase analytics
      const analytics = await this.getCustomerPurchaseData(customerId)

      logger.info(`Customer updated: ${customerId} - ${updatedCustomer.firstName} ${updatedCustomer.lastName}`)

      return {
        success: true,
        message: 'Customer updated successfully',
        customer: {
          ...updatedCustomer,
          totalSpent: analytics.totalSpent,
          lastPurchase: analytics.lastPurchase
        }
      }
    } catch (error) {
      logger.error('Update customer error:', error)
      return {
        success: false,
        message: 'An error occurred while updating customer'
      }
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomer(customerId: string): Promise<CustomerResult> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          _count: {
            select: { 
              sales: true,
              invoices: true
            }
          }
        }
      })

      if (!customer) {
        return {
          success: false,
          message: 'Customer not found'
        }
      }

      // Get purchase analytics
      const analytics = await this.getCustomerPurchaseData(customerId)

      return {
        success: true,
        message: 'Customer retrieved successfully',
        customer: {
          ...customer,
          totalSpent: analytics.totalSpent,
          lastPurchase: analytics.lastPurchase
        }
      }
    } catch (error) {
      logger.error('Get customer error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving customer'
      }
    }
  }

  /**
   * Get customers with filtering and pagination
   */
  static async getCustomers(filters: CustomerFilters = {}): Promise<CustomerListResult> {
    try {
      const {
        search,
        isActive,
        hasLoyaltyPoints,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (hasLoyaltyPoints) {
        where.loyaltyPoints = { gt: 0 }
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get customers and total count
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            _count: {
              select: { 
                sales: true,
                invoices: true
              }
            }
          },
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ],
          skip,
          take: limit
        }),
        prisma.customer.count({ where })
      ])

      // Enhance customers with purchase data
      const enhancedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const analytics = await this.getCustomerPurchaseData(customer.id)
          return {
            ...customer,
            totalSpent: analytics.totalSpent,
            lastPurchase: analytics.lastPurchase
          }
        })
      )

      return {
        success: true,
        message: 'Customers retrieved successfully',
        customers: enhancedCustomers,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get customers error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving customers'
      }
    }
  }

  /**
   * Delete customer
   */
  static async deleteCustomer(customerId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (!customer) {
        return {
          success: false,
          message: 'Customer not found'
        }
      }

      // Check if customer has any sales
      const salesCount = await prisma.sale.count({
        where: { customerId }
      })

      if (salesCount > 0) {
        return {
          success: false,
          message: 'Cannot delete customer with existing sales history. Consider deactivating instead.'
        }
      }

      // Check if customer has any invoices
      const invoiceCount = await prisma.invoice.count({
        where: { customerId }
      })

      if (invoiceCount > 0) {
        return {
          success: false,
          message: 'Cannot delete customer with existing invoices. Consider deactivating instead.'
        }
      }

      // Delete customer
      await prisma.customer.delete({
        where: { id: customerId }
      })

      logger.info(`Customer deleted: ${customerId}`)

      return {
        success: true,
        message: 'Customer deleted successfully'
      }
    } catch (error) {
      logger.error('Delete customer error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting customer'
      }
    }
  }

  /**
   * Get all active customers (for dropdowns)
   */
  static async getActiveCustomers(): Promise<CustomerListResult> {
    try {
      const customers = await prisma.customer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          loyaltyPoints: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
      })

      return {
        success: true,
        message: 'Active customers retrieved successfully',
        customers,
        total: customers.length
      }
    } catch (error) {
      logger.error('Get active customers error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving active customers'
      }
    }
  }

  /**
   * Get customer purchase history
   */
  static async getCustomerPurchaseHistory(customerId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit

      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
          where: { customerId },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true
                  }
                }
              }
            },
            cashier: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.sale.count({ where: { customerId } })
      ])

      return {
        success: true,
        message: 'Purchase history retrieved successfully',
        sales,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get customer purchase history error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving purchase history'
      }
    }
  }

  /**
   * Get customer analytics
   */
  static async getCustomerAnalytics(customerId: string): Promise<CustomerAnalyticsResult> {
    try {
      // Get customer sales data
      const sales = await prisma.sale.findMany({
        where: { customerId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      if (sales.length === 0) {
        return {
          success: true,
          message: 'Customer analytics retrieved successfully',
          analytics: {
            totalSpent: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            loyaltyPointsEarned: 0,
            loyaltyPointsUsed: 0,
            favoriteProducts: []
          }
        }
      }

      // Calculate analytics
      const totalSpent = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
      const totalOrders = sales.length
      const averageOrderValue = totalSpent / totalOrders
      const lastPurchaseDate = sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt

      // Calculate favorite products
      const productStats = new Map<string, { name: string; quantity: number; spent: number }>()
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productStats.get(item.productId) || { 
            name: item.product.name, 
            quantity: 0, 
            spent: 0 
          }
          existing.quantity += item.quantity
          existing.spent += Number(item.totalPrice)
          productStats.set(item.productId, existing)
        })
      })

      const favoriteProducts = Array.from(productStats.entries())
        .map(([productId, stats]) => ({
          productId,
          productName: stats.name,
          totalQuantity: stats.quantity,
          totalSpent: stats.spent
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5) // Top 5 products

      // Get customer loyalty points (for earned/used calculation)
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { loyaltyPoints: true }
      })

      // Simple loyalty calculation: 1 point per dollar spent, assume current points are remaining
      const loyaltyPointsEarned = Math.floor(totalSpent)
      const loyaltyPointsUsed = loyaltyPointsEarned - (customer?.loyaltyPoints || 0)

      const analytics: CustomerAnalytics = {
        totalSpent,
        totalOrders,
        averageOrderValue,
        lastPurchaseDate,
        loyaltyPointsEarned,
        loyaltyPointsUsed: Math.max(0, loyaltyPointsUsed),
        favoriteProducts
      }

      return {
        success: true,
        message: 'Customer analytics retrieved successfully',
        analytics
      }
    } catch (error) {
      logger.error('Get customer analytics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving customer analytics'
      }
    }
  }

  /**
   * Update customer loyalty points
   */
  static async updateLoyaltyPoints(customerId: string, pointsChange: number, reason: string): Promise<CustomerResult> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (!customer) {
        return {
          success: false,
          message: 'Customer not found'
        }
      }

      const newPoints = customer.loyaltyPoints + pointsChange

      if (newPoints < 0) {
        return {
          success: false,
          message: 'Insufficient loyalty points'
        }
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newPoints },
        include: {
          _count: {
            select: { 
              sales: true,
              invoices: true
            }
          }
        }
      })

      logger.info(`Loyalty points updated for customer ${customerId}: ${pointsChange} points (${reason})`)

      // Get purchase analytics
      const analytics = await this.getCustomerPurchaseData(customerId)

      return {
        success: true,
        message: 'Loyalty points updated successfully',
        customer: {
          ...updatedCustomer,
          totalSpent: analytics.totalSpent,
          lastPurchase: analytics.lastPurchase
        }
      }
    } catch (error) {
      logger.error('Update loyalty points error:', error)
      return {
        success: false,
        message: 'An error occurred while updating loyalty points'
      }
    }
  }

  /**
   * Search customers by various criteria
   */
  static async searchCustomers(query: string, limit = 10) {
    try {
      const customers = await prisma.customer.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          loyaltyPoints: true
        },
        take: limit,
        orderBy: [
          { firstName: 'asc' },
          { lastName: 'asc' }
        ]
      })

      return {
        success: true,
        message: 'Customer search completed successfully',
        customers
      }
    } catch (error) {
      logger.error('Search customers error:', error)
      return {
        success: false,
        message: 'An error occurred while searching customers'
      }
    }
  }

  /**
   * Get customer purchase data (total spent and last purchase)
   */
  private static async getCustomerPurchaseData(customerId: string) {
    const salesData = await prisma.sale.aggregate({
      where: { customerId },
      _sum: { totalAmount: true },
      _max: { createdAt: true }
    })

    return {
      totalSpent: Number(salesData._sum.totalAmount || 0),
      lastPurchase: salesData._max.createdAt
    }
  }

  /**
   * Validate email format
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone number format
   */
  private static validatePhone(phone: string): boolean {
    // Basic phone validation - can be enhanced based on specific requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
  }
}