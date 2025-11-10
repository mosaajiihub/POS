import { APISecurityService } from '../services/apiSecurityService'
import { logger } from './logger'
import { prisma } from '../config/database'

/**
 * Security Test Runner Utility
 * Automated security testing for API endpoints
 */

export interface EndpointTestConfig {
  endpoint: string
  methods: string[]
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  testTypes: string[]
  schedule: string // cron expression
  enabled: boolean
}

export interface TestSuite {
  name: string
  description: string
  endpoints: EndpointTestConfig[]
  schedule: string
  enabled: boolean
}

export class SecurityTestRunner {
  private static readonly DEFAULT_TEST_SUITES: TestSuite[] = [
    {
      name: 'Critical Endpoints',
      description: 'Security tests for critical authentication and authorization endpoints',
      schedule: '0 */6 * * *', // Every 6 hours
      enabled: true,
      endpoints: [
        {
          endpoint: '/api/auth/login',
          methods: ['POST'],
          priority: 'CRITICAL',
          testTypes: ['INJECTION', 'XSS', 'AUTHENTICATION', 'RATE_LIMITING'],
          schedule: '0 */2 * * *', // Every 2 hours
          enabled: true
        },
        {
          endpoint: '/api/auth/register',
          methods: ['POST'],
          priority: 'CRITICAL',
          testTypes: ['INJECTION', 'XSS', 'INPUT_VALIDATION'],
          schedule: '0 */4 * * *', // Every 4 hours
          enabled: true
        },
        {
          endpoint: '/api/users',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          priority: 'HIGH',
          testTypes: ['AUTHORIZATION', 'INJECTION', 'XSS'],
          schedule: '0 */8 * * *', // Every 8 hours
          enabled: true
        }
      ]
    },
    {
      name: 'Data Endpoints',
      description: 'Security tests for data manipulation endpoints',
      schedule: '0 0 * * *', // Daily
      enabled: true,
      endpoints: [
        {
          endpoint: '/api/products',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          priority: 'MEDIUM',
          testTypes: ['INJECTION', 'AUTHORIZATION', 'INPUT_VALIDATION'],
          schedule: '0 0 * * *', // Daily
          enabled: true
        },
        {
          endpoint: '/api/customers',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          priority: 'HIGH',
          testTypes: ['INJECTION', 'AUTHORIZATION', 'INPUT_VALIDATION'],
          schedule: '0 0 * * *', // Daily
          enabled: true
        },
        {
          endpoint: '/api/transactions',
          methods: ['GET', 'POST'],
          priority: 'CRITICAL',
          testTypes: ['INJECTION', 'AUTHORIZATION', 'INPUT_VALIDATION'],
          schedule: '0 */6 * * *', // Every 6 hours
          enabled: true
        }
      ]
    },
    {
      name: 'Administrative Endpoints',
      description: 'Security tests for administrative endpoints',
      schedule: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      endpoints: [
        {
          endpoint: '/api/roles',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          priority: 'CRITICAL',
          testTypes: ['AUTHORIZATION', 'INJECTION'],
          schedule: '0 */12 * * *', // Every 12 hours
          enabled: true
        },
        {
          endpoint: '/api/audit',
          methods: ['GET'],
          priority: 'HIGH',
          testTypes: ['AUTHORIZATION', 'INJECTION'],
          schedule: '0 0 * * *', // Daily
          enabled: true
        }
      ]
    }
  ]

