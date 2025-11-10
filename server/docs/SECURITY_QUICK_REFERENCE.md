# Security Quick Reference Guide

## Emergency Contacts

### Security Team
- **24/7 Security Hotline**: +1-XXX-XXX-XXXX
- **Security Email**: security@yourdomain.com
- **Incident Portal**: https://security.yourdomain.com/report

### Key Personnel
- **CISO**: ciso@yourdomain.com
- **Security Operations**: security-ops@yourdomain.com
- **Incident Commander**: incident-commander@yourdomain.com

---

## Incident Reporting

### When to Report
- Suspected data breach
- Malware or ransomware
- Unauthorized access
- Lost or stolen device
- Suspicious emails or calls
- Any security concern

### How to Report
1. **Email**: security@yourdomain.com
2. **Phone**: +1-XXX-XXX-XXXX (24/7)
3. **Portal**: https://security.yourdomain.com/report

### What to Include
- What happened
- When it happened
- What systems are affected
- Your contact information

---

## Common Security Commands

### User Management
```bash
# Create user
npm run user:create --email=user@example.com --name="Name" --role=cashier

# Disable user
npm run user:disable --userId=<user-id>

# Reset password
npm run user:reset-password --userId=<user-id>

# List users
npm run user:list
```

### Access Control
```bash
# Grant permission
npm run user:add-permission --userId=<user-id> --permission=<permission>

# Revoke permission
npm run user:remove-permission --userId=<user-id> --permission=<permission>

# List permissions
npm run user:list-permissions --userId=<user-id>
```

### Security Monitoring
```bash
# View security dashboard
npm run security:dashboard

# List alerts
npm run security:list-alerts --severity=critical

# Check failed logins
npm run security:failed-logins --since="24 hours ago"
```

### Vulnerability Management
```bash
# Scan for vulnerabilities
npm run security:scan-dependencies

# List vulnerabilities
npm run security:list-vulnerabilities --severity=critical

# Get vulnerability details
npm run security:get-vulnerability --vulnId=<vuln-id>
```

### Backup and Recovery
```bash
# Create backup
npm run backup:create --type=full

# List backups
npm run backup:list

# Restore from backup
npm run backup:restore --backupId=<backup-id>
```

---

## Password Requirements

