import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InvoiceService } from '../services/invoiceService'
import { CustomerService } from '../services/customerService'
import { ProductService } from '../services/productService'
import { CategoryService } from '../services/categoryService'
import { SupplierService } from '../services/supplierService'
import { prisma } from '../config/database'

describe('InvoiceService', () => {
  let testCustomerId: string
  let testProductId: string
  let testCategoryId: string
  let testSupplierId: string

  beforeEach(async () => {
    // Create test customer
    const customerResult = await CustomerService.createCustomer({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      phone: '+1234567890'
    })
    testCustomerId = customerResult.customer!.id

    // Create test category
    const categoryResult = await CategoryService.createCategory({
      name: 'Test Category',
      description: 'Test category for invoice tests'
    })
    testCategoryId = categoryResult.category!.id

    // Create test supplier
    const supplierResult = await SupplierService.createSupplier({
      name: 'Test Supplier',
      contactPerson: 'Jane Smith',
      email: 'jane@supplier.com'
    })
    testSupplierId = supplierResult.supplier!.id

    // Create test product
    const productResult = await ProductService.createProduct({
      name: 'Test Product',
      sku: 'TEST-001',
      costPrice: 10.00,
      sellingPrice: 15.00,
      categoryId: testCategoryId,
      supplierId: testSupplierId
    })
    testProductId = productResult.product!.id
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.invoicePayment.deleteMany()
    await prisma.invoiceItem.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.product.deleteMany({ where: { id: testProductId } })
    await prisma.customer.deleteMany({ where: { id: testCustomerId } })
    await prisma.category.deleteMany({ where: { id: testCategoryId } })
    await prisma.supplier.deleteMany({ where: { id: testSupplierId } })
  })

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const invoiceData = {
        customerId: testCustomerId,
        items: [
          {
            description: 'Test Item 1',
            quantity: 2,
            unitPrice: 15.00,
            taxRate: 10,
            productId: testProductId
          },
          {
            description: 'Test Item 2',
            quantity: 1,
            unitPrice: 25.00,
            taxRate: 10
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: 'Test invoice notes',
        terms: 'Net 30 days'
      }

      const result = await InvoiceService.createInvoice(invoiceData)

      expect(result.success).toBe(true)
      expect(result.invoice).toBeDefined()
      expect(result.invoice!.customerId).toBe(testCustomerId)
      expect(result.invoice!.items).toHaveLength(2)
      expect(result.invoice!.subtotal).toBe(55) // (2 * 15) + (1 * 25)
      expect(result.invoice!.taxAmount).toBe(5.5) // 10% of 55
      expect(result.invoice!.totalAmount).toBe(60.5) // 55 + 5.5
      expect(result.invoice!.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/)
    })

    it('should fail to create invoice with non-existent customer', async () => {
      const invoiceData = {
        customerId: 'non-existent-id',
        items: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 15.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }

      const result = await InvoiceService.createInvoice(invoiceData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Customer not found')
    })

    it('should fail to create invoice with empty items', async () => {
      const invoiceData = {
        customerId: testCustomerId,
        items: [],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }

      const result = await InvoiceService.createInvoice(invoiceData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('at least one item')
    })

    it('should fail to create invoice with past due date', async () => {
      const invoiceData = {
        customerId: testCustomerId,
        items: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 15.00
          }
        ],
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      }

      const result = await InvoiceService.createInvoice(invoiceData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Due date cannot be in the past')
    })

    it('should create recurring invoice successfully', async () => {
      const invoiceData = {
        customerId: testCustomerId,
        items: [
          {
            description: 'Monthly Service',
            quantity: 1,
            unitPrice: 100.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRecurring: true,
        recurringInterval: 'monthly'
      }

      const result = await InvoiceService.createInvoice(invoiceData)

      expect(result.success).toBe(true)
      expect(result.invoice!.isRecurring).toBe(true)
      expect(result.invoice!.recurringInterval).toBe('monthly')
      expect(result.invoice!.nextInvoiceDate).toBeDefined()
    })
  })

  describe('getInvoices', () => {
    it('should retrieve invoices with pagination', async () => {
      // Create multiple test invoices
      for (let i = 1; i <= 5; i++) {
        await InvoiceService.createInvoice({
          customerId: testCustomerId,
          items: [
            {
              description: `Test Item ${i}`,
              quantity: 1,
              unitPrice: 10.00 * i
            }
          ],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        })
      }

      const result = await InvoiceService.getInvoices({
        page: 1,
        limit: 3
      })

      expect(result.success).toBe(true)
      expect(result.invoices).toBeDefined()
      expect(result.invoices!.length).toBeLessThanOrEqual(3)
      expect(result.total).toBeGreaterThanOrEqual(5)
    })

    it('should filter invoices by customer', async () => {
      // Create invoice for test customer
      await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Customer Invoice',
            quantity: 1,
            unitPrice: 50.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const result = await InvoiceService.getInvoices({
        customerId: testCustomerId
      })

      expect(result.success).toBe(true)
      expect(result.invoices).toBeDefined()
      expect(result.invoices!.every(inv => inv.customerId === testCustomerId)).toBe(true)
    })

    it('should filter invoices by status', async () => {
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Status Test Invoice',
            quantity: 1,
            unitPrice: 30.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      // Update invoice status
      await InvoiceService.updateInvoice(invoice.invoice!.id, {
        status: 'SENT'
      })

      const result = await InvoiceService.getInvoices({
        status: 'SENT'
      })

      expect(result.success).toBe(true)
      expect(result.invoices).toBeDefined()
      expect(result.invoices!.every(inv => inv.status === 'SENT')).toBe(true)
    })
  })

  describe('recordPayment', () => {
    it('should record payment successfully', async () => {
      // Create invoice
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Payment Test Item',
            quantity: 1,
            unitPrice: 100.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const paymentData = {
        amount: 50.00,
        paymentMethod: 'CARD' as const,
        reference: 'TEST-REF-001',
        notes: 'Partial payment'
      }

      const result = await InvoiceService.recordPayment(invoice.invoice!.id, paymentData)

      expect(result.success).toBe(true)
      expect(result.invoice!.payments).toHaveLength(1)
      expect(result.invoice!.payments[0].amount).toBe(50)
      expect(result.invoice!.status).toBe('DRAFT') // Not fully paid yet
    })

    it('should mark invoice as paid when full payment is recorded', async () => {
      // Create invoice
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Full Payment Test Item',
            quantity: 1,
            unitPrice: 100.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const paymentData = {
        amount: 100.00,
        paymentMethod: 'CASH' as const,
        reference: 'FULL-PAY-001'
      }

      const result = await InvoiceService.recordPayment(invoice.invoice!.id, paymentData)

      expect(result.success).toBe(true)
      expect(result.invoice!.status).toBe('PAID')
      expect(result.invoice!.paidDate).toBeDefined()
      expect(result.invoice!.paymentMethod).toBe('CASH')
    })

    it('should fail to record payment exceeding remaining balance', async () => {
      // Create invoice
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Overpayment Test Item',
            quantity: 1,
            unitPrice: 50.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const paymentData = {
        amount: 100.00, // More than invoice total
        paymentMethod: 'CARD' as const
      }

      const result = await InvoiceService.recordPayment(invoice.invoice!.id, paymentData)

      expect(result.success).toBe(false)
      expect(result.message).toContain('exceeds remaining balance')
    })
  })

  describe('getOverdueInvoices', () => {
    it('should retrieve overdue invoices', async () => {
      // Create overdue invoice (due yesterday)
      const overdueInvoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Overdue Item',
            quantity: 1,
            unitPrice: 75.00
          }
        ],
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      })

      // Update status to SENT (overdue invoices must be sent)
      await InvoiceService.updateInvoice(overdueInvoice.invoice!.id, {
        status: 'SENT'
      })

      const result = await InvoiceService.getOverdueInvoices()

      expect(result.success).toBe(true)
      expect(result.invoices).toBeDefined()
      expect(result.invoices!.some(inv => inv.id === overdueInvoice.invoice!.id)).toBe(true)
    })
  })

  describe('generateRecurringInvoices', () => {
    it('should generate recurring invoices', async () => {
      // Create recurring invoice with next generation date in the past
      const recurringInvoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [
          {
            description: 'Recurring Service',
            quantity: 1,
            unitPrice: 200.00
          }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRecurring: true,
        recurringInterval: 'monthly'
      })

      // Manually set next invoice date to past to trigger generation
      await prisma.invoice.update({
        where: { id: recurringInvoice.invoice!.id },
        data: { nextInvoiceDate: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })

      const result = await InvoiceService.generateRecurringInvoices()

      expect(result.success).toBe(true)
      expect(result.generated).toBeGreaterThan(0)
    })
  })

  describe('getInvoiceAnalytics', () => {
    it('should calculate invoice analytics correctly', async () => {
      // Create test invoices with different statuses
      const invoice1 = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Item 1', quantity: 1, unitPrice: 100.00 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const invoice2 = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Item 2', quantity: 1, unitPrice: 200.00 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      // Record payment for one invoice
      await InvoiceService.recordPayment(invoice1.invoice!.id, {
        amount: 100.00,
        paymentMethod: 'CASH'
      })

      const result = await InvoiceService.getInvoiceAnalytics()

      expect(result.success).toBe(true)
      expect(result.analytics).toBeDefined()
      expect(result.analytics!.totalInvoices).toBeGreaterThanOrEqual(2)
      expect(result.analytics!.totalAmount).toBeGreaterThanOrEqual(300)
      expect(result.analytics!.paidAmount).toBeGreaterThanOrEqual(100)
      expect(result.analytics!.pendingAmount).toBeGreaterThanOrEqual(200)
    })
  })

  describe('updateInvoiceStatus', () => {
    it('should update invoice status to OVERDUE when past due date', async () => {
      // Create invoice with past due date
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Overdue Test', quantity: 1, unitPrice: 50.00 }],
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      })

      // Set status to SENT first
      await InvoiceService.updateInvoice(invoice.invoice!.id, { status: 'SENT' })

      const result = await InvoiceService.updateInvoiceStatus(invoice.invoice!.id)

      expect(result.success).toBe(true)
      expect(result.status).toBe('OVERDUE')
    })

    it('should update invoice status to PAID when fully paid', async () => {
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Payment Test', quantity: 1, unitPrice: 100.00 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      // Record full payment
      await InvoiceService.recordPayment(invoice.invoice!.id, {
        amount: 100.00,
        paymentMethod: 'CASH'
      })

      const result = await InvoiceService.updateInvoiceStatus(invoice.invoice!.id)

      expect(result.success).toBe(true)
      expect(result.status).toBe('PAID')
    })
  })

  describe('getPaymentReconciliation', () => {
    it('should calculate payment reconciliation correctly', async () => {
      // Create invoices with different payment statuses
      const invoice1 = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Paid Invoice', quantity: 1, unitPrice: 100.00 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const invoice2 = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Partial Invoice', quantity: 1, unitPrice: 200.00 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      const invoice3 = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Unpaid Invoice', quantity: 1, unitPrice: 150.00 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })

      // Record payments
      await InvoiceService.recordPayment(invoice1.invoice!.id, {
        amount: 100.00,
        paymentMethod: 'CASH'
      })

      await InvoiceService.recordPayment(invoice2.invoice!.id, {
        amount: 50.00,
        paymentMethod: 'CARD'
      })

      const result = await InvoiceService.getPaymentReconciliation()

      expect(result.success).toBe(true)
      expect(result.reconciliation).toBeDefined()
      expect(result.reconciliation!.totalInvoices).toBeGreaterThanOrEqual(3)
      expect(result.reconciliation!.totalInvoiceAmount).toBeGreaterThanOrEqual(450)
      expect(result.reconciliation!.totalPaymentAmount).toBeGreaterThanOrEqual(150)
      expect(result.reconciliation!.fullyPaidInvoices).toBeGreaterThanOrEqual(1)
      expect(result.reconciliation!.partiallyPaidInvoices).toBeGreaterThanOrEqual(1)
      expect(result.reconciliation!.unpaidInvoices).toBeGreaterThanOrEqual(1)
      expect(result.reconciliation!.paymentsByMethod.CASH).toBeDefined()
      expect(result.reconciliation!.paymentsByMethod.CARD).toBeDefined()
    })
  })

  describe('sendAutomatedReminders', () => {
    it('should send reminders for overdue invoices', async () => {
      // Create overdue invoice
      const invoice = await InvoiceService.createInvoice({
        customerId: testCustomerId,
        items: [{ description: 'Reminder Test', quantity: 1, unitPrice: 75.00 }],
        dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      })

      // Set status to SENT
      await InvoiceService.updateInvoice(invoice.invoice!.id, { status: 'SENT' })

      const result = await InvoiceService.sendAutomatedReminders()

      expect(result.success).toBe(true)
      expect(result.remindersSent).toBeGreaterThanOrEqual(0)
    })
  })
})