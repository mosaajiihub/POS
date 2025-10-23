import { useMemo } from 'react'
import { Plus, Package } from 'lucide-react'
import { Product } from '../../pages/POS'
import { useCartStore } from '../../stores/cartStore'

interface ProductGridProps {
  products: Product[]
  searchTerm: string
  selectedCategory: string
  isLoading: boolean
}

export default function ProductGrid({ 
  products, 
  searchTerm, 
  selectedCategory, 
  isLoading 
}: ProductGridProps) {
  const { addItem } = useCartStore()

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.barcode && product.barcode.includes(searchTerm))
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  const handleAddToCart = (product: Product) => {
    if (product.stockLevel > 0) {
      addItem(product, 1)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading products...</span>
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package className="w-12 h-12 mb-4" />
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm">Try adjusting your search or category filter</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {filteredProducts.map((product) => (
        <div
          key={product.id}
          className={`card p-4 hover:shadow-md transition-shadow cursor-pointer ${
            product.stockLevel === 0 ? 'opacity-50' : ''
          }`}
          onClick={() => handleAddToCart(product)}
        >
          {/* Product Image Placeholder */}
          <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Package className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2">
              {product.name}
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary-600">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">
                {product.sku}
              </span>
            </div>

            {product.barcode && (
              <div className="text-xs text-gray-400 font-mono">
                {product.barcode}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className={`text-xs ${
                product.stockLevel > 10 ? 'text-green-600' : 
                product.stockLevel > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                Stock: {product.stockLevel}
              </span>
              
              {product.stockLevel > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddToCart(product)
                  }}
                  className="p-1 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-xs text-red-600 font-medium">
                  Out of Stock
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}