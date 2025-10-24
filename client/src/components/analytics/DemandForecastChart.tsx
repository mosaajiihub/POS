import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { DemandForecast } from '../../services/analyticsService'

interface DemandForecastChartProps {
  data: DemandForecast[]
  limit?: number
}

export default function DemandForecastChart({ data, limit = 10 }: DemandForecastChartProps) {
  const chartData = useMemo(() => {
    return data.slice(0, limit).map(item => ({
      name: item.productName.length > 15 ? `${item.productName.substring(0, 15)}...` : item.productName,
      fullName: item.productName,
      sku: item.sku,
      currentStock: item.currentStock,
      forecastedDemand: item.forecastedDemand,
      recommendedOrder: item.recommendedOrder,
      confidence: item.confidence,
      trend: item.trend
    }))
  }, [data, limit])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '#10B981'
      case 'decreasing':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.fullName}</p>
          <p className="text-sm text-gray-600 mb-1">SKU: {data.sku}</p>
          <p className="text-sm text-gray-600 mb-1">Current Stock: {data.currentStock}</p>
          <p className="text-sm text-gray-600 mb-1">Forecasted Demand: {data.forecastedDemand}</p>
          <p className="text-sm text-gray-600 mb-1">Recommended Order: {data.recommendedOrder}</p>
          <p className="text-sm text-gray-600 mb-1">Confidence: {(data.confidence * 100).toFixed(1)}%</p>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(data.trend)}
            <span className="text-sm capitalize">{data.trend} trend</span>
          </div>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No demand forecast data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="forecastedDemand" name="Forecasted Demand">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getTrendColor(entry.trend)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span>Increasing Trend</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="w-4 h-4 text-gray-500" />
          <span>Stable Trend</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span>Decreasing Trend</span>
        </div>
      </div>
    </div>
  )
}