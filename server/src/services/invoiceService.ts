import { Invoice, InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { NotificationService } from './notificationService'

export interface CreateInvoiceData {
  customerId: string
  items: CreateInvoiceItemData[]
  dueDate: Date
  notes?: string
  terms?: string
  discountAmount?: number
  isRecurring?: boolean
  recurringInterval?: string
}

export interface CreateInvoiceItemData {
  description: string
  quantity: number
  unitPrice: number
  taxRate?: number
  productId?: string
}

export interface UpdateInvoiceData {
  customerId?: string
  items?: CreateInvoiceItemData[]
  dueDate?: Date
  notes?: string
  terms?: string
  discountAmount?: number
  status?: InvoiceStatus
  isRecurring?: boolean
  recurringInterval?: string
}

export interface InvoiceFilters {
  search?: string
  status?: InvoiceStatus
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
  isOverdue?: boolean
  page?: number
  limit?: number
}

export interface InvoiceResult {
  success: boolean
  message: string
  invoice?: Invoice & {
    customer: {
      id: string
      firstName: string
      lastName: string
      email: string | null
    }
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number
      totalPrice: number
      taxRate: number
      product?: {
        id: string
        name: string
        sku: string
      } | null
    }>
    payments: Array<{
      id: string
      amount: number
      paymentMethod: PaymentMethod
      paymentDate: Date
      reference: string | null
    }>
    _count?: {
      items: number
      payments: number
    }
  }
}

export interface InvoiceListResult {
  success: boolean
  message: string
  invoices?: Array<Invoice & {
    customer: {
      id: string
      firstName: string
      lastName: string
      email: string | null
    }
    _count: {
      items: number
      payments: number
    }
    totalPaid?: number
    remainingAmount?: number
  }>
  total?: number
  page?: number
  limit?: number
}

export interface InvoicePaymentData {
  amount: number
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
  paymentDate?: Date
}

export interface InvoiceAnalytics {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  averageInvoiceValue: number
  statusBreakdown: Record<InvoiceStatus, number>
  monthlyTrends: Array<{
    month: string
    totalInvoices: number
    totalAmount: number
    paidAmount: number
  }>
}

/**
 * Invoice Management Service
 * Handles invoice CRUD operations, payment tracking, and automated billing
 */
export class InvoiceService {
  /**
   * Create a new invoice
   */
  static async createInvoice(invoiceData: CreateInvoiceData): Promise<InvoiceResult> {
    try {
      const {
        customerId,
        items,
        dueDate,
        notes,
        terms,
        discountAmount = 0,
        isRecurring = false,
        recurringInterval
      } = invoiceData

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (!customer) {
        return {
          success: false,
          message: 'Customer not found'
        }
      }

      // Validate items
      if (!items || items.length === 0) {
        return {
          success: false,
          message: 'Invoice must have at least one item'
        }
      }

      // Validate item data
      for (const item of items) {
        if (item.quantity <= 0) {
          return {
            success: false,
            message: 'Item quantity must be greater than zero'
          }
        }
        if (item.unitPrice < 0) {
          return {
            success: false,
            message: 'Item unit price cannot be negative'
          }
        }
        if (item.taxRate && (item.taxRate < 0 || item.taxRate > 100)) {
          return {
            success: false,
            message: 'Tax rate must be between 0 and 100'
          }
        }
      }

      // Validate due date
      if (dueDate < new Date()) {
        return {
          success: false,
          message: 'Due date cannot be in the past'
        }
      }

      // Validate recurring settings
      if (isRecurring && !recurringInterval) {
        return {
          success: false,
          message: 'Recurring interval is required for recurring invoices'
        }
      }

      if (recurringInterval && !['monthly', 'quarterly', 'yearly'].includes(recurringInterval)) {
        return {
          success: false,
          message: 'Invalid recurring interval. Must be monthly, quarterly, or yearly'
        }
      }

      // Calculate totals
      let subtotal = 0
      let taxAmount = 0

      const processedItems = items.map(item => {
        const itemTotal = item.quantity * item.unitPrice
        const itemTax = itemTotal * (item.taxRate || 0) / 100
        
        subtotal += itemTotal
        taxAmount += itemTax

        return {
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          taxRate: item.taxRate || 0,
          productId: item.productId
        }
      })

      const totalAmount = subtotal + taxAmount - discountAmount

      if (totalAmount < 0) {
        return {
          success: false,
          message: 'Total amount cannot be negative'
        }
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber()

      // Calculate next invoice date for recurring invoices
      let nextInvoiceDate: Date | undefined
      if (isRecurring && recurringInterval) {
        nextInvoiceDate = this.calculateNextInvoiceDate(new Date(), recurringInterval)
      }

      // Create invoice with items
      const newInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          dueDate,
          notes: notes?.trim(),
          terms: terms?.trim(),
          isRecurring,
          recurringInterval,
          nextInvoiceDate,
          items: {
            create: processedItems
          }
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
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
          payments: true,
          _count: {
            select: {
              items: true,
              payments: true
            }
          }
        }
      })

