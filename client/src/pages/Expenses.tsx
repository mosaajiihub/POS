import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Receipt,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText
} from 'lucide-react'
import { useExpenseStore } from '../stores/expenseStore'
import DateRangePicker from '../components/analytics/DateRangePicker'

export default function Expenses() {
  const {
    expenses,
    categories,
    vendors,
    expenseReport,
    total,
    page,
    limit,
    isLoading,
    isCreating,
    isDeleting,
    isGeneratingReport,
    error,
    getExpenses,
    createExpense,
    deleteExpense,
    getExpenseCategories,
    getExpenseVendors,
    generateExpenseReport,
    clearError
  } = useExpenseStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    vendor: '',
    receiptUrl: '',
    expenseDate: format(new Date(), 'yyyy-MM-dd')
  })

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    vendor: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  })

  // Report date range
  const [reportDateRange, setReportDateRange] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadExpenses()
    getExpenseCategories()
    getExpenseVendors()
  }, [])

  const loadExpenses = () => {
    const expenseFilters = {
      ...(filters.search && { search: filters.search }),
      ...(filters.category && { category: filters.category }),
      ...(filters.vendor && { vendor: filters.vendor }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(filters.minAmount && { minAmount: parseFloat(filters.minAmount) }),
      ...(filters.maxAmount && { maxAmount: parseFloat(filters.maxAmount) }),
      page,
      limit
    }
    getExpenses(expenseFilters)
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const success = await createExpense({
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      vendor: formData.vendor || undefined,
      receiptUrl: formData.receiptUrl || undefined,
      expenseDate: formData.expenseDate
    })

    if (success) {
      setShowCreateModal(false)
      setFormData({
        description: '',
        amount: '',
        category: '',
        vendor: '',
        receiptUrl: '',
        expenseDate: format(new Date(), 'yyyy-MM-dd')
      })
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(expenseId)
    }
  }

  const handleGenerateReport = () => {
    generateExpenseReport(reportDateRange.startDate, reportDateRange.endDate)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search expenses..."
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                value={filters.vendor}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                className="input"
              >
                <option value="">All Vendors</option>
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="input text-sm"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => setFilters({
                search: '',
                category: '',
                vendor: '',
                startDate: '',
                endDate: '',
                minAmount: '',
                maxAmount: ''
              })}
              className="btn-outline"
            >
              Clear
            </button>
            <button
              onClick={loadExpenses}
              className="btn-primary"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Expense Report Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Expense Report</h3>
          <div className="flex items-center gap-3">
            <DateRangePicker
              value={reportDateRange}
              onChange={setReportDateRange}
            />
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="btn-primary flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {expenseReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(expenseReport.totalAmount)}
                </p>
                <p className="text-sm text-blue-600">Total Expenses</p>
              </div>
            </div>

            <div className="text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <Receipt className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">
                  {expenseReport.totalExpenses}
                </p>
                <p className="text-sm text-green-600">Total Transactions</p>
              </div>
            </div>

            <div className="text-center">
              <div className="p-4 bg-orange-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(expenseReport.averageExpense)}
                </p>
                <p className="text-sm text-orange-600">Average Expense</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {expense.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {expense.receiptUrl && (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Receipt className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedExpense(expense.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {/* Handle previous page */}}
                disabled={page === 1}
                className="btn-outline disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => {/* Handle next page */}}
                disabled={page * limit >= total}
                className="btn-outline disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Expense Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Expense</h3>
            
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="input"
                  placeholder="Enter expense description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="input"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="input"
                  placeholder="Enter category"
                  list="categories"
                />
                <datalist id="categories">
                  {categories.map(category => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="input"
                  placeholder="Enter vendor name"
                  list="vendors"
                />
                <datalist id="vendors">
                  {vendors.map(vendor => (
                    <option key={vendor} value={vendor} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt URL
                </label>
                <input
                  type="url"
                  value={formData.receiptUrl}
                  onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}