# Security Headers Implementation

This document describes the comprehensive security headers implementation for the Mosaajii POS system.

## Overview

The security headers middleware provides defense-in-depth protection against common web vulnerabilities including:

- Cross-Site Scripting (XSS)
- Clickjacking
- MIME type sniffing
- Cross-origin attacks
- Information leakage
- Browser feature abuse

## Implementation

### Core Components

1. **Security Headers Middleware** (`src/middleware/securityHeaders.ts`)
   - Comprehensive CSP configuration
   - Frame protection headers
   - Content type protection
   - Cross-origin security headers
   - Feature/Permissions policy enforcement

2. **CSP Violation Reporting** (`src/routes/security.ts`)
   - Endpoint for CSP violation reports
   - Logging and monitoring of security violations

3. **Security Headers Validator** (`src/utils/securityHeadersValidator.ts`)
   - Validation of security headers
   - Security recommendations
   - Development-time header checking

### Security Headers Implemented

#### Content Security Policy (CSP)
- **Purpose**: Prevents XSS attacks by controlling resource loading
- **Implementation**: Comprehensive directives for all resource types
- **Features**:
  - Nonce-based inline script/style protection (production)
  - Report-only mode for development
  - Violation reporting endpoint
  - Environment-specific configurations

#### X-Frame-Options
- **Purpose**: Prevents clickjacking attacks
- **Value**: `DENY` (default)
- **Alternative**: `SAMEORIGIN` for specific use cases

#### X-Content-Type-Options
- **Purpose**: Prevents MIME type sniffing attacks
- **Value**: `nosniff`

#### Referrer-Policy
- **Purpose**: Controls referrer information leakage
- **Value**: `strict-origin-when-cross-origin` (default)

#### Strict-Transport-Security (HSTS)
- **Purpose**: Enforces HTTPS connections
- **Configuration**:
  - Max-Age: 1 year (31536000 seconds)
  - Include Subdomains: Yes
  - Preload: Yes (production only)

#### Cross-Origin Headers
- **Cross-Origin-Embedder-Policy**: `unsafe-none`
- **Cross-Origin-Opener-Policy**: `same-origin-allow-popups`
- **Cross-Origin-Resource-Policy**: `same-site`

#### Feature/Permissions Policy
- **Purpose**: Controls browser feature access
- **Restricted Features**:
  - Camera: Disabled
  - Microphone: Disabled
  - USB: Disabled
  - Magnetometer: Disabled
  - Gyroscope: Disabled
  - Accelerometer: Disabled

#### Additional Security Headers
- **X-XSS-Protection**: `1; mode=block`
- **X-Permitted-Cross-Domain-Policies**: `none`
- **X-Download-Options**: `noopen`

## Configuration

### Development Configuration
```typescript
const devConfig = developmentCSPConfig()
// Features:
// - CSP in report-only mode
// - Allows unsafe-eval for development tools
// - Allows localhost connections
// - HSTS disabled
// - Nonces disabled for easier debugging
```

### Production Configuration
```typescript
const prodConfig = productionCSPConfig()
// Features:
// - CSP in enforcement mode
// - Strict script/style policies with nonces
// - No unsafe-eval or unsafe-inline
// - HSTS enabled with preload
// - Restricted to production domains only
```

## Usage

### Basic Implementation
```typescript
import { securityHeaders, developmentCSPConfig, productionCSPConfig } from './middleware/securityHeaders'

const config = process.env.NODE_ENV === 'production' 
  ? productionCSPConfig() 
  : developmentCSPConfig()

app.use(securityHeaders(config))
```

### Custom Configuration
```typescript
app.use(securityHeaders({
  contentSecurityPolicy: {
    enabled: true,
    useNonces: true,
    directives: {
      'script-src': ["'self'", "'nonce-{nonce}'"],
      'style-src': ["'self'", "'nonce-{nonce}'"]
    }
  },
  frameOptions: 'SAMEORIGIN',
  referrerPolicy: 'no-referrer'
}))
```

### CSP Violation Handling
```typescript
// Endpoint automatically configured at /api/security/csp-report
// Violations are logged and can be monitored
```

## CSP Directives Explained

### default-src
- **Value**: `'self'`
- **Purpose**: Default policy for all resource types

### script-src
- **Development**: `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, external domains
- **Production**: `'self'`, `'nonce-{nonce}'`, trusted external domains
- **Purpose**: Controls JavaScript execution

### style-src
- **Development**: `'self'`, `'unsafe-inline'`, font/style CDNs
- **Production**: `'self'`, `'nonce-{nonce}'`, trusted style sources
- **Purpose**: Controls CSS loading

### img-src
- **Value**: `'self'`, `data:`, `blob:`, `https:`
- **Purpose**: Controls image loading

### connect-src
- **Development**: `'self'`, APIs, localhost WebSocket
- **Production**: `'self'`, trusted APIs only
- **Purpose**: Controls AJAX, WebSocket, EventSource connections

### object-src
- **Value**: `'none'`
- **Purpose**: Blocks plugins (Flash, Java, etc.)

### frame-ancestors
- **Value**: `'none'`
- **Purpose**: Prevents embedding in frames (additional clickjacking protection)

## Monitoring and Reporting

### CSP Violation Reports
- **Endpoint**: `/api/security/csp-report`
- **Format**: Standard CSP violation report format
- **Logging**: Violations logged with context information
- **Analysis**: Can be used to identify attack attempts or policy issues

### Security Headers Validation
- **Development Mode**: Automatic validation and warnings
- **Production Mode**: Silent operation with error logging
- **Validation Checks**:
  - Required headers presence
  - Header value validation
  - Security recommendations
  - Best practice compliance

## Testing

### Manual Testing
```bash
# Test security headers
curl -I http://localhost:5000/health

# Test CSP violation reporting
curl -X POST http://localhost:5000/api/security/csp-report \
  -H "Content-Type: application/json" \
  -d '{"csp-report": {...}}'
```

### Automated Testing
- Unit tests for middleware functionality
- Integration tests for header presence
- CSP violation report handling tests
- Security headers validation tests

## Security Considerations

### Nonce Implementation
- Cryptographically secure random generation
- Unique per request
- Automatically injected into CSP
- Prevents inline script/style attacks

### Environment Separation
- Development: Permissive for debugging
- Production: Strict security enforcement
- Staging: Production-like configuration

### Reporting and Monitoring
- CSP violations indicate potential attacks
- Missing headers indicate configuration issues
- Regular security header audits recommended

## Compliance

This implementation helps meet security requirements for:
- **PCI DSS**: Secure web application requirements
- **OWASP**: Top 10 web application security risks
- **GDPR**: Data protection through security measures
- **SOC 2**: Security control requirements

## Maintenance

### Regular Updates
- Review CSP policies quarterly
- Update trusted domains as needed
- Monitor violation reports for policy adjustments
- Test header configurations after updates

### Performance Considerations
- Minimal performance impact
- Headers cached by browsers
- Nonce generation optimized
- Validation only in development

## Troubleshooting

### Common Issues
1. **CSP Violations**: Check browser console for blocked resources
2. **Missing Nonces**: Ensure nonce is passed to templates
3. **HSTS Issues**: Clear browser HSTS cache for testing
4. **Frame Blocking**: Adjust X-Frame-Options for legitimate embedding

### Debug Mode
Enable detailed logging in development:
```typescript
process.env.NODE_ENV = 'development'
// Automatic validation and warnings enabled
```