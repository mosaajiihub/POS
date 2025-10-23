import { useState, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'

interface Category {
  id: string
  name: string
  description?: string
}

interface CategorySelectorProps {
  value: string
  onChange: (categoryId: string) => void
  error?: string
}

export default function CategorySelector({ value, onChange, error }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      // Mock data - will be replaced with API call
      const mockCategories: Category[] = [
        { id: '1', name: 'Beverages', description: 'Drinks and liquid refreshments' },
        { id: '2', name: 'Food', description: 'Food items and snacks' },
        { id: '3', name: 'Stationery', description: 'Office and school supplies' },
        { id: '4', name: 'Electronics', description: 'Electronic devices and accessories' },
        { id: '5', name: 'Clothing', description: 'Apparel and fashion items' }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      setCategories(mockCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsCreating(true)
    try {
      // Mock API call - will be replaced with actual API
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
        description: `Category for ${newCategoryName.trim()}`
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setCategories(prev => [...prev, newCategory])
      onChange(newCategory.id)
      setNewCategoryName('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="relative">
        <div className="input flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input appearance-none pr-10 ${error ? 'border-red-500' : ''}`}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Create New Category */}
      {!showCreateForm ? (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="text-primary-600 hover:text-primary-700 text-sm flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>Create new category</span>
        </button>
      ) : (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="input flex-1 text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateCategory()
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || isCreating}
              className="btn-primary text-sm px-3 py-1"
            >
              {isCreating ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                'Add'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setNewCategoryName('')
              }}
              className="btn-outline text-sm px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Selected Category Info */}
      {value && (
        <div className="text-xs text-gray-500">
          {categories.find(c => c.id === value)?.description}
        </div>
      )}
    </div>
  )
}