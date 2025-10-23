import { useState, useEffect } from 'react'
import { X, Building, Mail, Phone, MapPin, CreditCard, TrendingUp, Calendar, Package, Edit, Star } from 'lucide-react'
import { Supplier, useSupplierStore } from '../../stores/supplierStore'

interface SupplierDetailsModalProps {
  supplier: Supplier
  onClose: () => void
  onEdit: (supplier: Supplier) => void
}

export default function SupplierDetailsModal({ supplier, onClose, onEdit }: SupplierDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'products'>('overview')

  const { 
    supplierPerformance, 
    isLoading, 
    fetchSupplierPerformance
  } = useSupplierStore()

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchSupplierPerformance(supplier.id)
    }
  }, [activeTab, supplier.id, fetchSupplierPerformance])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getPerformanceColor = (rating: number) => {
    if (rating >= 90) return 'text-green-600'
    if (rating >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStarRating = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />)
    }

    const remainingStars = 5 - Math.ceil(rating)
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />)
    }

    return stars
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{supplier.name}</h2>
              <p className="text-gray-600">{supplier.contactPerson || 'No contact person'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(supplier)}
              className="btn-outline flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Supplier Stats */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{supplier._count?.products || 0}</div>
              <div className="text-sm text-gray-600">Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{supplier._count?.purchaseOrders || 0}</div>
              <div className="text-sm text-gray-600">Purchase Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{supplier.paymentTerms || 'N/A'}</div>
              <div className="text-sm text-gray-600">Payment Terms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatDate(supplier.createdAt)}
              </div>
              <div className="text-sm text-gray-600">Partner Since</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Performance</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Products</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{supplier.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{supplier.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Address Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {supplier.address || supplier.city || supplier.postalCode ? (
                    <div className="space-y-2">
                      {supplier.address && <p className="text-gray-900">{supplier.address}</p>}
                      <p className="text-gray-900">
                        {[supplier.city, supplier.postalCode].filter(Boolean).join(', ') || 'Not provided'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No address information provided</p>
                  )}
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Business Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                    <p className="text-gray-900">{supplier.paymentTerms || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      supplier.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="text-gray-900">{formatDate(supplier.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Supplier Performance</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : supplierPerformance ? (
                <>
                  {/* Key Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(supplierPerformance.averageOrderValue)}
                      </div>
                      <div className="text-sm text-gray-600">Avg Order Value</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className={`text-2xl font-bold ${getPerformanceColor(supplierPerformance.onTimeDeliveryRate)}`}>
                        {supplierPerformance.onTimeDeliveryRate}%
                      </div>
                      <div className="text-sm text-gray-600">On-Time Delivery</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {supplierPerformance.totalOrders}
                      </div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(supplierPerformance.totalValue)}
                      </div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                  </div>

                  {/* Quality Rating */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Quality Rating</h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {getStarRating(supplierPerformance.qualityRating)}
                      </div>
                      <span className="text-lg font-medium text-gray-900">
                        {supplierPerformance.qualityRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600">out of 5</span>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Top Products by Value</h4>
                    {supplierPerformance.topProducts.length === 0 ? (
                      <p className="text-gray-600">No product data available</p>
                    ) : (
                      <div className="space-y-3">
                        {supplierPerformance.topProducts.map((product, index) => (
                          <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{product.productName}</p>
                                <p className="text-sm text-gray-600">{product.totalQuantity} units ordered</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{formatCurrency(product.totalValue)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Last Order */}
                  {supplierPerformance.lastOrderDate && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Last Order</h4>
                      <p className="text-gray-900">{formatDate(supplierPerformance.lastOrderDate)}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No performance data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Products from this Supplier</h3>
              
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Product listing will be implemented in future updates</p>
                <p className="text-sm text-gray-500 mt-2">
                  This supplier currently has {supplier._count?.products || 0} products
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}