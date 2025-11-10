import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { logger } from '../utils/logger'

// CSP Directive Types
export interface CSPDirectives {
  'default-src'?: string[]
  'script-src'?: string[]
  'style-src'?: string[]
  'img-src'?: string[]
  'font-src'?: string[]
  'connect-src'?: string[]
  'media-src'?: string[]
  'object-src'?: string[]
  'child-src'?: string[]
  'frame-src'?: string[]
  'worker-src'?: string[]
  'frame-ancestors'?: string[]
  'form-action'?: string[]
  'base-uri'?: string[]
  'manifest-src'?: string[]
  'report-uri'?: string[]
  'report-to'?: string[]
}

// Security Headers Configuration
export interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    enabled: boolean
    directives: CSPDirectives
    reportOnly: boolean
    useNonces: boolean
  }
  frameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  contentTypeOptions: boolean
  referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
  featurePolicy: Record<string, string[]>
  strictTransportSecurity: {
    enabled: boolean
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
  crossOriginEmbedderPolicy: 'unsafe-none' | 'require-corp'
  crossOriginOpenerPolicy: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'
  crossOriginResourcePolicy: 'same-site' | 'same-origin' | 'cross-origin'
}

// Default Security Configuration
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    enabled: true,
    reportOnly: false,
    useNonces: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Will be replaced with nonces in production
        'https://js.stripe.com',
        'https://checkout.stripe.com',
        'https://maps.googleapis.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Will be replaced with nonces in production
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'https://maps.gstatic.com',
        'https://maps.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com'
      ],
      'connect-src': [
        "'self'",
        'https://api.stripe.com',
        'https://maps.googleapis.com',
        'wss://localhost:*',
        'ws://localhost:*'
      ],
      'media-src': ["'self'", 'data:', 'blob:'],
      'object-src': ["'none'"],
      'child-src': ["'self'"],
      'frame-src': [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com'
      ],
      'worker-src': ["'self'", 'blob:'],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"],
      'report-uri': ['/api/security/csp-report'],
      'report-to': ['csp-endpoint']
    }
  },
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  featurePolicy: {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'self'"],
    payment: ["'self'"],
    usb: ["'none'"],
    magnetometer: ["'none'"],
    gyroscope: ["'none'"],
    accelerometer: ["'none'"],
    ambient-light-sensor: ["'none'"],
    autoplay: ["'none'"],
    encrypted-media: ["'none'"],
    fullscreen: ["'self'"],
    picture-in-picture: ["'none'"]
  },
  strictTransportSecurity: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginOpenerPolicy: 'same-origin-allow-popups',
  crossOriginResourcePolicy: 'same-site'
}

// CSP Violation Report Interface
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string
    referrer: string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    disposition: string
    'blocked-uri': string
    'line-number': number
    'column-number': number
    'source-file': string
    'status-code': number
    'script-sample': string
  }
}

// Nonce storage for request lifecycle
declare global {
  namespace Express {
    interface Request {
      nonce?: string
    }
  }
}

/**
 * Generate cryptographically secure nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Build CSP header value from directives
 */
function buildCSPHeader(directives: CSPDirectives, nonce?: string): string {
  const policies: string[] = []

  for (const [directive, sources] of Object.entries(directives)) {
    if (sources && sources.length > 0) {
      let directiveSources = [...sources]
      
      // Replace 'unsafe-inline' with nonce for script-src and style-src in production
      if (nonce && (directive === 'script-src' || directive === 'style-src')) {
        const unsafeInlineIndex = directiveSources.indexOf("'unsafe-inline'")
        if (unsafeInlineIndex !== -1 && process.env.NODE_ENV === 'production') {
          directiveSources.splice(unsafeInlineIndex, 1)
          directiveSources.push(`'nonce-${nonce}'`)
        }
      }
      
      policies.push(`${directive} ${directiveSources.join(' ')}`)
    }
  }

  return policies.join('; ')
}

