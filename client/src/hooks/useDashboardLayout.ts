import { useState } from 'react'

interface Widget {
  id: string
  name: string
  component: React.ComponentType<any>
  size: 'small' | 'medium' | 'large'
  props?: any
}

export function useDashboardLayout() {
  const [visibleWidgets, setVisibleWidgets] = useState<Widget[]>([])
  const [availableWidgets] = useState<Widget[]>([])
  const [isCustomizing, setIsCustomizing] = useState(false)

  const saveLayout = (widgets: Widget[]) => {
    setVisibleWidgets(widgets)
    setIsCustomizing(false)
  }

  const getWidgetGridClass = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1'
      case 'medium':
        return 'col-span-2'
      case 'large':
        return 'col-span-4'
      default:
        return 'col-span-1'
    }
  }

  return {
    visibleWidgets,
    availableWidgets,
    isCustomizing,
    setIsCustomizing,
    saveLayout,
    getWidgetGridClass
  }
}