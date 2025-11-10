import { prisma } from '../config/database'
import { logger } from '../utils/logger'

interface TransactionData {
  customerId?: string
  cashierId: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
  }>
  paymentMethod: {
    type: 'cash' | 'card' | 'digital'
    details?: any
  }
  cashReceived?: number
}

interface TransactionFilters {
  startDate?: Date
  endDate?: Date
  customerId?: string
  status?: string
  page?: number
  limit?: number
}

interface VoidTransactionData {
  transactionId: string
  reason: string
  voidedBy: string
}

interface RefundData {
  transactionId: string
  items: Array<{
    productId: string
    quantity: number
    refundAmount: number
  }>
  reason: string
  processedBy: string
}

interface ServiceResult<T = any> {
  success: boolean
  message: string
  transaction?: T
  transactions?: T[]
  refund?: any
  total?: number
  page?: number
  limit?: number
}

/**
 * Transaction Service
 * Handles business logic for POS transactions
 */
export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(data: TransactionData): Promise<ServiceResult> {
    try {
      const { customerId, cashierId, items, paymentMethod, cashReceived } = data

      // Validate cashier exists
      const cashier = await prisma.user.findUnique({
        where: { id: cashierId }
      })

      if (!cashier) {
        return {
          success: false,
          message: 'Cashier not found'
        }
      }

      // Validate customer if provided
      if (customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId }
        })

        if (!customer) {
          return {
            success: false,
            message: 'Customer not found'
          }
        }
      }

      // Validate products and check stock availability
      const productIds = items.map(item => item.productId)
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true
        }
      })

      if (products.length !== productIds.length) {
        return {
          success: false,
          message: 'One or more products not found or inactive'
        }
      }

      // Check stock availability
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)
        if (!product) {
          return {
            success: false,
            message: `Product ${item.productId} not found`
          }
        }

        if (product.stockLevel < item.quantity) {
          return {
            success: false,
            message: `Insufficient stock for product ${product.name}. Available: ${product.stockLevel}, Required: ${item.quantity}`
          }
        }
      }

      // Calculate transaction totals
      let subtotal = 0
      let taxAmount = 0
      const saleItems = []

      for (const item of items) {
        const product = products.find(p => p.id === item.productId)!
        const itemSubtotal = item.quantity * item.unitPrice
        const itemTax = itemSubtotal * (product.taxRate || 0)
        
        subtotal += itemSubtotal
        taxAmount += itemTax

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
          taxAmount: itemTax
        })
      }

      const totalAmount = subtotal + taxAmount
      const changeAmount = paymentMethod.type === 'cash' && cashReceived ? cashReceived - totalAmount : 0

      // Validate cash payment
      if (paymentMethod.type === 'cash' && (!cashReceived || cashReceived < totalAmount)) {
        return {
          success: false,
          message: 'Insufficient cash received'
        }
      }

      // Generate transaction number
      const transactionNumber = `TXN-${Date.now()}`

      // Create transaction with items and update stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the sale record
        const sale = await tx.sale.create({
          data: {
            transactionNumber,
            customerId,
            cashierId,
            subtotal,
            taxAmount,
            totalAmount,
            paymentMethod: paymentMethod.type,
            paymentDetails: paymentMethod.details || {},
            cashReceived,
            changeAmount,
            status: 'COMPLETED',
            items: {
              create: saleItems
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true,
            cashier: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })

        // Update stock levels
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockLevel: {
                decrement: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'SALE',
              quantity: -item.quantity,
              reason: `Sale - ${transactionNumber}`,
              userId: cashierId
            }
          })
        }

        return sale
      })

      logger.info(`Transaction created successfully: ${transactionNumber}`)

      return {
        success: true,
        message: 'Transaction created successfully',
        transaction: result
      }
    } catch (error) {
      logger.error('Create transaction service error:', error)
      return {
        success: false,
        message: 'Failed to create transaction'
      }
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(transactionId: string): Promise<ServiceResult> {
    try {
      const transaction = await prisma.sale.findUnique({
        where: { id: transactionId },
        include: {
          items: {
            include: {
              product: true
            }
          },
          customer: true,
          cashier: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          refunds: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      })

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found'
        }
      }

      return {
        success: true,
        message: 'Transaction retrieved successfully',
        transaction
      }
    } catch (error) {
      logger.error('Get transaction service error:', error)
      return {
        success: false,
        message: 'Failed to retrieve transaction'
      }
    }
  }

  /**
   * Get transactions with filtering and pagination
   */
  static async getTransactions(filters: TransactionFilters): Promise<ServiceResult> {
    try {
      const {
        startDate,
        endDate,
        customerId,
        status,
        page = 1,
        limit = 20
      } = filters

      const where: any = {}

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      if (customerId) {
        where.customerId = customerId
      }

      if (status) {
        where.status = status
      }

      const skip = (page - 1) * limit

      const [transactions, total] = await Promise.all([
        prisma.sale.findMany({
          where,
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true,
            cashier: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.sale.count({ where })
      ])

      return {
        success: true,
        message: 'Transactions retrieved successfully',
        transactions,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get transactions service error:', error)
      return {
        success: false,
        message: 'Failed to retrieve transactions'
      }
    }
  }

  /**
   * Void a transaction
   */
  static async voidTransaction(data: VoidTransactionData): Promise<ServiceResult> {
    try {
      const { transactionId, reason, voidedBy } = data

      // Get the transaction
      const transaction = await prisma.sale.findUnique({
        where: { id: transactionId },
        include: {
          items: true,
          refunds: true
        }
      })

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found'
        }
      }

      if (transaction.status === 'VOIDED') {
        return {
          success: false,
          message: 'Transaction is already voided'
        }
      }

      if (transaction.refunds.length > 0) {
        return {
          success: false,
          message: 'Cannot void transaction with existing refunds'
        }
      }

      // Void transaction and restore stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update transaction status
        const voidedTransaction = await tx.sale.update({
          where: { id: transactionId },
          data: {
            status: 'VOIDED',
            voidReason: reason,
            voidedAt: new Date(),
            voidedBy
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true,
            cashier: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })

        // Restore stock levels
        for (const item of transaction.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockLevel: {
                increment: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Void - ${transaction.transactionNumber}: ${reason}`,
              userId: voidedBy
            }
          })
        }

        return voidedTransaction
      })

      logger.info(`Transaction voided successfully: ${transaction.transactionNumber}`)

      return {
        success: true,
        message: 'Transaction voided successfully',
        transaction: result
      }
    } catch (error) {
      logger.error('Void transaction service error:', error)
      return {
        success: false,
        message: 'Failed to void transaction'
      }
    }
  }

  /**
   * Process a refund for a transaction
   */
  static async processRefund(data: RefundData): Promise<ServiceResult> {
    try {
      const { transactionId, items, reason, processedBy } = data

      // Get the transaction
      const transaction = await prisma.sale.findUnique({
        where: { id: transactionId },
        include: {
          items: true,
          refunds: {
            include: {
              items: true
            }
          }
        }
      })

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found'
        }
      }

      if (transaction.status !== 'COMPLETED') {
        return {
          success: false,
          message: 'Can only refund completed transactions'
        }
      }

      // Validate refund items
      const refundAmount = items.reduce((sum, item) => sum + item.refundAmount, 0)
      
      if (refundAmount <= 0) {
        return {
          success: false,
          message: 'Refund amount must be greater than zero'
        }
      }

      // Check if refund amount doesn't exceed transaction total
      const totalRefunded = transaction.refunds.reduce((sum, refund) => 
        sum + refund.items.reduce((itemSum, item) => itemSum + item.refundAmount, 0), 0
      )

      if (totalRefunded + refundAmount > transaction.totalAmount) {
        return {
          success: false,
          message: 'Refund amount exceeds transaction total'
        }
      }

      // Validate each refund item
      for (const refundItem of items) {
        const originalItem = transaction.items.find(item => item.productId === refundItem.productId)
        if (!originalItem) {
          return {
            success: false,
            message: `Product ${refundItem.productId} was not in the original transaction`
          }
        }

        // Check if refund quantity doesn't exceed original quantity minus already refunded
        const alreadyRefunded = transaction.refunds.reduce((sum, refund) => {
          const refundedItem = refund.items.find(item => item.productId === refundItem.productId)
          return sum + (refundedItem?.quantity || 0)
        }, 0)

        if (alreadyRefunded + refundItem.quantity > originalItem.quantity) {
          return {
            success: false,
            message: `Refund quantity for product ${refundItem.productId} exceeds available quantity`
          }
        }
      }

      // Process refund and restore stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create refund record
        const refund = await tx.refund.create({
          data: {
            saleId: transactionId,
            totalAmount: refundAmount,
            reason,
            processedBy,
            items: {
              create: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                refundAmount: item.refundAmount
              }))
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        })

        // Restore stock levels
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockLevel: {
                increment: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              reason: `Refund - ${transaction.transactionNumber}: ${reason}`,
              userId: processedBy
            }
          })
        }

        // Update transaction status if fully refunded
        const newTotalRefunded = totalRefunded + refundAmount
        if (newTotalRefunded >= transaction.totalAmount) {
          await tx.sale.update({
            where: { id: transactionId },
            data: {
              status: 'REFUNDED'
            }
          })
        }

        // Get updated transaction
        const updatedTransaction = await tx.sale.findUnique({
          where: { id: transactionId },
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true,
            cashier: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            refunds: {
              include: {
                items: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        })

        return { refund, transaction: updatedTransaction }
      })

      logger.info(`Refund processed successfully for transaction: ${transaction.transactionNumber}`)

      return {
        success: true,
        message: 'Refund processed successfully',
        refund: result.refund,
        transaction: result.transaction
      }
    } catch (error) {
      logger.error('Process refund service error:', error)
      return {
        success: false,
        message: 'Failed to process refund'
      }
    }
  }
}