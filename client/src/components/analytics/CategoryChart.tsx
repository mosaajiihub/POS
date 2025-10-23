import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts'
import { CategoryAnalytics } from '../../services/analyticsService'

interface CategoryChartProps {
  data: CategoryAnalytics[]
  className?: string
  maxItems?: number
}

const COLORS = [
  '#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#dc2626', '#9333ea'
]

export default function CategoryChart({ data, className = '', maxItems = 8 }: CategoryChartProps) {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {data.categoryName}
          </p>
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
              <span className="text-gray-600">Products:</span>
              <span className="font-medium">{data.productCount}</span>
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

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const chartData = data.slice(0, maxItems)

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">No category data available</p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="totalRevenue"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {entry.payload.categoryName}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}