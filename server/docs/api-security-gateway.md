# API Security Gateway Implementation

## Overview

The API Security Gateway is a comprehensive security framework that protects the Mosaajii POS system's API endpoints from various security threats. It implements multiple layers of security including input validation, attack detection, request monitoring, and automated security testing.

## Architecture

The security gateway consists of three main middleware components that work together:

1. **Security Context Middleware** - Adds security context to requests
2. **Attack Detection Middleware** - Detects and prevents various attacks
3. **API Security Middleware** - Provides logging, monitoring, and version control
4. **Input Validation Middleware** - Validates and sanitizes all inputs

## Components

### 1. Attack Detection Middleware (`attackDetection.ts`)

Implements comprehensive attack detection and prevention:

#### Features:
- **SQL Injection Detection**: Detects classic and advanced SQL injection patterns
- **XSS Attack Detection**: Identifies script-based and event handler XSS attempts
- **CSRF Protection**: Validates CSRF tokens for state-changing requests
- **Brute Force Protection**: Monitors and blocks rapid authentication attempts
- **Suspicious Activity Detection**: Identifies malicious patterns and behaviors
- **IP Blocking**: Automatically blocks IPs with high suspicious scores

#### Configuration Options:
```typescript
{
  enableSQLInjectionDetection: boolean
  enableXSSDetection: boolean
  enableCSRFProtection: boolean
  enableSuspiciousActivityDetection: boolean
  enableBruteForceProtection: boolean
  logSecurityEvents: boolean
  blockSuspiciousRequests: boolean
  maxSuspiciousScore: number
}
```

#### Threat Scoring System:
- SQL Injection: +50 points
- XSS Attack: +40 points
- CSRF Missing Token: +60 points
- Brute Force: +30 points
- Suspicious Patterns: +10-35 points

### 2. Input Validation Middleware (`inputValidation.ts`)

Provides comprehensive input validation and sanitization:

#### Features:
- **Schema-based Validation**: Uses Zod schemas for type-safe validation
- **Input Sanitization**: Removes malicious content from inputs
- **File Upload Security**: Validates file types, sizes, and content
- **Request Size Limits**: Prevents oversized requests
- **Content Type Validation**: Ensures proper content types
- **SQL Injection Prevention**: Detects and blocks SQL injection attempts
- **XSS Prevention**: Sanitizes HTML and JavaScript content

#### Common Schemas:
- Pagination with page/limit/search
- Email validation with normalization
- Password strength validation
- Phone number format validation
- URL validation
- Currency amount validation

### 3. API Security Middleware (`apiSecurityMiddleware.ts`)

Handles API monitoring, logging, and version control:

#### Features:
- **Request/Response Logging**: Comprehensive API request logging
- **API Version Validation**: Enforces API version policies
- **Request Signature Verification**: HMAC-based request signing
- **Security Context**: Adds security metadata to requests
- **Rate Limiting**: Configurable rate limiting per IP/user
- **Automated Security Testing**: Runs security tests on endpoints

#### Security Context:
```typescript
{
  requestId: string
  timestamp: Date
  ipAddress: string
  userAgent: string
  deviceFingerprint: string
  geoLocation: GeoLocation
  threatLevel: ThreatLevel
}
```

### 4. API Security Service (`apiSecurityService.ts`)

Provides security testing and monitoring services:

#### Features:
- **Automated Security Testing**: SQL injection, XSS, authentication tests
- **Vulnerability Assessment**: Comprehensive security scanning
- **Risk Scoring**: Calculates risk scores for requests
- **Anomaly Detection**: Identifies unusual patterns
- **Security Reporting**: Generates security reports and recommendations

## Integration

### Middleware Stack Order:
1. Express body parsing
2. Security Context Middleware
3. Attack Detection Middleware
4. API Security Middleware
5. Input Validation Middleware (per route)
6. Route handlers

### Example Integration:
```typescript
// Global security middleware
app.use('/api/', securityContextMiddleware())
app.use('/api/', attackDetectionMiddleware({
  enableSQLInjectionDetection: true,
  enableXSSDetection: true,
  enableCSRFProtection: true,
  blockSuspiciousRequests: true,
  maxSuspiciousScore: 75
}))
app.use('/api/', apiSecurityMiddleware({
  enableLogging: true,
  enableVersionValidation: true
}))

// Route-specific validation
router.post('/login', 
  limitRequestSize(1024 * 1024),
  validateContentType(['application/json']),
  validateRequest({ sanitize: true }),
  authController.login
)
```

