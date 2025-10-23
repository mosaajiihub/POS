import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { ProductAnalytics } from '../../services/analyticsService'

interface ProductChartProps {
  data: ProductAnalytics[]
  className?: string
  maxItems?: number
}

export default function ProductChart({ data, className = '', maxItems = 10 }: ProductChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {data.productName}
          </p>
          <p className="text-xs text-gray-600 mb-2">SKU: {data.sku}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium">{formatCurrency(data.totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Profit:</span>
              <span className="font-medium">{formatCurrency(data.totalProfit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Margin:</span>
              <span className="font-medium">{formatPercentage(data.profitMargin)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Qty Sold:</span>
              <span className="font-medium">{data.totalQuantitySold.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const chartData = data.slice(0, maxItems).map(item => ({
    ...item,
    name: item.productName.length > 15 
      ? `${item.productName.substring(0, 15)}...` 
      : item.productName
  }))

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">No product data available</p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            yAxisId="currency"
            orientation="left"
            tickFormatter={formatCurrency}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            yAxisId="percentage"
            orientation="right"
            tickFormatter={formatPercentage}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Bar
            yAxisId="currency"
            dataKey="totalRevenue"
            fill="#2563eb"
            name="Revenue"
            radius={[2, 2, 0, 0]}
          />
          
          <Bar
            yAxisId="currency"
            dataKey="totalProfit"
            fill="#059669"
            name="Profit"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}