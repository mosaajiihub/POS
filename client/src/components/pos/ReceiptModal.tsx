import { X, Printer, Download, Mail } from 'lucide-react'

interface ReceiptModalProps {
  saleData: any
  onClose: () => void
}

export default function ReceiptModal({ saleData, onClose }: ReceiptModalProps) {
  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${saleData.transactionNumber}</title>
              <style>
                body { font-family: monospace; font-size: 12px; margin: 20px; }
                .receipt { max-width: 300px; margin: 0 auto; }
                .center { text-align: center; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                .line { border-top: 1px dashed #000; margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 2px 0; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleDownload = () => {
    // In a real app, this would generate a PDF
    console.log('Download receipt as PDF')
  }

  const handleEmail = () => {
    // In a real app, this would open email dialog
    console.log('Email receipt')
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div id="receipt-content" className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Mosaajii POS</h1>
            <p className="text-sm text-gray-600">Point of Sale System</p>
            <p className="text-sm text-gray-600">123 Business Street</p>
            <p className="text-sm text-gray-600">City, State 12345</p>
            <p className="text-sm text-gray-600">Phone: (555) 123-4567</p>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Transaction #:</span>
              <span className="font-mono">{saleData.transactionNumber}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Date:</span>
              <span>{formatDate(saleData.timestamp)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Cashier:</span>
              <span>{saleData.cashier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payment:</span>
              <span className="capitalize">{saleData.paymentMethod.name}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-4 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {saleData.items.map((item: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-gray-500">{item.product.sku}</div>
                      </div>
                    </td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">${item.product.price.toFixed(2)}</td>
                    <td className="text-right py-2">${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${saleData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>${saleData.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${saleData.total.toFixed(2)}</span>
            </div>
            
            {saleData.paymentMethod.type === 'cash' && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Cash Received:</span>
                  <span>${saleData.cashReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Change:</span>
                  <span>${saleData.change.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-4 mt-6 text-center">
            <p className="text-sm text-gray-600">Thank you for your business!</p>
            <p className="text-xs text-gray-500 mt-2">
              Please keep this receipt for your records
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={handlePrint}
            className="btn-primary flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="btn-outline flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          
          <button
            onClick={handleEmail}
            className="btn-outline flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>
        </div>
      </div>
    </div>
  )
}