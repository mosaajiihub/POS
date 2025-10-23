import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import { TimeSeriesData } from '../../services/analyticsService'

interface SalesChartProps {
  data: TimeSeriesData[]
  groupBy: 'day' | 'week' | 'month' | 'year'
  className?: string
}

export default function SalesChart({ data, groupBy, className = '' }: SalesChartProps) {
  const formatXAxisLabel = (dateString: string) => {
    const date = new Date(dateString)
    
    switch (groupBy) {
      case 'day':
        return format(date, 'MMM dd')
      case 'week':
        return format(date, 'MMM dd')
      case 'month':
        return format(date, 'MMM yyyy')
      case 'year':
        return format(date, 'yyyy')
      default:
        return format(date, 'MMM dd')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {formatXAxisLabel(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium">
                {entry.dataKey === 'totalSales' || entry.dataKey === 'transactionCount' 
                  ? entry.value.toLocaleString()
                  : formatCurrency(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500">No data available for the selected period</p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxisLabel}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            yAxisId="currency"
            orientation="left"
            tickFormatter={formatCurrency}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            yAxisId="count"
            orientation="right"
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Line
            yAxisId="currency"
            type="monotone"
            dataKey="totalRevenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue"
          />
          
          <Line
            yAxisId="currency"
            type="monotone"
            dataKey="totalProfit"
            stroke="#059669"
            strokeWidth={2}
            dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            name="Profit"
          />
          
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="transactionCount"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            name="Transactions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}