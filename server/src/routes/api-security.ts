import express from 'express'
import { APISecurityController } from '../controllers/apiSecurityController'
import { requireAuth, requireAdmin, requireManager } from '../middleware/auth'
import { auditSecurity } from '../middleware/auditMiddleware'
import { validateRequest, commonSchemas } from '../middleware/inputValidation'
import { z } from 'zod'

const router = express.Router()

// Validation schemas
const securityTestSchema = z.object({
  body: z.object({
    endpoint: z.string().min(1, 'Endpoint is required'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET')
  })
})

const signatureGenerationSchema = z.object({
  body: z.object({
    method: z.string().min(1, 'Method is required'),
    path: z.string().min(1, 'Path is required'),
    body: z.any().optional(),
    timestamp: z.number().optional(),
    nonce: z.string().optional()
  })
})

const securityConfigSchema = z.object({
  body: z.object({
    enableSignatureVerification: z.boolean().optional(),
    enableVersionValidation: z.boolean().optional(),
    enableSecurityTesting: z.boolean().optional(),
    rateLimitConfig: z.object({
      windowMs: z.number().positive().optional(),
      maxRequests: z.number().positive().optional()
    }).optional(),
    securityTestConfig: z.object({
      testInterval: z.number().positive().optional(),
      testOnFirstRequest: z.boolean().optional()
    }).optional()
  })
})

/**
 * @route GET /api/api-security/logs
 * @desc Get API security logs with filtering and pagination
 * @access Manager, Admin
 */
router.get('/logs', 
  requireManager,
  validateRequest({
    schema: z.object({
      query: z.object({
        method: z.string().optional(),
        endpoint: z.string().optional(),
        version: z.string().optional(),
        userId: z.string().optional(),
        ipAddress: z.string().optional(),
        minRiskScore: z.string().optional(),
        maxRiskScore: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional()
      }).optional()
    })
  }),
  APISecurityController.getAPISecurityLogs
)

/**
 * @route GET /api/api-security/metrics
 * @desc Get API security metrics and analytics
 * @access Manager, Admin
 */
router.get('/metrics', 
  requireManager,
  validateRequest({
    schema: z.object({
      query: z.object({
        days: z.string().optional()
      }).optional()
    })
  }),
  APISecurityController.getAPISecurityMetrics
)

/**
 * @route POST /api/api-security/test
 * @desc Run security tests on specific endpoint
 * @access Admin only
 */
router.post('/test', 
  requireAdmin,
  validateRequest({ schema: securityTestSchema }),
  auditSecurity('SECURITY_TEST_RUN', 'api_security'),
  APISecurityController.runSecurityTest
)

/**
 * @route GET /api/api-security/test-results
 * @desc Get security test results
 * @access Manager, Admin
 */
router.get('/test-results', 
  requireManager,
  validateRequest({
    schema: z.object({
      query: z.object({
        endpoint: z.string().optional(),
        method: z.string().optional(),
        testType: z.string().optional(),
        passed: z.string().optional(),
        minRiskScore: z.string().optional(),
        maxRiskScore: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional()
      }).optional()
    })
  }),
  APISecurityController.getSecurityTestResults
)

/**
 * @route POST /api/api-security/signature/generate
 * @desc Generate request signature for API clients
 * @access Authenticated users
 */
router.post('/signature/generate', 
  requireAuth,
  validateRequest({ schema: signatureGenerationSchema }),
  APISecurityController.generateRequestSignature
)

/**
 * @route POST /api/api-security/signature/verify
 * @desc Verify request signature
 * @access Authenticated users
 */
router.post('/signature/verify', 
  requireAuth,
  APISecurityController.verifyRequestSignature
)

/**
 * @route GET /api/api-security/versions
 * @desc Get API version information and security controls
 * @access Authenticated users
 */
router.get('/versions', 
  requireAuth,
  APISecurityController.getAPIVersionInfo
)

/**
 * @route GET /api/api-security/endpoint/:endpoint/status
 * @desc Get API endpoint security status
 * @access Manager, Admin
 */
router.get('/endpoint/:endpoint/status', 
  requireManager,
  APISecurityController.getEndpointSecurityStatus
)

/**
 * @route GET /api/api-security/export
 * @desc Export API security logs
 * @access Admin only
 */
router.get('/export', 
  requireAdmin,
  validateRequest({
    schema: z.object({
      query: z.object({
        format: z.enum(['json', 'csv']).optional().default('json'),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        endpoint: z.string().optional(),
        method: z.string().optional(),
        minRiskScore: z.string().optional()
      }).optional()
    })
  }),
  auditSecurity('SECURITY_LOGS_EXPORT', 'api_security'),
  APISecurityController.exportSecurityLogs
)

/**
 * @route GET /api/api-security/dashboard
 * @desc Get API security dashboard data
 * @access Manager, Admin
 */
router.get('/dashboard', 
  requireManager,
  validateRequest({
    schema: z.object({
      query: z.object({
        timeRange: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h')
      }).optional()
    })
  }),
  APISecurityController.getSecurityDashboard
)

/**
 * @route PUT /api/api-security/config
 * @desc Update API security configuration
 * @access Admin only
 */
router.put('/config', 
  requireAdmin,
  validateRequest({ schema: securityConfigSchema }),
  auditSecurity('SECURITY_CONFIG_UPDATE', 'api_security'),
  APISecurityController.updateSecurityConfig
)

export default router