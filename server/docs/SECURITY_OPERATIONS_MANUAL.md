# Security Operations Manual

## Document Information
- **Version**: 1.0.0
- **Last Updated**: 2025-11-08
- **Owner**: Security Operations Team
- **Classification**: Internal Use Only

## Table of Contents
1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Security Configurations](#security-configurations)
4. [Operational Procedures](#operational-procedures)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Related Documentation](#related-documentation)

## Overview

This manual provides comprehensive guidance for operating and maintaining the security infrastructure of the Mosaajii POS system. It covers all security configurations, operational procedures, and best practices for maintaining a secure production environment.

### Purpose
- Document all security configurations and settings
- Provide operational procedures for security management
- Establish guidelines for security incident response
- Define security governance and review processes

### Scope
This manual covers:
- SSL/TLS and certificate management
- API security gateway operations
- Authentication and authorization systems
- Data encryption and key management
- Security monitoring and incident response
- Compliance management and reporting

## Security Architecture

### Layered Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Perimeter Security (WAF, DDoS Protection, CDN)        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Network Security (Load Balancer, SSL/TLS, Firewall)   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Application Security (API Gateway, Auth, Rate Limit)  │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Business Logic (Input Validation, Authorization)      │
├─────────────────────────────────────────────────────────────────┤
│ Layer 5: Data Security (Encryption, Access Control, Audit)     │
├─────────────────────────────────────────────────────────────────┤
│ Layer 6: Infrastructure (Container Security, Network Segment)  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Components

#### 1. SSL/TLS Management
- **Purpose**: Secure all communications with TLS 1.3
- **Components**: Certificate Manager, HSTS enforcement, OCSP stapling
- **Configuration**: `/server/src/config/ssl-tls.config.ts`

#### 2. API Security Gateway
- **Purpose**: Protect API endpoints from attacks
- **Components**: Input validation, attack detection, rate limiting
- **Configuration**: `/server/src/middleware/apiSecurityMiddleware.ts`

#### 3. Authentication Security
- **Purpose**: Secure user authentication and session management
- **Components**: MFA, password policies, brute force protection
- **Configuration**: `/server/src/services/authService.ts`

#### 4. Data Encryption
- **Purpose**: Protect sensitive data at rest and in transit
- **Components**: Field-level encryption, key management, TLS
- **Configuration**: `/server/src/services/dataEncryptionService.ts`

#### 5. Security Monitoring
- **Purpose**: Real-time threat detection and incident response
- **Components**: Security dashboard, alerting, SIEM integration
- **Configuration**: `/server/src/config/securityMonitoring.ts`

## Security Configurations

### SSL/TLS Configuration

#### Certificate Management
```typescript
// Location: /server/src/config/ssl-tls.config.ts
{
  minVersion: 'TLSv1.3',
  cipherSuites: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ],
  hstsEnabled: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  hstsPreload: true,
  ocspStapling: true
}
```

#### Certificate Renewal Process
1. Automated renewal triggers 30 days before expiration
2. New certificate provisioned via Let's Encrypt/ACME
3. Certificate validation and testing in staging
4. Zero-downtime deployment to production
5. Old certificate retained for 7 days as backup

### Security Headers Configuration

#### Content Security Policy (CSP)
```typescript
// Location: /server/src/middleware/securityHeaders.ts
{
  'default-src': ["'self'"],
  'script-src': ["'self'", "'nonce-{random}'"],
  'style-src': ["'self'", "'nonce-{random}'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
}
```

#### Additional Security Headers
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restrictive feature policy
- **Strict-Transport-Security**: max-age=31536000; includeSubDomains; preload

### API Security Configuration

#### Rate Limiting Rules
```typescript
// Location: /server/src/middleware/rateLimiting.ts
{
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // requests per window
  },
  authentication: {
    windowMs: 15 * 60 * 1000,
    max: 5 // login attempts per window
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 100 // API calls per window
  }
}
```

#### Input Validation Rules
- All inputs validated against defined schemas
- SQL injection patterns blocked
- XSS patterns sanitized
- File uploads scanned and validated
- Request size limits enforced (10MB default)

### Authentication Configuration

#### Password Policy
```typescript
{
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventPasswordReuse: 5, // last 5 passwords
  maxAge: 90, // days
  breachDetection: true // HaveIBeenPwned API
}
```

#### MFA Configuration
- **Supported Methods**: TOTP (Google Authenticator, Authy), SMS, Email
- **Backup Codes**: 10 single-use codes generated per user
- **Grace Period**: 7 days for MFA setup after account creation
- **Recovery Process**: Admin-assisted recovery with identity verification

#### Session Security
```typescript
{
  tokenExpiry: 3600, // 1 hour
  refreshTokenExpiry: 604800, // 7 days
  maxConcurrentSessions: 3,
  sessionTimeout: 1800, // 30 minutes inactivity
  secureFlag: true,
  httpOnlyFlag: true,
  sameSitePolicy: 'strict'
}
```

### Encryption Configuration

#### Data at Rest
```typescript
{
  algorithm: 'AES-256-GCM',
  keySize: 256,
  keyRotationPeriod: 90, // days
  encryptedFields: [
    'users.password',
    'customers.email',
    'customers.phone',
    'payments.cardNumber',
    'payments.cvv'
  ]
}
```

#### Key Management
- **Key Storage**: AWS KMS / HashiCorp Vault
- **Key Rotation**: Automated every 90 days
- **Key Backup**: Encrypted backup in separate region
- **Key Access**: Audit logged, role-based access

## Operational Procedures

### Daily Operations

#### Morning Security Checklist
1. Review overnight security alerts and incidents
2. Check security monitoring dashboard for anomalies
3. Verify backup completion and integrity
4. Review failed authentication attempts
5. Check certificate expiration status
6. Verify security service health status

#### Security Monitoring Tasks
1. Monitor real-time security dashboard
2. Review security event logs
3. Investigate suspicious activities
4. Update threat intelligence feeds
5. Verify rate limiting effectiveness
6. Check DDoS protection status

### Weekly Operations

#### Security Review Tasks
1. Review security incidents from past week
2. Analyze security metrics and trends
3. Update security rules and policies
4. Review access control changes
5. Verify compliance status
6. Update security documentation

#### Vulnerability Management
1. Review vulnerability scan results
2. Prioritize vulnerabilities for remediation
3. Track remediation progress
4. Update security patches
5. Verify patch deployment success

### Monthly Operations

#### Security Assessment
1. Conduct comprehensive security review
2. Review and update security policies
3. Perform access rights review
4. Update incident response procedures
5. Review security training completion
6. Generate monthly security report

#### Compliance Activities
1. Generate compliance reports (PCI DSS, GDPR)
2. Review audit logs and trails
3. Update compliance documentation
4. Conduct compliance gap analysis
5. Track remediation of compliance findings

### Certificate Management Procedures

#### Certificate Renewal Process
```bash
# 1. Check certificate expiration
openssl x509 -in /path/to/cert.pem -noout -enddate

# 2. Request new certificate (automated via ACME)
certbot renew --dry-run

# 3. Verify new certificate
openssl x509 -in /path/to/new-cert.pem -text -noout

# 4. Deploy to production (zero-downtime)
# Handled by deployment automation

# 5. Verify deployment
curl -vI https://your-domain.com 2>&1 | grep -i "SSL certificate"
```

#### Certificate Monitoring
- Automated monitoring checks certificates daily
- Alerts sent 30, 14, and 7 days before expiration
- Emergency renewal process for certificates expiring within 7 days

### Security Incident Response

#### Incident Classification
- **P1 - Critical**: Active breach, data exfiltration, system compromise
- **P2 - High**: Attempted breach, vulnerability exploitation, service disruption
- **P3 - Medium**: Suspicious activity, policy violations, failed attacks
- **P4 - Low**: Security warnings, informational alerts, minor issues

#### Response Procedures
See [INCIDENT_RESPONSE_RUNBOOK.md](./INCIDENT_RESPONSE_RUNBOOK.md) for detailed procedures.

### Backup and Recovery Procedures

#### Backup Schedule
- **Database**: Hourly incremental, daily full backup
- **Configuration**: Daily backup
- **Logs**: Continuous archival to secure storage
- **Encryption Keys**: Daily encrypted backup to separate location

#### Recovery Procedures
```bash
# 1. Verify backup integrity
./scripts/verify-backup.sh --backup-id <backup-id>

# 2. Restore from backup
./scripts/restore-backup.sh --backup-id <backup-id> --target <environment>

# 3. Verify restoration
./scripts/verify-restoration.sh --environment <environment>

# 4. Resume operations
./scripts/resume-operations.sh --environment <environment>
```

## Monitoring and Alerting

### Security Metrics Dashboard

#### Key Performance Indicators (KPIs)
1. **Threat Detection Rate**: % of threats detected and blocked
2. **False Positive Rate**: Accuracy of threat detection
3. **Mean Time to Detect (MTTD)**: Average time to detect incidents
4. **Mean Time to Respond (MTTR)**: Average time to respond to incidents
5. **Vulnerability Remediation Time**: Time to patch vulnerabilities
6. **Compliance Score**: Overall compliance posture

#### Real-time Monitoring
- **Security Events**: Live feed of security events
- **Threat Intelligence**: Current threat landscape
- **System Health**: Security service status
- **Attack Patterns**: Detected attack attempts
- **Anomalies**: Unusual behavior detection

### Alert Configuration

#### Critical Alerts (Immediate Response)
- Active security breach detected
- Critical vulnerability exploitation attempt
- Authentication system compromise
- Data exfiltration detected
- DDoS attack in progress
- Certificate expiration within 24 hours

#### High Priority Alerts (Response within 1 hour)
- Multiple failed authentication attempts
- Suspicious API activity patterns
- Vulnerability scan critical findings
- Compliance violation detected
- Backup failure
- Security service degradation

#### Medium Priority Alerts (Response within 4 hours)
- Rate limit threshold exceeded
- Security policy violation
- Unusual access patterns
- Certificate expiration within 7 days
- Security configuration drift

### Alert Response Procedures

#### Alert Triage Process
1. Receive and acknowledge alert
2. Assess severity and impact
3. Classify incident type
4. Initiate appropriate response procedure
5. Document actions taken
6. Escalate if necessary

#### Escalation Matrix
- **P1 Incidents**: Security Team Lead + CTO (immediate)
- **P2 Incidents**: Security Team Lead (within 1 hour)
- **P3 Incidents**: On-duty Security Engineer (within 4 hours)
- **P4 Incidents**: Next business day review

## Related Documentation

### Security Documentation Index
1. [Security Configuration Guide](./SECURITY_CONFIGURATION_GUIDE.md)
2. [Incident Response Runbook](./INCIDENT_RESPONSE_RUNBOOK.md)
3. [Security Procedures Manual](./SECURITY_PROCEDURES_MANUAL.md)
4. [Security Training Guide](./SECURITY_TRAINING_GUIDE.md)
5. [Security Governance Framework](./SECURITY_GOVERNANCE_FRAMEWORK.md)
6. [Security Monitoring Implementation](./SECURITY_MONITORING_IMPLEMENTATION_SUMMARY.md)
7. [Security Quick Reference](./SECURITY_QUICK_REFERENCE.md)

### External References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [GDPR Guidelines](https://gdpr.eu/)

## Document Control

### Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-08 | Security Team | Initial release |

### Review Schedule
- **Quarterly Review**: Security configurations and procedures
- **Annual Review**: Complete manual review and update
- **Ad-hoc Review**: After major security incidents or changes

### Document Approval
- **Prepared by**: Security Operations Team
- **Reviewed by**: Security Team Lead
- **Approved by**: Chief Technology Officer

---

**Document Classification**: Internal Use Only  
**Distribution**: Security Team, DevOps Team, Engineering Leadership