## Security Features

### 1. SQL Injection Protection
- Pattern-based detection for classic and advanced SQL injection
- Parameterized query enforcement
- Input sanitization
- Real-time blocking of malicious requests

### 2. XSS Protection
- Script tag detection and removal
- Event handler sanitization
- Content Security Policy enforcement
- HTML sanitization using DOMPurify

### 3. CSRF Protection
- Token-based CSRF protection
- Session-based token validation
- Automatic token generation and cleanup
- State-changing request protection

### 4. Brute Force Protection
- Login attempt monitoring
- Progressive account lockout
- IP-based blocking
- Rate limiting integration

### 5. Input Validation
- Schema-based validation using Zod
- Type safety and data transformation
- File upload security scanning
- Request size and content type validation

### 6. API Security Monitoring
- Real-time request/response logging
- Security event correlation
- Threat level assessment
- Automated security testing

## Configuration

### Environment Variables:
```env
API_SIGNATURE_SECRET=your-secret-key
NODE_ENV=production
SECURITY_LOG_LEVEL=info
```

### Security Configuration:
```typescript
const securityConfig = {
  attackDetection: {
    enableSQLInjectionDetection: true,
    enableXSSDetection: true,
    enableCSRFProtection: true,
    maxSuspiciousScore: 75,
    blockSuspiciousRequests: true
  },
  inputValidation: {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    allowedContentTypes: ['application/json'],
    sanitizeInputs: true
  },
  apiSecurity: {
    enableLogging: true,
    enableVersionValidation: true,
    enableSignatureVerification: false // Enable in production
  }
}
```

## Monitoring and Alerting

### Security Events:
- Threat detection events
- Attack attempt logs
- Suspicious activity alerts
- Security test results

### Metrics:
- Request volume and patterns
- Threat detection rates
- False positive rates
- Response times

### Logging:
- Structured JSON logging
- Security event correlation
- Audit trail maintenance
- Compliance reporting

## Testing

### Unit Tests:
- Attack detection accuracy
- Input validation effectiveness
- CSRF token management
- Error handling

### Integration Tests:
- End-to-end security flow
- Middleware interaction
- API version validation
- Security header verification

### Security Tests:
- Penetration testing automation
- Vulnerability scanning
- Performance impact assessment
- False positive analysis

## Performance Considerations

### Optimization Strategies:
- Asynchronous processing for non-blocking operations
- Caching for security decisions
- Efficient pattern matching algorithms
- Memory-efficient data structures

### Monitoring:
- Response time impact measurement
- Memory usage tracking
- CPU utilization monitoring
- Throughput analysis

## Compliance

### Standards Supported:
- OWASP Top 10 protection
- PCI DSS compliance features
- GDPR data protection
- SOC 2 security controls

### Audit Features:
- Comprehensive audit logging
- Security event tracking
- Compliance reporting
- Evidence collection

## Deployment

### Production Checklist:
- [ ] Enable request signature verification
- [ ] Configure proper rate limits
- [ ] Set up security monitoring
- [ ] Enable audit logging
- [ ] Configure alert thresholds
- [ ] Test security controls
- [ ] Validate performance impact

### Maintenance:
- Regular security pattern updates
- Threat intelligence integration
- Performance optimization
- Security test automation

## Troubleshooting

### Common Issues:
1. **High False Positive Rate**: Adjust suspicious score thresholds
2. **Performance Impact**: Enable caching and optimize patterns
3. **CSRF Token Issues**: Check token expiration and session management
4. **Rate Limiting Problems**: Review rate limit configurations

### Debug Mode:
Enable detailed logging for troubleshooting:
```typescript
const debugConfig = {
  logSecurityEvents: true,
  logRequestBody: true,
  logResponseBody: true,
  enableDetailedLogging: true
}
```

## Future Enhancements

### Planned Features:
- Machine learning-based threat detection
- Advanced behavioral analysis
- Integration with external threat intelligence
- Real-time security dashboard
- Automated incident response
- Enhanced compliance reporting

### Scalability Improvements:
- Distributed rate limiting with Redis
- Microservice architecture support
- Cloud-native security services
- Edge security deployment