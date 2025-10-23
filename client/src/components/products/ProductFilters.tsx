import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface ProductFiltersProps {
  filters: {
    categoryId: string
    supplierId: string
    isActive: string
    lowStock: boolean
  }
  onFiltersChange: (filters: any) => void
}

export default function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Mock data - will be replaced with API calls
    const mockCategories: Category[] = [
      { id: '1', name: 'Beverages' },
      { id: '2', name: 'Food' },
      { id: '3', name: 'Stationery' }
    ]

    const mockSuppliers: Supplier[] = [
      { id: '1', name: 'ABC Distributors' },
      { id: '2', name: 'XYZ Suppliers' },
      { id: '3', name: 'Local Vendor' }
    ]

    // Simulate API delay
    setTimeout(() => {
      setCategories(mockCategories)
      setSuppliers(mockSuppliers)
      setIsLoading(false)
    }, 300)
  }, [])

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      categoryId: '',
      supplierId: '',
      isActive: '',
      lowStock: false
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    typeof value === 'boolean' ? value : value !== ''
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filter Products</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={filters.categoryId}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier
          </label>
          <select
            value={filters.supplierId}
            onChange={(e) => handleFilterChange('supplierId', e.target.value)}
            className="input"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.isActive}
            onChange={(e) => handleFilterChange('isActive', e.target.value)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Low Stock Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Level
          </label>
          <div className="flex items-center h-10">
            <input
              type="checkbox"
              id="lowStock"
              checked={filters.lowStock}
              onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="lowStock" className="ml-2 text-sm text-gray-700">
              Show low stock only
            </label>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.categoryId && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Category: {categories.find(c => c.id === filters.categoryId)?.name}
              <button
                onClick={() => handleFilterChange('categoryId', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.supplierId && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Supplier: {suppliers.find(s => s.id === filters.supplierId)?.name}
              <button
                onClick={() => handleFilterChange('supplierId', '')}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.isActive !== '' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Status: {filters.isActive === 'true' ? 'Active' : 'Inactive'}
              <button
                onClick={() => handleFilterChange('isActive', '')}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.lowStock && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Low Stock Only
              <button
                onClick={() => handleFilterChange('lowStock', false)}
                className="ml-1 text-red-600 hover:text-red-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}