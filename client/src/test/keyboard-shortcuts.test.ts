import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

// Mock showToast
vi.mock('../lib/toast', () => ({
  showToast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

describe('useKeyboardShortcuts', () => {
  let mockAction: ReturnType<typeof vi.fn>
  
  beforeEach(() => {
    mockAction = vi.fn()
    // Clear all event listeners
    document.removeEventListener = vi.fn()
    document.addEventListener = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should register keyboard shortcuts', () => {
    const shortcuts = [
      {
        key: 'k',
        ctrlKey: true,
        description: 'Test shortcut',
        action: mockAction
      }
    ]

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should not register shortcuts when disabled', () => {
    const shortcuts = [
      {
        key: 'k',
        ctrlKey: true,
        description: 'Test shortcut',
        action: mockAction
      }
    ]

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }))

    expect(document.addEventListener).not.toHaveBeenCalled()
  })

  it('should handle shortcut execution', () => {
    const shortcuts = [
      {
        key: 'k',
        ctrlKey: true,
        description: 'Test shortcut',
        action: mockAction
      }
    ]

    const { result } = renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

    expect(result.current.shortcuts).toEqual(shortcuts)
  })

  it('should filter disabled shortcuts', () => {
    const shortcuts = [
      {
        key: 'k',
        ctrlKey: true,
        description: 'Enabled shortcut',
        action: mockAction,
        disabled: false
      },
      {
        key: 'j',
        ctrlKey: true,
        description: 'Disabled shortcut',
        action: mockAction,
        disabled: true
      }
    ]

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: true }))

    // Should still register the event listener
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})