      logger.info(`New invoice created: ${newInvoice.invoiceNumber} for customer ${customerId}`)

      return {
        success: true,
        message: 'Invoice created successfully',
        invoice: newInvoice
      }
    } catch (error) {
      logger.error('Create invoice error:', error)
      return {
        success: false,
        message: 'An error occurred while creating invoice'
      }
    }
  }

  /**
   * Update invoice
   */
  static async updateInvoice(invoiceId: string, updateData: UpdateInvoiceData): Promise<InvoiceResult> {
    try {
      // Find existing invoice
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: true,
          payments: true
        }
      })

      if (!existingInvoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      // Check if invoice can be modified
      if (existingInvoice.status === 'PAID') {
        return {
          success: false,
          message: 'Cannot modify paid invoice'
        }
      }

      // If updating items, validate and recalculate totals
      let updatePayload: any = {}

      if (updateData.items) {
        // Validate items
        if (updateData.items.length === 0) {
          return {
            success: false,
            message: 'Invoice must have at least one item'
          }
        }

        // Validate item data
        for (const item of updateData.items) {
          if (item.quantity <= 0) {
            return {
              success: false,
              message: 'Item quantity must be greater than zero'
            }
          }
          if (item.unitPrice < 0) {
            return {
              success: false,
              message: 'Item unit price cannot be negative'
            }
          }
          if (item.taxRate && (item.taxRate < 0 || item.taxRate > 100)) {
            return {
              success: false,
              message: 'Tax rate must be between 0 and 100'
            }
          }
        }

        // Calculate new totals
        let subtotal = 0
        let taxAmount = 0

        const processedItems = updateData.items.map(item => {
          const itemTotal = item.quantity * item.unitPrice
          const itemTax = itemTotal * (item.taxRate || 0) / 100
          
          subtotal += itemTotal
          taxAmount += itemTax

          return {
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal,
            taxRate: item.taxRate || 0,
            productId: item.productId
          }
        })

        const discountAmount = updateData.discountAmount ?? existingInvoice.discountAmount
        const totalAmount = subtotal + taxAmount - Number(discountAmount)

        if (totalAmount < 0) {
          return {
            success: false,
            message: 'Total amount cannot be negative'
          }
        }

        updatePayload.subtotal = subtotal
        updatePayload.taxAmount = taxAmount
        updatePayload.totalAmount = totalAmount
      }

      // Validate customer if being updated
      if (updateData.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: updateData.customerId }
        })

        if (!customer) {
          return {
            success: false,
            message: 'Customer not found'
          }
        }

        updatePayload.customerId = updateData.customerId
      }

      // Validate due date
      if (updateData.dueDate && updateData.dueDate < new Date()) {
        return {
          success: false,
          message: 'Due date cannot be in the past'
        }
      }

      // Validate recurring settings
      if (updateData.isRecurring && !updateData.recurringInterval) {
        return {
          success: false,
          message: 'Recurring interval is required for recurring invoices'
        }
      }

      if (updateData.recurringInterval && !['monthly', 'quarterly', 'yearly'].includes(updateData.recurringInterval)) {
        return {
          success: false,
          message: 'Invalid recurring interval. Must be monthly, quarterly, or yearly'
        }
      }

      // Build update payload
      if (updateData.dueDate) updatePayload.dueDate = updateData.dueDate
      if (updateData.notes !== undefined) updatePayload.notes = updateData.notes?.trim()
      if (updateData.terms !== undefined) updatePayload.terms = updateData.terms?.trim()
      if (updateData.discountAmount !== undefined) updatePayload.discountAmount = updateData.discountAmount
      if (updateData.status) updatePayload.status = updateData.status
      if (updateData.isRecurring !== undefined) updatePayload.isRecurring = updateData.isRecurring
      if (updateData.recurringInterval !== undefined) updatePayload.recurringInterval = updateData.recurringInterval

      // Calculate next invoice date for recurring invoices
      if (updateData.isRecurring && updateData.recurringInterval) {
        updatePayload.nextInvoiceDate = this.calculateNextInvoiceDate(new Date(), updateData.recurringInterval)
      } else if (updateData.isRecurring === false) {
        updatePayload.nextInvoiceDate = null
      }

      // Update status-specific fields
      if (updateData.status === 'SENT' && !existingInvoice.sentDate) {
        updatePayload.sentDate = new Date()
      }
      if (updateData.status === 'VIEWED' && !existingInvoice.viewedDate) {
        updatePayload.viewedDate = new Date()
      }

      // Update invoice
      const updatedInvoice = await prisma.$transaction(async (tx) => {
        // Delete existing items if updating items
        if (updateData.items) {
          await tx.invoiceItem.deleteMany({
            where: { invoiceId }
          })
        }

        // Update invoice
        const invoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: updatePayload,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
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
            payments: true,
            _count: {
              select: {
                items: true,
                payments: true
              }
            }
          }
        })

        // Create new items if updating items
        if (updateData.items) {
          const processedItems = updateData.items.map(item => ({
            invoiceId,
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            taxRate: item.taxRate || 0,
            productId: item.productId
          }))

          await tx.invoiceItem.createMany({
            data: processedItems
          })

          // Fetch updated invoice with new items
          return await tx.invoice.findUnique({
            where: { id: invoiceId },
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              },
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
              payments: true,
              _count: {
                select: {
                  items: true,
                  payments: true
                }
              }
            }
          })
        }

        return invoice
      })

      logger.info(`Invoice updated: ${updatedInvoice?.invoiceNumber}`)

      return {
        success: true,
        message: 'Invoice updated successfully',
        invoice: updatedInvoice!
      }
    } catch (error) {
      logger.error('Update invoice error:', error)
      return {
        success: false,
        message: 'An error occurred while updating invoice'
      }
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId: string): Promise<InvoiceResult> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
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
          payments: true,
          _count: {
            select: {
              items: true,
              payments: true
            }
          }
        }
      })

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      return {
        success: true,
        message: 'Invoice retrieved successfully',
        invoice
      }
    } catch (error) {
      logger.error('Get invoice error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving invoice'
      }
    }
  }

  /**
   * Get invoices with filtering and pagination
   */
  static async getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResult> {
    try {
      const {
        search,
        status,
        customerId,
        dateFrom,
        dateTo,
        isOverdue,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (status) {
        where.status = status
      }

      if (customerId) {
        where.customerId = customerId
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      if (isOverdue) {
        where.AND = [
          { status: { in: ['SENT', 'VIEWED'] } },
          { dueDate: { lt: new Date() } }
        ]
      }

      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }}
        ]
      }

      // Get invoices and total count
      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            _count: {
              select: {
                items: true,
                payments: true
              }
            },
            payments: {
              select: {
                amount: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.invoice.count({ where })
      ])

      // Calculate payment totals for each invoice
      const enhancedInvoices = invoices.map(invoice => {
        const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
        const remainingAmount = Number(invoice.totalAmount) - totalPaid

        return {
          ...invoice,
          totalPaid,
          remainingAmount
        }
      })

      return {
        success: true,
        message: 'Invoices retrieved successfully',
        invoices: enhancedInvoices,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get invoices error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving invoices'
      }
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(invoiceId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if invoice exists
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true
        }
      })

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      // Check if invoice has payments
      if (invoice.payments.length > 0) {
        return {
          success: false,
          message: 'Cannot delete invoice with recorded payments'
        }
      }

      // Check if invoice is paid
      if (invoice.status === 'PAID') {
        return {
          success: false,
          message: 'Cannot delete paid invoice'
        }
      }

      // Delete invoice (items will be deleted due to cascade)
      await prisma.invoice.delete({
        where: { id: invoiceId }
      })

      logger.info(`Invoice deleted: ${invoice.invoiceNumber}`)

      return {
        success: true,
        message: 'Invoice deleted successfully'
      }
    } catch (error) {
      logger.error('Delete invoice error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting invoice'
      }
    }
  }

  /**
   * Record payment for invoice
   */
  static async recordPayment(invoiceId: string, paymentData: InvoicePaymentData): Promise<InvoiceResult> {
    try {
      const { amount, paymentMethod, reference, notes, paymentDate = new Date() } = paymentData

      // Find invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true
        }
      })

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      // Validate payment amount
      if (amount <= 0) {
        return {
          success: false,
          message: 'Payment amount must be greater than zero'
        }
      }

      // Calculate remaining amount
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const remainingAmount = Number(invoice.totalAmount) - totalPaid

      if (amount > remainingAmount) {
        return {
          success: false,
          message: 'Payment amount exceeds remaining balance'
        }
      }

      // Record payment and update invoice status
      const updatedInvoice = await prisma.$transaction(async (tx) => {
        // Create payment record
        const payment = await tx.invoicePayment.create({
          data: {
            invoiceId,
            amount,
            paymentMethod,
            paymentDate,
            reference: reference?.trim(),
            notes: notes?.trim()
          }
        })

        // Update invoice status and payment date
        const newTotalPaid = totalPaid + amount
        const isFullyPaid = newTotalPaid >= Number(invoice.totalAmount)
        const isPartialPayment = newTotalPaid > 0 && newTotalPaid < Number(invoice.totalAmount)

        const updateData: any = {}
        if (isFullyPaid) {
          updateData.status = 'PAID'
          updateData.paidDate = paymentDate
          updateData.paymentMethod = paymentMethod
        } else if (isPartialPayment && invoice.status === 'DRAFT') {
          // If it's a partial payment on a draft, mark as sent
          updateData.status = 'SENT'
          updateData.sentDate = new Date()
        }

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: updateData,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
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
            payments: true,
            _count: {
              select: {
                items: true,
                payments: true
              }
            }
          }
        })

        // Log payment reconciliation
        logger.info(`Payment reconciliation for invoice ${invoice.invoiceNumber}:`, {
          paymentId: payment.id,
          amount: amount,
          totalPaid: newTotalPaid,
          remainingBalance: Number(invoice.totalAmount) - newTotalPaid,
          isFullyPaid,
          newStatus: updateData.status || invoice.status
        })

        return updatedInvoice
      })

      logger.info(`Payment recorded for invoice ${invoice.invoiceNumber}: ${amount}`)

      return {
        success: true,
        message: 'Payment recorded successfully',
        invoice: updatedInvoice
      }
    } catch (error) {
      logger.error('Record payment error:', error)
      return {
        success: false,
        message: 'An error occurred while recording payment'
      }
    }
  }

  /**
   * Get payment reconciliation report
   */
  static async getPaymentReconciliation(dateFrom?: Date, dateTo?: Date): Promise<{
    success: boolean
    message: string
    reconciliation?: {
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
  }> {
    try {
      const where: any = {}
      
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      // Get invoices with payments
      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          payments: true
        }
      })

      // Calculate reconciliation data
      const totalInvoices = invoices.length
      const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
      
      let totalPayments = 0
      let totalPaymentAmount = 0
      let fullyPaidInvoices = 0
      let partiallyPaidInvoices = 0
      let unpaidInvoices = 0
      let overdueAmount = 0
      const paymentsByMethod: Record<string, { count: number; amount: number }> = {}

      const today = new Date()

      invoices.forEach(invoice => {
        const invoicePayments = invoice.payments
        const invoicePaidAmount = invoicePayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
        const invoiceAmount = Number(invoice.totalAmount)
        
        totalPayments += invoicePayments.length
        totalPaymentAmount += invoicePaidAmount

        // Categorize invoice payment status
        if (invoicePaidAmount >= invoiceAmount) {
          fullyPaidInvoices++
        } else if (invoicePaidAmount > 0) {
          partiallyPaidInvoices++
        } else {
          unpaidInvoices++
        }

        // Calculate overdue amount
        if (invoice.dueDate < today && invoicePaidAmount < invoiceAmount) {
          overdueAmount += (invoiceAmount - invoicePaidAmount)
        }

        // Group payments by method
        invoicePayments.forEach(payment => {
          const method = payment.paymentMethod
          if (!paymentsByMethod[method]) {
            paymentsByMethod[method] = { count: 0, amount: 0 }
          }
          paymentsByMethod[method].count++
          paymentsByMethod[method].amount += Number(payment.amount)
        })
      })

      const reconciliationDifference = totalInvoiceAmount - totalPaymentAmount

      const reconciliation = {
        totalInvoices,
        totalInvoiceAmount,
        totalPayments,
        totalPaymentAmount,
        fullyPaidInvoices,
        partiallyPaidInvoices,
        unpaidInvoices,
        reconciliationDifference,
        paymentsByMethod,
        overdueAmount
      }

      return {
        success: true,
        message: 'Payment reconciliation retrieved successfully',
        reconciliation
      }
    } catch (error) {
      logger.error('Get payment reconciliation error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payment reconciliation'
      }
    }
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(invoiceId: string): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true
        }
      })

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      if (invoice.status === 'PAID') {
        return {
          success: false,
          message: 'Cannot send reminder for paid invoice'
        }
      }

      if (!invoice.customer.email) {
        return {
          success: false,
          message: 'Customer email not available'
        }
      }

      // Update reminder count and date
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          reminderCount: invoice.reminderCount + 1,
          lastReminderDate: new Date()
        }
      })

      // Send email reminder (integrate with notification service)
      await this.sendReminderEmail(invoice, invoice.customer)

      logger.info(`Payment reminder sent for invoice ${invoice.invoiceNumber}`)

      return {
        success: true,
        message: 'Payment reminder sent successfully'
      }
    } catch (error) {
      logger.error('Send payment reminder error:', error)
      return {
        success: false,
        message: 'An error occurred while sending payment reminder'
      }
    }
  }

  /**
   * Send automated payment reminders for overdue invoices
   */
  static async sendAutomatedReminders(): Promise<{ success: boolean; message: string; remindersSent: number }> {
    try {
      const today = new Date()
      const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000))
      const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))
      const fourteenDaysAgo = new Date(today.getTime() - (14 * 24 * 60 * 60 * 1000))

      // Find invoices that need reminders
      const invoicesNeedingReminders = await prisma.invoice.findMany({
        where: {
          AND: [
            { status: { in: ['SENT', 'VIEWED'] } },
            { dueDate: { lt: today } },
            {
              OR: [
                // First reminder: 3 days after due date, no reminders sent
                {
                  AND: [
                    { dueDate: { lte: threeDaysAgo } },
                    { reminderCount: 0 }
                  ]
                },
                // Second reminder: 7 days after due date, only 1 reminder sent
                {
                  AND: [
                    { dueDate: { lte: sevenDaysAgo } },
                    { reminderCount: 1 },
                    { lastReminderDate: { lte: threeDaysAgo } }
                  ]
                },
                // Third reminder: 14 days after due date, only 2 reminders sent
                {
                  AND: [
                    { dueDate: { lte: fourteenDaysAgo } },
                    { reminderCount: 2 },
                    { lastReminderDate: { lte: sevenDaysAgo } }
                  ]
                }
              ]
            }
          ]
        },
        include: {
          customer: true
        }
      })

      let remindersSent = 0

      for (const invoice of invoicesNeedingReminders) {
        try {
          if (invoice.customer.email) {
            await this.sendReminderEmail(invoice, invoice.customer)
            
            // Update reminder count and date
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                reminderCount: invoice.reminderCount + 1,
                lastReminderDate: new Date(),
                status: invoice.reminderCount >= 2 ? 'OVERDUE' : invoice.status
              }
            })

            remindersSent++
            logger.info(`Automated reminder sent for invoice ${invoice.invoiceNumber}`)
          }
        } catch (error) {
          logger.error(`Failed to send reminder for invoice ${invoice.invoiceNumber}:`, error)
        }
      }

      return {
        success: true,
        message: `Sent ${remindersSent} automated payment reminders`,
        remindersSent
      }
    } catch (error) {
      logger.error('Send automated reminders error:', error)
      return {
        success: false,
        message: 'An error occurred while sending automated reminders',
        remindersSent: 0
      }
    }
  }

  /**
   * Update invoice status based on current conditions
   */
  static async updateInvoiceStatus(invoiceId: string): Promise<{ success: boolean; message: string; status?: string }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true
        }
      })

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found'
        }
      }

      // Calculate payment status
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      const remainingAmount = Number(invoice.totalAmount) - totalPaid
      const isFullyPaid = remainingAmount <= 0
      const isOverdue = new Date() > invoice.dueDate && !isFullyPaid

      let newStatus = invoice.status

      // Determine new status
      if (isFullyPaid && invoice.status !== 'PAID') {
        newStatus = 'PAID'
      } else if (isOverdue && ['SENT', 'VIEWED'].includes(invoice.status)) {
        newStatus = 'OVERDUE'
      }

      // Update status if changed
      if (newStatus !== invoice.status) {
        const updateData: any = { status: newStatus }
        
        if (newStatus === 'PAID' && !invoice.paidDate) {
          updateData.paidDate = new Date()
        }

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: updateData
        })

        logger.info(`Invoice ${invoice.invoiceNumber} status updated from ${invoice.status} to ${newStatus}`)
      }

      return {
        success: true,
        message: 'Invoice status updated successfully',
        status: newStatus
      }
    } catch (error) {
      logger.error('Update invoice status error:', error)
      return {
        success: false,
        message: 'An error occurred while updating invoice status'
      }
    }
  }

  /**
   * Bulk update invoice statuses
   */
  static async updateAllInvoiceStatuses(): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['SENT', 'VIEWED', 'DRAFT'] }
        },
        include: {
          payments: true
        }
      })

      let updatedCount = 0

      for (const invoice of invoices) {
        const result = await this.updateInvoiceStatus(invoice.id)
        if (result.success && result.status !== invoice.status) {
          updatedCount++
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} invoice statuses`,
        updated: updatedCount
      }
    } catch (error) {
      logger.error('Bulk update invoice statuses error:', error)
      return {
        success: false,
        message: 'An error occurred while updating invoice statuses',
        updated: 0
      }
    }
  }

  /**
   * Send reminder email to customer
   */
  private static async sendReminderEmail(invoice: any, customer: any): Promise<void> {
    const daysOverdue = Math.ceil((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const customerName = `${customer.firstName} ${customer.lastName}`
    
    await NotificationService.sendPaymentReminderEmail(
      customer.email,
      customerName,
      invoice.invoiceNumber,
      Number(invoice.totalAmount),
      invoice.dueDate,
      daysOverdue,
      invoice.reminderCount + 1 // +1 because we're about to send the reminder
    )
  }

  /**
   * Get overdue invoices
   */
  static async getOverdueInvoices(): Promise<InvoiceListResult> {
    try {
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          AND: [
            { status: { in: ['SENT', 'VIEWED'] } },
            { dueDate: { lt: new Date() } }
          ]
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              items: true,
              payments: true
            }
          },
          payments: {
            select: {
              amount: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      })

      // Calculate payment totals for each invoice
      const enhancedInvoices = overdueInvoices.map(invoice => {
        const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
        const remainingAmount = Number(invoice.totalAmount) - totalPaid

        return {
          ...invoice,
          totalPaid,
          remainingAmount
        }
      })

      return {
        success: true,
        message: 'Overdue invoices retrieved successfully',
        invoices: enhancedInvoices,
        total: overdueInvoices.length
      }
    } catch (error) {
      logger.error('Get overdue invoices error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving overdue invoices'
      }
    }
  }

  /**
   * Generate recurring invoices
   */
  static async generateRecurringInvoices(): Promise<{ success: boolean; message: string; generated: number }> {
    try {
      const today = new Date()
      
      // Find invoices that need to be generated
      const recurringInvoices = await prisma.invoice.findMany({
        where: {
          isRecurring: true,
          nextInvoiceDate: {
            lte: today
          }
        },
        include: {
          items: true,
          customer: true
        }
      })

      let generatedCount = 0

      for (const originalInvoice of recurringInvoices) {
        try {
          // Calculate new due date
          const newDueDate = this.calculateNextInvoiceDate(today, originalInvoice.recurringInterval!)
          const nextInvoiceDate = this.calculateNextInvoiceDate(newDueDate, originalInvoice.recurringInterval!)

          // Generate new invoice number
          const invoiceNumber = await this.generateInvoiceNumber()

          // Create new invoice
          await prisma.invoice.create({
            data: {
              invoiceNumber,
              customerId: originalInvoice.customerId,
              subtotal: originalInvoice.subtotal,
              taxAmount: originalInvoice.taxAmount,
              discountAmount: originalInvoice.discountAmount,
              totalAmount: originalInvoice.totalAmount,
              dueDate: newDueDate,
              notes: originalInvoice.notes,
              terms: originalInvoice.terms,
              isRecurring: true,
              recurringInterval: originalInvoice.recurringInterval,
              nextInvoiceDate,
              items: {
                create: originalInvoice.items.map(item => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  taxRate: item.taxRate,
                  productId: item.productId
                }))
              }
            }
          })

          // Update original invoice's next generation date
          await prisma.invoice.update({
            where: { id: originalInvoice.id },
            data: { nextInvoiceDate }
          })

          generatedCount++
          logger.info(`Generated recurring invoice for ${originalInvoice.invoiceNumber}`)
        } catch (error) {
          logger.error(`Error generating recurring invoice for ${originalInvoice.invoiceNumber}:`, error)
        }
      }

      return {
        success: true,
        message: `Generated ${generatedCount} recurring invoices`,
        generated: generatedCount
      }
    } catch (error) {
      logger.error('Generate recurring invoices error:', error)
      return {
        success: false,
        message: 'An error occurred while generating recurring invoices',
        generated: 0
      }
    }
  }

  /**
   * Get invoice analytics
   */
  static async getInvoiceAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    success: boolean
    message: string
    analytics?: InvoiceAnalytics
  }> {
    try {
      const where: any = {}
      
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      // Get all invoices for the period
      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          payments: {
            select: {
              amount: true
            }
          }
        }
      })

      // Calculate totals
      const totalInvoices = invoices.length
      const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
      const paidAmount = invoices.reduce((sum, inv) => {
        const invoicePaid = inv.payments.reduce((pSum, payment) => pSum + Number(payment.amount), 0)
        return sum + invoicePaid
      }, 0)
      const pendingAmount = totalAmount - paidAmount

      // Calculate overdue amount
      const overdueAmount = invoices
        .filter(inv => inv.status !== 'PAID' && inv.dueDate < new Date())
        .reduce((sum, inv) => {
          const invoicePaid = inv.payments.reduce((pSum, payment) => pSum + Number(payment.amount), 0)
          return sum + (Number(inv.totalAmount) - invoicePaid)
        }, 0)

      const averageInvoiceValue = totalInvoices > 0 ? totalAmount / totalInvoices : 0

      // Status breakdown
      const statusBreakdown = invoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1
        return acc
      }, {} as Record<InvoiceStatus, number>)

      // Monthly trends (last 12 months)
      const monthlyTrends = []
      const now = new Date()
      
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        
        const monthInvoices = invoices.filter(inv => 
          inv.createdAt >= monthStart && inv.createdAt <= monthEnd
        )
        
        const monthTotal = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
        const monthPaid = monthInvoices.reduce((sum, inv) => {
          const invoicePaid = inv.payments.reduce((pSum, payment) => pSum + Number(payment.amount), 0)
          return sum + invoicePaid
        }, 0)

        monthlyTrends.push({
          month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
          totalInvoices: monthInvoices.length,
          totalAmount: monthTotal,
          paidAmount: monthPaid
        })
      }

      const analytics: InvoiceAnalytics = {
        totalInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        averageInvoiceValue,
        statusBreakdown,
        monthlyTrends
      }

      return {
        success: true,
        message: 'Invoice analytics retrieved successfully',
        analytics
      }
    } catch (error) {
      logger.error('Get invoice analytics error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving invoice analytics'
      }
    }
  }

  /**
   * Generate unique invoice number
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `INV-${year}-`
    
    // Get the latest invoice number for this year
    const latestInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        invoiceNumber: 'desc'
      }
    })

    let nextNumber = 1
    if (latestInvoice) {
      const currentNumber = parseInt(latestInvoice.invoiceNumber.replace(prefix, ''))
      nextNumber = currentNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`
  }

  /**
   * Create payment link for invoice
   */
  static async createPaymentLink(invoiceId: string, linkData: {
    amount: number
    currency: string
    description: string
    customerEmail?: string
    successUrl?: string
    cancelUrl?: string
    expiresAt?: Date
  }): Promise<{ success: boolean; message: string; paymentLink?: any }> {
    try {
      // Import PaymentGatewayService dynamically to avoid circular dependency
      const { PaymentGatewayService } = await import('./paymentGatewayService')
      
      const result = await PaymentGatewayService.createPaymentLink({
        invoiceId,
        ...linkData
      })

      return result
    } catch (error) {
      logger.error('Create payment link error:', error)
      return {
        success: false,
        message: 'An error occurred while creating payment link'
      }
    }
  }

  /**
   * Get payment links for invoice
   */
  static async getPaymentLinks(invoiceId: string): Promise<{
    success: boolean
    message: string
    paymentLinks?: any[]
  }> {
    try {
      const paymentLinks = await prisma.paymentLink.findMany({
        where: { invoiceId },
        orderBy: { createdAt: 'desc' }
      })

      return {
        success: true,
        message: 'Payment links retrieved successfully',
        paymentLinks
      }
    } catch (error) {
      logger.error('Get payment links error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving payment links'
      }
    }
  }

  /**
   * Calculate next invoice date based on interval
   */
  private static calculateNextInvoiceDate(fromDate: Date, interval: string): Date {
    const nextDate = new Date(fromDate)
    
    switch (interval) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
      default:
        throw new Error(`Invalid recurring interval: ${interval}`)
    }
    
    return nextDate
  }
}