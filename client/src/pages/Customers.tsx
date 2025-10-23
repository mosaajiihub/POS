import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Users, AlertTriangle, Star, Mail, Phone, Eye } from 'lucide-react'
import CustomerForm from '../components/customers/CustomerForm'
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal'
import { useCustomerStore, Customer } from '../stores/customerStore'

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [filters, setFilters] = useState({
    isActive: '',
    hasLoyaltyPoints: false
  })

  const { customers, isLoading, error, fetchCustomers, deleteCustomer } = useCustomerStore()

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleCreateCustomer = () => {
    setSelectedCustomer(null)
    setShowCustomerForm(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerForm(true)
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDetails(true)
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      await deleteCustomer(customerId)
    }
  }

  const handleFormClose = () => {
    setShowCustomerForm(false)
    setSelectedCustomer(null)
  }

  const handleDetailsClose = () => {
    setShowCustomerDetails(false)
    setSelectedCustomer(null)
  }

  const handleSearch = () => {
    fetchCustomers({
      search: searchTerm,
      isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
      hasLoyaltyPoints: filters.hasLoyaltyPoints
    })
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

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
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600">Manage customer relationships and loyalty programs</p>
        </div>
        <button
          onClick={handleCreateCustomer}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.isActive}
                  onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                  className="input"
                >
                  <option value="">All Customers</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loyalty Points
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasLoyaltyPoints}
                    onChange={(e) => setFilters(prev => ({ ...prev, hasLoyaltyPoints: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Has loyalty points</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With Loyalty Points</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.loyaltyPoints > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'No customers match your search criteria'
                : 'No customers found. Create your first customer to get started.'
              }
            </p>
            {!searchTerm && !Object.values(filters).some(f => f) && (
              <button
                onClick={handleCreateCustomer}
                className="btn-primary mt-4"
              >
                Add Your First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loyalty Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Purchase
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
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            Member since {formatDate(customer.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {customer.phone}
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-sm text-gray-500">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {customer.loyaltyPoints}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(customer.totalSpent || 0)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer._count?.sales || 0} orders
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.lastPurchase ? formatDate(customer.lastPurchase) : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Customer"
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

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CustomerForm
          customer={selectedCustomer}
          onClose={handleFormClose}
          onSave={() => {
            handleFormClose()
            fetchCustomers()
          }}
        />
      )}

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={handleDetailsClose}
          onEdit={(customer) => {
            handleDetailsClose()
            handleEditCustomer(customer)
          }}
        />
      )}
    </div>
  )
}