/**
 * Build Feature Policy header value
 */
function buildFeaturePolicyHeader(policies: Record<string, string[]>): string {
  const policyStrings: string[] = []

  for (const [feature, allowlist] of Object.entries(policies)) {
    if (allowlist.length === 0) {
      policyStrings.push(`${feature} 'none'`)
    } else {
      policyStrings.push(`${feature} ${allowlist.join(' ')}`)
    }
  }

  return policyStrings.join(', ')
}

/**
 * Security Headers Middleware
 */
export function securityHeaders(config: Partial<SecurityHeadersConfig> = {}) {
  const finalConfig: SecurityHeadersConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    contentSecurityPolicy: {
      ...DEFAULT_CONFIG.contentSecurityPolicy,
      ...config.contentSecurityPolicy,
      directives: {
        ...DEFAULT_CONFIG.contentSecurityPolicy.directives,
        ...config.contentSecurityPolicy?.directives
      }
    },
    featurePolicy: {
      ...DEFAULT_CONFIG.featurePolicy,
      ...config.featurePolicy
    },
    strictTransportSecurity: {
      ...DEFAULT_CONFIG.strictTransportSecurity,
      ...config.strictTransportSecurity
    }
  }

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate nonce for this request if enabled
      let nonce: string | undefined
      if (finalConfig.contentSecurityPolicy.useNonces) {
        nonce = generateNonce()
        req.nonce = nonce
      }

      // Content Security Policy
      if (finalConfig.contentSecurityPolicy.enabled) {
        const cspHeader = buildCSPHeader(finalConfig.contentSecurityPolicy.directives, nonce)
        const headerName = finalConfig.contentSecurityPolicy.reportOnly 
          ? 'Content-Security-Policy-Report-Only' 
          : 'Content-Security-Policy'
        res.setHeader(headerName, cspHeader)
      }

      // X-Frame-Options
      res.setHeader('X-Frame-Options', finalConfig.frameOptions)

      // X-Content-Type-Options
      if (finalConfig.contentTypeOptions) {
        res.setHeader('X-Content-Type-Options', 'nosniff')
      }

      // Referrer-Policy
      res.setHeader('Referrer-Policy', finalConfig.referrerPolicy)

      // Feature-Policy (deprecated but still supported)
      const featurePolicyHeader = buildFeaturePolicyHeader(finalConfig.featurePolicy)
      if (featurePolicyHeader) {
        res.setHeader('Feature-Policy', featurePolicyHeader)
      }

      // Permissions-Policy (modern replacement for Feature-Policy)
      const permissionsPolicyParts: string[] = []
      for (const [feature, allowlist] of Object.entries(finalConfig.featurePolicy)) {
        if (allowlist.length === 0 || allowlist.includes("'none'")) {
          permissionsPolicyParts.push(`${feature}=()`)
        } else {
          const formattedAllowlist = allowlist
            .map(origin => origin === "'self'" ? 'self' : origin.replace(/'/g, ''))
            .join(' ')
          permissionsPolicyParts.push(`${feature}=(${formattedAllowlist})`)
        }
      }
      if (permissionsPolicyParts.length > 0) {
        res.setHeader('Permissions-Policy', permissionsPolicyParts.join(', '))
      }

      // Strict-Transport-Security (HSTS)
      if (finalConfig.strictTransportSecurity.enabled && req.secure) {
        let hstsValue = `max-age=${finalConfig.strictTransportSecurity.maxAge}`
        if (finalConfig.strictTransportSecurity.includeSubDomains) {
          hstsValue += '; includeSubDomains'
        }
        if (finalConfig.strictTransportSecurity.preload) {
          hstsValue += '; preload'
        }
        res.setHeader('Strict-Transport-Security', hstsValue)
      }

      // Cross-Origin-Embedder-Policy
      res.setHeader('Cross-Origin-Embedder-Policy', finalConfig.crossOriginEmbedderPolicy)

      // Cross-Origin-Opener-Policy
      res.setHeader('Cross-Origin-Opener-Policy', finalConfig.crossOriginOpenerPolicy)

      // Cross-Origin-Resource-Policy
      res.setHeader('Cross-Origin-Resource-Policy', finalConfig.crossOriginResourcePolicy)

      // Additional security headers
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('X-Download-Options', 'noopen')

      // Report-To header for CSP reporting
      if (finalConfig.contentSecurityPolicy.directives['report-to']) {
        const reportToConfig = {
          group: 'csp-endpoint',
          max_age: 86400,
          endpoints: [
            { url: '/api/security/csp-report' }
          ]
        }
        res.setHeader('Report-To', JSON.stringify(reportToConfig))
      }

      next()
    } catch (error) {
      logger.error('Security headers middleware error:', error)
      next() // Continue even if security headers fail
    }
  }
}

