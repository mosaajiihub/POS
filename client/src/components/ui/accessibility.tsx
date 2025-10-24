/**
 * Accessibility Components and Utilities
 * Components and hooks for enhanced accessibility support
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Screen reader only text
export interface ScreenReaderOnlyProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const ScreenReaderOnly = React.forwardRef<HTMLSpanElement, ScreenReaderOnlyProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
        'clip-path-inset-50',
        className
      )}
      {...props}
    />
  )
);
ScreenReaderOnly.displayName = 'ScreenReaderOnly';

// Skip link for keyboard navigation
export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId: string;
}

export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ className, targetId, children = 'Skip to main content', ...props }, ref) => (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={cn(
        'absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground',
        'transform -translate-y-16 transition-transform duration-300',
        'focus:translate-y-0',
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
);
SkipLink.displayName = 'SkipLink';

// Focus trap for modals and dialogs
export interface FocusTrapProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  restoreFocus?: boolean;
}

export const FocusTrap = React.forwardRef<HTMLDivElement, FocusTrapProps>(
  ({ className, active = true, restoreFocus = true, children, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const previousActiveElement = React.useRef<HTMLElement | null>(null);

    React.useImperativeHandle(ref, () => containerRef.current!);

    React.useEffect(() => {
      if (!active || !containerRef.current) return;

      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Get all focusable elements within the container
      const getFocusableElements = () => {
        const focusableSelectors = [
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
        ].join(', ');

        return Array.from(
          containerRef.current!.querySelectorAll(focusableSelectors)
        ) as HTMLElement[];
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      };

      // Focus the first focusable element
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        
        // Restore focus to the previously focused element
        if (restoreFocus && previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }, [active, restoreFocus]);

    return (
      <div
        ref={containerRef}
        className={className}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FocusTrap.displayName = 'FocusTrap';

// Announcement region for screen readers
export interface AnnouncementProps extends React.HTMLAttributes<HTMLDivElement> {
  priority?: 'polite' | 'assertive';
  message?: string;
}

export const Announcement = React.forwardRef<HTMLDivElement, AnnouncementProps>(
  ({ className, priority = 'polite', message, children, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={cn('sr-only', className)}
      {...props}
    >
      {message || children}
    </div>
  )
);
Announcement.displayName = 'Announcement';

// High contrast mode detector
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const isWindowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Check for forced colors (Windows high contrast)
      const isForcedColors = window.matchMedia('(forced-colors: active)').matches;
      
      setIsHighContrast(isWindowsHighContrast || isForcedColors);
    };

    checkHighContrast();

    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');

    contrastQuery.addEventListener('change', checkHighContrast);
    forcedColorsQuery.addEventListener('change', checkHighContrast);

    return () => {
      contrastQuery.removeEventListener('change', checkHighContrast);
      forcedColorsQuery.removeEventListener('change', checkHighContrast);
    };
  }, []);

  return isHighContrast;
};

// Reduced motion detector
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Keyboard navigation helper
export const useKeyboardNavigation = (
  containerRef: React.RefObject<HTMLElement>,
  options: {
    direction?: 'horizontal' | 'vertical' | 'grid';
    loop?: boolean;
    selector?: string;
  } = {}
) => {
  const { direction = 'vertical', loop = true, selector = '[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]' } = options;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const focusableElements = Array.from(
        container.querySelectorAll(selector)
      ) as HTMLElement[];

      if (focusableElements.length === 0) return;

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          if (direction === 'vertical' || direction === 'grid') {
            event.preventDefault();
            nextIndex = currentIndex + 1;
          }
          break;
        case 'ArrowUp':
          if (direction === 'vertical' || direction === 'grid') {
            event.preventDefault();
            nextIndex = currentIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (direction === 'horizontal' || direction === 'grid') {
            event.preventDefault();
            nextIndex = currentIndex + 1;
          }
          break;
        case 'ArrowLeft':
          if (direction === 'horizontal' || direction === 'grid') {
            event.preventDefault();
            nextIndex = currentIndex - 1;
          }
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = focusableElements.length - 1;
          break;
        default:
          return;
      }

      // Handle looping
      if (loop) {
        if (nextIndex < 0) {
          nextIndex = focusableElements.length - 1;
        } else if (nextIndex >= focusableElements.length) {
          nextIndex = 0;
        }
      } else {
        nextIndex = Math.max(0, Math.min(nextIndex, focusableElements.length - 1));
      }

      focusableElements[nextIndex]?.focus();
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [direction, loop, selector]);
};

// ARIA live region hook
export const useAnnouncement = () => {
  const [announcement, setAnnouncement] = React.useState('');
  const [priority, setPriority] = React.useState<'polite' | 'assertive'>('polite');

  const announce = React.useCallback((message: string, urgency: 'polite' | 'assertive' = 'polite') => {
    setPriority(urgency);
    setAnnouncement(message);
    
    // Clear the announcement after a short delay to allow for re-announcements
    setTimeout(() => setAnnouncement(''), 100);
  }, []);

  return {
    announcement,
    priority,
    announce,
  };
};