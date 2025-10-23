import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Building, AlertTriangle, Mail, Phone, Eye, Package, ShoppingCart } from 'lucide-react'
import SupplierForm from '../components/suppliers/SupplierForm'
import SupplierDetailsModal from '../components/suppliers/SupplierDetailsModal'
import { useSupplierStore, Supplier } from '../stores/supplierStore'

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showSupplierDetails, setShowSupplierDetails] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [filters, setFilters] = useState({
    isActive: ''
  })

  const { suppliers, isLoading, error, fetchSuppliers, deleteSupplier } = useSupplierStore()

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleCreateSupplier = () => {
    setSelectedSupplier(null)
    setShowSupplierForm(true)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowSupplierForm(true)
  }

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowSupplierDetails(true)
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    if (window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      await deleteSupplier(supplierId)
    }
  }

  const handleFormClose = () => {
    setShowSupplierForm(false)
    setSelectedSupplier(null)
  }

  const handleDetailsClose = () => {
    setShowSupplierDetails(false)
    setSelectedSupplier(null)
  }

  const handleSearch = () => {
    fetchSuppliers({
      search: searchTerm,
      isActive: filters.isActive === '' ? undefined : filters.isActive === 'true'
    })
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters])

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
          <h2 className="text-2xl font-bold text-gray-900">Supplier Management</h2>
          <p className="text-gray-600">Manage supplier relationships and performance tracking</p>
        </div>
        <button
          onClick={handleCreateSupplier}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search suppliers by name, contact person, email, or phone..."
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
                  <option value="">All Suppliers</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.reduce((sum, s) => sum + (s._count?.products || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Purchase Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.reduce((sum, s) => sum + (s._count?.purchaseOrders || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Building className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'No suppliers match your search criteria'
                : 'No suppliers found. Create your first supplier to get started.'
              }
            </p>
            {!searchTerm && !Object.values(filters).some(f => f) && (
              <button
                onClick={handleCreateSupplier}
                className="btn-primary mt-4"
              >
                Add Your First Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Terms
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
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Partner since {formatDate(supplier.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {supplier.contactPerson && (
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.contactPerson}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {supplier.phone}
                          </div>
                        )}
                        {!supplier.contactPerson && !supplier.email && !supplier.phone && (
                          <span className="text-sm text-gray-500">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {supplier._count?.products || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingCart className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {supplier._count?.purchaseOrders || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supplier.paymentTerms || 'Not specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewSupplier(supplier)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit Supplier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Supplier"
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

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <SupplierForm
          supplier={selectedSupplier}
          onClose={handleFormClose}
          onSave={() => {
            handleFormClose()
            fetchSuppliers()
          }}
        />
      )}

      {/* Supplier Details Modal */}
      {showSupplierDetails && selectedSupplier && (
        <SupplierDetailsModal
          supplier={selectedSupplier}
          onClose={handleDetailsClose}
          onEdit={(supplier) => {
            handleDetailsClose()
            handleEditSupplier(supplier)
          }}
        />
      )}
    </div>
  )
}