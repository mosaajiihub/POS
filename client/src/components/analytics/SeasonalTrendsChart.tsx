import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { SeasonalTrend } from '../../services/analyticsService'

interface SeasonalTrendsChartProps {
  data: SeasonalTrend[]
  metric?: 'revenue' | 'sales' | 'profit'
}

export default function SeasonalTrendsChart({ data, metric = 'revenue' }: SeasonalTrendsChartProps) {
  const chartData = useMemo(() => {
    const filteredData = data.filter(item => item.metric === metric)
    
    // Group by period and create comparison data
    const periodMap = new Map<string, { current: number, previous: number, change: number }>()
    
    filteredData.forEach(item => {
      periodMap.set(item.period, {
        current: item.value,
        previous: item.previousValue,
        change: item.changePercent
      })
    })

    return Array.from(periodMap.entries()).map(([period, values]) => ({
      period: new Date(period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      current: values.current,
      previous: values.previous,
      change: values.change
    })).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
  }, [data, metric])

  const formatValue = (value: number) => {
    if (metric === 'revenue' || metric === 'profit') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    }
    return value.toLocaleString()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload.find((p: any) => p.dataKey === 'current')
      const previous = payload.find((p: any) => p.dataKey === 'previous')
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {current && (
            <p className="text-sm text-blue-600 mb-1">
              Current Year: {formatValue(current.value)}
            </p>
          )}
          {previous && (
            <p className="text-sm text-gray-600 mb-1">
              Previous Year: {formatValue(previous.value)}
            </p>
          )}
          {current && previous && (
            <p className={`text-sm font-medium ${
              current.value > previous.value ? 'text-green-600' : 'text-red-600'
            }`}>
              Change: {((current.value - previous.value) / previous.value * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No seasonal trend data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 capitalize">
          {metric} Seasonal Comparison
        </h4>
        <div className="text-xs text-gray-500">
          Current vs Previous Year
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis tickFormatter={formatValue} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="current" 
            stroke="#2563EB" 
            strokeWidth={2}
            name="Current Year"
            dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="previous" 
            stroke="#9CA3AF" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Previous Year"
            dot={{ fill: '#9CA3AF', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600">Average Growth</p>
          <p className="text-lg font-semibold text-gray-900">
            {chartData.length > 0 
              ? (chartData.reduce((sum, item) => sum + item.change, 0) / chartData.length).toFixed(1)
              : '0'
            }%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Best Month</p>
          <p className="text-lg font-semibold text-gray-900">
            {chartData.length > 0 
              ? chartData.reduce((max, item) => item.current > max.current ? item : max, chartData[0]).period
              : 'N/A'
            }
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Current</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatValue(chartData.reduce((sum, item) => sum + item.current, 0))}
          </p>
        </div>
      </div>
    </div>
  )
}