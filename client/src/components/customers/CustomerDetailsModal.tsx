import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, CreditCard, Star, TrendingUp, Calendar, Package, Edit, Plus, Minus } from 'lucide-react'
import { Customer, useCustomerStore } from '../../stores/customerStore'

interface CustomerDetailsModalProps {
  customer: Customer
  onClose: () => void
  onEdit: (customer: Customer) => void
}

export default function CustomerDetailsModal({ customer, onClose, onEdit }: CustomerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics'>('overview')
  const [loyaltyPointsChange, setLoyaltyPointsChange] = useState(0)
  const [loyaltyReason, setLoyaltyReason] = useState('')
  const [showLoyaltyForm, setShowLoyaltyForm] = useState(false)

  const { 
    customerAnalytics, 
    purchaseHistory, 
    isLoading, 
    fetchCustomerAnalytics, 
    fetchPurchaseHistory,
    updateLoyaltyPoints
  } = useCustomerStore()

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchCustomerAnalytics(customer.id)
    } else if (activeTab === 'history') {
      fetchPurchaseHistory(customer.id)
    }
  }, [activeTab, customer.id, fetchCustomerAnalytics, fetchPurchaseHistory])

  const handleLoyaltyPointsUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loyaltyReason.trim() || loyaltyPointsChange === 0) return

    try {
      await updateLoyaltyPoints(customer.id, loyaltyPointsChange, loyaltyReason)
      setShowLoyaltyForm(false)
      setLoyaltyPointsChange(0)
      setLoyaltyReason('')
    } catch (error) {
      console.error('Error updating loyalty points:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h2>
              <p className="text-gray-600">{customer.email || 'No email provided'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(customer)}
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

        {/* Customer Stats */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{customer.loyaltyPoints}</div>
              <div className="text-sm text-gray-600">Loyalty Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(customer.totalSpent || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {customer._count?.sales || 0}
              </div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(customer.creditLimit)}
              </div>
              <div className="text-sm text-gray-600">Credit Limit</div>
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
                <User className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Purchase History</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Analytics</span>
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
                    <p className="text-gray-900">{customer.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{customer.phone || 'Not provided'}</p>
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
                  {customer.address || customer.city || customer.postalCode ? (
                    <div className="space-y-2">
                      {customer.address && <p className="text-gray-900">{customer.address}</p>}
                      <p className="text-gray-900">
                        {[customer.city, customer.postalCode].filter(Boolean).join(', ') || 'Not provided'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No address information provided</p>
                  )}
                </div>
              </div>

              {/* Loyalty Points Management */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    Loyalty Points Management
                  </h3>
                  <button
                    onClick={() => setShowLoyaltyForm(!showLoyaltyForm)}
                    className="btn-outline text-sm"
                  >
                    {showLoyaltyForm ? 'Cancel' : 'Adjust Points'}
                  </button>
                </div>

                {showLoyaltyForm && (
                  <form onSubmit={handleLoyaltyPointsUpdate} className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Points Change
                        </label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setLoyaltyPointsChange(prev => prev - 1)}
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={loyaltyPointsChange}
                            onChange={(e) => setLoyaltyPointsChange(parseInt(e.target.value) || 0)}
                            className="input text-center"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => setLoyaltyPointsChange(prev => prev + 1)}
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason
                        </label>
                        <input
                          type="text"
                          value={loyaltyReason}
                          onChange={(e) => setLoyaltyReason(e.target.value)}
                          className="input"
                          placeholder="Enter reason for adjustment"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowLoyaltyForm(false)}
                        className="btn-outline text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary text-sm"
                        disabled={!loyaltyReason.trim() || loyaltyPointsChange === 0}
                      >
                        Update Points
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Account Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Since</label>
                    <p className="text-gray-900">{formatDate(customer.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Purchase</label>
                    <p className="text-gray-900">
                      {customer.lastPurchase ? formatDate(customer.lastPurchase) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Purchase History</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No purchase history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseHistory.map((sale) => (
                    <div key={sale.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{sale.transactionNumber}</h4>
                          <p className="text-sm text-gray-600">{formatDate(sale.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(sale.totalAmount)}</p>
                          <p className="text-sm text-gray-600">{sale.paymentMethod}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {sale.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <span className="text-gray-900">{item.product.name}</span>
                              <span className="text-gray-600 ml-2">({item.product.sku})</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-900">
                                {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                        Served by: {sale.cashier.firstName} {sale.cashier.lastName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Customer Analytics</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : customerAnalytics ? (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(customerAnalytics.averageOrderValue)}
                      </div>
                      <div className="text-sm text-gray-600">Average Order Value</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {customerAnalytics.loyaltyPointsEarned}
                      </div>
                      <div className="text-sm text-gray-600">Points Earned</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {customerAnalytics.loyaltyPointsUsed}
                      </div>
                      <div className="text-sm text-gray-600">Points Used</div>
                    </div>
                  </div>

                  {/* Favorite Products */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Favorite Products</h4>
                    {customerAnalytics.favoriteProducts.length === 0 ? (
                      <p className="text-gray-600">No favorite products data available</p>
                    ) : (
                      <div className="space-y-3">
                        {customerAnalytics.favoriteProducts.map((product, index) => (
                          <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{product.productName}</p>
                                <p className="text-sm text-gray-600">{product.totalQuantity} units purchased</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{formatCurrency(product.totalSpent)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No analytics data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}