import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, Package, Users, Building, Receipt, FileText, BarChart3, CreditCard, PieChart, FileBarChart, Keyboard } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ThemeToggle } from './ui/theme-toggle'
import { useGlobalKeyboardShortcuts, useKeyboardShortcutsHelp } from '../hooks/useKeyboardShortcuts'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  
  // Enable global keyboard shortcuts
  const globalShortcuts = useGlobalKeyboardShortcuts()
  const { showHelp } = useKeyboardShortcutsHelp()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'POS Terminal', href: '/pos', icon: ShoppingCart },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Building },
    { name: 'Transactions', href: '/transactions', icon: Receipt },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
    { name: 'Expenses', href: '/expenses', icon: CreditCard },
    { name: 'Financial', href: '/financial-dashboard', icon: PieChart }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-semibold text-foreground">
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
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
              <button
                onClick={() => showHelp(globalShortcuts)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title="Keyboard Shortcuts (Ctrl+K)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">
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