import React, { useState, useEffect } from 'react'
import { Package, Move, Grid, List, Search, Filter, Plus, Edit, Trash2 } from 'lucide-react'
import { useSortableDragAndDrop } from '../../hooks/useDragAndDrop'
import { useProductStore, ExtendedProduct } from '../../stores/productStore'
import { LoadingSpinner } from '../ui/loading-spinner'
import { showToast } from '../../lib/toast'

interface Category {
  id: string
  name: string
  products: ExtendedProduct[]
  order: number
}

interface DragDropInventoryManagerProps {
  onProductEdit?: (product: ExtendedProduct) => void
  onProductDelete?: (product: ExtendedProduct) => void
  onCategoryEdit?: (category: Category) => void
}

export const DragDropInventoryManager: React.FC<DragDropInventoryManagerProps> = ({
  onProductEdit,
  onProductDelete,
  onCategoryEdit
}) => {
  const { products, isLoading, fetchProducts } = useProductStore()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<Category[]>([])

  // Initialize categories from products
  useEffect(() => {
    if (products.length > 0) {
      const categoryMap = new Map<string, ExtendedProduct[]>()
      
      products.forEach(product => {
        const categoryName = product.category || 'Uncategorized'
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, [])
        }
        categoryMap.get(categoryName)!.push(product)
      })

      const categoriesArray: Category[] = Array.from(categoryMap.entries()).map(([name, products], index) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        products,
        order: index
      }))

      setCategories(categoriesArray)
    }
  }, [products])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Sortable categories
  const { createSortableItemProps: createCategorySortableProps } = useSortableDragAndDrop(
    categories,
    (newCategories) => {
      setCategories(newCategories)
      showToast.success('Category order updated')
    }
  )

  // Sortable products within category
  const createProductSortableProps = (categoryId: string, categoryProducts: ExtendedProduct[]) => {
    const { createSortableItemProps } = useSortableDragAndDrop(
      categoryProducts,
      (newProducts) => {
        setCategories(prev => 
          prev.map(cat => 
            cat.id === categoryId 
              ? { ...cat, products: newProducts }
              : cat
          )
        )
        showToast.success('Product order updated')
      }
    )
    return createSortableItemProps
  }

  const filteredCategories = categories.filter(category => {
    if (selectedCategory !== 'all' && category.id !== selectedCategory) {
      return false
    }
    
    if (searchTerm) {
      return category.products.some(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return true
  })

  const getFilteredProducts = (category: Category) => {
    if (!searchTerm) return category.products
    
    return category.products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-600">Drag and drop to reorder categories and products</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-48"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.products.length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {filteredCategories.map((category, categoryIndex) => {
          const filteredProducts = getFilteredProducts(category)
          const createProductSortable = createProductSortableProps(category.id, category.products)
          
          if (filteredProducts.length === 0) return null

          return (
            <div
              key={category.id}
              {...createCategorySortableProps(category, categoryIndex)}
              className="card overflow-hidden"
            >
              {/* Category Header */}
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Move className="w-5 h-5 text-gray-400 cursor-grab" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-600">
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onCategoryEdit?.(category)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Products */}
              <div className="p-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map((product, productIndex) => (
                      <div
                        key={product.id}
                        {...createProductSortable(product, productIndex)}
                        className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-grab"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover mb-2"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                              {product.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{product.sku}</p>
                          </div>
                          <Move className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-semibold">${product.price.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Stock:</span>
                            <span className={`font-semibold ${
                              product.stockLevel <= product.minStockLevel 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {product.stockLevel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t">
                          <button
                            onClick={() => onProductEdit?.(product)}
                            className="p-1 text-primary-600 hover:bg-primary-100 rounded"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onProductDelete?.(product)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product, productIndex) => (
                      <div
                        key={product.id}
                        {...createProductSortable(product, productIndex)}
                        className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow cursor-grab"
                      >
                        <div className="flex items-center space-x-4">
                          <Move className="w-4 h-4 text-gray-400" />
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-500">{product.sku}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <p className="text-sm font-semibold">${product.price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Price</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${
                              product.stockLevel <= product.minStockLevel 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {product.stockLevel}
                            </p>
                            <p className="text-xs text-gray-500">Stock</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onProductEdit?.(product)}
                              className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg"
                              title="Edit product"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onProductDelete?.(product)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'Add some products to get started'}
          </p>
        </div>
      )}
    </div>
  )
}