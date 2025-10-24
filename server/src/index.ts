import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import { connectRedis } from './config/redis'
import { connectDatabase } from './config/database'
import { ScheduledTaskService } from './services/scheduledTaskService'
import { PaymentGatewayService } from './services/paymentGatewayService'
import { ReportService } from './services/reportService'
import { ScheduledReportService } from './services/scheduledReportService'
import { webSocketService } from './services/websocketService'
import authRoutes from './routes/auth'
import otpRoutes from './routes/otp'
import paymentRoutes from './routes/payment'
import roleRoutes from './routes/roles'
import userRoutes from './routes/users'
import productRoutes from './routes/products'
import categoryRoutes from './routes/categories'
import supplierRoutes from './routes/suppliers'
import customerRoutes from './routes/customers'
import stockRoutes from './routes/stock'
import analyticsRoutes from './routes/analytics'
import expenseRoutes from './routes/expenses'
import financialDashboardRoutes from './routes/financial-dashboard'
import invoiceRoutes from './routes/invoices'
import scheduledTaskRoutes from './routes/scheduled-tasks'
import paymentGatewayRoutes from './routes/payment-gateway'
import subscriptionRoutes from './routes/subscriptions'
import serviceManagementRoutes from './routes/service-management'
import reportRoutes from './routes/reports'
import auditRoutes from './routes/audit'
import securityRoutes from './routes/security'
import securityMonitoringRoutes from './routes/security-monitoring'
import advancedSecurityRoutes from './routes/advanced-security'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(compression())

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/financial-dashboard', financialDashboardRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/scheduled-tasks', scheduledTaskRoutes)
app.use('/api/payment-gateway', paymentGatewayRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/service-management', serviceManagementRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/security', securityRoutes)
app.use('/api/security-monitoring', securityMonitoringRoutes)
app.use('/api/advanced-security', advancedSecurityRoutes)

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// Error handling middleware
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await connectRedis()
    logger.info('Redis connected successfully')

    // Connect to Database
    await connectDatabase()
    logger.info('Database connected successfully')

    // Initialize Report Service
    await ReportService.initialize()
    logger.info('Report service initialized')

    // Initialize Scheduled Report Service
    await ScheduledReportService.initialize()
    logger.info('Scheduled report service initialized')

    // Initialize payment gateway
    if (process.env.PAYMENT_GATEWAY_PROVIDER) {
      PaymentGatewayService.initialize({
        provider: process.env.PAYMENT_GATEWAY_PROVIDER as any,
        apiKey: process.env.PAYMENT_GATEWAY_API_KEY || '',
        webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
        environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as any
      })
      logger.info('Payment gateway initialized')
    }

    // Start scheduled tasks (only in production)
    if (process.env.NODE_ENV === 'production') {
      ScheduledTaskService.startAllTasks()
      logger.info('Scheduled tasks started')
    }

    // Initialize WebSocket service
    webSocketService.initialize(server)
    logger.info('WebSocket service initialized')

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`WebSocket server available at ws://localhost:${PORT}/ws`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  ScheduledTaskService.stopAllTasks()
  ScheduledReportService.stopAllScheduledReports()
  webSocketService.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  ScheduledTaskService.stopAllTasks()
  ScheduledReportService.stopAllScheduledReports()
  webSocketService.close()
  process.exit(0)
})

startServer()

export default app