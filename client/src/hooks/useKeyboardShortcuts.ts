import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { showToast } from '../lib/toast'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
  global?: boolean
  disabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcuts({ 
  shortcuts, 
  enabled = true, 
  preventDefault = true 
}: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate()
  const shortcutsRef = useRef(shortcuts)
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow some global shortcuts even in inputs
      const globalShortcuts = shortcutsRef.current.filter(s => s.global && !s.disabled)
      const matchingShortcut = globalShortcuts.find(shortcut => 
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.metaKey === event.metaKey
      )
      
      if (matchingShortcut) {
        if (preventDefault) event.preventDefault()
        matchingShortcut.action()
      }
      return
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => 
      !shortcut.disabled &&
      shortcut.key.toLowerCase() === event.key.toLowerCase() &&
      !!shortcut.ctrlKey === event.ctrlKey &&
      !!shortcut.altKey === event.altKey &&
      !!shortcut.shiftKey === event.shiftKey &&
      !!shortcut.metaKey === event.metaKey
    )

    if (matchingShortcut) {
      if (preventDefault) event.preventDefault()
      matchingShortcut.action()
    }
  }, [enabled, preventDefault])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return {
    shortcuts: shortcutsRef.current
  }
}

// Global shortcuts that work across the entire application
export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate()

  const globalShortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: '1',
      ctrlKey: true,
      description: 'Go to Dashboard',
      action: () => navigate('/dashboard'),
      global: true
    },
    {
      key: '2',
      ctrlKey: true,
      description: 'Go to POS Terminal',
      action: () => navigate('/pos'),
      global: true
    },
    {
      key: '3',
      ctrlKey: true,
      description: 'Go to Products',
      action: () => navigate('/products'),
      global: true
    },
    {
      key: '4',
      ctrlKey: true,
      description: 'Go to Customers',
      action: () => navigate('/customers'),
      global: true
    },
    {
      key: '5',
      ctrlKey: true,
      description: 'Go to Suppliers',
      action: () => navigate('/suppliers'),
      global: true
    },
    {
      key: '6',
      ctrlKey: true,
      description: 'Go to Transactions',
      action: () => navigate('/transactions'),
      global: true
    },
    {
      key: '7',
      ctrlKey: true,
      description: 'Go to Invoices',
      action: () => navigate('/invoices'),
      global: true
    },
    {
      key: '8',
      ctrlKey: true,
      description: 'Go to Analytics',
      action: () => navigate('/analytics'),
      global: true
    },
    {
      key: '9',
      ctrlKey: true,
      description: 'Go to Reports',
      action: () => navigate('/reports'),
      global: true
    },
    {
      key: '0',
      ctrlKey: true,
      description: 'Go to Financial Dashboard',
      action: () => navigate('/financial-dashboard'),
      global: true
    },
    // Utility shortcuts
    {
      key: 'k',
      ctrlKey: true,
      description: 'Show Keyboard Shortcuts',
      action: () => showToast.info('Press Ctrl+H to see all keyboard shortcuts'),
      global: true
    },
    {
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      description: 'Refresh Page',
      action: () => window.location.reload(),
      global: true
    }
  ]

  useKeyboardShortcuts({
    shortcuts: globalShortcuts,
    enabled: true,
    preventDefault: true
  })

  return globalShortcuts
}

// Hook for showing keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const showHelp = useCallback((shortcuts: KeyboardShortcut[]) => {
    const shortcutsList = shortcuts
      .filter(s => !s.disabled)
      .map(s => {
        const keys = []
        if (s.ctrlKey) keys.push('Ctrl')
        if (s.altKey) keys.push('Alt')
        if (s.shiftKey) keys.push('Shift')
        if (s.metaKey) keys.push('Cmd')
        keys.push(s.key.toUpperCase())
        
        return `${keys.join('+')} - ${s.description}`
      })
      .join('\n')

    // Create a modal or toast with shortcuts
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
          <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.fixed').remove()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          ${shortcuts
            .filter(s => !s.disabled)
            .map(s => {
              const keys = []
              if (s.ctrlKey) keys.push('Ctrl')
              if (s.altKey) keys.push('Alt')
              if (s.shiftKey) keys.push('Shift')
              if (s.metaKey) keys.push('Cmd')
              keys.push(s.key.toUpperCase())
              
              return `
                <div class="flex items-center justify-between py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">${s.description}</span>
                  <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">${keys.join('+')}</kbd>
                </div>
              `
            })
            .join('')}
        </div>
        <div class="mt-4 text-center">
          <button 
            class="btn-primary text-sm"
            onclick="this.closest('.fixed').remove()"
          >
            Close
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)
  }, [])

  return { showHelp }
}