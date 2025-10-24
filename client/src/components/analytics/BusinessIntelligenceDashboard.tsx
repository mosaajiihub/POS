import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Info, Target } from 'lucide-react'
import { BusinessIntelligence } from '../../services/analyticsService'

interface BusinessIntelligenceDashboardProps {
  data: BusinessIntelligence
}

export default function BusinessIntelligenceDashboard({ data }: BusinessIntelligenceDashboardProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="w-5 h-5 text-yellow-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getInsightBorderColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-l-yellow-500'
      case 'warning':
        return 'border-l-red-500'
      default:
        return 'border-l-blue-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'inventory':
        return '📦'
      case 'pricing':
        return '💰'
      case 'marketing':
        return '📈'
      case 'operations':
        return '⚙️'
      default:
        return '📊'
    }
  }

  const formatValue = (value: number, isPercentage = false, isCurrency = false) => {
    if (isPercentage) {
      return `${value.toFixed(1)}%`
    }
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    }
    return value.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* KPIs Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.kpis.map((kpi, index) => (
            <div key={index} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-600">{kpi.name}</h4>
                {getTrendIcon(kpi.trend)}
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">
                  {formatValue(
                    kpi.value, 
                    kpi.name.toLowerCase().includes('margin') || kpi.name.toLowerCase().includes('retention'),
                    kpi.name.toLowerCase().includes('revenue') || kpi.name.toLowerCase().includes('value')
                  )}
                </p>
                {kpi.target && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Target className="w-3 h-3" />
                    <span>Target: {formatValue(kpi.target, kpi.name.toLowerCase().includes('margin'))}</span>
                  </div>
                )}
                <p className={`text-xs font-medium ${
                  kpi.changePercent > 0 ? 'text-green-600' : 
                  kpi.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent.toFixed(1)}% from last period
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Insights</h3>
        <div className="space-y-3">
          {data.insights.map((insight, index) => (
            <div 
              key={index} 
              className={`card p-4 border-l-4 ${getInsightBorderColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {insight.impact} impact
                      </span>
                      {insight.actionable && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Actionable
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Strategic Recommendations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.recommendations.map((recommendation, index) => (
            <div key={index} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getCategoryIcon(recommendation.category)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs font-medium text-gray-700 mb-1">Estimated Impact:</p>
                    <p className="text-sm text-gray-900">{recommendation.estimatedImpact}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">Intelligence Summary</h4>
        </div>
        <p className="text-sm text-blue-800">
          Based on your data analysis, we've identified {data.insights.length} key insights and 
          {data.recommendations.length} strategic recommendations. Focus on high-priority items 
          for maximum business impact.
        </p>
      </div>
    </div>
  )
}