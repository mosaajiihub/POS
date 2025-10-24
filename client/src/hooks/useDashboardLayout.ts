import { useState, useEffect, useCallback } from 'react'
import { DashboardWidget } from '../components/dashboard/DashboardLayoutCustomizer'
import {
  SalesSummaryWidget,
  ProductsOverviewWidget,
  CustomersWidget,
  RevenueWidget,
  QuickActionsWidget,
  RecentTransactionsWidget,
  LowStockAlertsWidget,
  SystemStatusWidget
} from '../components/dashboard/DashboardWidgets'

const STORAGE_KEY = 'mosaajii-dashboard-layout'

// Default widget configurations
const defaultWidgets: DashboardWidget[] = [
  {
    id: 'sales-summary',
    type: 'sales-summary',
    title: "Today's Sales",
    component: SalesSummaryWidget,
    size: 'medium',
    visible: true,
    order: 0
  },
  {
    id: 'products-overview',
    type: 'products-overview',
    title: 'Products Overview',
    component: ProductsOverviewWidget,
    size: 'medium',
    visible: true,
    order: 1
  },
  {
    id: 'customers',
    type: 'customers',
    title: 'Customers',
    component: CustomersWidget,
    size: 'medium',
    visible: true,
    order: 2
  },
  {
    id: 'revenue',
    type: 'revenue',
    title: 'Monthly Revenue',
    component: RevenueWidget,
    size: 'medium',
    visible: true,
    order: 3
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    component: QuickActionsWidget,
    size: 'full',
    visible: true,
    order: 4
  },
  {
    id: 'recent-transactions',
    type: 'recent-transactions',
    title: 'Recent Transactions',
    component: RecentTransactionsWidget,
    size: 'large',
    visible: true,
    order: 5
  },
  {
    id: 'low-stock-alerts',
    type: 'low-stock-alerts',
    title: 'Low Stock Alerts',
    component: LowStockAlertsWidget,
    size: 'medium',
    visible: true,
    order: 6
  },
  {
    id: 'system-status',
    type: 'system-status',
    title: 'System Status',
    component: SystemStatusWidget,
    size: 'medium',
    visible: false,
    order: 7
  }
]

// Available widgets that can be added
const availableWidgets: Omit<DashboardWidget, 'id' | 'visible' | 'order'>[] = [
  {
    type: 'sales-summary',
    title: "Today's Sales",
    component: SalesSummaryWidget,
    size: 'medium'
  },
  {
    type: 'products-overview',
    title: 'Products Overview',
    component: ProductsOverviewWidget,
    size: 'medium'
  },
  {
    type: 'customers',
    title: 'Customers',
    component: CustomersWidget,
    size: 'medium'
  },
  {
    type: 'revenue',
    title: 'Monthly Revenue',
    component: RevenueWidget,
    size: 'medium'
  },
  {
    type: 'quick-actions',
    title: 'Quick Actions',
    component: QuickActionsWidget,
    size: 'full'
  },
  {
    type: 'recent-transactions',
    title: 'Recent Transactions',
    component: RecentTransactionsWidget,
    size: 'large'
  },
  {
    type: 'low-stock-alerts',
    title: 'Low Stock Alerts',
    component: LowStockAlertsWidget,
    size: 'medium'
  },
  {
    type: 'system-status',
    title: 'System Status',
    component: SystemStatusWidget,
    size: 'medium'
  }
]

export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets)
  const [isCustomizing, setIsCustomizing] = useState(false)

  // Load saved layout from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const savedWidgets = JSON.parse(saved) as DashboardWidget[]
        
        // Merge with default widgets to ensure all components are available
        const mergedWidgets = savedWidgets.map(savedWidget => {
          const defaultWidget = defaultWidgets.find(w => w.type === savedWidget.type)
          return {
            ...defaultWidget,
            ...savedWidget,
            component: defaultWidget?.component || savedWidget.component
          }
        })
        
        setWidgets(mergedWidgets)
      }
    } catch (error) {
      console.error('Error loading dashboard layout:', error)
      setWidgets(defaultWidgets)
    }
  }, [])

  // Save layout to localStorage
  const saveLayout = useCallback((newWidgets: DashboardWidget[]) => {
    try {
      // Don't save the component functions, just the configuration
      const widgetsToSave = newWidgets.map(({ component, ...widget }) => widget)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetsToSave))
      setWidgets(newWidgets)
    } catch (error) {
      console.error('Error saving dashboard layout:', error)
    }
  }, [])

  // Reset to default layout
  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setWidgets(defaultWidgets)
    } catch (error) {
      console.error('Error resetting dashboard layout:', error)
    }
  }, [])

  // Get visible widgets sorted by order
  const visibleWidgets = widgets
    .filter(widget => widget.visible)
    .sort((a, b) => a.order - b.order)

  // Get grid class for widget size
  const getWidgetGridClass = useCallback((size: DashboardWidget['size']) => {
    switch (size) {
      case 'small':
        return 'col-span-1 md:col-span-1'
      case 'medium':
        return 'col-span-1 md:col-span-2'
      case 'large':
        return 'col-span-1 md:col-span-3'
      case 'full':
        return 'col-span-1 md:col-span-4'
      default:
        return 'col-span-1 md:col-span-2'
    }
  }, [])

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    const newWidgets = widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, visible: !widget.visible }
        : widget
    )
    saveLayout(newWidgets)
  }, [widgets, saveLayout])

  // Update widget size
  const updateWidgetSize = useCallback((widgetId: string, size: DashboardWidget['size']) => {
    const newWidgets = widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, size }
        : widget
    )
    saveLayout(newWidgets)
  }, [widgets, saveLayout])

  // Reorder widgets
  const reorderWidgets = useCallback((newOrder: DashboardWidget[]) => {
    const reorderedWidgets = newOrder.map((widget, index) => ({
      ...widget,
      order: index
    }))
    saveLayout(reorderedWidgets)
  }, [saveLayout])

  return {
    widgets,
    visibleWidgets,
    availableWidgets,
    isCustomizing,
    setIsCustomizing,
    saveLayout,
    resetLayout,
    getWidgetGridClass,
    toggleWidgetVisibility,
    updateWidgetSize,
    reorderWidgets
  }
}