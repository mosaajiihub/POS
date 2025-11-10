import { Request, Response } from 'express'
import { APISecurityService } from '../services/apiSecurityService'
import { logger } from '../utils/logger'

/**
 * API Security Controller
 * Handles API security monitoring, testing, and management endpoints
 */
export class APISecurityController {
  /**
   * Get API security logs with filtering and pagination
   */
  static async getAPISecurityLogs(req: Request, res: Response) {
    try {
      const {
        method,
        endpoint,
        version,
        userId,
        ipAddress,
        minRiskScore,
        maxRiskScore,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query

      // Build filters
      const filters: any = {}
      
      if (method) filters.method = method
      if (endpoint) filters.endpoint = { contains: endpoint }
      if (version) filters.version = version
      if (userId) filters.userId = userId
      if (ipAddress) filters.ipAddress = ipAddress
      
      if (minRiskScore || maxRiskScore) {
        filters.riskScore = {}
        if (minRiskScore) filters.riskScore.gte = parseInt(minRiskScore as string)
        if (maxRiskScore) filters.riskScore.lte = parseInt(maxRiskScore as string)
      }

      if (startDate || endDate) {
        filters.timestamp = {}
        if (startDate) filters.timestamp.gte = new Date(startDate as string)
        if (endDate) filters.timestamp.lte = new Date(endDate as string)
      }

      // In a real implementation, query the API security logs from database
      const logs: any[] = []
      const total = 0

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      })
    } catch (error) {
      logger.error('Get API security logs error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving API security logs'
        }
      })
    }
  }

  /**
   * Get API security metrics and analytics
   */
  static async getAPISecurityMetrics(req: Request, res: Response) {
    try {
      const { days = 7 } = req.query
      const daysNumber = parseInt(days as string)

      // In a real implementation, calculate metrics from API security logs
      const metrics = {
        totalRequests: 0,
        highRiskRequests: 0,
        averageRiskScore: 0,
        topEndpoints: [],
        topUserAgents: [],
        topIPs: [],
        requestsByMethod: {},
        requestsByStatus: {},
        anomaliesDetected: 0,
        securityTestsRun: 0,
        vulnerabilitiesFound: 0,
        timeSeriesData: []
      }

      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      logger.error('Get API security metrics error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving API security metrics'
        }
      })
    }
  }

  /**
   * Run security tests on specific endpoint
   */
  static async runSecurityTest(req: Request, res: Response) {
    try {
      const { endpoint, method = 'GET' } = req.body

      if (!endpoint) {
        return res.status(400).json({
          error: {
            code: 'MISSING_ENDPOINT',
            message: 'Endpoint is required for security testing'
          }
        })
      }

      const testResult = await APISecurityService.runSecurityTests(endpoint, method)

      res.json({
        success: true,
        data: testResult
      })
    } catch (error) {
      logger.error('Run security test error:', error)
      res.status(500).json({
        error: {
          code: 'SECURITY_TEST_ERROR',
          message: 'An error occurred while running security tests'
        }
      })
    }
  }

  /**
   * Get security test results
   */
  static async getSecurityTestResults(req: Request, res: Response) {
    try {
      const {
        endpoint,
        method,
        testType,
        passed,
        minRiskScore,
        maxRiskScore,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query

      // Build filters for security test results
      const filters: any = {}
      
      if (endpoint) filters.endpoint = { contains: endpoint }
      if (method) filters.method = method
      if (testType) filters.testType = testType
      if (passed !== undefined) filters.passed = passed === 'true'
      
      if (minRiskScore || maxRiskScore) {
        filters.riskScore = {}
        if (minRiskScore) filters.riskScore.gte = parseInt(minRiskScore as string)
        if (maxRiskScore) filters.riskScore.lte = parseInt(maxRiskScore as string)
      }

      if (startDate || endDate) {
        filters.timestamp = {}
        if (startDate) filters.timestamp.gte = new Date(startDate as string)
        if (endDate) filters.timestamp.lte = new Date(endDate as string)
      }

      // In a real implementation, query security test results from database
      const testResults: any[] = []
      const total = 0

      res.json({
        success: true,
        data: {
          testResults,
          pagination: {
            total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      })
    } catch (error) {
      logger.error('Get security test results error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security test results'
        }
      })
    }
  }

  /**
   * Generate request signature for API clients
   */
  static async generateRequestSignature(req: Request, res: Response) {
    try {
      const { method, path, body, timestamp, nonce } = req.body

      if (!method || !path) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Method and path are required for signature generation'
          }
        })
      }

      const signatureTimestamp = timestamp || Date.now()
      const signatureNonce = nonce || Math.random().toString(36).substr(2, 16)

      const signature = APISecurityService.generateRequestSignature(
        method,
        path,
        body,
        signatureTimestamp,
        signatureNonce
      )

      res.json({
        success: true,
        data: {
          signature,
          timestamp: signatureTimestamp,
          nonce: signatureNonce,
          algorithm: 'HMAC-SHA256',
          headers: {
            'X-Signature': signature,
            'X-Timestamp': signatureTimestamp.toString(),
            'X-Nonce': signatureNonce
          }
        }
      })
    } catch (error) {
      logger.error('Generate request signature error:', error)
      res.status(500).json({
        error: {
          code: 'SIGNATURE_GENERATION_ERROR',
          message: 'An error occurred while generating request signature'
        }
      })
    }
  }

  /**
   * Verify request signature
   */
  static async verifyRequestSignature(req: Request, res: Response) {
    try {
      const isValid = await APISecurityService.verifyRequestSignature(req)

      res.json({
        success: true,
        data: {
          valid: isValid,
          signature: req.headers['x-signature'],
          timestamp: req.headers['x-timestamp'],
          nonce: req.headers['x-nonce']
        }
      })
    } catch (error) {
      logger.error('Verify request signature error:', error)
      res.status(500).json({
        error: {
          code: 'SIGNATURE_VERIFICATION_ERROR',
          message: 'An error occurred while verifying request signature'
        }
      })
    }
  }

  /**
   * Get API version information and security controls
   */
  static async getAPIVersionInfo(req: Request, res: Response) {
    try {
      // In a real implementation, get version configs from APISecurityService
      const versions = [
        {
          version: 'v1',
          deprecated: true,
          deprecationDate: '2024-01-01T00:00:00Z',
          endOfLifeDate: '2024-12-31T23:59:59Z',
          securityLevel: 'AUTHENTICATED',
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          rateLimits: { default: 100, authenticated: 1000 },
          requiredPermissions: []
        },
        {
          version: 'v2',
          deprecated: false,
          securityLevel: 'AUTHORIZED',
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          rateLimits: { default: 200, authenticated: 2000 },
          requiredPermissions: []
        }
      ]

      res.json({
        success: true,
        data: {
          supportedVersions: versions,
          currentVersion: 'v2',
          defaultVersion: 'v2'
        }
      })
    } catch (error) {
      logger.error('Get API version info error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving API version information'
        }
      })
    }
  }

  /**
   * Get API endpoint security status
   */
  static async getEndpointSecurityStatus(req: Request, res: Response) {
    try {
      const { endpoint } = req.params

      if (!endpoint) {
        return res.status(400).json({
          error: {
            code: 'MISSING_ENDPOINT',
            message: 'Endpoint parameter is required'
          }
        })
      }

      // In a real implementation, get security status from database
      const securityStatus = {
        endpoint: decodeURIComponent(endpoint),
        lastTested: null,
        securityScore: 85,
        vulnerabilities: [],
        recommendations: [],
        riskLevel: 'LOW',
        authenticationRequired: true,
        rateLimitEnabled: true,
        inputValidationEnabled: true,
        outputEncodingEnabled: true,
        testHistory: []
      }

      res.json({
        success: true,
        data: securityStatus
      })
    } catch (error) {
      logger.error('Get endpoint security status error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving endpoint security status'
        }
      })
    }
  }

  /**
   * Export API security logs
   */
  static async exportSecurityLogs(req: Request, res: Response) {
    try {
      const {
        format = 'json',
        startDate,
        endDate,
        endpoint,
        method,
        minRiskScore
      } = req.query

      // Build filters
      const filters: any = {}
      if (startDate) filters.startDate = new Date(startDate as string)
      if (endDate) filters.endDate = new Date(endDate as string)
      if (endpoint) filters.endpoint = endpoint
      if (method) filters.method = method
      if (minRiskScore) filters.minRiskScore = parseInt(minRiskScore as string)

      // In a real implementation, export logs from database
      const exportData = {
        exportDate: new Date().toISOString(),
        filters,
        totalRecords: 0,
        logs: []
      }

      const filename = `api-security-logs-${new Date().toISOString().split('T')[0]}`

      switch (format) {
        case 'csv':
          res.setHeader('Content-Type', 'text/csv')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
          res.send('') // In real implementation, convert to CSV
          break
        case 'json':
        default:
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
          res.json(exportData)
          break
      }
    } catch (error) {
      logger.error('Export security logs error:', error)
      res.status(500).json({
        error: {
          code: 'EXPORT_ERROR',
          message: 'An error occurred while exporting security logs'
        }
      })
    }
  }

  /**
   * Get API security dashboard data
   */
  static async getSecurityDashboard(req: Request, res: Response) {
    try {
      const { timeRange = '24h' } = req.query

      // In a real implementation, aggregate data from various sources
      const dashboardData = {
        summary: {
          totalRequests: 0,
          securityIncidents: 0,
          averageRiskScore: 0,
          vulnerabilitiesFound: 0
        },
        charts: {
          requestsOverTime: [],
          riskScoreDistribution: [],
          topEndpoints: [],
          threatsByType: []
        },
        alerts: [],
        recentTests: [],
        systemHealth: {
          apiSecurityService: 'healthy',
          signatureVerification: 'healthy',
          rateLimiting: 'healthy',
          inputValidation: 'healthy'
        }
      }

      res.json({
        success: true,
        data: dashboardData
      })
    } catch (error) {
      logger.error('Get security dashboard error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security dashboard data'
        }
      })
    }
  }

  /**
   * Update API security configuration
   */
  static async updateSecurityConfig(req: Request, res: Response) {
    try {
      const {
        enableSignatureVerification,
        enableVersionValidation,
        enableSecurityTesting,
        rateLimitConfig,
        securityTestConfig
      } = req.body

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      // In a real implementation, update configuration in database
      const updatedConfig = {
        enableSignatureVerification: enableSignatureVerification ?? true,
        enableVersionValidation: enableVersionValidation ?? true,
        enableSecurityTesting: enableSecurityTesting ?? false,
        rateLimitConfig: rateLimitConfig || {
          windowMs: 15 * 60 * 1000,
          maxRequests: 100
        },
        securityTestConfig: securityTestConfig || {
          testInterval: 24 * 60 * 60 * 1000,
          testOnFirstRequest: false
        },
        updatedBy: req.user.userId,
        updatedAt: new Date()
      }

      res.json({
        success: true,
        message: 'API security configuration updated successfully',
        data: updatedConfig
      })
    } catch (error) {
      logger.error('Update security config error:', error)
      res.status(500).json({
        error: {
          code: 'CONFIG_UPDATE_ERROR',
          message: 'An error occurred while updating security configuration'
        }
      })
    }
  }
}