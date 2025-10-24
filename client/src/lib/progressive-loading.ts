/**
 * Progressive Loading Utilities
 * Implements progressive loading and caching strategies
 */

import React from 'react';

// Lazy loading with retry mechanism
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType,
  retries = 3
) => {
  const LazyComponent = React.lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    // If all retries failed, return fallback or throw error
    if (fallback) {
      return { default: fallback };
    }
    
    throw lastError;
  });

  return LazyComponent;
};

// Image lazy loading with progressive enhancement
export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className,
  alt,
  ...props
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the actual image
            const img = new Image();
            
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
              onLoad?.();
            };
            
            img.onerror = () => {
              setHasError(true);
              onError?.();
            };
            
            img.src = src;
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, threshold, rootMargin, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-70'
      } ${hasError ? 'opacity-50' : ''} ${className || ''}`}
      {...props}
    />
  );
};

// Progressive data loading hook
export interface UseProgressiveDataOptions<T> {
  fetchFn: () => Promise<T>;
  cacheKey: string;
  staleTime?: number;
  retryAttempts?: number;
  retryDelay?: number;
  fallbackData?: T;
}

export const useProgressiveData = <T>({
  fetchFn,
  cacheKey,
  staleTime = 5 * 60 * 1000, // 5 minutes
  retryAttempts = 3,
  retryDelay = 1000,
  fallbackData,
}: UseProgressiveDataOptions<T>) => {
  const [data, setData] = React.useState<T | undefined>(fallbackData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [lastFetch, setLastFetch] = React.useState<number>(0);

  const fetchData = React.useCallback(async (force = false) => {
    // Check if data is still fresh
    if (!force && data && Date.now() - lastFetch < staleTime) {
      return data;
    }

    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const result = await fetchFn();
        setData(result);
        setLastFetch(Date.now());
        setIsLoading(false);
        
        // Cache the result
        if ('caches' in window) {
          const cache = await caches.open('progressive-data');
          await cache.put(
            cacheKey,
            new Response(JSON.stringify({
              data: result,
              timestamp: Date.now(),
            }))
          );
        }
        
        return result;
      } catch (err) {
        lastError = err as Error;
        
        if (attempt < retryAttempts - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    // All attempts failed, try to load from cache
    try {
      if ('caches' in window) {
        const cache = await caches.open('progressive-data');
        const cachedResponse = await cache.match(cacheKey);
        
        if (cachedResponse) {
          const cachedData = await cachedResponse.json();
          setData(cachedData.data);
          setLastFetch(cachedData.timestamp);
        }
      }
    } catch (cacheError) {
      console.warn('Failed to load from cache:', cacheError);
    }

    setError(lastError);
    setIsLoading(false);
    
    return data;
  }, [fetchFn, cacheKey, staleTime, retryAttempts, retryDelay, data, lastFetch]);

  // Initial fetch
  React.useEffect(() => {
    fetchData();
  }, []);

  const refetch = React.useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    isStale: Date.now() - lastFetch > staleTime,
  };
};

// Bundle splitting utilities
export const preloadRoute = (routeImport: () => Promise<any>) => {
  // Preload the route component
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = routeImport.toString();
  document.head.appendChild(link);
  
  // Also trigger the actual import to cache it
  routeImport().catch(() => {
    // Ignore errors during preloading
  });
};

// Critical resource preloader
export const preloadCriticalResources = (resources: string[]) => {
  resources.forEach(resource => {
    const link = document.createElement('link');
    
    if (resource.endsWith('.js')) {
      link.rel = 'modulepreload';
    } else if (resource.endsWith('.css')) {
      link.rel = 'preload';
      link.as = 'style';
    } else if (resource.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
      link.rel = 'preload';
      link.as = 'image';
    } else {
      link.rel = 'preload';
    }
    
    link.href = resource;
    document.head.appendChild(link);
  });
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => Promise<any>) => {
  return async (...args: any[]) => {
    const start = performance.now();
    
    try {
      const result = await fn.apply(null, args);
      const end = performance.now();
      
      // Log performance metrics
      console.log(`${name} took ${end - start} milliseconds`);
      
      // Send to analytics if available
      if ('gtag' in window) {
        (window as any).gtag('event', 'timing_complete', {
          name,
          value: Math.round(end - start),
        });
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${name} failed after ${end - start} milliseconds:`, error);
      throw error;
    }
  };
};

// Resource hints for better loading
export const addResourceHints = () => {
  // DNS prefetch for external resources
  const dnsPrefetchDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];
  
  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });
  
  // Preconnect to critical origins
  const preconnectOrigins = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];
  
  preconnectOrigins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Intersection Observer for progressive loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);
  const [node, setNode] = React.useState<Element | null>(null);

  React.useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      options
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [node, options]);

  return [setNode, entry] as const;
};

// Virtual scrolling for large lists
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualScroll = <T>(
  items: T[],
  { itemHeight, containerHeight, overscan = 5 }: VirtualScrollOptions
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleItemCount + overscan * 2
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index,
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
};