import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Scan, X, Package, Zap } from 'lucide-react'
import { Product } from '../../pages/POS'
import { useCartStore } from '../../stores/cartStore'

interface QuickSearchProps {
  products: Product[]
  onProductSelect: (product: Product) => void
  onBarcodeSearch: (barcode: string) => void
  onOpenScanner: () => void
  searchTerm: string
  onSearchChange: (term: string) => void
  className?: string
}

interface SearchSuggestion {
  product: Product
  matchType: 'name' | 'sku' | 'barcode'
  matchText: string
}

export default function QuickSearch({
  products,
  onProductSelect,
  onBarcodeSearch,
  onOpenScanner,
  searchTerm,
  onSearchChange,
  className = ''
}: QuickSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])
  const { addItem } = useCartStore()

  // Generate search suggestions with fuzzy matching
  const suggestions = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return []

    const term = searchTerm.toLowerCase()
    const results: SearchSuggestion[] = []

    products.forEach(product => {
      // Check name match
      if (product.name.toLowerCase().includes(term)) {
        results.push({
          product,
          matchType: 'name',
          matchText: product.name
        })
      }
      // Check SKU match
      else if (product.sku.toLowerCase().includes(term)) {
        results.push({
          product,
          matchType: 'sku',
          matchText: product.sku
        })
      }
      // Check barcode match
      else if (product.barcode && product.barcode.includes(term)) {
        results.push({
          product,
          matchType: 'barcode',
          matchText: product.barcode
        })
      }
    })

    // Sort by relevance (exact matches first, then partial matches)
    return results
      .sort((a, b) => {
        const aExact = a.matchText.toLowerCase().startsWith(term)
        const bExact = b.matchText.toLowerCase().startsWith(term)
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        return a.matchText.localeCompare(b.matchText)
      })
      .slice(0, 8) // Limit to 8 suggestions
  }, [products, searchTerm])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onSearchChange(value)
    setIsOpen(value.length >= 2)
    
    // Check if input looks like a barcode (numeric and long enough)
    if (value.length >= 8 && /^\d+$/.test(value)) {
      onBarcodeSearch(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      // Handle global keyboard shortcuts when search is not active
      if (e.key === 'F3' || (e.ctrlKey && e.key === 'f')) {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (e.key === 'F4' || (e.ctrlKey && e.key === 'b')) {
        e.preventDefault()
        onOpenScanner()
        return
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    onProductSelect(suggestion.product)
    addItem(suggestion.product, 1)
    onSearchChange('')
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const handleFocus = () => {
    if (searchTerm.length >= 2) {
      setIsOpen(true)
    }
  }

  const handleBlur = () => {
    // Delay closing to allow clicking on suggestions
    setTimeout(() => setIsOpen(false), 150)
  }

  const clearSearch = () => {
    onSearchChange('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products, SKU, or scan barcode..."
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="input pl-10 pr-20 w-full"
          autoComplete="off"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          <button
            onClick={onOpenScanner}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Scan barcode (F4 or Ctrl+B)"
          >
            <Scan className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.product.id}-${suggestion.matchType}`}
              ref={el => suggestionRefs.current[index] = el}
              className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-primary-50 border-primary-200' : ''
              }`}
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {highlightMatch(suggestion.product.name, searchTerm)}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>SKU: {highlightMatch(suggestion.product.sku, searchTerm)}</span>
                        {suggestion.product.barcode && (
                          <span>• Barcode: {highlightMatch(suggestion.product.barcode, searchTerm)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-sm font-semibold text-primary-600">
                    ${suggestion.product.price.toFixed(2)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    suggestion.product.stockLevel > 10 
                      ? 'bg-green-100 text-green-700'
                      : suggestion.product.stockLevel > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {suggestion.product.stockLevel > 0 
                      ? `${suggestion.product.stockLevel} in stock`
                      : 'Out of stock'
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Keyboard shortcuts hint */}
          <div className="p-2 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd>
                  <span className="ml-1">Navigate</span>
                </span>
                <span className="flex items-center">
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd>
                  <span className="ml-1">Select</span>
                </span>
                <span className="flex items-center">
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd>
                  <span className="ml-1">Close</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-3 h-3" />
                <span>F3: Focus search • F4: Scan barcode</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && searchTerm.length >= 2 && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1">
          <div className="p-4 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No products found for "{searchTerm}"</p>
            <p className="text-xs mt-1">Try searching by name, SKU, or barcode</p>
          </div>
        </div>
      )}
    </div>
  )
}