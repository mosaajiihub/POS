import express from 'express'
import { ReportController } from '../controllers/reportController'
import { requireAuth } from '../middleware/auth'

const router = express.Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

// Stock Reports
router.get('/stock/levels', ReportController.getStockLevelReport)
router.get('/stock/movements', ReportController.getStockMovementReport)
router.get('/stock/low-stock', ReportController.getLowStockReport)
router.get('/stock/valuation', ReportController.getInventoryValuationReport)

// Sales Reports
router.get('/sales/performance', ReportController.getSalesPerformanceReport)
router.get('/sales/products', ReportController.getProductPerformanceReport)
router.get('/sales/customers', ReportController.getCustomerAnalyticsReport)

// Export functionality
router.get('/export/:reportType/:format', ReportController.exportReport)

// Scheduled reports
router.post('/scheduled', ReportController.scheduleReport)
router.get('/scheduled', ReportController.getScheduledReports)
router.put('/scheduled/:id', ReportController.updateScheduledReport)
router.delete('/scheduled/:id', ReportController.deleteScheduledReport)

export default router