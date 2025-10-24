import React, { useState, useEffect } from 'react'
import { X, Settings, Grid, Eye, EyeOff, Move, Plus } from 'lucide-react'
import { useSortableDragAndDrop } from '../../hooks/useDragAndDrop'

export interface DashboardWidget {
  id: string
  type: string
  title: string
  component: React.ComponentType<any>
  props?: any
  size: 'small' | 'medium' | 'large' | 'full'
  visible: boolean
  order: number
}

interface DashboardLayoutCustomizerProps {
  widgets: DashboardWidget[]
  onLayoutChange: (widgets: DashboardWidget[]) => void
  onClose: () => void
  availableWidgets: Omit<DashboardWidget, 'id' | 'visible' | 'order'>[]
}

export const DashboardLayoutCustomizer: React.FC<DashboardLayoutCustomizerProps> = ({
  widgets,
  onLayoutChange,
  onClose,
  availableWidgets
}) => {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets)
  const [showAddWidget, setShowAddWidget] = useState(false)

  const { createSortableItemProps, isDragging } = useSortableDragAndDrop(
    localWidgets,
    setLocalWidgets
  )

  const handleToggleVisibility = (widgetId: string) => {
    setLocalWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, visible: !widget.visible }
          : widget
      )
    )
  }

  const handleSizeChange = (widgetId: string, size: DashboardWidget['size']) => {
    setLocalWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, size }
          : widget
      )
    )
  }

  const handleAddWidget = (widgetType: string) => {
    const availableWidget = availableWidgets.find(w => w.type === widgetType)
    if (!availableWidget) return

    const newWidget: DashboardWidget = {
      ...availableWidget,
      id: `${widgetType}-${Date.now()}`,
      visible: true,
      order: localWidgets.length
    }

    setLocalWidgets(prev => [...prev, newWidget])
    setShowAddWidget(false)
  }

  const handleRemoveWidget = (widgetId: string) => {
    setLocalWidgets(prev => prev.filter(widget => widget.id !== widgetId))
  }

  const handleSave = () => {
    // Update order based on current position
    const updatedWidgets = localWidgets.map((widget, index) => ({
      ...widget,
      order: index
    }))
    
    onLayoutChange(updatedWidgets)
    onClose()
  }

  const handleReset = () => {
    setLocalWidgets(widgets)
  }

  const getSizeLabel = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'Small (1/4)'
      case 'medium': return 'Medium (1/2)'
      case 'large': return 'Large (3/4)'
      case 'full': return 'Full Width'
      default: return 'Medium'
    }
  }

  const getSizeClass = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'w-1/4'
      case 'medium': return 'w-1/2'
      case 'large': return 'w-3/4'
      case 'full': return 'w-full'
      default: return 'w-1/2'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Customize Dashboard Layout
              </h2>
              <p className="text-sm text-gray-600">
                Drag widgets to reorder, toggle visibility, and adjust sizes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Widget List */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Dashboard Widgets</h3>
              <button
                onClick={() => setShowAddWidget(true)}
                className="btn-outline text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Widget</span>
              </button>
            </div>

            <div className="space-y-3">
              {localWidgets.map((widget, index) => (
                <div
                  key={widget.id}
                  {...createSortableItemProps(widget, index)}
                  className={`p-4 border rounded-lg transition-all ${
                    widget.visible ? 'bg-white' : 'bg-gray-50'
                  } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Move className="w-4 h-4 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{widget.title}</h4>
                        <p className="text-xs text-gray-500">Type: {widget.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleVisibility(widget.id)}
                        className={`p-1 rounded ${
                          widget.visible 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={widget.visible ? 'Hide widget' : 'Show widget'}
                      >
                        {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleRemoveWidget(widget.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Remove widget"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Widget Size
                    </label>
                    <select
                      value={widget.size}
                      onChange={(e) => handleSizeChange(widget.id, e.target.value as DashboardWidget['size'])}
                      className="input text-sm"
                      disabled={!widget.visible}
                    >
                      <option value="small">Small (1/4 width)</option>
                      <option value="medium">Medium (1/2 width)</option>
                      <option value="large">Large (3/4 width)</option>
                      <option value="full">Full Width</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Preview</h3>
            
            <div className="border rounded-lg p-4 bg-gray-50 min-h-96">
              <div className="grid grid-cols-4 gap-4">
                {localWidgets
                  .filter(widget => widget.visible)
                  .map((widget) => (
                    <div
                      key={widget.id}
                      className={`${getSizeClass(widget.size)} bg-white border rounded p-3 min-h-24 flex items-center justify-center`}
                    >
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {widget.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getSizeLabel(widget.size)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {localWidgets.filter(w => w.visible).length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <Grid className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No visible widgets</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleReset}
            className="btn-outline text-sm"
          >
            Reset to Default
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              Save Layout
            </button>
          </div>
        </div>

        {/* Add Widget Modal */}
        {showAddWidget && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Widget</h3>
                <button
                  onClick={() => setShowAddWidget(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {availableWidgets
                  .filter(widget => !localWidgets.some(w => w.type === widget.type))
                  .map((widget) => (
                    <button
                      key={widget.type}
                      onClick={() => handleAddWidget(widget.type)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{widget.title}</div>
                      <div className="text-sm text-gray-500">Type: {widget.type}</div>
                    </button>
                  ))}
              </div>
              
              {availableWidgets.filter(widget => !localWidgets.some(w => w.type === widget.type)).length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  All available widgets are already added
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}