  /**
   * Run security tests for all configured endpoints
   */
  static async runAllTests(): Promise<void> {
    try {
      logger.info('Starting automated security test run')
      
      const testSuites = await this.getTestSuites()
      let totalTests = 0
      let passedTests = 0
      let failedTests = 0

      for (const suite of testSuites) {
        if (!suite.enabled) {
          continue
        }

        logger.info(`Running test suite: ${suite.name}`)

        for (const endpointConfig of suite.endpoints) {
          if (!endpointConfig.enabled) {
            continue
          }

          for (const method of endpointConfig.methods) {
            try {
              const testResult = await APISecurityService.runSecurityTests(
                endpointConfig.endpoint,
                method
              )

              totalTests++
              if (testResult.passed) {
                passedTests++
              } else {
                failedTests++
                
                // Log critical vulnerabilities
                const criticalVulns = testResult.vulnerabilities.filter(
                  v => v.severity === 'CRITICAL' || v.severity === 'HIGH'
                )
                
                if (criticalVulns.length > 0) {
                  logger.error('Critical vulnerabilities found', {
                    endpoint: endpointConfig.endpoint,
                    method,
                    vulnerabilities: criticalVulns.length,
                    riskScore: testResult.riskScore
                  })
                }
              }

              // Store test result
              await this.storeTestResult(testResult, endpointConfig.priority)

            } catch (error) {
              logger.error(`Security test failed for ${endpointConfig.endpoint} ${method}:`, error)
              failedTests++
            }
          }
        }
      }

      logger.info('Automated security test run completed', {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) + '%' : '0%'
      })

      // Generate summary report
      await this.generateTestSummaryReport(totalTests, passedTests, failedTests)

    } catch (error) {
      logger.error('Automated security test run failed:', error)
    }
  }

  /**
   * Run security tests for specific endpoint
   */
  static async runEndpointTests(endpoint: string, methods: string[] = ['GET']): Promise<void> {
    try {
      logger.info(`Running security tests for endpoint: ${endpoint}`)

      for (const method of methods) {
        const testResult = await APISecurityService.runSecurityTests(endpoint, method)
        
        logger.info(`Security test completed for ${endpoint} ${method}`, {
          passed: testResult.passed,
          vulnerabilities: testResult.vulnerabilities.length,
          riskScore: testResult.riskScore
        })

        await this.storeTestResult(testResult, 'MEDIUM')
      }
    } catch (error) {
      logger.error(`Security test failed for endpoint ${endpoint}:`, error)
    }
  }

  /**
   * Run security tests for specific test suite
   */
  static async runTestSuite(suiteName: string): Promise<void> {
    try {
      const testSuites = await this.getTestSuites()
      const suite = testSuites.find(s => s.name === suiteName)

      if (!suite) {
        throw new Error(`Test suite '${suiteName}' not found`)
      }

      if (!suite.enabled) {
        logger.warn(`Test suite '${suiteName}' is disabled`)
        return
      }

      logger.info(`Running test suite: ${suite.name}`)

      for (const endpointConfig of suite.endpoints) {
        if (!endpointConfig.enabled) {
          continue
        }

        await this.runEndpointTests(endpointConfig.endpoint, endpointConfig.methods)
      }

      logger.info(`Test suite '${suiteName}' completed`)
    } catch (error) {
      logger.error(`Test suite '${suiteName}' failed:`, error)
    }
  }

  /**
   * Get configured test suites
   */
  private static async getTestSuites(): Promise<TestSuite[]> {
    // In a real implementation, load from database or configuration file
    // For now, return default test suites
    return this.DEFAULT_TEST_SUITES
  }

  /**
   * Store test result in database
   */
  private static async storeTestResult(
    testResult: any,
    priority: string
  ): Promise<void> {
    try {
      // In a real implementation, store in dedicated security_test_results table
      // For now, log to audit system
      logger.info('Security test result stored', {
        testId: testResult.testId,
        endpoint: testResult.endpoint,
        method: testResult.method,
        passed: testResult.passed,
        vulnerabilities: testResult.vulnerabilities.length,
        riskScore: testResult.riskScore,
        priority
      })
    } catch (error) {
      logger.error('Failed to store test result:', error)
    }
  }

  /**
   * Generate test summary report
   */
  private static async generateTestSummaryReport(
    totalTests: number,
    passedTests: number,
    failedTests: number
  ): Promise<void> {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTests,
          passedTests,
          failedTests,
          successRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) + '%' : '0%'
        },
        recommendations: this.generateRecommendations(failedTests, totalTests)
      }

      // In a real implementation, store report in database or send to administrators
      logger.info('Security test summary report generated', report)

      // Send alert if failure rate is high
      if (totalTests > 0 && (failedTests / totalTests) > 0.2) {
        logger.error('High security test failure rate detected', {
          failureRate: (failedTests / totalTests * 100).toFixed(2) + '%',
          failedTests,
          totalTests
        })
      }
    } catch (error) {
      logger.error('Failed to generate test summary report:', error)
    }
  }

  /**
   * Generate security recommendations based on test results
   */
  private static generateRecommendations(failedTests: number, totalTests: number): string[] {
    const recommendations: string[] = []

    if (failedTests === 0) {
      recommendations.push('All security tests passed. Continue regular testing schedule.')
    } else {
      const failureRate = failedTests / totalTests

      if (failureRate > 0.5) {
        recommendations.push('CRITICAL: High failure rate detected. Immediate security review required.')
        recommendations.push('Review and update input validation mechanisms.')
        recommendations.push('Audit authentication and authorization controls.')
      } else if (failureRate > 0.2) {
        recommendations.push('WARNING: Moderate failure rate detected. Security improvements needed.')
        recommendations.push('Review failed test results and prioritize fixes.')
      } else {
        recommendations.push('Some security tests failed. Review and address identified vulnerabilities.')
      }

      recommendations.push('Implement automated vulnerability remediation where possible.')
      recommendations.push('Schedule additional security testing for failed endpoints.')
      recommendations.push('Consider penetration testing for critical vulnerabilities.')
    }

    return recommendations
  }

  /**
   * Schedule automated security tests
   */
  static async scheduleTests(): Promise<void> {
    try {
      // In a real implementation, use a job scheduler like node-cron or Bull
      logger.info('Security test scheduling initialized')
      
      // Example: Schedule daily comprehensive tests
      // cron.schedule('0 2 * * *', () => {
      //   this.runAllTests()
      // })

      // Example: Schedule hourly critical endpoint tests
      // cron.schedule('0 * * * *', () => {
      //   this.runTestSuite('Critical Endpoints')
      // })

    } catch (error) {
      logger.error('Failed to schedule security tests:', error)
    }
  }

  /**
   * Get test results summary
   */
  static async getTestResultsSummary(days: number = 7): Promise<any> {
    try {
      // In a real implementation, query test results from database
      const summary = {
        period: `${days} days`,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 0,
        lowVulnerabilities: 0,
        topVulnerableEndpoints: [],
        testTrends: []
      }

      return summary
    } catch (error) {
      logger.error('Failed to get test results summary:', error)
      return null
    }
  }
}

export default SecurityTestRunner