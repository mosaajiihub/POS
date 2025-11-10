import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  description: string
  action: () => void
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey
        const altMatch = shortcut.altKey === undefined || shortcut.altKey === event.altKey
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase()

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          event.preventDefault()
          shortcut.action()
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])

  return { shortcuts }
}

export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts can be added here
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault()
        // Show help modal
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {}
}

export function useKeyboardShortcutsHelp() {
  const showHelp = (shortcuts: any) => {
    // Show keyboard shortcuts help modal
    console.log('Keyboard shortcuts help', shortcuts)
  }

  return { showHelp }
}