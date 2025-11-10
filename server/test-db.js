const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Query result:', result);
    
    await prisma.$disconnect();
    console.log('Database disconnected successfully!');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();