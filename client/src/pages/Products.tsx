import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Package, AlertTriangle, BarChart3 } from 'lucide-react'
import ProductForm from '../components/products/ProductForm'
import ProductFilters from '../components/products/ProductFilters'
import { StockManagement } from '../components/inventory/StockManagement'
import { useProductStore, ExtendedProduct } from '../stores/productStore'

export default function Products() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'stock'>('catalog')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ExtendedProduct | null>(null)
  const [filters, setFilters] = useState({
    categoryId: '',
    supplierId: '',
    isActive: '',
    lowStock: false
  })

  const { products, isLoading, error, fetchProducts, deleteProduct } = useProductStore()

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleCreateProduct = () => {
    setSelectedProduct(null)
    setShowProductForm(true)
  }

  const handleEditProduct = (product: ExtendedProduct) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(productId)
    }
  }

  const handleFormClose = () => {
    setShowProductForm(false)
    setSelectedProduct(null)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm))

    const matchesCategory = !filters.categoryId || product.categoryId === filters.categoryId
    const matchesSupplier = !filters.supplierId || product.supplierId === filters.supplierId
    const matchesActive = filters.isActive === '' || 
      (filters.isActive === 'true' ? product.isActive : !product.isActive)
    const matchesLowStock = !filters.lowStock || product.stockLevel <= product.minStockLevel

    return matchesSearch && matchesCategory && matchesSupplier && matchesActive && matchesLowStock
  })

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'catalog' ? 'Product Catalog' : 'Stock Management'}
          </h2>
          <p className="text-gray-600">
            {activeTab === 'catalog' 
              ? 'Manage your product inventory and pricing'
              : 'Monitor stock levels, movements, and alerts'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {activeTab === 'catalog' && (
            <button
              onClick={handleCreateProduct}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'catalog'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Product Catalog</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Stock Management</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && (
        <>
          {/* Search and Filters */}
          <div className="card p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-outline flex items-center space-x-2 ${showFilters ? 'bg-gray-100' : ''}`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <ProductFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Package className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'No products match your search criteria'
                : 'No products found. Create your first product to get started.'
              }
            </p>
            {!searchTerm && !Object.values(filters).some(f => f) && (
              <button
                onClick={handleCreateProduct}
                className="btn-primary mt-4"
              >
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU / Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {product.image ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={product.image}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.sku}</div>
                      {product.barcode && (
                        <div className="text-sm text-gray-500 font-mono">
                          {product.barcode}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Retail: ${product.price.toFixed(2)}
                      </div>
                      {product.wholesalePrice && (
                        <div className="text-sm text-gray-500">
                          Wholesale: ${product.wholesalePrice.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.stockLevel} units
                      </div>
                      {product.stockLevel <= product.minStockLevel && (
                        <div className="text-sm text-red-600 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </div>
        </>
      )}

      {activeTab === 'stock' && (
        <StockManagement />
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={selectedProduct}
          onClose={handleFormClose}
          onSave={() => {
            handleFormClose()
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}