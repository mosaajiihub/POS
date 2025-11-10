import { Response } from 'express'
import { logger } from './logger'

export interface SecurityHeadersValidationResult {
  isValid: boolean
  missingHeaders: string[]
  warnings: string[]
  recommendations: string[]
}

export interface SecurityHeadersCheck {
  header: string
  required: boolean
  expectedValues?: string[]
  description: string
}

// Define security headers to check
const SECURITY_HEADERS_CHECKLIST: SecurityHeadersCheck[] = [
  {
    header: 'Content-Security-Policy',
    required: true,
    description: 'Prevents XSS attacks by controlling resource loading'
  },
  {
    header: 'Content-Security-Policy-Report-Only',
    required: false,
    description: 'CSP in report-only mode for testing'
  },
  {
    header: 'X-Frame-Options',
    required: true,
    expectedValues: ['DENY', 'SAMEORIGIN'],
    description: 'Prevents clickjacking attacks'
  },
  {
    header: 'X-Content-Type-Options',
    required: true,
    expectedValues: ['nosniff'],
    description: 'Prevents MIME type sniffing'
  },
  {
    header: 'Referrer-Policy',
    required: true,
    expectedValues: [
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url'
    ],
    description: 'Controls referrer information sent with requests'
  },
  {
    header: 'Strict-Transport-Security',
    required: false, // Only required for HTTPS
    description: 'Enforces HTTPS connections'
  },
  {
    header: 'X-XSS-Protection',
    required: true,
    expectedValues: ['1; mode=block', '0'],
    description: 'Enables XSS filtering in browsers'
  },
  {
    header: 'X-Permitted-Cross-Domain-Policies',
    required: true,
    expectedValues: ['none', 'master-only', 'by-content-type', 'all'],
    description: 'Controls cross-domain policy files'
  },
  {
    header: 'Cross-Origin-Embedder-Policy',
    required: true,
    expectedValues: ['unsafe-none', 'require-corp'],
    description: 'Controls cross-origin resource embedding'
  },
  {
    header: 'Cross-Origin-Opener-Policy',
    required: true,
    expectedValues: ['unsafe-none', 'same-origin-allow-popups', 'same-origin'],
    description: 'Controls cross-origin window interactions'
  },
  {
    header: 'Cross-Origin-Resource-Policy',
    required: true,
    expectedValues: ['same-site', 'same-origin', 'cross-origin'],
    description: 'Controls cross-origin resource sharing'
  },
  {
    header: 'Feature-Policy',
    required: false, // Deprecated but still useful
    description: 'Controls browser feature access (deprecated)'
  },
  {
    header: 'Permissions-Policy',
    required: true,
    description: 'Controls browser feature access (modern)'
  },
  {
    header: 'Report-To',
    required: false,
    description: 'Defines endpoints for security reports'
  }
]

/**
 * Validate security headers on a response
 */
export function validateSecurityHeaders(headers: Record<string, string | string[]>): SecurityHeadersValidationResult {
  const result: SecurityHeadersValidationResult = {
    isValid: true,
    missingHeaders: [],
    warnings: [],
    recommendations: []
  }

  // Normalize headers to lowercase for case-insensitive comparison
  const normalizedHeaders: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value
  }

  // Check each security header
  for (const check of SECURITY_HEADERS_CHECKLIST) {
    const headerName = check.header.toLowerCase()
    const headerValue = normalizedHeaders[headerName]

    if (!headerValue) {
      if (check.required) {
        result.missingHeaders.push(check.header)
        result.isValid = false
      } else {
        result.warnings.push(`Optional header '${check.header}' is missing: ${check.description}`)
      }
      continue
    }

    // Validate header values if expected values are defined
    if (check.expectedValues && typeof headerValue === 'string') {
      const isValidValue = check.expectedValues.some(expectedValue => 
        headerValue.toLowerCase().includes(expectedValue.toLowerCase())
      )
      
      if (!isValidValue) {
        result.warnings.push(
          `Header '${check.header}' has unexpected value '${headerValue}'. Expected one of: ${check.expectedValues.join(', ')}`
        )
      }
    }
  }

  // Additional CSP validation
  const csp = normalizedHeaders['content-security-policy'] || normalizedHeaders['content-security-policy-report-only']
  if (csp && typeof csp === 'string') {
    validateCSPDirectives(csp, result)
  }

  // HSTS validation for HTTPS
  const hsts = normalizedHeaders['strict-transport-security']
  if (hsts && typeof hsts === 'string') {
    validateHSTSDirectives(hsts, result)
  }

  // Generate recommendations
  generateSecurityRecommendations(normalizedHeaders, result)

  return result
}

