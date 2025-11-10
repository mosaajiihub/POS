import React from 'react'
import { X } from 'lucide-react'

interface Widget {
  id: string
  name: string
  component: React.ComponentType<any>
  size: 'small' | 'medium' | 'large'
  props?: any
}

interface DashboardLayoutCustomizerProps {
  widgets: Widget[]
  availableWidgets: Widget[]
  onLayoutChange: (widgets: Widget[]) => void
  onClose: () => void
}

export function DashboardLayoutCustomizer({
  widgets,
  availableWidgets,
  onLayoutChange,
  onClose
}: DashboardLayoutCustomizerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-elegant max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Customize Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Dashboard customization coming soon! You can add and arrange widgets to personalize your workspace.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary-elegant"
            >
              Cancel
            </button>
            <button
              onClick={() => onLayoutChange(widgets)}
              className="btn-primary-elegant"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}