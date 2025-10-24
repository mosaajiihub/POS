import { useState, useRef, useCallback } from 'react'

export interface DragItem {
  id: string
  type: string
  data: any
}

export interface DropZone {
  id: string
  accepts: string[]
  onDrop: (item: DragItem, dropZone: string) => void
}

interface UseDragAndDropOptions {
  onDragStart?: (item: DragItem) => void
  onDragEnd?: (item: DragItem) => void
  onDrop?: (item: DragItem, dropZone: string) => void
}

export function useDragAndDrop(options: UseDragAndDropOptions = {}) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dragOverZone, setDragOverZone] = useState<string | null>(null)
  const dragImageRef = useRef<HTMLElement | null>(null)

  const handleDragStart = useCallback((item: DragItem, event: React.DragEvent) => {
    setDraggedItem(item)
    
    // Set drag data
    event.dataTransfer.setData('application/json', JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'move'
    
    // Custom drag image if provided
    if (dragImageRef.current) {
      event.dataTransfer.setDragImage(dragImageRef.current, 0, 0)
    }
    
    options.onDragStart?.(item)
  }, [options])

  const handleDragEnd = useCallback((item: DragItem) => {
    setDraggedItem(null)
    setDragOverZone(null)
    options.onDragEnd?.(item)
  }, [options])

  const handleDragOver = useCallback((event: React.DragEvent, dropZoneId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverZone(dropZoneId)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    // Only clear if we're leaving the drop zone entirely
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverZone(null)
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent, dropZoneId: string, accepts: string[] = []) => {
    event.preventDefault()
    setDragOverZone(null)
    
    try {
      const itemData = event.dataTransfer.getData('application/json')
      const item: DragItem = JSON.parse(itemData)
      
      // Check if drop zone accepts this item type
      if (accepts.length > 0 && !accepts.includes(item.type)) {
        return
      }
      
      options.onDrop?.(item, dropZoneId)
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }, [options])

  const createDraggableProps = useCallback((item: DragItem) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => handleDragStart(item, event),
    onDragEnd: () => handleDragEnd(item),
    style: {
      cursor: 'grab',
      opacity: draggedItem?.id === item.id ? 0.5 : 1
    }
  }), [draggedItem, handleDragStart, handleDragEnd])

  const createDropZoneProps = useCallback((dropZoneId: string, accepts: string[] = []) => ({
    onDragOver: (event: React.DragEvent) => handleDragOver(event, dropZoneId),
    onDragLeave: handleDragLeave,
    onDrop: (event: React.DragEvent) => handleDrop(event, dropZoneId, accepts),
    'data-drop-zone': dropZoneId,
    style: {
      backgroundColor: dragOverZone === dropZoneId ? 'rgba(59, 130, 246, 0.1)' : undefined,
      borderColor: dragOverZone === dropZoneId ? '#3B82F6' : undefined,
      borderStyle: dragOverZone === dropZoneId ? 'dashed' : undefined,
      borderWidth: dragOverZone === dropZoneId ? '2px' : undefined
    }
  }), [dragOverZone, handleDragOver, handleDragLeave, handleDrop])

  return {
    draggedItem,
    dragOverZone,
    createDraggableProps,
    createDropZoneProps,
    setDragImageRef: (ref: HTMLElement | null) => {
      dragImageRef.current = ref
    }
  }
}

// Hook for sortable lists
export function useSortableDragAndDrop<T extends { id: string }>(
  items: T[],
  onReorder: (newItems: T[]) => void
) {
  const { createDraggableProps, createDropZoneProps, draggedItem } = useDragAndDrop({
    onDrop: (draggedItem, dropZoneId) => {
      const draggedIndex = items.findIndex(item => item.id === draggedItem.id)
      const dropIndex = items.findIndex(item => item.id === dropZoneId)
      
      if (draggedIndex === -1 || dropIndex === -1 || draggedIndex === dropIndex) {
        return
      }
      
      const newItems = [...items]
      const [draggedElement] = newItems.splice(draggedIndex, 1)
      newItems.splice(dropIndex, 0, draggedElement)
      
      onReorder(newItems)
    }
  })

  const createSortableItemProps = useCallback((item: T, index: number) => {
    const draggableProps = createDraggableProps({
      id: item.id,
      type: 'sortable-item',
      data: { item, index }
    })
    
    const dropZoneProps = createDropZoneProps(item.id, ['sortable-item'])
    
    return {
      ...draggableProps,
      ...dropZoneProps,
      className: `sortable-item ${draggedItem?.id === item.id ? 'dragging' : ''}`,
      'data-index': index
    }
  }, [createDraggableProps, createDropZoneProps, draggedItem])

  return {
    createSortableItemProps,
    isDragging: !!draggedItem
  }
}