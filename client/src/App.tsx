import { Routes, Route } from 'react-router-dom'
// import { Toaster } from 'react-hot-toast' // Will be added in future tasks
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import Expenses from './pages/Expenses'
import FinancialDashboard from './pages/FinancialDashboard'
import Login from './pages/Login'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/financial-dashboard" element={<FinancialDashboard />} />
          {/* Additional routes will be added in future tasks */}
        </Routes>
      </Layout>
      {/* <Toaster position="top-right" /> */}
    </>
  )
}

export default App