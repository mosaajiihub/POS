import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import { connectRedis } from './config/redis'
import { connectDatabase } from './config/database'

// Load environment variables
dotenv.config()

const app = express()
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

// API routes will be added in future tasks
app.use('/api', (req, res) => {
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

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

startServer()

export default app