import { useState, useEffect } from 'react'

interface DashboardMetrics {
  totalSales: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  recentTransactions: any[]
}

export function useDashboardMetrics() {
  const [data, setData] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = () => {
    setIsLoading(true)
    setError(null)
    
    // Simulate API call
    setTimeout(() => {
      try {
        const mockData: DashboardMetrics = {
          totalSales: 125430,
          totalOrders: 1247,
          totalCustomers: 3456,
          totalProducts: 892,
          recentTransactions: []
        }
        setData(mockData)
        setLastUpdated(new Date())
        setIsLoading(false)
      } catch (err) {
        setError(err as Error)
        setIsLoading(false)
      }
    }, 1000)
  }

  useEffect(() => {
    refresh()
  }, [])

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh
  }
}