/**
 * CSP Violation Report Handler
 */
export function handleCSPViolation() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const report: CSPViolationReport = req.body

      // Log CSP violation
      logger.warn('CSP Violation Report:', {
        documentUri: report['csp-report']['document-uri'],
        violatedDirective: report['csp-report']['violated-directive'],
        blockedUri: report['csp-report']['blocked-uri'],
        sourceFile: report['csp-report']['source-file'],
        lineNumber: report['csp-report']['line-number'],
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString()
      })

      // Store violation in database for analysis (optional)
      // await storeCSPViolation(report, req.ip, req.headers['user-agent'])

      res.status(204).send() // No content response
    } catch (error) {
      logger.error('CSP violation handler error:', error)
      res.status(500).json({ error: 'Failed to process CSP violation report' })
    }
  }
}

/**
 * Security Headers Validation Middleware
 * Validates that security headers are properly set
 */
export function validateSecurityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send

    res.send = function(data) {
      // Check if required security headers are present
      const requiredHeaders = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy'
      ]

      const missingHeaders = requiredHeaders.filter(header => !res.getHeader(header))
      
      if (missingHeaders.length > 0) {
        logger.warn('Missing security headers:', {
          url: req.url,
          method: req.method,
          missingHeaders,
          timestamp: new Date().toISOString()
        })
      }

      return originalSend.call(this, data)
    }

    next()
  }
}

/**
 * Development-specific CSP configuration
 */
export function developmentCSPConfig(): Partial<SecurityHeadersConfig> {
  return {
    contentSecurityPolicy: {
      enabled: true,
      reportOnly: true, // Use report-only mode in development
      useNonces: false, // Disable nonces in development for easier debugging
      directives: {
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", // Allow eval for development tools
          'https://js.stripe.com',
          'https://checkout.stripe.com',
          'https://maps.googleapis.com',
          'http://localhost:*', // Allow local development servers
          'ws://localhost:*',
          'wss://localhost:*'
        ],
        'connect-src': [
          "'self'",
          'https://api.stripe.com',
          'https://maps.googleapis.com',
          'http://localhost:*',
          'ws://localhost:*',
          'wss://localhost:*'
        ]
      }
    },
    strictTransportSecurity: {
      enabled: false // Disable HSTS in development
    }
  }
}

/**
 * Production-specific CSP configuration
 */
export function productionCSPConfig(): Partial<SecurityHeadersConfig> {
  return {
    contentSecurityPolicy: {
      enabled: true,
      reportOnly: false,
      useNonces: true,
      directives: {
        'script-src': [
          "'self'",
          'https://js.stripe.com',
          'https://checkout.stripe.com',
          'https://maps.googleapis.com'
          // 'unsafe-inline' and 'unsafe-eval' removed for production
        ],
        'connect-src': [
          "'self'",
          'https://api.stripe.com',
          'https://maps.googleapis.com'
          // Remove localhost connections for production
        ]
      }
    },
    strictTransportSecurity: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }
}

export default securityHeaders