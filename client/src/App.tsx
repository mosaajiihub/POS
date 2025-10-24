import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './components/ui/theme-provider'
import { ErrorBoundary } from './components/ui/error-boundary'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Transactions from './pages/Transactions'
import Invoices from './pages/Invoices'
import Analytics from './pages/Analytics'
import Expenses from './pages/Expenses'
import FinancialDashboard from './pages/FinancialDashboard'
import ServiceManagement from './pages/ServiceManagement'
import { Reports } from './pages/Reports'
import Login from './pages/Login'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="mosaajii-pos-theme">
        {!isAuthenticated ? (
          <Login />
        ) : (
          <>
            <Layout>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/financial-dashboard" element={<FinancialDashboard />} />
                  <Route path="/service-management" element={<ServiceManagement />} />
                  <Route path="/reports" element={<Reports />} />
                </Routes>
              </ErrorBoundary>
            </Layout>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#374151',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
              }}
            />
          </>
        )}
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App