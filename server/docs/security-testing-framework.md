# Security Testing Framework

## Overview

Comprehensive security testing framework implementing SAST, DAST, penetration testing, and unified reporting capabilities.

## Components

### 1. Static Application Security Testing (SAST)

**Service**: `sastService.ts`
**Controller**: `sastController.ts`

Features:
- Automated code scanning for security vulnerabilities
- 8 default security rules covering common vulnerabilities:
  - SQL Injection (CWE-89)
  - XSS (CWE-79)
  - Hardcoded Secrets (CWE-798)
  - Weak Cryptography (CWE-327)
  - Insecure Random (CWE-338)
  - Path Traversal (CWE-22)
  - Command Injection (CWE-78)
  - Insecure JWT (CWE-347)
- Custom rule creation
- False positive management
- Detailed reporting with code snippets
- Security score calculation

**API Endpoints**:
- `POST /api/security-testing/sast/scan` - Run SAST scan
- `GET /api/security-testing/sast/scan/:scanId` - Get scan results
- `POST /api/security-testing/sast/issues/:issueId/false-positive` - Mark false positive
- `POST /api/security-testing/sast/rules` - Add custom rule
- `GET /api/security-testing/sast/rules` - Get default rules
- `GET /api/security-testing/sast/config` - Get default configuration

### 2. Dynamic Application Security Testing (DAST)

**Service**: `dastService.ts`
**Controller**: `dastController.ts`

Features:
- Runtime security testing of web applications
- Automated endpoint discovery
- 8 security test categories:
  - SQL Injection
  - XSS
  - CSRF
  - Authentication Bypass
  - Authorization
  - Security Headers
  - CORS Misconfiguration
  - Sensitive Data Exposure
- Request/response analysis
- Vulnerability verification
- CVSS scoring

**API Endpoints**:
- `POST /api/security-testing/dast/scan` - Run DAST scan
- `GET /api/security-testing/dast/scan/:scanId` - Get scan results
- `GET /api/security-testing/dast/tests` - Get default tests
- `POST /api/security-testing/dast/vulnerabilities/:vulnerabilityId/verify` - Verify vulnerability

### 3. Penetration Testing Automation

**Service**: `penetrationTestingService.ts`
**Controller**: `penetrationTestingController.ts`

Features:
- Automated penetration testing framework
- Test categories:
  - Authentication
  - Authorization
  - Session Management
  - Input Validation
  - Cryptography
  - API Security
- Specific test cases:
  - Brute force protection
  - Password policy enforcement
  - Default credentials detection
- Risk scoring and impact analysis
- Executive summary generation

**API Endpoints**:
- `POST /api/security-testing/pentest/run` - Run penetration test
- `GET /api/security-testing/pentest/:testId` - Get test results
- `GET /api/security-testing/pentest/history` - Get test history

### 4. Security Testing Integration & Reporting

**Service**: `securityTestingIntegrationService.ts`
**Controller**: `securityTestingIntegrationController.ts`

Features:
- Unified security test suite execution
- Cross-test finding correlation
- Comprehensive security metrics:
  - Overall security score
  - Vulnerability density
  - False positive rate
  - Test coverage
- Security trends tracking
- Compliance status checking (PCI DSS, GDPR, SOC 2, ISO 27001, OWASP Top 10)
- HTML and JSON report generation
- Security dashboard

**API Endpoints**:
- `POST /api/security-testing/integration/test-suite` - Run test suite
- `GET /api/security-testing/integration/report/:reportId` - Get security report
- `GET /api/security-testing/integration/report/:reportId/export` - Export report
- `GET /api/security-testing/integration/dashboard` - Get security dashboard
- `GET /api/security-testing/integration/metrics` - Get security metrics
- `GET /api/security-testing/integration/compliance` - Get compliance status

## Usage Examples

### Running a SAST Scan

```typescript
POST /api/security-testing/sast/scan
{
  "configuration": {
    "scanPaths": ["server/src", "client/src"],
    "excludePaths": ["node_modules", "dist"],
    "severity": {
      "minSeverity": "LOW",
      "failOnCritical": true,
      "failOnHigh": false
    }
  }
}
```

### Running a DAST Scan

```typescript
POST /api/security-testing/dast/scan
{
  "targetUrl": "http://localhost:5000",
  "scanProfile": "standard",
  "tests": [
    { "id": "sql-injection-test", "enabled": true },
    { "id": "xss-test", "enabled": true },
    { "id": "security-headers-test", "enabled": true }
  ]
}
```

### Running a Comprehensive Test Suite

```typescript
POST /api/security-testing/integration/test-suite
{
  "name": "Full Security Audit",
  "description": "Comprehensive security testing",
  "enabled": true,
  "tests": [
    {
      "type": "SAST",
      "enabled": true,
      "configuration": { /* SAST config */ },
      "failOnCritical": true
    },
    {
      "type": "DAST",
      "enabled": true,
      "configuration": { /* DAST config */ },
      "failOnCritical": true
    },
    {
      "type": "PENTEST",
      "enabled": true,
      "configuration": { /* Pentest config */ },
      "failOnCritical": true
    }
  ]
}
```

## Integration with CI/CD

The security testing framework can be integrated into CI/CD pipelines using the existing `CICDSecurityService`:

```typescript
import { CICDSecurityService } from './services/cicdSecurityService'

// Validate security gates
const gateResult = await CICDSecurityService.validateSecurityGates(pipeline)

if (!gateResult.passed) {
  // Block deployment
  await CICDSecurityService.blockInsecureDeployment(vulnerabilities)
}
```

## Security Metrics

The framework tracks the following key metrics:

- **Security Score**: Overall security posture (0-100)
- **Code Quality Score**: Code quality assessment (0-100)
- **Vulnerability Density**: Issues per 1000 lines of code
- **Mean Time to Remediate**: Average time to fix vulnerabilities
- **Test Coverage**: Percentage of code/endpoints tested
- **False Positive Rate**: Accuracy of security findings

## Compliance Reporting

Automated compliance checking for:
- PCI DSS
- GDPR
- SOC 2
- ISO 27001
- OWASP Top 10

## Best Practices

1. **Run SAST early**: Integrate into development workflow
2. **Schedule DAST regularly**: Weekly or before major releases
3. **Conduct penetration tests**: Quarterly or after significant changes
4. **Review findings promptly**: Address critical issues within 24 hours
5. **Track metrics**: Monitor security trends over time
6. **Automate testing**: Integrate into CI/CD pipeline
7. **Manage false positives**: Review and tune detection rules
8. **Document remediation**: Track fixes and verification

## Future Enhancements

- Integration with external SAST tools (SonarQube, Checkmarx)
- Integration with external DAST tools (OWASP ZAP, Burp Suite)
- Machine learning for vulnerability prediction
- Automated remediation suggestions
- Real-time security testing in development
- Advanced threat modeling
- Security test case generation from requirements
