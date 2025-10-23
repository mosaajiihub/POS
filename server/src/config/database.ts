import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
})

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`)
    logger.debug(`Duration: ${e.duration}ms`)
  })
}

prisma.$on('error', (e) => {
  logger.error('Database error:', e)
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export async function connectDatabase() {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Database connection failed:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    logger.info('Database disconnected')
  } catch (error) {
    logger.error('Database disconnection failed:', error)
  }
}