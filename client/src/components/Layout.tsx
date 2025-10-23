import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, Package, Users, Building, Receipt, BarChart3, CreditCard, PieChart } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'POS Terminal', href: '/pos', icon: ShoppingCart },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Building },
    { name: 'Transactions', href: '/transactions', icon: Receipt },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Expenses', href: '/expenses', icon: CreditCard },
    { name: 'Financial', href: '/financial-dashboard', icon: PieChart }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-semibold text-gray-900">
                Mosaajii POS
              </Link>
              
              <nav className="hidden md:flex space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="btn-outline text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={location.pathname === '/pos' ? '' : 'max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8'}>
        {children}
      </main>
    </div>
  )
}