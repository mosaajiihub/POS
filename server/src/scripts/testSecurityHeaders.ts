#!/usr/bin/env tsx

import express from 'express'
import { securityHeaders, developmentCSPConfig, productionCSPConfig } from '../middleware/securityHeaders'
import { validateSecurityHeaders } from '../utils/securityHeadersValidator'

const app = express()

// Test development configuration
console.log('Testing Development Configuration...')
app.use(securityHeaders(developmentCSPConfig()))

app.get('/test-dev', (req, res) => {
  const headers = res.getHeaders()
  const validation = validateSecurityHeaders(headers)
  
  console.log('Development Headers:')
  console.log('- CSP:', headers['content-security-policy'] || headers['content-security-policy-report-only'])
  console.log('- X-Frame-Options:', headers['x-frame-options'])
  console.log('- X-Content-Type-Options:', headers['x-content-type-options'])
  console.log('- Referrer-Policy:', headers['referrer-policy'])
  console.log('- Feature-Policy:', headers['feature-policy'])
  console.log('- Permissions-Policy:', headers['permissions-policy'])
  console.log('- Cross-Origin-Embedder-Policy:', headers['cross-origin-embedder-policy'])
  console.log('- Cross-Origin-Opener-Policy:', headers['cross-origin-opener-policy'])
  console.log('- Cross-Origin-Resource-Policy:', headers['cross-origin-resource-policy'])
  console.log('- Report-To:', headers['report-to'])
  
  console.log('\nValidation Results:')
  console.log('- Valid:', validation.isValid)
  console.log('- Missing Headers:', validation.missingHeaders)
  console.log('- Warnings:', validation.warnings)
  console.log('- Recommendations:', validation.recommendations)
  
  res.json({ 
    message: 'Development configuration test',
    headers: Object.fromEntries(
      Object.entries(headers).filter(([key]) => 
        key.toLowerCase().includes('content-security-policy') ||
        key.toLowerCase().includes('x-frame-options') ||
        key.toLowerCase().includes('x-content-type-options') ||
        key.toLowerCase().includes('referrer-policy') ||
        key.toLowerCase().includes('cross-origin') ||
        key.toLowerCase().includes('feature-policy') ||
        key.toLowerCase().includes('permissions-policy') ||
        key.toLowerCase().includes('report-to')
      )
    ),
    validation
  })
})

// Test production configuration
console.log('\nTesting Production Configuration...')
const prodApp = express()
prodApp.use(securityHeaders(productionCSPConfig()))

prodApp.get('/test-prod', (req, res) => {
  const headers = res.getHeaders()
  const validation = validateSecurityHeaders(headers)
  
  console.log('Production Headers:')
  console.log('- CSP:', headers['content-security-policy'] || headers['content-security-policy-report-only'])
  console.log('- X-Frame-Options:', headers['x-frame-options'])
  console.log('- X-Content-Type-Options:', headers['x-content-type-options'])
  console.log('- Referrer-Policy:', headers['referrer-policy'])
  console.log('- Feature-Policy:', headers['feature-policy'])
  console.log('- Permissions-Policy:', headers['permissions-policy'])
  console.log('- Cross-Origin-Embedder-Policy:', headers['cross-origin-embedder-policy'])
  console.log('- Cross-Origin-Opener-Policy:', headers['cross-origin-opener-policy'])
  console.log('- Cross-Origin-Resource-Policy:', headers['cross-origin-resource-policy'])
  console.log('- Report-To:', headers['report-to'])
  
  console.log('\nValidation Results:')
  console.log('- Valid:', validation.isValid)
  console.log('- Missing Headers:', validation.missingHeaders)
  console.log('- Warnings:', validation.warnings)
  console.log('- Recommendations:', validation.recommendations)
  
  res.json({ 
    message: 'Production configuration test',
    headers: Object.fromEntries(
      Object.entries(headers).filter(([key]) => 
        key.toLowerCase().includes('content-security-policy') ||
        key.toLowerCase().includes('x-frame-options') ||
        key.toLowerCase().includes('x-content-type-options') ||
        key.toLowerCase().includes('referrer-policy') ||
        key.toLowerCase().includes('cross-origin') ||
        key.toLowerCase().includes('feature-policy') ||
        key.toLowerCase().includes('permissions-policy') ||
        key.toLowerCase().includes('report-to')
      )
    ),
    validation
  })
})

// Start test servers
const devServer = app.listen(3001, () => {
  console.log('\nDevelopment test server running on http://localhost:3001')
  console.log('Test endpoint: http://localhost:3001/test-dev')
})

const prodServer = prodApp.listen(3002, () => {
  console.log('Production test server running on http://localhost:3002')
  console.log('Test endpoint: http://localhost:3002/test-prod')
})

// Test both configurations
async function runTests() {
  try {
    console.log('\n=== Running Security Headers Tests ===\n')
    
    // Test development configuration
    const devResponse = await fetch('http://localhost:3001/test-dev')
    const devData = await devResponse.json()
    console.log('Development Test Results:', JSON.stringify(devData, null, 2))
    
    // Test production configuration
    const prodResponse = await fetch('http://localhost:3002/test-prod')
    const prodData = await prodResponse.json()
    console.log('\nProduction Test Results:', JSON.stringify(prodData, null, 2))
    
  } catch (error) {
    console.error('Test error:', error)
  } finally {
    devServer.close()
    prodServer.close()
    process.exit(0)
  }
}

// Wait a moment for servers to start, then run tests
setTimeout(runTests, 1000)