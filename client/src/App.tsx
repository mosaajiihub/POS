import { Routes, Route } from 'react-router-dom'
// import { Toaster } from 'react-hot-toast' // Will be added in future tasks
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
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
          {/* Additional routes will be added in future tasks */}
        </Routes>
      </Layout>
      {/* <Toaster position="top-right" /> */}
    </>
  )
}

export default App