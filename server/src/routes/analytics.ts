import { Router } from 'express'
import { AnalyticsController, analyticsValidation } from '../controllers/analyticsController'
import { 
  requireAuth, 
  requirePermission,
  auditLog 
} from '../middleware/auth'

const router = Router()

/**
 * Analytics and Reporting Routes
 */

// Get dashboard metrics
router.get('/dashboard',
  requireAuth,
  requirePermission('analytics', 'read'),
  AnalyticsController.getDashboardMetrics
)

// Get sales metrics
router.get('/sales/metrics',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getSalesMetrics,
  AnalyticsController.getSalesMetrics
)

// Get product analytics
router.get('/products',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getProductAnalytics,
  AnalyticsController.getProductAnalytics
)

// Get category analytics
router.get('/categories',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getCategoryAnalytics,
  AnalyticsController.getCategoryAnalytics
)

// Get time series data for charts
router.get('/time-series',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getTimeSeriesData,
  AnalyticsController.getTimeSeriesData
)

// Get comprehensive profit analysis
router.get('/profit-analysis',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getProfitAnalysis,
  AnalyticsController.getProfitAnalysis
)

// Get demand forecasting
router.get('/demand-forecast',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getDemandForecast,
  AnalyticsController.getDemandForecast
)

// Get seasonal trends
router.get('/seasonal-trends',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getSeasonalTrends,
  AnalyticsController.getSeasonalTrends
)

// Get business intelligence
router.get('/business-intelligence',
  requireAuth,
  requirePermission('analytics', 'read'),
  analyticsValidation.getBusinessIntelligence,
  AnalyticsController.getBusinessIntelligence
)

// Export analytics data
router.post('/export',
  requireAuth,
  requirePermission('analytics', 'export'),
  analyticsValidation.exportData,
  auditLog('EXPORT_ANALYTICS', 'analytics'),
  AnalyticsController.exportData
)

export default router