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
import { securityHeaders, developmentCSPConfig, productionCSPConfig, validateSecurityHeaders } from './middleware/securityHeaders'
import { securityHeadersValidationMiddleware } from './utils/securityHeadersValidator'
import { apiSecurityMiddleware, securityContextMiddleware } from './middleware/apiSecurityMiddleware'
import { attackDetectionMiddleware, cleanupSecurityData } from './middleware/attackDetection'
import { moderateIPAccessControl } from './middleware/ipAccessControl'
import { connectRedis } from './config/redis'
import { connectDatabase } from './config/database'
import { ScheduledTaskService } from './services/scheduledTaskService'
import { PaymentGatewayService } from './services/paymentGatewayService'
import { ReportService } from './services/reportService'
import { ScheduledReportService } from './services/scheduledReportService'
import { webSocketService } from './services/websocketService'
import { BackupService } from './services/backupService'
import { OffsiteBackupService } from './services/offsiteBackupService'
import { DisasterRecoveryService } from './services/disasterRecoveryService'
import authRoutes from './routes/auth'
import mfaRoutes from './routes/mfa'
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
import securityDashboardRoutes from './routes/security-dashboard'
import threatDetectionRoutes from './routes/threat-detection'
import incidentResponseRoutes from './routes/incident-response'
import siemIntegrationRoutes from './routes/siem-integration'
import advancedSecurityRoutes from './routes/advanced-security'
import apiSecurityRoutes from './routes/api-security'
import transactionRoutes from './routes/transactions'
import ipManagementRoutes from './routes/ipManagement'
import vulnerabilityRoutes from './routes/vulnerabilityRoutes'
import dataEncryptionRoutes from './routes/dataEncryption'
import accessControlRoutes from './routes/accessControl'
import abacRoutes from './routes/abac'
import accessReviewRoutes from './routes/accessReview'
import backupRoutes from './routes/backup'
import infrastructureSecurityRoutes from './routes/infrastructure-security'
import networkSecurityRoutes from './routes/network-security'
import secretsManagementRoutes from './routes/secrets-management'
import securityTestingRoutes from './routes/securityTestingRoutes'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 5000

// Security middleware
// Use basic helmet for some headers, but disable CSP and frame options as we handle them in our custom middleware
app.use(helmet({
  contentSecurityPolicy: false, // We handle this in our custom middleware
  frameguard: false, // We handle this in our custom middleware
  referrerPolicy: false, // We handle this in our custom middleware
  crossOriginEmbedderPolicy: false, // We handle this in our custom middleware
  crossOriginOpenerPolicy: false, // We handle this in our custom middleware
  crossOriginResourcePolicy: false // We handle this in our custom middleware
}))

// Apply comprehensive security headers
const securityConfig = process.env.NODE_ENV === 'production' 
  ? productionCSPConfig() 
  : developmentCSPConfig()
app.use(securityHeaders(securityConfig))

// Validate security headers are properly set (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(validateSecurityHeaders())
  app.use(securityHeadersValidationMiddleware())
}

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

// IP Access Control middleware (applied early for security)
app.use('/api/', moderateIPAccessControl)

// API Security middleware
app.use('/api/', securityContextMiddleware())
app.use('/api/', attackDetectionMiddleware({
  enableSQLInjectionDetection: true,
  enableXSSDetection: true,
  enableCSRFProtection: true,
  enableSuspiciousActivityDetection: true,
  enableBruteForceProtection: true,
  logSecurityEvents: true,
  blockSuspiciousRequests: true,
  maxSuspiciousScore: 75
}))
app.use('/api/', apiSecurityMiddleware({
  enableLogging: true,
  enableVersionValidation: true,
  enableSignatureVerification: false, // Enable in production
  logRequestBody: false, // Enable for debugging
  logResponseBody: false // Enable for debugging
}))

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
app.use('/api/mfa', mfaRoutes)
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
app.use('/api/security-dashboard', securityDashboardRoutes)
app.use('/api/threat-detection', threatDetectionRoutes)
app.use('/api/incident-response', incidentResponseRoutes)
app.use('/api/siem', siemIntegrationRoutes)
app.use('/api/advanced-security', advancedSecurityRoutes)
app.use('/api/api-security', apiSecurityRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/ip-management', ipManagementRoutes)
app.use('/api/vulnerability', vulnerabilityRoutes)
app.use('/api/data-encryption', dataEncryptionRoutes)
app.use('/api/access-control', accessControlRoutes)
app.use('/api/abac', abacRoutes)
app.use('/api/access-review', accessReviewRoutes)
app.use('/api', backupRoutes)
app.use('/api/infrastructure-security', infrastructureSecurityRoutes)
app.use('/api/network-security', networkSecurityRoutes)
app.use('/api/secrets-management', secretsManagementRoutes)
app.use('/api/security-testing', securityTestingRoutes)

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

    // Initialize Backup Service
    await BackupService.initialize()
    logger.info('Backup service initialized')

    // Initialize Offsite Backup Service
    await OffsiteBackupService.initialize()
    logger.info('Offsite backup service initialized')

    // Initialize Disaster Recovery Service
    await DisasterRecoveryService.initialize()
    logger.info('Disaster recovery service initialized')

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

    // Start security data cleanup (every hour)
    setInterval(() => {
      cleanupSecurityData()
      logger.debug('Security data cleanup completed')
    }, 60 * 60 * 1000) // 1 hour
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
  BackupService.stopBackupMonitoring()
  OffsiteBackupService.stopReplicationMonitoring()
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