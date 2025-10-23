import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Welcome to Mosaajii POS System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Today's Sales
          </h3>
          <p className="text-3xl font-bold text-primary-600">$0.00</p>
          <p className="text-sm text-gray-500">0 transactions</p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Products
          </h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">0 low stock</p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Customers
          </h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
          <p className="text-sm text-gray-500">Active customers</p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Revenue
          </h3>
          <p className="text-3xl font-bold text-primary-600">$0.00</p>
          <p className="text-sm text-gray-500">This month</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/pos" className="btn-primary">
            New Sale
          </Link>
          <Link to="/products" className="btn-secondary">
            Add Product
          </Link>
          <button className="btn-secondary">
            Add Customer
          </button>
          <button className="btn-secondary">
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}