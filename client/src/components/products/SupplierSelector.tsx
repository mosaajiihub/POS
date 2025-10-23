import { useState, useEffect } from 'react'
import { Plus, ChevronDown, Building2 } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
}

interface SupplierSelectorProps {
  value: string
  onChange: (supplierId: string) => void
  error?: string
}

export default function SupplierSelector({ value, onChange, error }: SupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: ''
  })
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    setIsLoading(true)
    try {
      // Mock data - will be replaced with API call
      const mockSuppliers: Supplier[] = [
        {
          id: '1',
          name: 'ABC Distributors',
          contactPerson: 'John Smith',
          email: 'john@abcdist.com',
          phone: '+1-555-0123'
        },
        {
          id: '2',
          name: 'XYZ Suppliers',
          contactPerson: 'Jane Doe',
          email: 'jane@xyzsuppliers.com',
          phone: '+1-555-0456'
        },
        {
          id: '3',
          name: 'Local Vendor Co.',
          contactPerson: 'Mike Johnson',
          email: 'mike@localvendor.com',
          phone: '+1-555-0789'
        },
        {
          id: '4',
          name: 'Global Trade Inc.',
          contactPerson: 'Sarah Wilson',
          email: 'sarah@globaltrade.com',
          phone: '+1-555-0321'
        }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      setSuppliers(mockSuppliers)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) return

    setIsCreating(true)
    try {
      // Mock API call - will be replaced with actual API
      const supplier: Supplier = {
        id: Date.now().toString(),
        name: newSupplier.name.trim(),
        contactPerson: newSupplier.contactPerson.trim() || undefined,
        email: newSupplier.email.trim() || undefined,
        phone: newSupplier.phone.trim() || undefined
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSuppliers(prev => [...prev, supplier])
      onChange(supplier.id)
      setNewSupplier({ name: '', contactPerson: '', email: '', phone: '' })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating supplier:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const selectedSupplier = suppliers.find(s => s.id === value)

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
          <option value="">Select a supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Create New Supplier */}
      {!showCreateForm ? (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="text-primary-600 hover:text-primary-700 text-sm flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>Create new supplier</span>
        </button>
      ) : (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Building2 className="w-4 h-4" />
            <span>New Supplier</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Supplier name *"
              className="input text-sm"
            />
            
            <input
              type="text"
              value={newSupplier.contactPerson}
              onChange={(e) => setNewSupplier(prev => ({ ...prev, contactPerson: e.target.value }))}
              placeholder="Contact person"
              className="input text-sm"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="input text-sm"
              />
              
              <input
                type="tel"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone"
                className="input text-sm"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleCreateSupplier}
              disabled={!newSupplier.name.trim() || isCreating}
              className="btn-primary text-sm px-3 py-1 flex-1"
            >
              {isCreating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Supplier'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setNewSupplier({ name: '', contactPerson: '', email: '', phone: '' })
              }}
              className="btn-outline text-sm px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Selected Supplier Info */}
      {selectedSupplier && (
        <div className="text-xs text-gray-500 space-y-1">
          {selectedSupplier.contactPerson && (
            <div>Contact: {selectedSupplier.contactPerson}</div>
          )}
          {selectedSupplier.email && (
            <div>Email: {selectedSupplier.email}</div>
          )}
          {selectedSupplier.phone && (
            <div>Phone: {selectedSupplier.phone}</div>
          )}
        </div>
      )}
    </div>
  )
}