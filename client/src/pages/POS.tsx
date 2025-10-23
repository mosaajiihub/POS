import { useState, useEffect, useCallback } from 'react'
import { Search, ShoppingCart, CreditCard, Printer, X, Plus, Minus, Scan } from 'lucide-react'
import ProductGrid from '../components/pos/ProductGrid'
import ShoppingCartPanel from '../components/pos/ShoppingCartPanel'
import PaymentModal from '../components/pos/PaymentModal'
import ReceiptModal from '../components/pos/ReceiptModal'
import BarcodeScanner from '../components/pos/BarcodeScanner'
import QuickSearch from '../components/pos/QuickSearch'
import { useCartStore } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'
import toast from 'react-hot-toast'

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 or Ctrl+F for search focus
      if (e.key === 'F3' || (e.ctrlKey && e.key === 'f')) {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      }
      
      // F4 or Ctrl+B for barcode scanner
      if (e.key === 'F4' || (e.ctrlKey && e.key === 'b')) {
        e.preventDefault()
        setShowBarcodeScanner(true)
      }
      
      // F5 for checkout
      if (e.key === 'F5' && cartItems.length > 0) {
        e.preventDefault()
        handleCheckout()
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowBarcodeScanner(false)
        setShowPaymentModal(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cartItems.length])

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
        toast.success(`Added ${product.name} to cart`)
      } else {
        toast.error(`${product.name} is out of stock`)
      }
    } else {
      toast.error(`Product with barcode ${barcode} not found`)
    }
  }, [findProductByBarcode, addItem])

  const handleBarcodeSearch = useCallback((barcode: string) => {
    // Auto-search when barcode-like input is detected
    handleBarcodeScanned(barcode)
  }, [handleBarcodeScanned])

  const handleProductSelect = useCallback((product: Product) => {
    if (product.stockLevel > 0) {
      toast.success(`Added ${product.name} to cart`)
    } else {
      toast.error(`${product.name} is out of stock`)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">POS Terminal</h1>
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
        <div className="mt-2 flex items-center justify-end text-xs text-gray-500">
          <div className="flex items-center space-x-4">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product Grid - Left Side */}
        <div className="flex-1 p-4 overflow-y-auto">
          <ProductGrid
            products={products}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            isLoading={isLoading}
          />
        </div>

        {/* Shopping Cart - Right Side */}
        <div className="w-80 lg:w-96 bg-white border-l shadow-lg">
          <ShoppingCartPanel
            items={cartItems}
            total={total}
            itemCount={itemCount}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          cartItems={cartItems}
          total={total}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && completedSale && (
        <ReceiptModal
          saleData={completedSale}
          onClose={handleReceiptClose}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />
    </div>
  )
}