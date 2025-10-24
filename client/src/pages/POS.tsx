import { useState, useEffect, useCallback } from 'react'
import { Search, ShoppingCart, CreditCard, Printer, X, Plus, Minus, Scan, AlertCircle } from 'lucide-react'
import ProductGrid from '../components/pos/ProductGrid'
import ShoppingCartPanel from '../components/pos/ShoppingCartPanel'
import PaymentModal from '../components/pos/PaymentModal'
import ReceiptModal from '../components/pos/ReceiptModal'
import BarcodeScanner from '../components/pos/BarcodeScanner'
import QuickSearch from '../components/pos/QuickSearch'
import { useCartStore } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { showToast } from '../lib/toast'
import { ErrorBoundary } from '../components/ui/error-boundary'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  sku: string
  barcode?: string
  image?: string
  stockLevel: number
  taxRate: number
}

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

export interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'card' | 'digital'
  icon: string
}

export default function POS() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [completedSale, setCompletedSale] = useState<any>(null)
  
  const { items: cartItems, total, itemCount, clearCart, addItem } = useCartStore()
  const { products, categories, isLoading, fetchProducts, findProductByBarcode } = useProductStore()

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Enhanced keyboard shortcuts for POS
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'F3',
        description: 'Focus Search',
        action: () => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
          searchInput?.focus()
        }
      },
      {
        key: 'f',
        ctrlKey: true,
        description: 'Focus Search',
        action: () => {
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
          searchInput?.focus()
        },
        global: true
      },
      {
        key: 'F4',
        description: 'Open Barcode Scanner',
        action: () => setShowBarcodeScanner(true)
      },
      {
        key: 'b',
        ctrlKey: true,
        description: 'Open Barcode Scanner',
        action: () => setShowBarcodeScanner(true)
      },
      {
        key: 'F5',
        description: 'Checkout',
        action: handleCheckout,
        disabled: cartItems.length === 0
      },
      {
        key: 'Enter',
        ctrlKey: true,
        description: 'Checkout',
        action: handleCheckout,
        disabled: cartItems.length === 0
      },
      {
        key: 'Escape',
        description: 'Close Modals',
        action: () => {
          setShowBarcodeScanner(false)
          setShowPaymentModal(false)
        }
      },
      {
        key: 'c',
        ctrlKey: true,
        description: 'Clear Cart',
        action: () => {
          if (cartItems.length > 0) {
            clearCart()
            showToast.success('Cart cleared')
          }
        }
      }
    ],
    enabled: true
  })

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      setShowPaymentModal(true)
    }
  }

  const handlePaymentComplete = (saleData: any) => {
    setCompletedSale(saleData)
    setShowPaymentModal(false)
    setShowReceiptModal(true)
    clearCart()
    showToast.success('Sale completed successfully!')
  }

  const handleReceiptClose = () => {
    setShowReceiptModal(false)
    setCompletedSale(null)
  }

  const handleBarcodeScanned = useCallback((barcode: string) => {
    const product = findProductByBarcode(barcode)
    if (product) {
      if (product.stockLevel > 0) {
        addItem(product, 1)
        showToast.success(`Added ${product.name} to cart`)
      } else {
        showToast.error(`${product.name} is out of stock`)
      }
    } else {
      showToast.error(`Product with barcode ${barcode} not found`)
    }
  }, [findProductByBarcode, addItem])

  const handleBarcodeSearch = useCallback((barcode: string) => {
    // Auto-search when barcode-like input is detected
    handleBarcodeScanned(barcode)
  }, [handleBarcodeScanned])

  const handleProductSelect = useCallback((product: Product) => {
    if (product.stockLevel > 0) {
      addItem(product, 1)
      showToast.success(`Added ${product.name} to cart`)
    } else {
      showToast.error(`${product.name} is out of stock`)
    }
  }, [addItem])

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">POS Terminal</h1>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
                  Loading products...
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <QuickSearch
                products={products}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onProductSelect={handleProductSelect}
                onBarcodeSearch={handleBarcodeSearch}
                onOpenScanner={() => setShowBarcodeScanner(true)}
                className="w-80"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-40"
                disabled={isLoading}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {cartItems.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
                  <ShoppingCart className="w-3 h-3" />
                  {itemCount} items in cart
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs mr-1">F3</kbd>
                Search
              </span>
              <span className="flex items-center">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs mr-1">F4</kbd>
                Scan
              </span>
              <span className="flex items-center">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs mr-1">F5</kbd>
                Checkout
              </span>
              <span className="flex items-center">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs mr-1">Ctrl+C</kbd>
                Clear Cart
              </span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {!isLoading && products.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Available</h3>
              <p className="text-gray-600 mb-4">
                You need to add products to your inventory before using the POS system.
              </p>
              <button
                onClick={() => window.location.href = '/products'}
                className="btn-primary"
              >
                Add Products
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {(products.length > 0 || isLoading) && (
          <div className="flex-1 flex overflow-hidden">
            {/* Product Grid - Left Side */}
            <div className="flex-1 p-4 overflow-y-auto">
              <ErrorBoundary>
                <ProductGrid
                  products={products}
                  searchTerm={searchTerm}
                  selectedCategory={selectedCategory}
                  isLoading={isLoading}
                />
              </ErrorBoundary>
            </div>

            {/* Shopping Cart - Right Side */}
            <div className="w-80 lg:w-96 bg-white border-l shadow-lg">
              <ErrorBoundary>
                <ShoppingCartPanel
                  items={cartItems}
                  total={total}
                  itemCount={itemCount}
                  onCheckout={handleCheckout}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <ErrorBoundary>
            <PaymentModal
              cartItems={cartItems}
              total={total}
              onClose={() => setShowPaymentModal(false)}
              onPaymentComplete={handlePaymentComplete}
            />
          </ErrorBoundary>
        )}

        {/* Receipt Modal */}
        {showReceiptModal && completedSale && (
          <ErrorBoundary>
            <ReceiptModal
              saleData={completedSale}
              onClose={handleReceiptClose}
            />
          </ErrorBoundary>
        )}

        {/* Barcode Scanner Modal */}
        <ErrorBoundary>
          <BarcodeScanner
            isOpen={showBarcodeScanner}
            onScan={handleBarcodeScanned}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}