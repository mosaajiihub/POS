import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react'
import { CartItem } from '../../pages/POS'
import { useCartStore } from '../../stores/cartStore'

interface ShoppingCartPanelProps {
  items: CartItem[]
  total: number
  itemCount: number
  onCheckout: () => void
}

export default function ShoppingCartPanel({ 
  items, 
  total, 
  itemCount, 
  onCheckout 
}: ShoppingCartPanelProps) {
  const { updateQuantity, removeItem, clearCart } = useCartStore()

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const taxAmount = items.reduce((sum, item) => sum + (item.subtotal * item.product.taxRate), 0)
  const finalTotal = subtotal + taxAmount

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cart</h2>
            {itemCount > 0 && (
              <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1">
                {itemCount}
              </span>
            )}
          </div>
          
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ShoppingCart className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Cart is empty</p>
            <p className="text-sm text-center">Add products to start a sale</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="bg-white rounded-lg border p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-gray-500">{item.product.sku}</p>
                    <p className="text-sm font-medium text-primary-600">
                      ${item.product.price.toFixed(2)} each
                    </p>
                  </div>
                  
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <span className="font-medium text-sm min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                      disabled={item.quantity >= item.product.stockLevel}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <span className="font-bold text-sm text-gray-900">
                    ${item.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {items.length > 0 && (
        <div className="border-t bg-gray-50 p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary-600">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Checkout</span>
          </button>
        </div>
      )}
    </div>
  )
}