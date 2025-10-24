import { useState } from 'react'
import { X, Download, Send, Printer, Eye } from 'lucide-react'
import type { Invoice } from '../../stores/invoiceStore'

interface InvoicePreviewModalProps {
  invoice: Invoice
  onClose: () => void
}

export default function InvoicePreviewModal({ invoice, onClose }: InvoicePreviewModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // In a real implementation, this would call an API to generate PDF
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create a simple HTML content for PDF generation
      const printContent = document.getElementById('invoice-preview')?.innerHTML
      if (printContent) {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Invoice ${invoice.invoiceNumber}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .invoice-header { text-align: center; margin-bottom: 30px; }
                  .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                  .invoice-items table { width: 100%; border-collapse: collapse; }
                  .invoice-items th, .invoice-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  .invoice-items th { background-color: #f2f2f2; }
                  .invoice-totals { text-align: right; margin-top: 20px; }
                  .total-row { font-weight: bold; font-size: 1.2em; }
                  @media print { body { margin: 0; } }
                </style>
              </head>
              <body>
                ${printContent}
              </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendInvoice = async () => {
    setIsSending(true)
    try {
      // In a real implementation, this would call an API to send the invoice
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert('Invoice sent successfully!')
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Failed to send invoice')
    } finally {
      setIsSending(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Invoice Preview
            </h2>
            <p className="text-gray-600">{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="btn-outline flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-outline flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            {invoice.customer.email && invoice.status === 'DRAFT' && (
              <button
                onClick={handleSendInvoice}
                disabled={isSending}
                className="btn-primary flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Sending...' : 'Send Invoice'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div id="invoice-preview" className="bg-white">
            {/* Invoice Header */}
            <div className="invoice-header text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <div className="text-lg text-gray-600">
                <div className="font-semibold">Mosaajii POS</div>
                <div>123 Business Street</div>
                <div>Business City, BC 12345</div>
                <div>Phone: (555) 123-4567</div>
                <div>Email: billing@mosaajii.com</div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="invoice-details grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
                <div className="text-gray-700">
                  <div className="font-medium text-lg">
                    {invoice.customer.firstName} {invoice.customer.lastName}
                  </div>
                  {invoice.customer.email && (
                    <div>{invoice.customer.email}</div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-semibold ml-2">{invoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Issue Date:</span>
                    <span className="ml-2">{formatDate(invoice.issuedDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <span className="ml-2">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-semibold text-blue-600">{invoice.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="invoice-items mb-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Description</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Unit Price</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Tax Rate</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="font-medium">{item.description}</div>
                        {item.product && (
                          <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        {item.taxRate}%
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-medium">
                        {formatCurrency(item.totalPrice * (1 + item.taxRate / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="invoice-totals">
              <div className="flex justify-end">
                <div className="w-80">
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Tax:</span>
                      <span>{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                    {invoice.discountAmount > 0 && (
                      <div className="flex justify-between py-1 text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(invoice.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 text-xl font-bold border-t-2 border-gray-300 total-row">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    {invoice.totalPaid && invoice.totalPaid > 0 && (
                      <>
                        <div className="flex justify-between py-1 text-green-600">
                          <span>Amount Paid:</span>
                          <span>{formatCurrency(invoice.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between py-1 font-semibold">
                          <span>Amount Due:</span>
                          <span>{formatCurrency(invoice.remainingAmount || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Notes */}
            {(invoice.terms || invoice.notes) && (
              <div className="mt-8 pt-6 border-t border-gray-300">
                {invoice.terms && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Terms & Conditions:</h4>
                    <p className="text-gray-700 text-sm">{invoice.terms}</p>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
                    <p className="text-gray-700 text-sm">{invoice.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
              <p>Thank you for your business!</p>
              <p className="mt-2">
                For questions about this invoice, please contact us at billing@mosaajii.com or (555) 123-4567
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}