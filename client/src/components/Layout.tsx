import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, ShoppingCart, Package, Users, Building, Receipt, FileText, 
  BarChart3, CreditCard, PieChart, FileBarChart, Keyboard, Menu, X,
  Bell, Search, Settings, LogOut, User, Sparkles
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ThemeToggle } from './ui/theme-toggle'
import { useGlobalKeyboardShortcuts, useKeyboardShortcutsHelp } from '../hooks/useKeyboardShortcuts'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  
  // Enable global keyboard shortcuts
  const globalShortcuts = useGlobalKeyboardShortcuts()
  const { showHelp } = useKeyboardShortcutsHelp()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, color: 'text-blue-600' },
    { name: 'POS Terminal', href: '/pos', icon: ShoppingCart, color: 'text-green-600' },
    { name: 'Products', href: '/products', icon: Package, color: 'text-purple-600' },
    { name: 'Customers', href: '/customers', icon: Users, color: 'text-pink-600' },
    { name: 'Suppliers', href: '/suppliers', icon: Building, color: 'text-indigo-600' },
    { name: 'Transactions', href: '/transactions', icon: Receipt, color: 'text-yellow-600' },
    { name: 'Invoices', href: '/invoices', icon: FileText, color: 'text-red-600' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, color: 'text-cyan-600' },
    { name: 'Reports', href: '/reports', icon: FileBarChart, color: 'text-orange-600' },
    { name: 'Expenses', href: '/expenses', icon: CreditCard, color: 'text-rose-600' },
    { name: 'Financial', href: '/financial-dashboard', icon: PieChart, color: 'text-emerald-600' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Elegant Header */}
      <header className="header-elegant sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-elegant group-hover:shadow-glow transition-all duration-300 transform group-hover:scale-105">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gradient hidden sm:block">
                  Mosaajii POS
                </span>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-1">
                {navigation.slice(0, 6).map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`nav-item-elegant group ${isActive ? 'nav-item-active' : ''}`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200'}`} />
                      <span className={isActive ? 'font-semibold' : ''}>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200">
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* Keyboard Shortcuts */}
              <button
                onClick={() => showHelp(globalShortcuts)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                title="Keyboard Shortcuts (Ctrl+K)"
              >
                <Keyboard className="w-5 h-5" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role}
                    </p>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 card-elegant py-2 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-item-elegant group ${isActive ? 'nav-item-active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600 dark:text-purple-400' : item.color}`} />
                    <span className={isActive ? 'font-semibold' : ''}>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={location.pathname === '/pos' ? 'relative' : 'max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8'}>
        <div className="relative z-10">
          {children}
        </div>
      </main>

      {/* Click outside to close profile menu */}
      {isProfileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsProfileMenuOpen(false)}
        />
      )}
    </div>
  )
}