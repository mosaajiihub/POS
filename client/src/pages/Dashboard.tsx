import React from 'react'
import { RefreshCw, Settings, AlertCircle } from 'lucide-react'
import { useDashboardMetrics } from '../hooks/useRealTimeData'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { useGlobalKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { DashboardLayoutCustomizer } from '../components/dashboard/DashboardLayoutCustomizer'
import { showToast } from '../lib/toast'
import { formatDate } from '../lib/utils'

export default function Dashboard() {
  const { data: metrics, isLoading, error, lastUpdated, refresh } = useDashboardMetrics()
  const {
    visibleWidgets,
    availableWidgets,
    isCustomizing,
    setIsCustomizing,
    saveLayout,
    getWidgetGridClass
  } = useDashboardLayout()

  // Enable global keyboard shortcuts
  useGlobalKeyboardShortcuts()

  const handleRefresh = () => {
    refresh()
    showToast.success('Dashboard data refreshed')
  }

  const handleError = () => {
    if (error) {
      showToast.error('Failed to load dashboard data')
    }
  }

  // Show error toast when error occurs
  if (error && !isLoading) {
    handleError()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Welcome to Mosaajii POS System</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {formatDate(lastUpdated, 'PPpp')}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCustomizing(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <Settings className="h-4 w-4" />
            Customize
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">
              Failed to load dashboard data. Please try refreshing.
            </p>
          </div>
        </div>
      )}

      {/* Customizable Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {visibleWidgets.map((widget) => {
          const WidgetComponent = widget.component
          return (
            <div
              key={widget.id}
              className={getWidgetGridClass(widget.size)}
            >
              <WidgetComponent {...(widget.props || {})} />
            </div>
          )
        })}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets visible</h3>
          <p className="text-gray-600 mb-4">
            Customize your dashboard to add widgets and organize your workspace.
          </p>
          <button
            onClick={() => setIsCustomizing(true)}
            className="btn-primary"
          >
            Customize Dashboard
          </button>
        </div>
      )}

      {/* Dashboard Layout Customizer Modal */}
      {isCustomizing && (
        <DashboardLayoutCustomizer
          widgets={visibleWidgets}
          availableWidgets={availableWidgets}
          onLayoutChange={saveLayout}
          onClose={() => setIsCustomizing(false)}
        />
      )}
    </div>
  )
}