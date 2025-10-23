import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { prisma } from '../config/database'
import { getRedisClient } from '../config/redis'

// Setup test database
beforeAll(async () => {
  // Database migrations should be run before tests
  // This is typically done in CI/CD pipeline
})

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect()
  
  try {
    const redis = getRedisClient()
    await redis.quit()
  } catch (error) {
    // Redis might not be connected in test environment
  }
})

// Clean up before each test
beforeEach(async () => {
  // Clean up test data if needed
  // This ensures test isolation
})

// Clean up after each test
afterEach(async () => {
  // Additional cleanup if needed
})