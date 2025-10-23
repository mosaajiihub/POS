import { Calculator, TrendingUp, Users, Percent } from 'lucide-react'

interface PricingTiersProps {
  costPrice: number
  sellingPrice: number
  wholesalePrice: number
  taxRate: number
  onPriceChange: (field: string, value: number) => void
  errors: Record<string, string>
}

export default function PricingTiers({
  costPrice,
  sellingPrice,
  wholesalePrice,
  taxRate,
  onPriceChange,
  errors
}: PricingTiersProps) {
  const calculateMargin = (selling: number, cost: number): number => {
    if (cost === 0) return 0
    return ((selling - cost) / cost) * 100
  }

  const calculateMarkup = (selling: number, cost: number): number => {
    if (cost === 0) return 0
    return ((selling - cost) / selling) * 100
  }

  const retailMargin = calculateMargin(sellingPrice, costPrice)
  const wholesaleMargin = calculateMargin(wholesalePrice, costPrice)
  const retailMarkup = calculateMarkup(sellingPrice, costPrice)
  const wholesaleMarkup = calculateMarkup(wholesalePrice, costPrice)

  const suggestRetailPrice = () => {
    // Suggest 50% markup over cost price
    const suggested = costPrice * 1.5
    onPriceChange('sellingPrice', Math.round(suggested * 100) / 100)
  }

  const suggestWholesalePrice = () => {
    // Suggest 25% markup over cost price
    const suggested = costPrice * 1.25
    onPriceChange('wholesalePrice', Math.round(suggested * 100) / 100)
  }

  return (
    <div className="space-y-6">
      {/* Cost Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice || ''}
                onChange={(e) => onPriceChange('costPrice', parseFloat(e.target.value) || 0)}
                className={`input pl-7 ${errors.costPrice ? 'border-red-500' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors.costPrice && (
              <p className="text-red-500 text-sm mt-1">{errors.costPrice}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              The cost you pay to acquire this product
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate || ''}
                onChange={(e) => onPriceChange('taxRate', parseFloat(e.target.value) || 0)}
                className={`input pr-8 ${errors.taxRate ? 'border-red-500' : ''}`}
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Percent className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            {errors.taxRate && (
              <p className="text-red-500 text-sm mt-1">{errors.taxRate}</p>
            )}
          </div>
        </div>

        {/* Pricing Calculator */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Calculator className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">Pricing Calculator</h4>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cost Price:</span>
              <span className="font-medium">${costPrice.toFixed(2)}</span>
            </div>
            
            {sellingPrice > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retail Margin:</span>
                  <span className={`font-medium ${retailMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {retailMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retail Markup:</span>
                  <span className="font-medium">{retailMarkup.toFixed(1)}%</span>
                </div>
              </>
            )}
            
            {wholesalePrice > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wholesale Margin:</span>
                  <span className={`font-medium ${wholesaleMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {wholesaleMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wholesale Markup:</span>
                  <span className="font-medium">{wholesaleMarkup.toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Retail Price */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-medium text-gray-900">Retail Pricing</h4>
          </div>
          {costPrice > 0 && (
            <button
              type="button"
              onClick={suggestRetailPrice}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Suggest Price (50% markup)
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Retail Price *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice || ''}
              onChange={(e) => onPriceChange('sellingPrice', parseFloat(e.target.value) || 0)}
              className={`input pl-7 ${errors.sellingPrice ? 'border-red-500' : ''}`}
              placeholder="0.00"
            />
          </div>
          {errors.sellingPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.sellingPrice}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Price for individual customers and retail sales
          </p>
        </div>
      </div>

      {/* Wholesale Price */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-medium text-gray-900">Wholesale Pricing</h4>
            <span className="text-xs text-gray-500">(Optional)</span>
          </div>
          {costPrice > 0 && (
            <button
              type="button"
              onClick={suggestWholesalePrice}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Suggest Price (25% markup)
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wholesale Price
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={wholesalePrice || ''}
              onChange={(e) => onPriceChange('wholesalePrice', parseFloat(e.target.value) || 0)}
              className={`input pl-7 ${errors.wholesalePrice ? 'border-red-500' : ''}`}
              placeholder="0.00"
            />
          </div>
          {errors.wholesalePrice && (
            <p className="text-red-500 text-sm mt-1">{errors.wholesalePrice}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Price for bulk orders and wholesale customers
          </p>
        </div>
      </div>

      {/* Price Comparison */}
      {sellingPrice > 0 && wholesalePrice > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Price Comparison</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-700">Retail Price</div>
              <div className="font-semibold text-blue-900">${sellingPrice.toFixed(2)}</div>
              <div className="text-xs text-blue-600">
                {retailMargin > 0 ? `+${retailMargin.toFixed(1)}% margin` : 'Loss'}
              </div>
            </div>
            <div>
              <div className="text-blue-700">Wholesale Price</div>
              <div className="font-semibold text-blue-900">${wholesalePrice.toFixed(2)}</div>
              <div className="text-xs text-blue-600">
                {wholesaleMargin > 0 ? `+${wholesaleMargin.toFixed(1)}% margin` : 'Loss'}
              </div>
            </div>
          </div>
          
          {wholesalePrice >= sellingPrice && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-100 p-2 rounded">
              ⚠️ Wholesale price should typically be lower than retail price
            </div>
          )}
        </div>
      )}
    </div>
  )
}