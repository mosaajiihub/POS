# Security Configuration Guide

## Overview

This document provides comprehensive guidance on configuring and maintaining security controls for the Mosaajii POS system. All security configurations must be reviewed and approved by the security team before deployment to production.

## Table of Contents

1. [SSL/TLS Configuration](#ssltls-configuration)
2. [Security Headers Configuration](#security-headers-configuration)
3. [API Security Configuration](#api-security-configuration)
4. [Rate Limiting Configuration](#rate-limiting-configuration)
5. [Authentication Security Configuration](#authentication-security-configuration)
6. [Data Encryption Configuration](#data-encryption-configuration)
7. [Access Control Configuration](#access-control-configuration)
8. [Monitoring and Alerting Configuration](#monitoring-and-alerting-configuration)

---

## SSL/TLS Configuration

### Certificate Management

**Location**: Server configuration and reverse proxy (nginx/Apache)

**Configuration Steps**:

1. **Automated Certificate Provisioning**
   ```bash
   # Using Let's Encrypt with Certbot
   certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```

2. **TLS Version Enforcement**
   ```nginx
   # nginx configuration
   ssl_protocols TLSv1.3;
   ssl_prefer_server_ciphers on;
   ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
   ```

3. **HSTS Configuration**
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   ```

4. **Certificate Monitoring**
   - Set up automated monitoring for certificate expiration (30 days before expiry)
   - Configure auto-renewal via cron job: `0 0 * * * certbot renew --quiet`

**Environment Variables**:
```env
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
TLS_MIN_VERSION=1.3
HSTS_MAX_AGE=31536000
```

---

## Security Headers Configuration

### Implementation

**Location**: `server/src/middleware/securityHeaders.ts`

**Required Headers**:

1. **Content Security Policy (CSP)**
   ```typescript
   'Content-Security-Policy': 
     "default-src 'self'; " +
     "script-src 'self' 'nonce-{random}'; " +
     "style-src 'self' 'unsafe-inline'; " +
     "img-src 'self' data: https:; " +
     "font-src 'self'; " +
     "connect-src 'self'; " +
     "frame-ancestors 'none';"
   ```

2. **Additional Security Headers**
   ```typescript
   'X-Frame-Options': 'DENY'
   'X-Content-Type-Options': 'nosniff'
   'Referrer-Policy': 'strict-origin-when-cross-origin'
   'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
   ```

**Configuration File**: `server/src/config/securityHeaders.json`

**Testing**:
```bash
# Verify security headers
curl -I https://yourdomain.com | grep -E "X-Frame-Options|Content-Security-Policy|Strict-Transport-Security"
```

---

## API Security Configuration

### Input Validation

**Location**: `server/src/middleware/inputValidation.ts`

**Configuration**:

1. **Request Size Limits**
   ```typescript
   MAX_REQUEST_SIZE: '10mb'
   MAX_FILE_UPLOAD_SIZE: '5mb'
   MAX_JSON_PAYLOAD_SIZE: '1mb'
   ```

2. **Validation Schemas**
   - Define JSON schemas for all API endpoints
   - Enable strict type checking
   - Implement sanitization for all user inputs

3. **Attack Detection**
   ```typescript
   ENABLE_SQL_INJECTION_DETECTION: true
   ENABLE_XSS_DETECTION: true
   ENABLE_CSRF_PROTECTION: true
   ```

**Environment Variables**:
```env
API_SECURITY_ENABLED=true
INPUT_VALIDATION_STRICT=true
ATTACK_DETECTION_ENABLED=true
SECURITY_LOGGING_LEVEL=info
```

---

## Rate Limiting Configuration

### Multi-Tier Rate Limiting

**Location**: `server/src/middleware/rateLimiting.ts`

**Configuration Tiers**:

1. **Global Rate Limits**
   ```typescript
   GLOBAL_RATE_LIMIT: 1000 requests per hour per IP
   ```

2. **Authenticated User Limits**
   ```typescript
   USER_RATE_LIMIT: 5000 requests per hour per user
   ```

3. **Endpoint-Specific Limits**
   ```typescript
   LOGIN_ENDPOINT: 5 requests per 15 minutes per IP
   API_ENDPOINT: 100 requests per minute per user
   PAYMENT_ENDPOINT: 10 requests per minute per user
   ```

4. **DDoS Protection**
   ```typescript
   DDOS_THRESHOLD: 10000 requests per minute
   DDOS_BLOCK_DURATION: 3600 seconds
   ```

**Redis Configuration**:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
RATE_LIMIT_REDIS_DB=1
```

---

## Authentication Security Configuration

### Multi-Factor Authentication (MFA)

**Location**: `server/src/services/mfaService.ts`

**Configuration**:

1. **MFA Methods**
   - TOTP (Time-based One-Time Password)
   - SMS-based OTP
   - Email-based OTP
   - Backup codes

2. **MFA Enforcement**
   ```typescript
   MFA_REQUIRED_FOR_ADMIN: true
   MFA_REQUIRED_FOR_SENSITIVE_OPERATIONS: true
   MFA_GRACE_PERIOD_DAYS: 7
   ```

### Password Policy

**Configuration**:
```typescript
PASSWORD_MIN_LENGTH: 12
PASSWORD_REQUIRE_UPPERCASE: true
PASSWORD_REQUIRE_LOWERCASE: true
PASSWORD_REQUIRE_NUMBERS: true
PASSWORD_REQUIRE_SPECIAL_CHARS: true
PASSWORD_HISTORY_COUNT: 5
PASSWORD_MAX_AGE_DAYS: 90
```

### Brute Force Protection

**Configuration**:
```typescript
MAX_LOGIN_ATTEMPTS: 5
LOCKOUT_DURATION_MINUTES: 30
PROGRESSIVE_LOCKOUT_ENABLED: true
CAPTCHA_AFTER_ATTEMPTS: 3
```

**Environment Variables**:
```env
MFA_ENABLED=true
MFA_ISSUER=MosaajiiPOS
PASSWORD_BREACH_CHECK_ENABLED=true
BRUTE_FORCE_PROTECTION_ENABLED=true
SESSION_TIMEOUT_MINUTES=30
```

---

## Data Encryption Configuration

### Encryption at Rest

**Location**: `server/src/services/dataEncryptionService.ts`

**Configuration**:

1. **Database Encryption**
   ```typescript
   ENCRYPTION_ALGORITHM: 'aes-256-gcm'
   KEY_DERIVATION_FUNCTION: 'pbkdf2'
   KEY_ROTATION_INTERVAL_DAYS: 90
   ```

2. **Field-Level Encryption**
   - Customer PII data
   - Payment information
   - Authentication credentials
   - Sensitive business data

### Key Management

**Configuration**:
```typescript
KEY_STORAGE: 'aws-kms' | 'azure-key-vault' | 'hashicorp-vault'
KEY_BACKUP_ENABLED: true
KEY_ESCROW_ENABLED: true
```

**Environment Variables**:
```env
ENCRYPTION_ENABLED=true
ENCRYPTION_KEY_ID=your-key-id
KEY_ROTATION_ENABLED=true
KEY_MANAGEMENT_SERVICE=aws-kms
```

---

## Access Control Configuration

### Role-Based Access Control (RBAC)

**Location**: `server/src/services/accessControlService.ts`

**Default Roles**:

1. **Super Admin**
   - Full system access
   - User management
   - Security configuration

2. **Admin**
   - Business operations
   - Report access
   - Limited user management

3. **Manager**
   - Transaction management
   - Inventory management
   - Basic reporting

4. **Cashier**
   - POS operations
   - Customer management
   - Limited reporting

### Attribute-Based Access Control (ABAC)

**Configuration**:
```typescript
ABAC_ENABLED: true
TIME_BASED_ACCESS: true
LOCATION_BASED_ACCESS: true
CONTEXT_AWARE_ACCESS: true
```

**Environment Variables**:
```env
RBAC_ENABLED=true
ABAC_ENABLED=true
LEAST_PRIVILEGE_ENFORCEMENT=true
ACCESS_REVIEW_INTERVAL_DAYS=90
```

---

## Monitoring and Alerting Configuration

### Security Monitoring

**Location**: `server/src/services/securityMonitoringService.ts`

**Configuration**:

1. **Real-Time Monitoring**
   ```typescript
   MONITORING_ENABLED: true
   METRICS_COLLECTION_INTERVAL: 60 seconds
   ANOMALY_DETECTION_ENABLED: true
   ```

2. **Alert Thresholds**
   ```typescript
   CRITICAL_ALERT_THRESHOLD: Immediate
   HIGH_ALERT_THRESHOLD: 5 minutes
   MEDIUM_ALERT_THRESHOLD: 15 minutes
   LOW_ALERT_THRESHOLD: 1 hour
   ```

3. **Alert Channels**
   - Email notifications
   - SMS alerts (critical only)
   - Slack/Teams integration
   - PagerDuty integration

### SIEM Integration

**Configuration**:
```typescript
SIEM_ENABLED: true
SIEM_PROVIDER: 'splunk' | 'elastic' | 'datadog'
LOG_FORWARDING_ENABLED: true
```

**Environment Variables**:
```env
SECURITY_MONITORING_ENABLED=true
ALERT_EMAIL=security@yourdomain.com
ALERT_SMS=+1234567890
SIEM_ENDPOINT=https://siem.yourdomain.com
SIEM_API_KEY=your-api-key
```

---

## Configuration Validation

### Pre-Deployment Checklist

- [ ] SSL/TLS certificates are valid and properly configured
- [ ] All security headers are enabled and tested
- [ ] Rate limiting is configured for all endpoints
- [ ] MFA is enabled for administrative accounts
- [ ] Data encryption is enabled for sensitive fields
- [ ] Access controls are properly configured
- [ ] Security monitoring is active and alerts are configured
- [ ] All environment variables are set correctly
- [ ] Security configurations are documented
- [ ] Security team has reviewed and approved configuration

### Testing Commands

```bash
# Test SSL/TLS configuration
openssl s_client -connect yourdomain.com:443 -tls1_3

# Test security headers
curl -I https://yourdomain.com

# Test rate limiting
ab -n 1000 -c 10 https://yourdomain.com/api/test

# Test authentication
npm run test:security:auth

# Test encryption
npm run test:security:encryption
```

---

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Weekly**
   - Review security logs
   - Check for failed authentication attempts
   - Monitor rate limiting effectiveness

2. **Monthly**
   - Update security dependencies
   - Review and update security policies
   - Conduct security configuration audit

3. **Quarterly**
   - Rotate encryption keys
   - Review access controls
   - Update security documentation
   - Conduct security training

### Configuration Change Management

1. All security configuration changes must be:
   - Documented in this guide
   - Reviewed by security team
   - Tested in staging environment
   - Approved before production deployment
   - Logged in change management system

2. Emergency security changes:
   - Can be deployed immediately if critical
   - Must be documented within 24 hours
   - Require post-deployment review

---

## Support and Escalation

### Security Team Contacts

- **Security Lead**: security-lead@yourdomain.com
- **Security Operations**: security-ops@yourdomain.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX (24/7)

### Escalation Path

1. **Level 1**: Security Operations Team
2. **Level 2**: Security Lead
3. **Level 3**: CISO / CTO
4. **Level 4**: Executive Team

---

## Document Control

- **Version**: 1.0
- **Last Updated**: 2025-11-07
- **Next Review Date**: 2026-02-07
- **Owner**: Security Team
- **Approved By**: CISO

---

## References

- [OWASP Security Configuration Guide](https://owasp.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Security Benchmarks](https://www.cisecurity.org/)
