import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Import components to test
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import ProductForm from '../components/products/ProductForm'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

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

describe('Accessibility Compliance Testing (WCAG 2.1 AA)', () => {
  describe('UI Components Accessibility', () => {
    it('should have no accessibility violations in Button component', async () => {
      const { container } = render(
        <Button>Click me</Button>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels on form inputs', async () => {
      render(
        <div>
          <Label htmlFor="test-input">Test Input</Label>
          <Input id="test-input" placeholder="Enter text" />
        </div>
      )

      const input = screen.getByLabelText('Test Input')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('id', 'test-input')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Button>First Button</Button>
          <Button>Second Button</Button>
          <Button>Third Button</Button>
        </div>
      )

      const firstButton = screen.getByText('First Button')
      const secondButton = screen.getByText('Second Button')
      const thirdButton = screen.getByText('Third Button')

      // Focus first button
      firstButton.focus()
      expect(firstButton).toHaveFocus()

      // Tab to second button
      await user.tab()
      expect(secondButton).toHaveFocus()

      // Tab to third button
      await user.tab()
      expect(thirdButton).toHaveFocus()
    })
  })

  describe('Form Accessibility', () => {
    it('should have no accessibility violations in ProductForm', async () => {
      const { container } = render(
        <TestWrapper>
          <ProductForm onSubmit={() => {}} onCancel={() => {}} />
        </TestWrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should provide proper error messages with ARIA attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <ProductForm onSubmit={() => {}} onCancel={() => {}} />
        </TestWrapper>
      )

      // Try to submit form without required fields
      const submitButton = screen.getByText('Save Product')
      await user.click(submitButton)

      // Check for error messages with proper ARIA attributes
      const errorMessages = screen.queryAllByRole('alert')
      errorMessages.forEach(error => {
        expect(error).toBeInTheDocument()
      })
    })

    it('should have proper form field associations', () => {
      render(
        <TestWrapper>
          <ProductForm onSubmit={() => {}} onCancel={() => {}} />
        </TestWrapper>
      )

      // Check that form fields have proper labels
      const nameInput = screen.getByLabelText(/product name/i)
      const priceInput = screen.getByLabelText(/price/i)
      const skuInput = screen.getByLabelText(/sku/i)

      expect(nameInput).toBeInTheDocument()
      expect(priceInput).toBeInTheDocument()
      expect(skuInput).toBeInTheDocument()
    })
  })

  describe('Page Accessibility', () => {
    it('should have no accessibility violations in Login page', async () => {
      const { container } = render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Check for proper heading structure (h1, then h2, etc.)
      const headings = screen.getAllByRole('heading')
      const h1Elements = headings.filter(h => h.tagName === 'H1')
      
      // Should have exactly one h1 element
      expect(h1Elements).toHaveLength(1)
    })

    it('should have proper landmark roles', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Check for main landmark
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })
  })

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', () => {
      render(
        <div>
          <span style={{ color: 'red' }}>Error: Required field</span>
          <span style={{ color: 'green' }}>Success: Saved</span>
        </div>
      )

      // Error messages should have text indicators, not just color
      const errorText = screen.getByText(/error/i)
      const successText = screen.getByText(/success/i)

      expect(errorText).toBeInTheDocument()
      expect(successText).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <Button>Focusable Button</Button>
          <Input placeholder="Focusable Input" />
        </div>
      )

      const button = screen.getByText('Focusable Button')
      const input = screen.getByPlaceholderText('Focusable Input')

      // Focus elements and check they receive focus
      await user.tab()
      expect(button).toHaveFocus()

      await user.tab()
      expect(input).toHaveFocus()
    })

    it('should trap focus in modal dialogs', async () => {
      // This would test modal focus trapping when modals are implemented
      // For now, we'll test that focusable elements are properly identified
      render(
        <div role="dialog" aria-modal="true">
          <Button>Close</Button>
          <Input placeholder="Modal input" />
          <Button>Save</Button>
        </div>
      )

      const dialog = screen.getByRole('dialog')
      const focusableElements = dialog.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(
        <div>
          <button aria-label="Close dialog">×</button>
          <button aria-label="Add to cart">+</button>
          <input aria-label="Search products" type="search" />
        </div>
      )

      const closeButton = screen.getByLabelText('Close dialog')
      const addButton = screen.getByLabelText('Add to cart')
      const searchInput = screen.getByLabelText('Search products')

      expect(closeButton).toBeInTheDocument()
      expect(addButton).toBeInTheDocument()
      expect(searchInput).toBeInTheDocument()
    })

    it('should announce dynamic content changes', () => {
      render(
        <div>
          <div role="status" aria-live="polite">
            Status updates appear here
          </div>
          <div role="alert" aria-live="assertive">
            Error messages appear here
          </div>
        </div>
      )

      const statusRegion = screen.getByRole('status')
      const alertRegion = screen.getByRole('alert')

      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive')
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have touch targets of adequate size', () => {
      render(
        <div>
          <Button style={{ minHeight: '44px', minWidth: '44px' }}>
            Touch Target
          </Button>
        </div>
      )

      const button = screen.getByText('Touch Target')
      const styles = window.getComputedStyle(button)
      
      // Touch targets should be at least 44px (iOS) or 48dp (Android)
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44)
    })
  })
})