/**
 * Performance Optimization Utilities
 * Provides caching, memoization, and performance monitoring
 */

// Cache implementation with TTL support
export class Cache<T = any> {
  private cache = new Map<string, { value: T; expires: number }>()
  private defaultTTL: number

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL
  }

  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expires })
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    // Clean expired items first
    this.cleanExpired()
    return this.cache.size
  }

  private cleanExpired(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instances
export const apiCache = new Cache(10 * 60 * 1000) // 10 minutes for API responses
export const imageCache = new Cache(30 * 60 * 1000) // 30 minutes for images
export const dataCache = new Cache(5 * 60 * 1000) // 5 minutes for general data

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTiming(label: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(label, duration)
    }
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    
    const values = this.metrics.get(label)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetrics(label: string): {
    count: number
    average: number
    min: number
    max: number
    latest: number
  } | null {
    const values = this.metrics.get(label)
    if (!values || values.length === 0) return null

    return {
      count: values.length,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1]
    }
  }

  getAllMetrics(): Record<string, ReturnType<PerformanceMonitor['getMetrics']>> {
    const result: Record<string, ReturnType<PerformanceMonitor['getMetrics']>> = {}
    
    for (const label of this.metrics.keys()) {
      result[label] = this.getMetrics(label)
    }
    
    return result
  }

  clearMetrics(label?: string): void {
    if (label) {
      this.metrics.delete(label)
    } else {
      this.metrics.clear()
    }
  }
}

// Bundle size optimization utilities
export const lazyImport = <T>(importFn: () => Promise<T>) => {
  let promise: Promise<T> | null = null
  
  return (): Promise<T> => {
    if (!promise) {
      promise = importFn()
    }
    return promise
  }
}

// Image optimization utilities
export const optimizeImage = (
  src: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  } = {}
): string => {
  const { width, height, quality = 80, format = 'webp' } = options
  
  // In a real implementation, this would integrate with an image optimization service
  // For now, we'll return the original src with query parameters
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  params.set('q', quality.toString())
  params.set('f', format)
  
  return `${src}?${params.toString()}`
}

// Resource preloading
export const preloadResource = (href: string, as: string): void => {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

// Critical resource loading
export const loadCriticalResources = (): void => {
  // Preload critical fonts
  preloadResource('/fonts/inter-var.woff2', 'font')
  
  // Preload critical images
  preloadResource('/images/logo.svg', 'image')
  
  // Preload critical API endpoints
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Cache critical API endpoints
      const criticalEndpoints = [
        '/api/products',
        '/api/analytics/dashboard',
        '/api/auth/verify'
      ]
      
      criticalEndpoints.forEach(endpoint => {
        fetch(endpoint, { method: 'HEAD' }).catch(() => {
          // Ignore errors for preloading
        })
      })
    })
  }
}

// Memory usage monitoring
export const getMemoryUsage = (): {
  used: number
  total: number
  percentage: number
} | null => {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  }
  return null
}

// Performance observer for monitoring
export const observePerformance = (): void => {
  if ('PerformanceObserver' in window) {
    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn(`Long task detected: ${entry.duration}ms`, entry)
          PerformanceMonitor.getInstance().recordMetric('long-tasks', entry.duration)
        }
      }
    })
    
    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // Long task API not supported
    }

    // Monitor layout shifts
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ((entry as any).hadRecentInput) continue
        
        const clsValue = (entry as any).value
        if (clsValue > 0.1) { // CLS threshold
          console.warn(`Layout shift detected: ${clsValue}`, entry)
          PerformanceMonitor.getInstance().recordMetric('layout-shifts', clsValue)
        }
      }
    })
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      // Layout shift API not supported
    }
  }
}

// Initialize performance monitoring
export const initializePerformanceMonitoring = (): void => {
  // Load critical resources
  loadCriticalResources()
  
  // Start performance observation
  observePerformance()
  
  // Monitor memory usage periodically
  setInterval(() => {
    const memoryUsage = getMemoryUsage()
    if (memoryUsage && memoryUsage.percentage > 80) {
      console.warn(`High memory usage: ${memoryUsage.percentage.toFixed(1)}%`)
    }
  }, 30000) // Check every 30 seconds
}

export const performanceMonitor = PerformanceMonitor.getInstance()