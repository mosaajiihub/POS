import { Supplier } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface CreateSupplierData {
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  paymentTerms?: string
}

export interface UpdateSupplierData {
  name?: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  paymentTerms?: string
  isActive?: boolean
}

export interface SupplierFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface SupplierResult {
  success: boolean
  message: string
  supplier?: Supplier & { _count?: { products: number; purchaseOrders: number } }
}

export interface SupplierListResult {
  success: boolean
  message: string
  suppliers?: (Supplier & { _count?: { products: number; purchaseOrders: number } })[]
  total?: number
  page?: number
  limit?: number
}

/**
 * Supplier Management Service
 * Handles supplier CRUD operations with validation and business logic
 */
export class SupplierService {
  /**
   * Create a new supplier
   */
  static async createSupplier(supplierData: CreateSupplierData): Promise<SupplierResult> {
    try {
      const {
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentTerms
      } = supplierData

      // Check if supplier name already exists
      const existingSupplier = await prisma.supplier.findFirst({
        where: { name: name.trim() }
      })

      if (existingSupplier) {
        return {
          success: false,
          message: 'Supplier with this name already exists'
        }
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await prisma.supplier.findUnique({
          where: { email: email.toLowerCase() }
        })

        if (existingEmail) {
          return {
            success: false,
            message: 'Supplier with this email already exists'
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

      // Create supplier
      const newSupplier = await prisma.supplier.create({
        data: {
          name: name.trim(),
          contactPerson: contactPerson?.trim(),
          email: email?.toLowerCase(),
          phone: phone?.trim(),
          address: address?.trim(),
          city: city?.trim(),
          postalCode: postalCode?.trim(),
          paymentTerms: paymentTerms?.trim()
        },
        include: {
          _count: {
            select: { 
              products: true,
              purchaseOrders: true
            }
          }
        }
      })

      logger.info(`New supplier created: ${newSupplier.id} - ${newSupplier.name}`)

      return {
        success: true,
        message: 'Supplier created successfully',
        supplier: newSupplier
      }
    } catch (error) {
      logger.error('Create supplier error:', error)
      return {
        success: false,
        message: 'An error occurred while creating supplier'
      }
    }
  }

  /**
   * Update supplier
   */
  static async updateSupplier(supplierId: string, updateData: UpdateSupplierData): Promise<SupplierResult> {
    try {
      // Find existing supplier
      const existingSupplier = await prisma.supplier.findUnique({
        where: { id: supplierId }
      })

      if (!existingSupplier) {
        return {
          success: false,
          message: 'Supplier not found'
        }
      }

      // Check name uniqueness if being updated
      if (updateData.name && updateData.name.trim() !== existingSupplier.name) {
        const nameExists = await prisma.supplier.findFirst({
          where: { name: updateData.name.trim() }
        })

        if (nameExists) {
          return {
            success: false,
            message: 'Supplier with this name already exists'
          }
        }
      }

      // Check email uniqueness if being updated
      if (updateData.email && updateData.email.toLowerCase() !== existingSupplier.email) {
        const emailExists = await prisma.supplier.findUnique({
          where: { email: updateData.email.toLowerCase() }
        })

        if (emailExists) {
          return {
            success: false,
            message: 'Supplier with this email already exists'
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

      // Prepare update data
      const updatePayload: any = {}

      if (updateData.name) {
        updatePayload.name = updateData.name.trim()
      }

      if (updateData.contactPerson !== undefined) {
        updatePayload.contactPerson = updateData.contactPerson?.trim()
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

      if (updateData.paymentTerms !== undefined) {
        updatePayload.paymentTerms = updateData.paymentTerms?.trim()
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive
      }

      // Update supplier
      const updatedSupplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: updatePayload,
        include: {
          _count: {
            select: { 
              products: true,
              purchaseOrders: true
            }
          }
        }
      })

      logger.info(`Supplier updated: ${supplierId} - ${updatedSupplier.name}`)

      return {
        success: true,
        message: 'Supplier updated successfully',
        supplier: updatedSupplier
      }
    } catch (error) {
      logger.error('Update supplier error:', error)
      return {
        success: false,
        message: 'An error occurred while updating supplier'
      }
    }
  }

  /**
   * Get supplier by ID
   */
  static async getSupplier(supplierId: string): Promise<SupplierResult> {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
          _count: {
            select: { 
              products: true,
              purchaseOrders: true
            }
          }
        }
      })

      if (!supplier) {
        return {
          success: false,
          message: 'Supplier not found'
        }
      }

      return {
        success: true,
        message: 'Supplier retrieved successfully',
        supplier
      }
    } catch (error) {
      logger.error('Get supplier error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving supplier'
      }
    }
  }

  /**
   * Get suppliers with filtering and pagination
   */
  static async getSuppliers(filters: SupplierFilters = {}): Promise<SupplierListResult> {
    try {
      const {
        search,
        isActive,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get suppliers and total count
      const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
          where,
          include: {
            _count: {
              select: { 
                products: true,
                purchaseOrders: true
              }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit
        }),
        prisma.supplier.count({ where })
      ])

      return {
        success: true,
        message: 'Suppliers retrieved successfully',
        suppliers,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get suppliers error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving suppliers'
      }
    }
  }

  /**
   * Delete supplier
   */
  static async deleteSupplier(supplierId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId }
      })

      if (!supplier) {
        return {
          success: false,
          message: 'Supplier not found'
        }
      }

      // Check if supplier has any products
      const productCount = await prisma.product.count({
        where: { supplierId }
      })

      if (productCount > 0) {
        return {
          success: false,
          message: 'Cannot delete supplier with existing products. Consider deactivating instead.'
        }
      }

      // Check if supplier has any purchase orders
      const purchaseOrderCount = await prisma.purchaseOrder.count({
        where: { supplierId }
      })

      if (purchaseOrderCount > 0) {
        return {
          success: false,
          message: 'Cannot delete supplier with existing purchase orders. Consider deactivating instead.'
        }
      }

      // Delete supplier
      await prisma.supplier.delete({
        where: { id: supplierId }
      })

      logger.info(`Supplier deleted: ${supplierId}`)

      return {
        success: true,
        message: 'Supplier deleted successfully'
      }
    } catch (error) {
      logger.error('Delete supplier error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting supplier'
      }
    }
  }

  /**
   * Get all active suppliers (for dropdowns)
   */
  static async getActiveSuppliers(): Promise<SupplierListResult> {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          contactPerson: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { name: 'asc' }
      })

      return {
        success: true,
        message: 'Active suppliers retrieved successfully',
        suppliers,
        total: suppliers.length
      }
    } catch (error) {
      logger.error('Get active suppliers error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving active suppliers'
      }
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