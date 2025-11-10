import { describe, it, expect } from 'vitest'
import { securityHeaders, developmentCSPConfig, productionCSPConfig } from '../middleware/securityHeaders'
import { validateSecurityHeaders } from '../utils/securityHeadersValidator'

describe('Security Headers Implementation', () => {
  it('should create development configuration correctly', () => {
    const devConfig = developmentCSPConfig()
    
    expect(devConfig.contentSecurityPolicy?.reportOnly).toBe(true)
    expect(devConfig.contentSecurityPolicy?.useNonces).toBe(false)
    expect(devConfig.strictTransportSecurity?.enabled).toBe(false)
    expect(devConfig.contentSecurityPolicy?.directives?.['script-src']).toContain("'unsafe-eval'")
  })

  it('should create production configuration correctly', () => {
    const prodConfig = productionCSPConfig()
    
    expect(prodConfig.contentSecurityPolicy?.reportOnly).toBe(false)
    expect(prodConfig.contentSecurityPolicy?.useNonces).toBe(true)
    expect(prodConfig.strictTransportSecurity?.enabled).toBe(true)
    expect(prodConfig.contentSecurityPolicy?.directives?.['script-src']).not.toContain("'unsafe-eval'")
  })

  it('should validate security headers correctly', () => {
    const mockHeaders = {
      'content-security-policy': "default-src 'self'; script-src 'self'; object-src 'none'",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'cross-origin-embedder-policy': 'unsafe-none',
      'cross-origin-opener-policy': 'same-origin-allow-popups',
      'cross-origin-resource-policy': 'same-site',
      'x-xss-protection': '1; mode=block',
      'x-permitted-cross-domain-policies': 'none',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(self)'
    }

    const result = validateSecurityHeaders(mockHeaders)
    
    expect(result.isValid).toBe(true)
    expect(result.missingHeaders).toHaveLength(0)
  })

  it('should detect missing required headers', () => {
    const incompleteHeaders = {
      'content-security-policy': "default-src 'self'"
      // Missing other required headers
    }

    const result = validateSecurityHeaders(incompleteHeaders)
    
    expect(result.isValid).toBe(false)
    expect(result.missingHeaders.length).toBeGreaterThan(0)
    expect(result.missingHeaders).toContain('X-Frame-Options')
    expect(result.missingHeaders).toContain('X-Content-Type-Options')
  })

  it('should provide security recommendations', () => {
    const headersWithIssues = {
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'cross-origin-embedder-policy': 'unsafe-none',
      'cross-origin-opener-policy': 'same-origin-allow-popups',
      'cross-origin-resource-policy': 'same-site',
      'x-xss-protection': '1; mode=block',
      'x-permitted-cross-domain-policies': 'none',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(self)'
    }

    const result = validateSecurityHeaders(headersWithIssues)
    
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.recommendations.some(rec => rec.includes('nonce'))).toBe(true)
  })
})