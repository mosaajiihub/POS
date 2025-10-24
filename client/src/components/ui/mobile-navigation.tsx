/**
 * Mobile Navigation Components
 * Touch-optimized navigation for mobile devices
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TouchButton, Swipeable } from './touch-controls';
import { useKeyboardNavigation } from './accessibility';

// Mobile navigation menu
export interface MobileNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: MobileNavItem[];
}

export interface MobileNavigationProps {
  items: MobileNavItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  isOpen,
  onToggle,
  onClose,
}) => {
  const location = useLocation();
  const navRef = React.useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  // Use keyboard navigation
  useKeyboardNavigation(navRef, { direction: 'vertical' });

  // Close menu on route change
  React.useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Close menu on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const renderNavItem = (item: MobileNavItem, level = 0) => {
    const isActive = location.pathname === item.href;
    const isExpanded = expandedItems.has(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    return (
      <div key={item.name} className="w-full">
        {hasChildren ? (
          <TouchButton
            variant="ghost"
            className={cn(
              'w-full justify-start h-12 px-4 text-left',
              level > 0 && 'pl-8',
              isActive && 'bg-primary/10 text-primary'
            )}
            onClick={() => toggleExpanded(item.name)}
          >
            <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                {item.badge}
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0" />
            )}
          </TouchButton>
        ) : (
          <Link
            to={item.href}
            className={cn(
              'flex items-center w-full h-12 px-4 text-left transition-colors rounded-md',
              level > 0 && 'pl-8',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        )}

        {hasChildren && isExpanded && (
          <div className="ml-4 border-l border-border">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Menu Toggle Button */}
      <TouchButton
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="md:hidden"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </TouchButton>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Navigation Menu */}
      <Swipeable
        onSwipeLeft={onClose}
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <TouchButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </TouchButton>
          </div>

          {/* Navigation Items */}
          <nav
            ref={navRef}
            className="flex-1 overflow-y-auto p-4 space-y-1"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {items.map(item => renderNavItem(item))}
          </nav>
        </div>
      </Swipeable>
    </>
  );
};

// Bottom navigation for mobile
export interface BottomNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface BottomNavigationProps {
  items: BottomNavItem[];
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  className,
}) => {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border md:hidden',
        'safe-area-inset-bottom', // For devices with home indicator
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-lg transition-colors relative',
                'touch-manipulation select-none',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 text-xs bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 truncate max-w-[60px]">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

// Floating action button for mobile
export interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  className,
  variant = 'primary',
}) => {
  return (
    <TouchButton
      onClick={onClick}
      touchSize="large"
      className={cn(
        'fixed bottom-20 right-4 z-40 rounded-full shadow-lg',
        'md:bottom-6', // Adjust position for desktop
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        className
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </TouchButton>
  );
};

// Mobile search bar
export interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MobileSearch: React.FC<MobileSearchProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  className,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative flex items-center',
        isFocused && 'z-50', // Bring to front when focused
        className
      )}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          'w-full h-12 pl-4 pr-12 rounded-full border border-input bg-background',
          'text-base placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'touch-manipulation'
        )}
      />
      <TouchButton
        type="submit"
        variant="ghost"
        size="icon"
        className="absolute right-1 h-10 w-10 rounded-full"
        aria-label="Search"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </TouchButton>
    </form>
  );
};

// Mobile-optimized modal
export interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Swipeable
        onSwipeDown={onClose}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border',
          'max-h-[90vh] overflow-hidden',
          'animate-slide-up',
          className
        )}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <TouchButton
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </TouchButton>
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </Swipeable>
    </div>
  );
};