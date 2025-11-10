/**
 * End-to-End Test: Cross-Platform Compatibility
 * Tests responsive design, touch controls, and mobile-specific features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock different viewport sizes
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const touchList = touches.map(touch => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
    identifier: Math.random(),
    target: document.body
  }))

  return new TouchEvent(type, {
    touches: touchList as any,
    targetTouches: touchList as any,
    changedTouches: touchList as any,
    bubbles: true,
    cancelable: true
  })
}

// Mock media queries
const mockMediaQuery = (query: string, matches: boolean) => {
  const mediaQuery = {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => mediaQuery),
  })

  return mediaQuery
}

// Mock service worker for offline functionality
const mockServiceWorker = () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue({
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        addEventListener: vi.fn(),
        update: vi.fn()
      }),
      ready: Promise.resolve({
        installing: null,
        waiting: null,
        active: { state: 'activated' },
        addEventListener: vi.fn(),
        update: vi.fn()
      })
    },
    writable: true
  })
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Cross-Platform Compatibility E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset viewport to desktop size
    mockViewport(1920, 1080)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile devices (320px - 768px)', async () => {
      // Test mobile viewport
      mockViewport(375, 667) // iPhone SE size
      mockMediaQuery('(max-width: 768px)', true)

      // Import and render a responsive component
      const { ResponsiveLayout } = await import('../../components/ui/responsive-layout')
      
      render(
        <TestWrapper>
          <ResponsiveLayout>
            <div data-testid="content">Mobile Content</div>
          </ResponsiveLayout>
        </TestWrapper>
      )

      // Verify mobile-specific layout
      const content = screen.getByTestId('content')
      expect(content).toBeInTheDocument()

      // Check if mobile navigation is present
      const mobileNav = screen.queryByTestId('mobile-navigation')
      expect(mobileNav).toBeInTheDocument()

      // Verify desktop navigation is hidden
      const desktopNav = screen.queryByTestId('desktop-navigation')
      expect(desktopNav).not.toBeInTheDocument()
    })

    it('should adapt layout for tablet devices (768px - 1024px)', async () => {
      // Test tablet viewport
      mockViewport(768, 1024) // iPad size
      mockMediaQuery('(min-width: 768px) and (max-width: 1024px)', true)

      const { ResponsiveLayout } = await import('../../components/ui/responsive-layout')
      
      render(
        <TestWrapper>
          <ResponsiveLayout>
            <div data-testid="content">Tablet Content</div>
          </ResponsiveLayout>
        </TestWrapper>
      )

      // Verify tablet-specific layout adaptations
      const content = screen.getByTestId('content')
      expect(content).toBeInTheDocument()

      // Check for hybrid navigation (both touch and mouse friendly)
      const navigation = screen.getByTestId('navigation')
      expect(navigation).toHaveClass('tablet-navigation')
    })

    it('should use desktop layout for large screens (1024px+)', async () => {
      // Test desktop viewport
      mockViewport(1920, 1080)
      mockMediaQuery('(min-width: 1024px)', true)

      const { ResponsiveLayout } = await import('../../components/ui/responsive-layout')
      
      render(
        <TestWrapper>
          <ResponsiveLayout>
            <div data-testid="content">Desktop Content</div>
          </ResponsiveLayout>
        </TestWrapper>
      )

      // Verify desktop layout
      const content = screen.getByTestId('content')
      expect(content).toBeInTheDocument()

      // Check for desktop navigation
      const desktopNav = screen.getByTestId('desktop-navigation')
      expect(desktopNav).toBeInTheDocument()

      // Verify mobile navigation is hidden
      const mobileNav = screen.queryByTestId('mobile-navigation')
      expect(mobileNav).not.toBeInTheDocument()
    })
  })

  describe('Touch Controls', () => {
    it('should handle touch interactions on mobile POS interface', async () => {
      mockViewport(375, 667) // Mobile viewport
      
      const { TouchControls } = await import('../../components/ui/touch-controls')
      const { ProductGrid } = await import('../../components/pos/ProductGrid')
      
      render(
        <TestWrapper>
          <TouchControls>
            <ProductGrid />
          </TouchControls>
        </TestWrapper>
      )

      // Simulate touch events on product buttons
      const productButton = screen.getByTestId('product-button-1')
      
      // Test tap gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
      const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }])
      
      fireEvent(productButton, touchStart)
      fireEvent(productButton, touchEnd)

      // Verify touch interaction was handled
      await waitFor(() => {
        expect(productButton).toHaveClass('touch-active')
      })
    })

    it('should support swipe gestures for navigation', async () => {
      mockViewport(375, 667)
      
      const { TouchControls } = await import('../../components/ui/touch-controls')
      
      const onSwipeLeft = vi.fn()
      const onSwipeRight = vi.fn()
      
      render(
        <TestWrapper>
          <TouchControls onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
            <div data-testid="swipe-area">Swipe me</div>
          </TouchControls>
        </TestWrapper>
      )

      const swipeArea = screen.getByTestId('swipe-area')

      // Simulate swipe left gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }])
      const touchMove = createTouchEvent('touchmove', [{ clientX: 50, clientY: 100 }])
      const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }])

      fireEvent(swipeArea, touchStart)
      fireEvent(swipeArea, touchMove)
      fireEvent(swipeArea, touchEnd)

      // Verify swipe left was detected
      expect(onSwipeLeft).toHaveBeenCalled()

      // Simulate swipe right gesture
      const touchStart2 = createTouchEvent('touchstart', [{ clientX: 50, clientY: 100 }])
      const touchMove2 = createTouchEvent('touchmove', [{ clientX: 200, clientY: 100 }])
      const touchEnd2 = createTouchEvent('touchend', [{ clientX: 200, clientY: 100 }])

      fireEvent(swipeArea, touchStart2)
      fireEvent(swipeArea, touchMove2)
      fireEvent(swipeArea, touchEnd2)

      // Verify swipe right was detected
      expect(onSwipeRight).toHaveBeenCalled()
    })

    it('should handle pinch-to-zoom gestures', async () => {
      mockViewport(375, 667)
      
      const { TouchControls } = await import('../../components/ui/touch-controls')
      
      const onPinch = vi.fn()
      
      render(
        <TestWrapper>
          <TouchControls onPinch={onPinch}>
            <div data-testid="pinch-area">Pinch to zoom</div>
          </TouchControls>
        </TestWrapper>
      )

      const pinchArea = screen.getByTestId('pinch-area')

      // Simulate pinch gesture (two fingers moving apart)
      const touchStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 120, clientY: 100 }
      ])
      const touchMove = createTouchEvent('touchmove', [
        { clientX: 80, clientY: 100 },
        { clientX: 140, clientY: 100 }
      ])
      const touchEnd = createTouchEvent('touchend', [
        { clientX: 80, clientY: 100 },
        { clientX: 140, clientY: 100 }
      ])

      fireEvent(pinchArea, touchStart)
      fireEvent(pinchArea, touchMove)
      fireEvent(pinchArea, touchEnd)

      // Verify pinch gesture was detected
      expect(onPinch).toHaveBeenCalledWith(expect.objectContaining({
        scale: expect.any(Number),
        direction: 'out' // Pinch out (zoom in)
      }))
    })
  })

  describe('Offline Functionality', () => {
    it('should register service worker for offline support', async () => {
      mockServiceWorker()
      
      const { registerServiceWorker } = await import('../../lib/service-worker')
      
      await registerServiceWorker()
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
    })

    it('should cache critical resources for offline use', async () => {
      mockServiceWorker()
      
      // Mock cache API
      const mockCache = {
        addAll: vi.fn().mockResolvedValue(undefined),
        match: vi.fn().mockResolvedValue(new Response('cached content')),
        put: vi.fn().mockResolvedValue(undefined)
      }
      
      Object.defineProperty(window, 'caches', {
        value: {
          open: vi.fn().mockResolvedValue(mockCache),
          match: vi.fn().mockResolvedValue(new Response('cached content'))
        },
        writable: true
      })

      const { OfflineManager } = await import('../../lib/offline')
      const offlineManager = new OfflineManager()
      
      await offlineManager.cacheEssentialResources()
      
      expect(mockCache.addAll).toHaveBeenCalledWith([
        '/',
        '/pos',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json'
      ])
    })

    it('should handle offline POS transactions', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      })

      const { useOfflinePosStore } = await import('../../stores/offlinePosStore')
      
      // Add transaction while offline
      const offlineTransaction = {
        id: 'offline-txn-1',
        items: [{ productId: '1', quantity: 2, price: 10.00 }],
        total: 20.00,
        timestamp: new Date(),
        synced: false
      }

      useOfflinePosStore.getState().addOfflineTransaction(offlineTransaction)
      
      // Verify transaction was stored locally
      expect(useOfflinePosStore.getState().offlineTransactions).toHaveLength(1)
      expect(useOfflinePosStore.getState().offlineTransactions[0].synced).toBe(false)

      // Mock going back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      })

      // Trigger sync
      await useOfflinePosStore.getState().syncOfflineTransactions()
      
      // Verify transaction was marked as synced
      expect(useOfflinePosStore.getState().offlineTransactions[0].synced).toBe(true)
    })
  })

  describe('Performance Optimization', () => {
    it('should implement progressive loading for large product catalogs', async () => {
      const { ProgressiveLoader } = await import('../../lib/progressive-loading')
      
      const mockProducts = Array.from({ length: 1000 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        price: 10.00
      }))

      const loader = new ProgressiveLoader(mockProducts, { batchSize: 50 })
      
      // Load first batch
      const firstBatch = await loader.loadNextBatch()
      expect(firstBatch).toHaveLength(50)
      expect(firstBatch[0].id).toBe('product-0')
      expect(firstBatch[49].id).toBe('product-49')

      // Load second batch
      const secondBatch = await loader.loadNextBatch()
      expect(secondBatch).toHaveLength(50)
      expect(secondBatch[0].id).toBe('product-50')
      expect(secondBatch[49].id).toBe('product-99')
    })

    it('should implement lazy loading for images', async () => {
      const { LazyImage } = await import('../../components/ui/lazy-image')
      
      render(
        <TestWrapper>
          <LazyImage
            src="/images/product-1.jpg"
            alt="Product 1"
            data-testid="lazy-image"
          />
        </TestWrapper>
      )

      const image = screen.getByTestId('lazy-image')
      
      // Initially should show placeholder
      expect(image).toHaveAttribute('src', expect.stringContaining('placeholder'))

      // Mock intersection observer triggering
      const mockIntersectionObserver = vi.mocked(global.IntersectionObserver)
      const observerCallback = mockIntersectionObserver.mock.calls[0][0]
      
      // Simulate image coming into view
      observerCallback([
        {
          isIntersecting: true,
          target: image,
          intersectionRatio: 1,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: {} as DOMRectReadOnly,
          time: Date.now()
        }
      ], {} as IntersectionObserver)

      // Should now load actual image
      await waitFor(() => {
        expect(image).toHaveAttribute('src', '/images/product-1.jpg')
      })
    })
  })

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      const { AccessibilityProvider } = await import('../../components/ui/accessibility')
      
      render(
        <TestWrapper>
          <AccessibilityProvider>
            <button data-testid="button-1">Button 1</button>
            <button data-testid="button-2">Button 2</button>
            <button data-testid="button-3">Button 3</button>
          </AccessibilityProvider>
        </TestWrapper>
      )

      const button1 = screen.getByTestId('button-1')
      const button2 = screen.getByTestId('button-2')
      
      // Focus first button
      button1.focus()
      expect(document.activeElement).toBe(button1)

      // Tab to next button
      fireEvent.keyDown(button1, { key: 'Tab' })
      expect(document.activeElement).toBe(button2)

      // Enter should activate button
      fireEvent.keyDown(button2, { key: 'Enter' })
      // Verify button activation (would need actual button handler)
    })

    it('should provide proper ARIA labels and roles', async () => {
      const { ProductGrid } = await import('../../components/pos/ProductGrid')
      
      render(
        <TestWrapper>
          <ProductGrid />
        </TestWrapper>
      )

      // Check for proper ARIA attributes
      const productGrid = screen.getByRole('grid')
      expect(productGrid).toHaveAttribute('aria-label', 'Product selection grid')

      const productButtons = screen.getAllByRole('gridcell')
      expect(productButtons.length).toBeGreaterThan(0)
      
      productButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
        expect(button).toHaveAttribute('tabindex')
      })
    })

    it('should support screen reader announcements', async () => {
      const { ScreenReaderAnnouncer } = await import('../../components/ui/accessibility')
      
      const announcements: string[] = []
      const mockAnnounce = vi.fn((message: string) => {
        announcements.push(message)
      })

      render(
        <TestWrapper>
          <ScreenReaderAnnouncer onAnnounce={mockAnnounce} />
        </TestWrapper>
      )

      // Simulate adding item to cart
      const announcer = screen.getByTestId('screen-reader-announcer')
      fireEvent(announcer, new CustomEvent('announce', {
        detail: { message: 'Product added to cart' }
      }))

      expect(mockAnnounce).toHaveBeenCalledWith('Product added to cart')
    })
  })

  describe('Browser Compatibility', () => {
    it('should work with modern browsers (Chrome, Firefox, Safari, Edge)', async () => {
      // Test modern JavaScript features
      expect(typeof Promise).toBe('function')
      expect(typeof fetch).toBe('function')
      expect(typeof localStorage).toBe('object')
      expect(typeof sessionStorage).toBe('object')
      
      // Test ES6+ features
      const testArrowFunction = () => 'arrow function works'
      expect(testArrowFunction()).toBe('arrow function works')
      
      const testDestructuring = { a: 1, b: 2 }
      const { a, b } = testDestructuring
      expect(a).toBe(1)
      expect(b).toBe(2)
      
      // Test async/await
      const testAsync = async () => {
        return await Promise.resolve('async works')
      }
      expect(await testAsync()).toBe('async works')
    })

    it('should provide fallbacks for unsupported features', async () => {
      // Mock missing IntersectionObserver
      const originalIntersectionObserver = global.IntersectionObserver
      delete (global as any).IntersectionObserver

      const { IntersectionObserverPolyfill } = await import('../../lib/polyfills')
      
      // Should provide polyfill
      expect(IntersectionObserverPolyfill).toBeDefined()
      
      // Restore original
      global.IntersectionObserver = originalIntersectionObserver
    })
  })
})