import axios, { AxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface DASTConfiguration {
  enabled: boolean
  targetUrl: string
  authentication?: {
    type: 'basic' | 'bearer' | 'cookie'
    credentials: any
  }
  scanProfile: 'quick' | 'standard' | 'comprehensive'
  tests: DASTTest[]
  maxConcurrentRequests: number
  requestTimeout: number
  followRedirects: boolean
  userAgent: string
}

export interface DASTTest {
  id: string
  name: string
  description: string
  category: DASTCategory
  enabled: boolean
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface DASTScanResult {
  scanId: string
  timestamp: Date
  duration: number
  targetUrl: string
  configuration: DASTConfiguration
  summary: DASTSummary
  vulnerabilities: DASTVulnerability[]
  endpoints: DASTEndpoint[]
  recommendations: string[]
}

export interface DASTSummary {
  totalVulnerabilities: number
  criticalVulnerabilities: number
  highVulnerabilities: number
  mediumVulnerabilities: number
  lowVulnerabilities: number
  endpointsTested: number
  requestsSent: number
  securityScore: number
  coverageScore: number
}

export interface DASTVulnerability {
  id: string
  testId: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: DASTCategory
  type: string
  title: string
  description: string
  url: string
  method: string
  parameter?: string
  payload?: string
  evidence: string
  request: string
  response: string
  recommendation: string
  cwe?: string
  owasp?: string
  cvss?: number
  verified: boolean
}

export interface DASTEndpoint {
  url: string
  method: string
  statusCode: number
  responseTime: number
  tested: boolean
  vulnerabilities: number
}

export enum DASTCategory {
  INJECTION = 'INJECTION',
  BROKEN_AUTHENTICATION = 'BROKEN_AUTHENTICATION',
  SENSITIVE_DATA_EXPOSURE = 'SENSITIVE_DATA_EXPOSURE',
  XML_EXTERNAL_ENTITIES = 'XML_EXTERNAL_ENTITIES',
  BROKEN_ACCESS_CONTROL = 'BROKEN_ACCESS_CONTROL',
  SECURITY_MISCONFIGURATION = 'SECURITY_MISCONFIGURATION',
  XSS = 'XSS',
  INSECURE_DESERIALIZATION = 'INSECURE_DESERIALIZATION',
  USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES = 'USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES',
  INSUFFICIENT_LOGGING = 'INSUFFICIENT_LOGGING',
  CSRF = 'CSRF',
  CORS = 'CORS'
}

/**
 * Dynamic Application Security Testing (DAST) Service
 * Performs runtime security testing of web applications
 */
export class DASTService {
  private static readonly DEFAULT_TESTS: DASTTest[] = [
    {
      id: 'sql-injection-test',
      name: 'SQL Injection Test',
      description: 'Tests for SQL injection vulnerabilities',
      category: DASTCategory.INJECTION,
      enabled: true,
      severity: 'CRITICAL'
    },
    {
      id: 'xss-test',
      name: 'Cross-Site Scripting Test',
      description: 'Tests for XSS vulnerabilities',
      category: DASTCategory.XSS,
      enabled: true,
      severity: 'HIGH'
    },
    {
      id: 'csrf-test',
      name: 'CSRF Protection Test',
      description: 'Tests for CSRF vulnerabilities',
      category: DASTCategory.CSRF,
      enabled: true,
      severity: 'HIGH'
    },
    {
      id: 'auth-bypass-test',
      name: 'Authentication Bypass Test',
      description: 'Tests for authentication bypass vulnerabilities',
      category: DASTCategory.BROKEN_AUTHENTICATION,
      enabled: true,
      severity: 'CRITICAL'
    },
    {
      id: 'authz-test',
      name: 'Authorization Test',
      description: 'Tests for broken access control',
      category: DASTCategory.BROKEN_ACCESS_CONTROL,
      enabled: true,
      severity: 'HIGH'
    },
    {
      id: 'security-headers-test',
      name: 'Security Headers Test',
      description: 'Tests for missing security headers',
      category: DASTCategory.SECURITY_MISCONFIGURATION,
      enabled: true,
      severity: 'MEDIUM'
    },
    {
      id: 'cors-test',
      name: 'CORS Misconfiguration Test',
      description: 'Tests for CORS misconfigurations',
      category: DASTCategory.CORS,
      enabled: true,
      severity: 'MEDIUM'
    },
    {
      id: 'sensitive-data-test',
      name: 'Sensitive Data Exposure Test',
      description: 'Tests for sensitive data exposure',
      category: DASTCategory.SENSITIVE_DATA_EXPOSURE,
      enabled: true,
      severity: 'HIGH'
    }
  ]

  /**
   * Run DAST scan
   */
  static async runScan(config: DASTConfiguration): Promise<DASTScanResult> {
    const scanId = `dast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    try {
      logger.info(`Starting DAST scan: ${scanId} on ${config.targetUrl}`)

      const vulnerabilities: DASTVulnerability[] = []
      const endpoints: DASTEndpoint[] = []
      let requestsSent = 0

      // Discover endpoints
      const discoveredEndpoints = await this.discoverEndpoints(config.targetUrl)
      logger.info(`Discovered ${discoveredEndpoints.length} endpoints`)

      // Test each endpoint
      for (const endpoint of discoveredEndpoints) {
        const endpointResult = await this.testEndpoint(endpoint, config)
        endpoints.push(endpointResult.endpoint)
        vulnerabilities.push(...endpointResult.vulnerabilities)
        requestsSent += endpointResult.requestsSent
      }

      const duration = Date.now() - startTime

      // Calculate summary
      const summary = this.calculateSummary(vulnerabilities, endpoints, requestsSent)

      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, vulnerabilities)

      const result: DASTScanResult = {
        scanId,
        timestamp: new Date(),
        duration,
        targetUrl: config.targetUrl,
        configuration: config,
        summary,
        vulnerabilities,
        endpoints,
        recommendations
      }

      // Log scan completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'DAST_SCAN_COMPLETED',
        tableName: 'security_scans',
        recordId: scanId,
        newValues: {
          targetUrl: config.targetUrl,
          totalVulnerabilities: summary.totalVulnerabilities,
          criticalVulnerabilities: summary.criticalVulnerabilities,
          securityScore: summary.securityScore,
          duration
        }
      })

      logger.info(`DAST scan completed: ${scanId} - Found ${summary.totalVulnerabilities} vulnerabilities`)

      return result
    } catch (error) {
      logger.error(`DAST scan failed: ${scanId}`, error)
      throw error
    }
  }

  /**
   * Discover API endpoints
   */
  private static async discoverEndpoints(baseUrl: string): Promise<string[]> {
    const endpoints: string[] = []

    try {
      // Common API endpoints to test
      const commonPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/users',
        '/api/products',
        '/api/transactions',
        '/api/customers',
        '/api/suppliers',
        '/api/invoices',
        '/api/reports',
        '/api/analytics'
      ]

      for (const path of commonPaths) {
        endpoints.push(`${baseUrl}${path}`)
      }

      // Try to discover OpenAPI/Swagger endpoints
      try {
        const swaggerUrls = ['/api-docs', '/swagger.json', '/openapi.json']
        for (const swaggerUrl of swaggerUrls) {
          const response = await axios.get(`${baseUrl}${swaggerUrl}`, { timeout: 5000 })
          if (response.status === 200 && response.data) {
            // Parse OpenAPI spec and extract endpoints
            const spec = response.data
            if (spec.paths) {
              Object.keys(spec.paths).forEach(path => {
                endpoints.push(`${baseUrl}${path}`)
              })
            }
            break
          }
        }
      } catch (error) {
        // Swagger/OpenAPI not available, continue with common paths
      }
    } catch (error) {
      logger.error('Error discovering endpoints:', error)
    }

    return [...new Set(endpoints)] // Remove duplicates
  }

  /**
   * Test a single endpoint
   */
  private static async testEndpoint(
    url: string,
    config: DASTConfiguration
  ): Promise<{
    endpoint: DASTEndpoint
    vulnerabilities: DASTVulnerability[]
    requestsSent: number
  }> {
    const vulnerabilities: DASTVulnerability[] = []
    let requestsSent = 0
    let statusCode = 0
    let responseTime = 0

    try {
      // Test endpoint availability
      const startTime = Date.now()
      const response = await axios.get(url, {
        timeout: config.requestTimeout,
        validateStatus: () => true
      })
      responseTime = Date.now() - startTime
      statusCode = response.status
      requestsSent++

      // Run enabled tests
      for (const test of config.tests.filter(t => t.enabled)) {
        const testVulns = await this.runTest(test, url, config)
        vulnerabilities.push(...testVulns)
        requestsSent += testVulns.length
      }
    } catch (error) {
      logger.error(`Error testing endpoint ${url}:`, error)
    }

    const endpoint: DASTEndpoint = {
      url,
      method: 'GET',
      statusCode,
      responseTime,
      tested: true,
      vulnerabilities: vulnerabilities.length
    }

    return { endpoint, vulnerabilities, requestsSent }
  }

  /**
   * Run a specific security test
   */
  private static async runTest(
    test: DASTTest,
    url: string,
    config: DASTConfiguration
  ): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    try {
      switch (test.id) {
        case 'sql-injection-test':
          vulnerabilities.push(...await this.testSQLInjection(url, config))
          break
        case 'xss-test':
          vulnerabilities.push(...await this.testXSS(url, config))
          break
        case 'csrf-test':
          vulnerabilities.push(...await this.testCSRF(url, config))
          break
        case 'security-headers-test':
          vulnerabilities.push(...await this.testSecurityHeaders(url, config))
          break
        case 'cors-test':
          vulnerabilities.push(...await this.testCORS(url, config))
          break
        case 'auth-bypass-test':
          vulnerabilities.push(...await this.testAuthBypass(url, config))
          break
        case 'authz-test':
          vulnerabilities.push(...await this.testAuthorization(url, config))
          break
        case 'sensitive-data-test':
          vulnerabilities.push(...await this.testSensitiveData(url, config))
          break
      }
    } catch (error) {
      logger.error(`Error running test ${test.id} on ${url}:`, error)
    }

    return vulnerabilities
  }

  /**
   * Test for SQL injection vulnerabilities
   */
  private static async testSQLInjection(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []
    const payloads = ["' OR '1'='1", "1' OR '1'='1' --", "' UNION SELECT NULL--"]

    for (const payload of payloads) {
      try {
        const testUrl = `${url}?id=${encodeURIComponent(payload)}`
        const response = await axios.get(testUrl, {
          timeout: config.requestTimeout,
          validateStatus: () => true
        })

        // Check for SQL error messages in response
        const sqlErrors = ['sql', 'mysql', 'sqlite', 'postgresql', 'syntax error']
        const responseText = JSON.stringify(response.data).toLowerCase()
        
        if (sqlErrors.some(error => responseText.includes(error))) {
          vulnerabilities.push({
            id: `sqli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            testId: 'sql-injection-test',
            severity: 'CRITICAL',
            category: DASTCategory.INJECTION,
            type: 'SQL Injection',
            title: 'Potential SQL Injection Vulnerability',
            description: 'The application may be vulnerable to SQL injection attacks',
            url,
            method: 'GET',
            parameter: 'id',
            payload,
            evidence: responseText.substring(0, 200),
            request: testUrl,
            response: JSON.stringify(response.data).substring(0, 500),
            recommendation: 'Use parameterized queries and input validation',
            cwe: 'CWE-89',
            owasp: 'A03:2021',
            cvss: 9.8,
            verified: false
          })
        }
      } catch (error) {
        // Request failed, continue testing
      }
    }

    return vulnerabilities
  }

  /**
   * Test for XSS vulnerabilities
   */
  private static async testXSS(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []
    const payloads = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>']

    for (const payload of payloads) {
      try {
        const testUrl = `${url}?search=${encodeURIComponent(payload)}`
        const response = await axios.get(testUrl, {
          timeout: config.requestTimeout,
          validateStatus: () => true
        })

        const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        
        if (responseText.includes(payload) || responseText.includes('<script>')) {
          vulnerabilities.push({
            id: `xss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            testId: 'xss-test',
            severity: 'HIGH',
            category: DASTCategory.XSS,
            type: 'Cross-Site Scripting',
            title: 'Potential XSS Vulnerability',
            description: 'The application may be vulnerable to XSS attacks',
            url,
            method: 'GET',
            parameter: 'search',
            payload,
            evidence: responseText.substring(0, 200),
            request: testUrl,
            response: responseText.substring(0, 500),
            recommendation: 'Sanitize user input and encode output',
            cwe: 'CWE-79',
            owasp: 'A03:2021',
            cvss: 7.3,
            verified: false
          })
        }
      } catch (error) {
        // Request failed, continue testing
      }
    }

    return vulnerabilities
  }

  /**
   * Test for CSRF protection
   */
  private static async testCSRF(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    try {
      // Test POST request without CSRF token
      const response = await axios.post(url, {}, {
        timeout: config.requestTimeout,
        validateStatus: () => true
      })

      // If request succeeds without CSRF token, it's vulnerable
      if (response.status >= 200 && response.status < 300) {
        vulnerabilities.push({
          id: `csrf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testId: 'csrf-test',
          severity: 'HIGH',
          category: DASTCategory.CSRF,
          type: 'CSRF',
          title: 'Missing CSRF Protection',
          description: 'The endpoint accepts requests without CSRF tokens',
          url,
          method: 'POST',
          evidence: `Request succeeded with status ${response.status}`,
          request: `POST ${url}`,
          response: JSON.stringify(response.data).substring(0, 500),
          recommendation: 'Implement CSRF token validation for state-changing operations',
          cwe: 'CWE-352',
          owasp: 'A01:2021',
          cvss: 6.5,
          verified: false
        })
      }
    } catch (error) {
      // Request failed, likely has CSRF protection
    }

    return vulnerabilities
  }

  /**
   * Test for security headers
   */
  private static async testSecurityHeaders(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    try {
      const response = await axios.get(url, {
        timeout: config.requestTimeout,
        validateStatus: () => true
      })

      const headers = response.headers
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'content-security-policy',
        'x-xss-protection'
      ]

      const missingHeaders = requiredHeaders.filter(header => !headers[header])

      if (missingHeaders.length > 0) {
        vulnerabilities.push({
          id: `headers_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testId: 'security-headers-test',
          severity: 'MEDIUM',
          category: DASTCategory.SECURITY_MISCONFIGURATION,
          type: 'Missing Security Headers',
          title: 'Missing Security Headers',
          description: `Missing security headers: ${missingHeaders.join(', ')}`,
          url,
          method: 'GET',
          evidence: `Missing headers: ${missingHeaders.join(', ')}`,
          request: `GET ${url}`,
          response: JSON.stringify(headers).substring(0, 500),
          recommendation: 'Implement all recommended security headers',
          cwe: 'CWE-16',
          owasp: 'A05:2021',
          cvss: 5.3,
          verified: true
        })
      }
    } catch (error) {
      logger.error('Error testing security headers:', error)
    }

    return vulnerabilities
  }

  /**
   * Test for CORS misconfiguration
   */
  private static async testCORS(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    try {
      const response = await axios.get(url, {
        headers: { 'Origin': 'https://evil.com' },
        timeout: config.requestTimeout,
        validateStatus: () => true
      })

      const corsHeader = response.headers['access-control-allow-origin']
      
      if (corsHeader === '*' || corsHeader === 'https://evil.com') {
        vulnerabilities.push({
          id: `cors_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testId: 'cors-test',
          severity: 'MEDIUM',
          category: DASTCategory.CORS,
          type: 'CORS Misconfiguration',
          title: 'Insecure CORS Configuration',
          description: 'CORS policy allows requests from any origin',
          url,
          method: 'GET',
          evidence: `Access-Control-Allow-Origin: ${corsHeader}`,
          request: `GET ${url} with Origin: https://evil.com`,
          response: JSON.stringify(response.headers).substring(0, 500),
          recommendation: 'Restrict CORS to trusted origins only',
          cwe: 'CWE-942',
          owasp: 'A05:2021',
          cvss: 5.3,
          verified: true
        })
      }
    } catch (error) {
      logger.error('Error testing CORS:', error)
    }

    return vulnerabilities
  }

  /**
   * Test for authentication bypass
   */
  private static async testAuthBypass(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    try {
      // Test access without authentication
      const response = await axios.get(url, {
        timeout: config.requestTimeout,
        validateStatus: () => true
      })

      // If protected endpoint returns 200 without auth, it's vulnerable
      if (response.status === 200 && url.includes('/api/')) {
        vulnerabilities.push({
          id: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testId: 'auth-bypass-test',
          severity: 'CRITICAL',
          category: DASTCategory.BROKEN_AUTHENTICATION,
          type: 'Authentication Bypass',
          title: 'Missing Authentication',
          description: 'Protected endpoint accessible without authentication',
          url,
          method: 'GET',
          evidence: `Endpoint returned ${response.status} without authentication`,
          request: `GET ${url}`,
          response: JSON.stringify(response.data).substring(0, 500),
          recommendation: 'Implement authentication middleware for protected endpoints',
          cwe: 'CWE-287',
          owasp: 'A07:2021',
          cvss: 9.1,
          verified: false
        })
      }
    } catch (error) {
      // Request failed, likely has authentication
    }

    return vulnerabilities
  }

  /**
   * Test for authorization issues
   */
  private static async testAuthorization(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    // This would require authenticated requests with different user roles
    // Simplified implementation for now

    return vulnerabilities
  }

  /**
   * Test for sensitive data exposure
   */
  private static async testSensitiveData(url: string, config: DASTConfiguration): Promise<DASTVulnerability[]> {
    const vulnerabilities: DASTVulnerability[] = []

    try {
      const response = await axios.get(url, {
        timeout: config.requestTimeout,
        validateStatus: () => true
      })

      const responseText = JSON.stringify(response.data).toLowerCase()
      const sensitivePatterns = ['password', 'secret', 'api_key', 'token', 'credit_card', 'ssn']

      const foundPatterns = sensitivePatterns.filter(pattern => responseText.includes(pattern))

      if (foundPatterns.length > 0) {
        vulnerabilities.push({
          id: `sensitive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testId: 'sensitive-data-test',
          severity: 'HIGH',
          category: DASTCategory.SENSITIVE_DATA_EXPOSURE,
          type: 'Sensitive Data Exposure',
          title: 'Potential Sensitive Data Exposure',
          description: `Response may contain sensitive data: ${foundPatterns.join(', ')}`,
          url,
          method: 'GET',
          evidence: `Found patterns: ${foundPatterns.join(', ')}`,
          request: `GET ${url}`,
          response: responseText.substring(0, 500),
          recommendation: 'Remove sensitive data from API responses',
          cwe: 'CWE-200',
          owasp: 'A02:2021',
          cvss: 7.5,
          verified: false
        })
      }
    } catch (error) {
      logger.error('Error testing sensitive data:', error)
    }

    return vulnerabilities
  }

  /**
   * Calculate scan summary
   */
  private static calculateSummary(
    vulnerabilities: DASTVulnerability[],
    endpoints: DASTEndpoint[],
    requestsSent: number
  ): DASTSummary {
    const criticalVulnerabilities = vulnerabilities.filter(v => v.severity === 'CRITICAL').length
    const highVulnerabilities = vulnerabilities.filter(v => v.severity === 'HIGH').length
    const mediumVulnerabilities = vulnerabilities.filter(v => v.severity === 'MEDIUM').length
    const lowVulnerabilities = vulnerabilities.filter(v => v.severity === 'LOW').length

    // Calculate security score
    const securityScore = Math.max(
      0,
      100 - (criticalVulnerabilities * 25 + highVulnerabilities * 15 + mediumVulnerabilities * 8 + lowVulnerabilities * 3)
    )

    // Calculate coverage score
    const testedEndpoints = endpoints.filter(e => e.tested).length
    const coverageScore = endpoints.length > 0 ? (testedEndpoints / endpoints.length) * 100 : 0

    return {
      totalVulnerabilities: vulnerabilities.length,
      criticalVulnerabilities,
      highVulnerabilities,
      mediumVulnerabilities,
      lowVulnerabilities,
      endpointsTested: testedEndpoints,
      requestsSent,
      securityScore,
      coverageScore
    }
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(summary: DASTSummary, vulnerabilities: DASTVulnerability[]): string[] {
    const recommendations: string[] = []

    if (summary.criticalVulnerabilities > 0) {
      recommendations.push(`Fix ${summary.criticalVulnerabilities} critical vulnerabilities immediately`)
    }

    if (summary.highVulnerabilities > 0) {
      recommendations.push(`Address ${summary.highVulnerabilities} high-severity vulnerabilities`)
    }

    if (summary.securityScore < 50) {
      recommendations.push('Security score is critically low - prioritize security fixes')
    }

    // Category-specific recommendations
    const categories = new Set(vulnerabilities.map(v => v.category))
    if (categories.has(DASTCategory.INJECTION)) {
      recommendations.push('Implement input validation and parameterized queries')
    }
    if (categories.has(DASTCategory.XSS)) {
      recommendations.push('Implement output encoding and Content Security Policy')
    }
    if (categories.has(DASTCategory.SECURITY_MISCONFIGURATION)) {
      recommendations.push('Configure all security headers properly')
    }

    recommendations.push('Integrate DAST scanning into CI/CD pipeline')
    recommendations.push('Conduct regular penetration testing')

    return recommendations
  }

  /**
   * Get default tests
   */
  static getDefaultTests(): DASTTest[] {
    return [...this.DEFAULT_TESTS]
  }
}
