import { useState, useEffect } from 'react'
import { X, Upload, Scan, RefreshCw, DollarSign, Package, Tag, Building2 } from 'lucide-react'
import ImageUpload from './ImageUpload'
import BarcodeGenerator from './BarcodeGenerator'
import CategorySelector from './CategorySelector'
import SupplierSelector from './SupplierSelector'
import PricingTiers from './PricingTiers'
import { useProductStore } from '../../stores/productStore'

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface ProductFormProps {
  product?: any
  onClose: () => void
  onSave: () => void
}

interface FormData {
  name: string
  description: string
  sku: string
  barcode: string
  image: string
  costPrice: number
  sellingPrice: number
  wholesalePrice: number
  stockLevel: number
  minStockLevel: number
  taxRate: number
  categoryId: string
  supplierId: string
  isActive: boolean
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    image: '',
    costPrice: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    stockLevel: 0,
    minStockLevel: 0,
    taxRate: 8,
    categoryId: '',
    supplierId: '',
    isActive: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false)

  const { addProduct, updateProduct } = useProductStore()

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        image: product.image || '',
        costPrice: product.costPrice || 0,
        sellingPrice: product.price || product.sellingPrice || 0,
        wholesalePrice: product.wholesalePrice || 0,
        stockLevel: product.stockLevel || 0,
        minStockLevel: product.minStockLevel || 0,
        taxRate: product.taxRate || 8,
        categoryId: product.categoryId || '',
        supplierId: product.supplierId || '',
        isActive: product.isActive !== undefined ? product.isActive : true
      })
    }
  }, [product])

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6)
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase()
    const sku = `PRD-${randomStr}-${timestamp}`
    handleInputChange('sku', sku)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required'
    }

    if (formData.costPrice < 0) {
      newErrors.costPrice = 'Cost price must be positive'
    }

    if (formData.sellingPrice < 0) {
      newErrors.sellingPrice = 'Selling price must be positive'
    }

    if (formData.sellingPrice < formData.costPrice) {
      newErrors.sellingPrice = 'Selling price should be higher than cost price'
    }

    if (formData.wholesalePrice > 0 && formData.wholesalePrice < formData.costPrice) {
      newErrors.wholesalePrice = 'Wholesale price should be higher than cost price'
    }

    if (formData.stockLevel < 0) {
      newErrors.stockLevel = 'Stock level must be non-negative'
    }

    if (formData.minStockLevel < 0) {
      newErrors.minStockLevel = 'Minimum stock level must be non-negative'
    }

    if (formData.taxRate < 0 || formData.taxRate > 100) {
      newErrors.taxRate = 'Tax rate must be between 0 and 100'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required'
    }

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      if (product) {
        updateProduct(product.id, formData)
      } else {
        addProduct(formData)
      }
      
      onSave()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className={`input flex-1 ${errors.sku ? 'border-red-500' : ''}`}
                    placeholder="Enter SKU"
                  />
                  <button
                    type="button"
                    onClick={generateSKU}
                    className="btn-outline px-3"
                    title="Generate SKU"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {errors.sku && (
                  <p className="text-red-500 text-sm mt-1">{errors.sku}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="input"
                placeholder="Enter product description"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Product Image
            </h3>
            
            <ImageUpload
              currentImage={formData.image}
              onImageChange={(imageUrl) => handleInputChange('image', imageUrl)}
            />
          </div>

          {/* Barcode */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Scan className="w-5 h-5 mr-2" />
              Barcode
            </h3>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                className="input flex-1"
                placeholder="Enter or generate barcode"
              />
              <button
                type="button"
                onClick={() => setShowBarcodeGenerator(true)}
                className="btn-outline px-4"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Category and Supplier */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Classification
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <CategorySelector
                  value={formData.categoryId}
                  onChange={(categoryId) => handleInputChange('categoryId', categoryId)}
                  error={errors.categoryId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <SupplierSelector
                  value={formData.supplierId}
                  onChange={(supplierId) => handleInputChange('supplierId', supplierId)}
                  error={errors.supplierId}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Pricing & Tax
            </h3>
            
            <PricingTiers
              costPrice={formData.costPrice}
              sellingPrice={formData.sellingPrice}
              wholesalePrice={formData.wholesalePrice}
              taxRate={formData.taxRate}
              onPriceChange={(field, value) => handleInputChange(field, value)}
              errors={errors}
            />
          </div>

          {/* Stock Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Stock Management
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockLevel}
                  onChange={(e) => handleInputChange('stockLevel', parseInt(e.target.value) || 0)}
                  className={`input ${errors.stockLevel ? 'border-red-500' : ''}`}
                  placeholder="0"
                />
                {errors.stockLevel && (
                  <p className="text-red-500 text-sm mt-1">{errors.stockLevel}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockLevel}
                  onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value) || 0)}
                  className={`input ${errors.minStockLevel ? 'border-red-500' : ''}`}
                  placeholder="0"
                />
                {errors.minStockLevel && (
                  <p className="text-red-500 text-sm mt-1">{errors.minStockLevel}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                  className="input"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </button>
          </div>
        </form>

        {/* Barcode Generator Modal */}
        {showBarcodeGenerator && (
          <BarcodeGenerator
            onBarcodeGenerated={(barcode) => {
              handleInputChange('barcode', barcode)
              setShowBarcodeGenerator(false)
            }}
            onClose={() => setShowBarcodeGenerator(false)}
          />
        )}
      </div>
    </div>
  )
}