import { ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  growth?: number
  icon: ReactNode
  color?: string
  prefix?: string
  suffix?: string
  className?: string
  onClick?: () => void
}

export function MetricCard({ 
  title, 
  value, 
  growth, 
  icon, 
  color = 'bg-blue-500',
  prefix = '',
  suffix = '',
  className = '',
  onClick
}: MetricCardProps) {
  const isClickable = !!onClick
  
  return (
    <div 
      className={`metric-card group ${isClickable ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
          <div className={`w-6 h-6 ${color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
        {growth !== undefined && (
          <div className={`flex items-center text-sm font-medium ${
            growth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
          {title}
        </p>
      </div>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
    </div>
  )
}