/**
 * Validate CSP directives
 */
function validateCSPDirectives(csp: string, result: SecurityHeadersValidationResult): void {
  const requiredDirectives = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'object-src',
    'frame-ancestors'
  ]

  const dangerousValues = [
    "'unsafe-eval'",
    "'unsafe-inline'",
    'data:',
    '*'
  ]

  // Check for required directives
  for (const directive of requiredDirectives) {
    if (!csp.includes(directive)) {
      result.warnings.push(`CSP missing recommended directive: ${directive}`)
    }
  }

  // Check for dangerous values
  for (const dangerousValue of dangerousValues) {
    if (csp.includes(dangerousValue)) {
      if (dangerousValue === "'unsafe-inline'" || dangerousValue === "'unsafe-eval'") {
        result.warnings.push(`CSP contains potentially dangerous value: ${dangerousValue}. Consider using nonces or hashes instead.`)
      } else if (dangerousValue === '*') {
        result.warnings.push(`CSP contains wildcard (*) which may be too permissive`)
      }
    }
  }

  // Check for report-uri or report-to
  if (!csp.includes('report-uri') && !csp.includes('report-to')) {
    result.recommendations.push('Consider adding CSP reporting with report-uri or report-to directive')
  }
}

/**
 * Validate HSTS directives
 */
function validateHSTSDirectives(hsts: string, result: SecurityHeadersValidationResult): void {
  // Extract max-age value
  const maxAgeMatch = hsts.match(/max-age=(\d+)/)
  if (maxAgeMatch) {
    const maxAge = parseInt(maxAgeMatch[1])
    const oneYear = 31536000 // seconds in a year
    
    if (maxAge < oneYear) {
      result.recommendations.push(`HSTS max-age is ${maxAge} seconds. Consider using at least 1 year (31536000 seconds) for better security`)
    }
  }

  // Check for includeSubDomains
  if (!hsts.includes('includeSubDomains')) {
    result.recommendations.push('Consider adding includeSubDomains to HSTS header for comprehensive protection')
  }

  // Check for preload
  if (!hsts.includes('preload')) {
    result.recommendations.push('Consider adding preload to HSTS header and submitting to HSTS preload list')
  }
}

/**
 * Generate security recommendations
 */
function generateSecurityRecommendations(headers: Record<string, string | string[]>, result: SecurityHeadersValidationResult): void {
  // Check for both Feature-Policy and Permissions-Policy
  const hasFeaturePolicy = headers['feature-policy']
  const hasPermissionsPolicy = headers['permissions-policy']
  
  if (hasFeaturePolicy && !hasPermissionsPolicy) {
    result.recommendations.push('Feature-Policy is deprecated. Consider migrating to Permissions-Policy')
  }

  // Check for CSP nonce usage
  const csp = headers['content-security-policy'] || headers['content-security-policy-report-only']
  if (csp && typeof csp === 'string' && csp.includes("'unsafe-inline'") && !csp.includes("'nonce-")) {
    result.recommendations.push('Consider using CSP nonces instead of unsafe-inline for better security')
  }

  // Check for report-to header
  if (!headers['report-to']) {
    result.recommendations.push('Consider adding Report-To header for centralized security reporting')
  }
}

/**
 * Log security headers validation results
 */
export function logSecurityHeadersValidation(url: string, result: SecurityHeadersValidationResult): void {
  if (!result.isValid) {
    logger.warn('Security headers validation failed', {
      url,
      missingHeaders: result.missingHeaders,
      warnings: result.warnings
    })
  }

  if (result.warnings.length > 0) {
    logger.info('Security headers warnings', {
      url,
      warnings: result.warnings
    })
  }

  if (result.recommendations.length > 0) {
    logger.info('Security headers recommendations', {
      url,
      recommendations: result.recommendations
    })
  }
}

/**
 * Express middleware to validate security headers
 */
export function securityHeadersValidationMiddleware() {
  return (req: any, res: Response, next: any) => {
    const originalSend = res.send

    res.send = function(data) {
      // Validate headers before sending response
      const result = validateSecurityHeaders(res.getHeaders())
      
      if (process.env.NODE_ENV === 'development') {
        logSecurityHeadersValidation(req.url, result)
      }

      return originalSend.call(this, data)
    }

    next()
  }
}

export default {
  validateSecurityHeaders,
  logSecurityHeadersValidation,
  securityHeadersValidationMiddleware
}