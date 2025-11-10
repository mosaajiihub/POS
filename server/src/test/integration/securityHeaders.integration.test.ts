import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('Security Headers Integration', () => {
  describe('API Endpoints Security Headers', () => {
    it('should include security headers on API responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      // Check CSP header
      expect(response.headers['content-security-policy'] || response.headers['content-security-policy-report-only']).toBeDefined()
      
      // Check frame options
      expect(response.headers['x-frame-options']).toBe('DENY')
      
      // Check content type options
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      
      // Check referrer policy
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
      
      // Check additional security headers
      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
      expect(response.headers['x-download-options']).toBe('noopen')
      
      // Check cross-origin headers
      expect(response.headers['cross-origin-embedder-policy']).toBe('unsafe-none')
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups')
      expect(response.headers['cross-origin-resource-policy']).toBe('same-site')
      
      // Check feature/permissions policy
      expect(response.headers['feature-policy']).toBeDefined()
      expect(response.headers['permissions-policy']).toBeDefined()
    })

    it('should handle CSP violation reports', async () => {
      const violationReport = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          'referrer': 'https://example.com',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'",
          'disposition': 'enforce',
          'blocked-uri': 'https://evil.com/script.js',
          'line-number': 10,
          'column-number': 5,
          'source-file': 'https://example.com/page',
          'status-code': 200,
          'script-sample': 'eval("malicious code")'
        }
      }

      const response = await request(app)
        .post('/api/security/csp-report')
        .send(violationReport)
        .expect(204)
    })

    it('should include Report-To header for CSP reporting', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.headers['report-to']).toBeDefined()
      
      const reportTo = JSON.parse(response.headers['report-to'])
      expect(reportTo.group).toBe('csp-endpoint')
      expect(reportTo.endpoints).toEqual([{ url: '/api/security/csp-report' }])
    })

    it('should have environment-appropriate CSP configuration', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      const cspHeader = response.headers['content-security-policy'] || response.headers['content-security-policy-report-only']
      expect(cspHeader).toBeDefined()
      
      // Should contain basic security directives
      expect(cspHeader).toContain("default-src 'self'")
      expect(cspHeader).toContain("object-src 'none'")
      expect(cspHeader).toContain("frame-ancestors 'none'")
      
      // Should include report-uri
      expect(cspHeader).toContain('report-uri /api/security/csp-report')
    })

    it('should set appropriate feature policy restrictions', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      const featurePolicy = response.headers['feature-policy']
      const permissionsPolicy = response.headers['permissions-policy']
      
      expect(featurePolicy).toBeDefined()
      expect(permissionsPolicy).toBeDefined()
      
      // Check that dangerous features are disabled
      expect(featurePolicy).toContain("camera 'none'")
      expect(featurePolicy).toContain("microphone 'none'")
      expect(permissionsPolicy).toContain('camera=()')
      expect(permissionsPolicy).toContain('microphone=()')
    })
  })
})