### Minimum Requirements
- ✓ 12 characters minimum
- ✓ Uppercase letters (A-Z)
- ✓ Lowercase letters (a-z)
- ✓ Numbers (0-9)
- ✓ Special characters (!@#$%^&*)

### Best Practices
- Use unique passwords for each account
- Use a password manager
- Enable MFA everywhere possible
- Never share passwords
- Change passwords if compromised

### Example Strong Password
```
Correct: MyD0g&L0v3sT0Run!2024
Incorrect: password123
```

---

## Phishing Identification

### Red Flags
- ⚠️ Suspicious sender address
- ⚠️ Urgent or threatening language
- ⚠️ Requests for sensitive information
- ⚠️ Suspicious links or attachments
- ⚠️ Grammar and spelling errors
- ⚠️ Too good to be true offers

### What to Do
1. ❌ Don't click links
2. ❌ Don't download attachments
3. ✓ Verify sender through alternate channel
4. ✓ Report to security@yourdomain.com
5. ✓ Delete the email

---

## Data Classification

### Public
- No restrictions
- Can be shared publicly
- Example: Marketing materials

### Internal
- Company employees only
- Not for external sharing
- Example: Internal memos

### Confidential
- Authorized personnel only
- Business sensitive
- Example: Financial reports

### Restricted
- Highly sensitive
- Strict access controls
- Example: Customer PII, payment data

---

## Security Incident Severity

### Critical (P1)
- Response: < 15 minutes
- Examples: Data breach, ransomware

### High (P2)
- Response: < 1 hour
- Examples: DDoS attack, malware

### Medium (P3)
- Response: < 4 hours
- Examples: Brute force attacks

### Low (P4)
- Response: < 24 hours
- Examples: Policy violations

---

## MFA Setup

### Using Authenticator App

1. **Install App**
   - Google Authenticator
   - Microsoft Authenticator
   - Authy

2. **Enable MFA**
   - Go to Account Settings
   - Click "Enable MFA"
   - Scan QR code with app

3. **Save Backup Codes**
   - Download backup codes
   - Store securely
   - Use if phone lost

---

## Security Headers Checklist

### Required Headers
- ✓ Content-Security-Policy
- ✓ X-Frame-Options: DENY
- ✓ X-Content-Type-Options: nosniff
- ✓ Referrer-Policy: strict-origin-when-cross-origin
- ✓ Strict-Transport-Security

### Verify Headers
```bash
curl -I https://yourdomain.com | grep -E "X-Frame-Options|Content-Security-Policy"
```

---

## Common Vulnerabilities

### OWASP Top 10
1. Injection (SQL, XSS)
2. Broken Authentication
3. Sensitive Data Exposure
4. XML External Entities (XXE)
5. Broken Access Control
6. Security Misconfiguration
7. Cross-Site Scripting (XSS)
8. Insecure Deserialization
9. Using Components with Known Vulnerabilities
10. Insufficient Logging & Monitoring

---

## Secure Coding Checklist

### Input Validation
- ✓ Validate all user inputs
- ✓ Use parameterized queries
- ✓ Sanitize outputs
- ✓ Implement proper error handling

### Authentication
- ✓ Use bcrypt for passwords
- ✓ Implement session management
- ✓ Use secure JWT practices
- ✓ Implement MFA

### Authorization
- ✓ Implement RBAC
- ✓ Check permissions on every request
- ✓ Use principle of least privilege
- ✓ Log access attempts

### Data Protection
- ✓ Encrypt sensitive data
- ✓ Use HTTPS everywhere
- ✓ Implement proper key management
- ✓ Secure data disposal

---

## Compliance Quick Reference

### GDPR
- Protect personal data
- Obtain consent
- Allow data access/deletion
- Report breaches within 72 hours

### PCI DSS
- Protect cardholder data
- Encrypt transmission
- Restrict access
- Monitor and test networks

---

## Security Tools Access

### Dashboards
- **Security Dashboard**: https://security.yourdomain.com/dashboard
- **Monitoring**: https://monitoring.yourdomain.com
- **SIEM**: https://siem.yourdomain.com

### Documentation
- **Security Docs**: https://docs.yourdomain.com/security
- **Runbooks**: https://docs.yourdomain.com/runbooks
- **Policies**: https://docs.yourdomain.com/policies

---

## Useful Links

### Internal
- Security Training Portal: https://training.yourdomain.com
- Security Knowledge Base: https://kb.yourdomain.com/security
- Incident Response Portal: https://security.yourdomain.com/incidents

### External
- OWASP: https://owasp.org/
- NIST: https://www.nist.gov/cyberframework
- US-CERT: https://www.cisa.gov/uscert
- Have I Been Pwned: https://haveibeenpwned.com/

---

## Security Checklist for Developers

### Before Committing Code
- [ ] No hardcoded credentials
- [ ] No sensitive data in logs
- [ ] Input validation implemented
- [ ] Output encoding implemented
- [ ] Error handling implemented
- [ ] Security tests passing
- [ ] Dependencies up to date
- [ ] Code reviewed

### Before Deploying
- [ ] Security scan passed
- [ ] Vulnerability scan passed
- [ ] Security tests passed
- [ ] Security review completed
- [ ] Secrets properly managed
- [ ] Monitoring configured
- [ ] Rollback plan ready
- [ ] Security team notified

---

## Security Checklist for Admins

### Daily
- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Monitor system health
- [ ] Review critical logs

### Weekly
- [ ] Review access logs
- [ ] Check for security updates
- [ ] Review backup status
- [ ] Test backup restoration

### Monthly
- [ ] Review user access
- [ ] Update security documentation
- [ ] Review security metrics
- [ ] Conduct security training

### Quarterly
- [ ] Conduct access review
- [ ] Review security policies
- [ ] Conduct security audit
- [ ] Update incident response plan

---

## Acronyms and Definitions

- **ABAC**: Attribute-Based Access Control
- **API**: Application Programming Interface
- **CISO**: Chief Information Security Officer
- **CSP**: Content Security Policy
- **CSRF**: Cross-Site Request Forgery
- **DAST**: Dynamic Application Security Testing
- **DDoS**: Distributed Denial of Service
- **GDPR**: General Data Protection Regulation
- **HSTS**: HTTP Strict Transport Security
- **MFA**: Multi-Factor Authentication
- **MTTD**: Mean Time To Detect
- **MTTR**: Mean Time To Respond/Recover
- **OWASP**: Open Web Application Security Project
- **PCI DSS**: Payment Card Industry Data Security Standard
- **PII**: Personally Identifiable Information
- **RBAC**: Role-Based Access Control
- **SAST**: Static Application Security Testing
- **SIEM**: Security Information and Event Management
- **SOC**: Security Operations Center
- **SQL**: Structured Query Language
- **SSL/TLS**: Secure Sockets Layer / Transport Layer Security
- **XSS**: Cross-Site Scripting

---

## Document Control

- **Version**: 1.0
- **Last Updated**: 2025-11-07
- **Owner**: Security Team
- **Approved By**: CISO

---

## Need Help?

**Security Team is here to help!**

- Email: security@yourdomain.com
- Phone: +1-XXX-XXX-XXXX (24/7)
- Portal: https://security.yourdomain.com

**When in doubt, reach out!**
