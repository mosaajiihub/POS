/**
 * Database Query Optimization Utilities
 * Provides query optimization, caching, and performance monitoring for database operations
 */

import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

// Query performance monitoring
export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor
  private metrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map()

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor()
    }
    return QueryPerformanceMonitor.instance
  }

  recordQuery(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 }
    
    existing.count++
    existing.totalTime += duration
    existing.avgTime = existing.totalTime / existing.count

    this.metrics.set(operation, existing)

    // Log slow queries
    if (duration > 1000) { // Queries slower than 1 second
      logger.warn(`Slow query detected: ${operation} took ${duration}ms`)
    }
  }

  getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics)
  }

  clearMetrics(): void {
    this.metrics.clear()
  }
}

// Enhanced Prisma client with performance monitoring
export const createOptimizedPrismaClient = (): PrismaClient => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ]
  })

  const monitor = QueryPerformanceMonitor.getInstance()

  // Monitor query performance
  prisma.$on('query', (e) => {
    monitor.recordQuery(e.query.substring(0, 50), e.duration)
  })

  prisma.$on('error', (e) => {
    logger.error('Database error:', e)
  })

  prisma.$on('warn', (e) => {
    logger.warn('Database warning:', e)
  })

  return prisma
}

// Query optimization helpers
export const optimizeProductQuery = (filters: {
  categoryId?: string
  supplierId?: string
  search?: string
  isActive?: boolean
  lowStock?: boolean
  page?: number
  limit?: number
}) => {
  const { categoryId, supplierId, search, isActive, lowStock, page = 1, limit = 20 } = filters

  // Build optimized where clause
  const where: any = {}

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (supplierId) {
    where.supplierId = supplierId
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (lowStock) {
    where.stockLevel = {
      lte: { $ref: 'minStockLevel' } // Use Prisma's field reference
    }
  }

  // Optimize includes based on usage
  const include = {
    category: {
      select: {
        id: true,
        name: true
      }
    },
    supplier: {
      select: {
        id: true,
        name: true
      }
    }
  }

  return {
    where,
    include,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { updatedAt: 'desc' as const }
  }
}

export const optimizeSalesQuery = (filters: {
  startDate?: Date
  endDate?: Date
  customerId?: string
  cashierId?: string
  status?: string
  page?: number
  limit?: number
}) => {
  const { startDate, endDate, customerId, cashierId, status, page = 1, limit = 50 } = filters

  const where: any = {}

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  if (customerId) {
    where.customerId = customerId
  }

  if (cashierId) {
    where.cashierId = cashierId
  }

  if (status) {
    where.status = status
  }

  // Optimize includes for sales queries
  const include = {
    customer: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      }
    }
  }

  return {
    where,
    include,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' as const }
  }
}

// Batch operations for better performance
export const batchUpdateStock = async (
  prisma: PrismaClient,
  updates: Array<{ productId: string; newStock: number; reason: string }>
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const updatePromises = updates.map(async ({ productId, newStock, reason }) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stockLevel: true }
      })

      if (!product) {
        throw new Error(`Product ${productId} not found`)
      }

      // Update product stock
      await tx.product.update({
        where: { id: productId },
        data: { stockLevel: newStock }
      })

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          productId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(newStock - product.stockLevel),
          previousStock: product.stockLevel,
          newStock,
          reason
        }
      })
    })

    await Promise.all(updatePromises)
  })
}

// Connection pool optimization
export const optimizeConnectionPool = (prisma: PrismaClient): void => {
  // Set connection pool limits based on environment
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    // Production settings
    process.env.DATABASE_URL += '?connection_limit=20&pool_timeout=20'
  } else {
    // Development settings
    process.env.DATABASE_URL += '?connection_limit=5&pool_timeout=10'
  }
}

// Query result caching
export class QueryCache {
  private cache = new Map<string, { data: any; expires: number }>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { data, expires })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

export const queryCache = new QueryCache()

// Cached query wrapper
export const cachedQuery = async <T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  // Check cache first
  const cached = queryCache.get(key)
  if (cached) {
    return cached
  }

  // Execute query
  const result = await queryFn()
  
  // Cache result
  queryCache.set(key, result, ttl)
  
  return result
}

// Database health check
export const checkDatabaseHealth = async (prisma: PrismaClient): Promise<{
  isHealthy: boolean
  responseTime: number
  error?: string
}> => {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start
    
    return {
      isHealthy: true,
      responseTime
    }
  } catch (error) {
    return {
      isHealthy: false,
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Index recommendations
export const getIndexRecommendations = (): string[] => {
  return [
    // Product indexes
    'CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);',
    'CREATE INDEX IF NOT EXISTS idx_products_supplier_active ON products(supplier_id, is_active);',
    'CREATE INDEX IF NOT EXISTS idx_products_stock_level ON products(stock_level, min_stock_level);',
    'CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector(\'english\', name || \' \' || sku));',
    
    // Sales indexes
    'CREATE INDEX IF NOT EXISTS idx_sales_date_status ON sales(created_at, status);',
    'CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_sales_cashier_date ON sales(cashier_id, created_at);',
    
    // Stock movement indexes
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(type, created_at);',
    
    // Customer indexes
    'CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector(\'english\', name || \' \' || email));',
    
    // User indexes
    'CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, status);',
    'CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role_id, status);'
  ]
}

// Performance analysis
export const analyzeQueryPerformance = async (prisma: PrismaClient): Promise<{
  slowQueries: Array<{ query: string; avgTime: number; count: number }>
  recommendations: string[]
}> => {
  const monitor = QueryPerformanceMonitor.getInstance()
  const metrics = monitor.getMetrics()
  
  // Find slow queries (average time > 500ms)
  const slowQueries = Object.entries(metrics)
    .filter(([_, stats]) => stats.avgTime > 500)
    .map(([query, stats]) => ({
      query,
      avgTime: stats.avgTime,
      count: stats.count
    }))
    .sort((a, b) => b.avgTime - a.avgTime)

  const recommendations: string[] = []
  
  if (slowQueries.length > 0) {
    recommendations.push('Consider adding database indexes for slow queries')
    recommendations.push('Review query complexity and optimize WHERE clauses')
    recommendations.push('Consider implementing query result caching')
  }

  // Check database health
  const health = await checkDatabaseHealth(prisma)
  if (!health.isHealthy) {
    recommendations.push('Database connection issues detected - check connection pool settings')
  }

  if (health.responseTime > 100) {
    recommendations.push('High database response time - consider connection optimization')
  }

  return {
    slowQueries,
    recommendations
  }
}

export const queryPerformanceMonitor = QueryPerformanceMonitor.getInstance()