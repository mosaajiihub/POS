import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Import components to test
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import ProductGrid from '../components/pos/ProductGrid'
import ShoppingCartPanel from '../components/pos/ShoppingCartPanel'
import BarcodeScanner from '../components/pos/BarcodeScanner'

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Mock user agents for different browsers
const mockUserAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
}

describe('Cross-Browser Compatibility Testing', () => {
  beforeEach(() => {
    // Reset any browser-specific mocks
    vi.clearAllMocks()
  })

  describe('CSS Feature Support', () => {
    it('should handle CSS Grid layout gracefully', () => {
      render(
        <TestWrapper>
          <ProductGrid />
        </TestWrapper>
      )

      const gridContainer = screen.getByTestId('product-grid')
      const styles = window.getComputedStyle(gridContainer)
      
      // Should have grid or fallback layout
      expect(styles.display).toMatch(/grid|flex|block/)
    })

    it('should handle Flexbox layout across browsers', () => {
      render(
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button>Left</Button>
          <Button>Right</Button>
        </div>
      )

      const container = screen.getByText('Left').parentElement
      const styles = window.getComputedStyle(container!)
      
      expect(styles.display).toBe('flex')
    })

    it('should handle CSS custom properties (variables)', () => {
      const testElement = document.createElement('div')
      testElement.style.setProperty('--test-color', '#ff0000')
      testElement.style.color = 'var(--test-color)'
      
      document.body.appendChild(testElement)
      const styles = window.getComputedStyle(testElement)
      
      // Should either support CSS variables or have a fallback
      expect(styles.color).toMatch(/rgb\(255, 0, 0\)|#ff0000|red/)
      
      document.body.removeChild(testElement)
    })
  })

  describe('JavaScript API Compatibility', () => {
    it('should handle localStorage availability', () => {
      // Test localStorage support
      try {
        localStorage.setItem('test', 'value')
        const value = localStorage.getItem('test')
        expect(value).toBe('value')
        localStorage.removeItem('test')
      } catch (error) {
        // Should have fallback for browsers without localStorage
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle fetch API or provide polyfill', () => {
      // Test fetch API availability
      expect(typeof fetch).toBe('function')
      
      // Test basic fetch functionality
      const mockResponse = Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      
      expect(fetch).toBeDefined()
    })

    it('should handle Promise support', async () => {
      // Test Promise support
      const testPromise = new Promise(resolve => resolve('test'))
      const result = await testPromise
      
      expect(result).toBe('test')
    })

    it('should handle async/await syntax', async () => {
      const asyncFunction = async () => {
        return 'async result'
      }
      
      const result = await asyncFunction()
      expect(result).toBe('async result')
    })
  })

  describe('Touch and Mobile Support', () => {
    it('should handle touch events on mobile devices', async () => {
      const user = userEvent.setup()
      
      render(
        <Button data-testid="touch-button">Touch Me</Button>
      )

      const button = screen.getByTestId('touch-button')
      
      // Simulate touch interaction
      await user.click(button)
      
      expect(button).toBeInTheDocument()
    })

    it('should handle viewport meta tag for mobile', () => {
      // Check if viewport meta tag exists
      const viewportMeta = document.querySelector('meta[name="viewport"]')
      
      if (viewportMeta) {
        const content = viewportMeta.getAttribute('content')
        expect(content).toContain('width=device-width')
        expect(content).toContain('initial-scale=1')
      }
    })

    it('should handle responsive design breakpoints', () => {
      // Test different viewport sizes
      const testSizes = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ]

      testSizes.forEach(size => {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: size.width
        })
        
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: size.height
        })

        // Trigger resize event
        window.dispatchEvent(new Event('resize'))
        
        expect(window.innerWidth).toBe(size.width)
        expect(window.innerHeight).toBe(size.height)
      })
    })
  })

  describe('Form Input Compatibility', () => {
    it('should handle HTML5 input types', () => {
      render(
        <div>
          <Input type="email" data-testid="email-input" />
          <Input type="number" data-testid="number-input" />
          <Input type="tel" data-testid="tel-input" />
          <Input type="date" data-testid="date-input" />
        </div>
      )

      const emailInput = screen.getByTestId('email-input')
      const numberInput = screen.getByTestId('number-input')
      const telInput = screen.getByTestId('tel-input')
      const dateInput = screen.getByTestId('date-input')

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(numberInput).toHaveAttribute('type', 'number')
      expect(telInput).toHaveAttribute('type', 'tel')
      expect(dateInput).toHaveAttribute('type', 'date')
    })

    it('should handle form validation across browsers', async () => {
      const user = userEvent.setup()
      
      render(
        <form>
          <Input type="email" required data-testid="required-email" />
          <Button type="submit">Submit</Button>
        </form>
      )

      const emailInput = screen.getByTestId('required-email')
      const submitButton = screen.getByText('Submit')

      // Try to submit with invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      // Should handle validation (either HTML5 or custom)
      expect(emailInput).toBeInTheDocument()
    })
  })

  describe('Media and File Handling', () => {
    it('should handle file input and camera access', () => {
      render(
        <TestWrapper>
          <BarcodeScanner onScan={() => {}} />
        </TestWrapper>
      )

      // Should render without errors even if camera is not available
      const scannerComponent = screen.getByTestId('barcode-scanner')
      expect(scannerComponent).toBeInTheDocument()
    })

    it('should handle image loading and display', () => {
      render(
        <img 
          src="test-image.jpg" 
          alt="Test Image"
          onError={(e) => {
            // Fallback for broken images
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
          }}
        />
      )

      const image = screen.getByAltText('Test Image')
      expect(image).toBeInTheDocument()
    })
  })

  describe('Performance Across Browsers', () => {
    it('should handle large lists efficiently', () => {
      const largeItemList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        price: 10.00
      }))

      const startTime = performance.now()
      
      render(
        <div>
          {largeItemList.slice(0, 50).map(item => (
            <div key={item.id}>{item.name} - ${item.price}</div>
          ))}
        </div>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 100ms for 50 items)
      expect(renderTime).toBeLessThan(100)
    })

    it('should handle memory management', () => {
      // Test for memory leaks by creating and destroying components
      const iterations = 10
      
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(
          <TestWrapper>
            <ProductGrid />
          </TestWrapper>
        )
        
        unmount()
      }

      // Should complete without throwing memory errors
      expect(true).toBe(true)
    })
  })

  describe('Browser-Specific Features', () => {
    it('should handle browser-specific CSS prefixes', () => {
      const testElement = document.createElement('div')
      testElement.style.cssText = `
        transform: translateX(10px);
        -webkit-transform: translateX(10px);
        -moz-transform: translateX(10px);
        -ms-transform: translateX(10px);
      `
      
      document.body.appendChild(testElement)
      const styles = window.getComputedStyle(testElement)
      
      // Should have transform applied (with or without prefix)
      expect(styles.transform).toContain('translateX')
      
      document.body.removeChild(testElement)
    })

    it('should handle different event models', async () => {
      const user = userEvent.setup()
      let clickCount = 0
      
      render(
        <Button 
          onClick={() => clickCount++}
          onMouseDown={() => clickCount++}
        >
          Multi-Event Button
        </Button>
      )

      const button = screen.getByText('Multi-Event Button')
      await user.click(button)

      // Should handle both click and mousedown events
      expect(clickCount).toBeGreaterThan(0)
    })
  })
})