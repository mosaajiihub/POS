/**
 * Touch-Friendly Controls
 * Components optimized for mobile touch interaction
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';

// Touch-optimized button with larger touch targets
export interface TouchButtonProps extends ButtonProps {
  touchSize?: 'default' | 'large' | 'xl';
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, touchSize = 'default', ...props }, ref) => {
    const touchSizeClasses = {
      default: 'min-h-[44px] min-w-[44px] px-4 py-2',
      large: 'min-h-[48px] min-w-[48px] px-6 py-3',
      xl: 'min-h-[56px] min-w-[56px] px-8 py-4',
    };

    return (
      <Button
        ref={ref}
        className={cn(
          touchSizeClasses[touchSize],
          'touch-manipulation select-none',
          className
        )}
        {...props}
      />
    );
  }
);
TouchButton.displayName = 'TouchButton';

// Swipeable container for mobile gestures
export interface SwipeableProps extends React.HTMLAttributes<HTMLDivElement> {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const Swipeable = React.forwardRef<HTMLDivElement, SwipeableProps>(
  ({ 
    className, 
    onSwipeLeft, 
    onSwipeRight, 
    onSwipeUp, 
    onSwipeDown, 
    threshold = 50,
    children,
    ...props 
  }, ref) => {
    const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null);
    const [touchEnd, setTouchEnd] = React.useState<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      });
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = touchStart.y - touchEnd.y;
      const isLeftSwipe = distanceX > threshold;
      const isRightSwipe = distanceX < -threshold;
      const isUpSwipe = distanceY > threshold;
      const isDownSwipe = distanceY < -threshold;

      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      }
      if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    };

    return (
      <div
        ref={ref}
        className={cn('touch-pan-x touch-pan-y', className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Swipeable.displayName = 'Swipeable';

// Touch-optimized input with larger touch targets
export interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  touchSize?: 'default' | 'large';
}

export const TouchInput = React.forwardRef<HTMLInputElement, TouchInputProps>(
  ({ className, touchSize = 'default', ...props }, ref) => {
    const touchSizeClasses = {
      default: 'h-12 px-4 py-3',
      large: 'h-14 px-6 py-4',
    };

    return (
      <input
        ref={ref}
        className={cn(
          'flex w-full rounded-md border border-input bg-background text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation',
          touchSizeClasses[touchSize],
          className
        )}
        {...props}
      />
    );
  }
);
TouchInput.displayName = 'TouchInput';

// Pull-to-refresh component
export interface PullToRefreshProps extends React.HTMLAttributes<HTMLDivElement> {
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
}

export const PullToRefresh = React.forwardRef<HTMLDivElement, PullToRefreshProps>(
  ({ 
    className,
    onRefresh,
    refreshThreshold = 80,
    refreshingText = 'Refreshing...',
    pullText = 'Pull to refresh',
    releaseText = 'Release to refresh',
    children,
    ...props 
  }, ref) => {
    const [pullDistance, setPullDistance] = React.useState(0);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [startY, setStartY] = React.useState(0);

    const handleTouchStart = (e: React.TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const distance = Math.max(0, currentY - startY);
        setPullDistance(Math.min(distance, refreshThreshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= refreshThreshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
    };

    const getRefreshText = () => {
      if (isRefreshing) return refreshingText;
      if (pullDistance >= refreshThreshold) return releaseText;
      return pullText;
    };

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        {/* Refresh indicator */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 text-primary transition-all duration-200 ease-out',
            pullDistance > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            height: `${Math.min(pullDistance, refreshThreshold)}px`,
            transform: `translateY(-${Math.max(0, refreshThreshold - pullDistance)}px)`,
          }}
        >
          <div className="flex items-center space-x-2">
            {isRefreshing && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            <span className="text-sm font-medium">{getRefreshText()}</span>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            transform: `translateY(${Math.min(pullDistance, refreshThreshold)}px)`,
            transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
PullToRefresh.displayName = 'PullToRefresh';

// Touch-optimized tab navigation
export interface TouchTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TouchTabs = React.forwardRef<HTMLDivElement, TouchTabsProps>(
  ({ className, tabs, activeTab, onTabChange, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col', className)} {...props}>
        {/* Tab buttons */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors touch-manipulation min-h-[48px] flex items-center justify-center',
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-4">
          {tabs.find((tab) => tab.id === activeTab)?.content}
        </div>
      </div>
    );
  }
);
TouchTabs.displayName = 'TouchTabs';