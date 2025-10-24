/**
 * Responsive Layout Components
 * Flexible layout components that adapt to different screen sizes
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Container component with responsive max-widths
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', centered = true, ...props }, ref) => {
    const sizeClasses = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full px-4 sm:px-6 lg:px-8',
          sizeClasses[size],
          centered && 'mx-auto',
          className
        )}
        {...props}
      />
    );
  }
);
Container.displayName = 'Container';

// Grid component with responsive columns
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  };
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = 'md', responsive, ...props }, ref) => {
    const gapClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    const colClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    };

    const responsiveClasses = responsive
      ? [
          responsive.sm && `sm:grid-cols-${responsive.sm}`,
          responsive.md && `md:grid-cols-${responsive.md}`,
          responsive.lg && `lg:grid-cols-${responsive.lg}`,
          responsive.xl && `xl:grid-cols-${responsive.xl}`,
        ].filter(Boolean)
      : [];

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          colClasses[cols],
          gapClasses[gap],
          ...responsiveClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Grid.displayName = 'Grid';

// Flex component with responsive direction and alignment
export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: { direction?: FlexProps['direction']; align?: FlexProps['align']; justify?: FlexProps['justify'] };
    md?: { direction?: FlexProps['direction']; align?: FlexProps['align']; justify?: FlexProps['justify'] };
    lg?: { direction?: FlexProps['direction']; align?: FlexProps['align']; justify?: FlexProps['justify'] };
  };
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction = 'row', align, justify, wrap, gap, responsive, ...props }, ref) => {
    const directionClasses = {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    };

    const alignClasses = align
      ? {
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
          stretch: 'items-stretch',
          baseline: 'items-baseline',
        }[align]
      : '';

    const justifyClasses = justify
      ? {
          start: 'justify-start',
          center: 'justify-center',
          end: 'justify-end',
          between: 'justify-between',
          around: 'justify-around',
          evenly: 'justify-evenly',
        }[justify]
      : '';

    const gapClasses = gap
      ? {
          none: 'gap-0',
          sm: 'gap-2',
          md: 'gap-4',
          lg: 'gap-6',
          xl: 'gap-8',
        }[gap]
      : '';

    const responsiveClasses = responsive
      ? [
          responsive.sm?.direction && `sm:${directionClasses[responsive.sm.direction]}`,
          responsive.sm?.align && `sm:${alignClasses}`,
          responsive.sm?.justify && `sm:${justifyClasses}`,
          responsive.md?.direction && `md:${directionClasses[responsive.md.direction]}`,
          responsive.md?.align && `md:${alignClasses}`,
          responsive.md?.justify && `md:${justifyClasses}`,
          responsive.lg?.direction && `lg:${directionClasses[responsive.lg.direction]}`,
          responsive.lg?.align && `lg:${alignClasses}`,
          responsive.lg?.justify && `lg:${justifyClasses}`,
        ].filter(Boolean)
      : [];

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionClasses[direction],
          alignClasses,
          justifyClasses,
          wrap && 'flex-wrap',
          gapClasses,
          ...responsiveClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Flex.displayName = 'Flex';

// Stack component for vertical layouts
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, spacing = 'md', align, ...props }, ref) => {
    const spacingClasses = {
      none: 'space-y-0',
      xs: 'space-y-1',
      sm: 'space-y-2',
      md: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8',
      '2xl': 'space-y-12',
    };

    const alignClasses = align
      ? {
          start: 'items-start',
          center: 'items-center',
          end: 'items-end',
          stretch: 'items-stretch',
        }[align]
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          spacingClasses[spacing],
          alignClasses,
          className
        )}
        {...props}
      />
    );
  }
);
Stack.displayName = 'Stack';

// Responsive show/hide utilities
export interface ShowProps extends React.HTMLAttributes<HTMLDivElement> {
  above?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  below?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  only?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Show = React.forwardRef<HTMLDivElement, ShowProps>(
  ({ className, above, below, only, ...props }, ref) => {
    let visibilityClasses = '';

    if (only) {
      const onlyClasses = {
        sm: 'block sm:hidden',
        md: 'hidden sm:block md:hidden',
        lg: 'hidden md:block lg:hidden',
        xl: 'hidden lg:block xl:hidden',
        '2xl': 'hidden xl:block 2xl:hidden',
      };
      visibilityClasses = onlyClasses[only];
    } else {
      if (above) {
        const aboveClasses = {
          sm: 'hidden sm:block',
          md: 'hidden md:block',
          lg: 'hidden lg:block',
          xl: 'hidden xl:block',
          '2xl': 'hidden 2xl:block',
        };
        visibilityClasses += ` ${aboveClasses[above]}`;
      }

      if (below) {
        const belowClasses = {
          sm: 'block sm:hidden',
          md: 'block md:hidden',
          lg: 'block lg:hidden',
          xl: 'block xl:hidden',
          '2xl': 'block 2xl:hidden',
        };
        visibilityClasses += ` ${belowClasses[below]}`;
      }
    }

    return (
      <div
        ref={ref}
        className={cn(visibilityClasses.trim(), className)}
        {...props}
      />
    );
  }
);
Show.displayName = 'Show';