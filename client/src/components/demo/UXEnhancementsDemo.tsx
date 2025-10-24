import React, { useState } from 'react'
import { Keyboard, Move, Settings, Grid, List } from 'lucide-react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'
import { showToast } from '../../lib/toast'

interface DemoItem {
  id: string
  name: string
  color: string
}

export const UXEnhancementsDemo: React.FC = () => {
  const [demoItems, setDemoItems] = useState<DemoItem[]>([
    { id: '1', name: 'Item 1', color: 'bg-blue-100' },
    { id: '2', name: 'Item 2', color: 'bg-green-100' },
    { id: '3', name: 'Item 3', color: 'bg-yellow-100' },
    { id: '4', name: 'Item 4', color: 'bg-purple-100' }
  ])

  // Keyboard shortcuts demo
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'd',
        ctrlKey: true,
        description: 'Demo Action',
        action: () => showToast.success('Demo keyboard shortcut triggered!')
      },
      {
        key: 'r',
        altKey: true,
        description: 'Reset Demo Items',
        action: () => {
          setDemoItems([
            { id: '1', name: 'Item 1', color: 'bg-blue-100' },
            { id: '2', name: 'Item 2', color: 'bg-green-100' },
            { id: '3', name: 'Item 3', color: 'bg-yellow-100' },
            { id: '4', name: 'Item 4', color: 'bg-purple-100' }
          ])
          showToast.info('Demo items reset')
        }
      }
    ],
    enabled: true
  })

  // Drag and drop demo
  const { createDraggableProps, createDropZoneProps } = useDragAndDrop({
    onDrop: (draggedItem, dropZoneId) => {
      const draggedIndex = demoItems.findIndex(item => item.id === draggedItem.id)
      const dropIndex = demoItems.findIndex(item => item.id === dropZoneId)
      
      if (draggedIndex === -1 || dropIndex === -1 || draggedIndex === dropIndex) {
        return
      }
      
      const newItems = [...demoItems]
      const [draggedElement] = newItems.splice(draggedIndex, 1)
      newItems.splice(dropIndex, 0, draggedElement)
      
      setDemoItems(newItems)
      showToast.success('Items reordered!')
    }
  })

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          UX Enhancements Demo
        </h2>
        <p className="text-gray-600">
          Demonstrating keyboard shortcuts, drag-and-drop, and customizable layouts
        </p>
      </div>

      {/* Keyboard Shortcuts Demo */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Keyboard className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Keyboard Shortcuts
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Demo Action</span>
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              Ctrl+D
            </kbd>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Reset Demo Items</span>
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              Alt+R
            </kbd>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Navigate to Dashboard</span>
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              Ctrl+1
            </kbd>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Navigate to POS</span>
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              Ctrl+2
            </kbd>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Try pressing the keyboard combinations above to see them in action!
        </p>
      </div>

      {/* Drag and Drop Demo */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Move className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Drag and Drop
          </h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Drag the items below to reorder them:
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {demoItems.map((item) => (
            <div
              key={item.id}
              {...createDraggableProps({
                id: item.id,
                type: 'demo-item',
                data: item
              })}
              {...createDropZoneProps(item.id, ['demo-item'])}
              className={`${item.color} p-4 rounded-lg border-2 border-dashed border-transparent hover:border-primary-300 transition-all cursor-grab active:cursor-grabbing`}
            >
              <div className="flex items-center space-x-2">
                <Move className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Items can be dragged and dropped to reorder them. Try it out!
        </p>
      </div>

      {/* Dashboard Customization Demo */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Customizable Dashboard
          </h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The dashboard now supports customizable layouts with drag-and-drop widgets:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Drag and drop widgets to reorder</li>
                <li>• Toggle widget visibility</li>
                <li>• Resize widgets (small, medium, large, full)</li>
                <li>• Add/remove widgets dynamically</li>
                <li>• Save layout preferences</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Available Widgets:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Sales Summary</li>
                <li>• Products Overview</li>
                <li>• Customer Stats</li>
                <li>• Revenue Tracking</li>
                <li>• Quick Actions</li>
                <li>• Recent Transactions</li>
                <li>• Low Stock Alerts</li>
                <li>• System Status</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Try it out:</strong> Go to the Dashboard and click the "Customize" button 
              to see the layout customizer in action!
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Management Demo */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Grid className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Drag-and-Drop Inventory Management
          </h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The Products page now includes an "Organize Inventory" tab with advanced features:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Category Management:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Drag categories to reorder</li>
                <li>• Visual category organization</li>
                <li>• Category-based product grouping</li>
                <li>• Collapsible category sections</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Product Organization:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Drag products within categories</li>
                <li>• Grid and list view modes</li>
                <li>• Real-time search and filtering</li>
                <li>• Visual stock level indicators</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Try it out:</strong> Go to Products → Organize Inventory tab to see 
              the drag-and-drop inventory management in action!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}