# Security Monitoring and Alerting System

## Overview

The Security Monitoring and Alerting System provides comprehensive real-time security monitoring, automated threat detection, and incident response capabilities for the Mosaajii POS application.

## Features

### 🔍 Real-Time Monitoring
- Continuous monitoring of security events
- Real-time threat detection and analysis
- Automated anomaly detection
- Session monitoring and management

### 🚨 Multi-Channel Alerting
- Email notifications with detailed alert information
- SMS alerts for critical incidents (optional)
- Webhook integration (Slack, PagerDuty, etc.)
- Configurable alert severity levels

### 🛡️ Automated Response
- Automatic IP blocking for brute force attacks
- Session termination for suspicious activity
- Account lockout for security violations
- Incident response playbook execution

### 📊 Security Dashboard
- Real-time security metrics visualization
- Active session management
- Security event log viewer
- Alert management interface

### 📝 Comprehensive Logging
- Detailed audit trail of all security events
- Forensic data collection
- Compliance reporting
- Incident timeline tracking

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server
- Email service (SendGrid, AWS SES, or SMTP)

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run deployment script**:
   ```bash
   chmod +x scripts/deploy-security-monitoring.sh
   ./scripts/deploy-security-monitoring.sh
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

### Configuration

Edit `server/src/config/securityMonitoring.ts` to customize:

```typescript
{
  thresholds: {
    failedLoginAttempts: 5,
    suspiciousActivityScore: 75,
    concurrentSessions: 3
  },
  notifications: {
    email: {
      enabled: true,
      recipients: ['admin@example.com']
    }
  }
}
```

## Usage

### Accessing the Dashboard

1. Log in as an admin user
2. Navigate to **Security** → **Security Monitoring**
3. View real-time security metrics and alerts

### API Endpoints

#### Get Security Metrics
```bash
GET /api/security-monitoring/metrics?days=7
Authorization: Bearer <token>
```

#### Get Active Sessions
```bash
GET /api/security-monitoring/sessions
Authorization: Bearer <token>
```

#### Block IP Address
```bash
POST /api/security-monitoring/block-ip
Authorization: Bearer <token>
Content-Type: application/json

{
  "ipAddress": "192.168.1.100",
  "reason": "Brute force attack detected",
  "duration": 900000
}
```

#### Test Alert Generation
```bash
POST /api/security-monitoring/test-alert
Authorization: Bearer <token>
Content-Type: application/json

{
  "severity": "HIGH",
  "type": "TEST_ALERT",
  "message": "Test alert message"
}
```

## Alert Types

| Alert Type | Severity | Description |
|-----------|----------|-------------|
| BRUTE_FORCE_DETECTED | HIGH | Multiple failed login attempts |
| SUSPICIOUS_LOGIN | MEDIUM | Login from unusual location |
| UNAUTHORIZED_ACCESS | HIGH | Access to restricted resources |
| DATA_BREACH_ATTEMPT | CRITICAL | Suspicious data access patterns |
| UNUSUAL_ACTIVITY | MEDIUM | Anomalous user behavior |
| RATE_LIMIT_EXCEEDED | MEDIUM | API rate limits exceeded |
| SYSTEM_COMPROMISE | CRITICAL | System integrity compromised |

## Incident Response

### Automated Response Actions

1. **IP Blocking**: Automatically block malicious IP addresses
2. **Session Termination**: Terminate suspicious user sessions
3. **Account Lockout**: Lock compromised user accounts
4. **Alert Generation**: Create and send security alerts
5. **Forensic Collection**: Collect evidence for investigation

### Response Playbooks

Each incident type has a predefined playbook:

- **Brute Force Attack**: Block IP, notify team, review accounts
- **Unauthorized Access**: Terminate sessions, lock accounts, investigate
- **System Compromise**: Isolate systems, collect evidence, escalate

## Monitoring Configuration

### Alert Thresholds

Configure in `server/src/config/securityMonitoring.ts`:

```typescript
thresholds: {
  failedLoginAttempts: 5,        // Failed attempts before alert
  suspiciousActivityScore: 75,    // Suspicious activity threshold
  concurrentSessions: 3,          // Max concurrent sessions
  rateLimitViolations: 10,        // Rate limit violations
  criticalVulnerabilities: 1      // Critical vulnerabilities
}
```

### Notification Channels

#### Email Configuration

```typescript
notifications: {
  email: {
    enabled: true,
    recipients: ['admin@example.com', 'security@example.com'],
    criticalOnly: false  // Send all alerts or critical only
  }
}
```

#### SMS Configuration (Optional)

```typescript
notifications: {
  sms: {
    enabled: true,
    recipients: ['+1234567890'],
    criticalOnly: true  // SMS for critical alerts only
  }
}
```

#### Webhook Configuration (Optional)

```typescript
notifications: {
  webhook: {
    enabled: true,
    url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    headers: {
      'Authorization': 'Bearer your-token'
    }
  }
}
```

### Monitoring Intervals

```typescript
intervals: {
  metricsCollection: 60000,    // Collect metrics every 1 minute
  alertCheck: 30000,           // Check for alerts every 30 seconds
  sessionCleanup: 300000,      // Clean up sessions every 5 minutes
  reportGeneration: 86400000   // Generate reports daily
}
```

### Data Retention

```typescript
retention: {
  securityEvents: 90,   // Keep security events for 90 days
  alerts: 180,          // Keep alerts for 180 days
  auditLogs: 365,       // Keep audit logs for 1 year
  sessionHistory: 30    // Keep session history for 30 days
}
```

## Testing

### Test Alert Generation

```bash
curl -X POST http://localhost:3000/api/security-monitoring/test-alert \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "HIGH",
    "type": "TEST_ALERT",
    "message": "This is a test alert"
  }'
```

### Simulate Brute Force Attack

```bash
# Run multiple failed login attempts
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  sleep 1
done
```

### Check Monitoring Status

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/security-monitoring/status
```

## Troubleshooting

### Alerts Not Being Sent

1. Check email configuration in `.env`
2. Verify SMTP/SendGrid credentials
3. Check logs: `tail -f server/logs/error.log`
4. Test email service: `npm run test:email`

### Dashboard Not Loading

1. Verify user has ADMIN or SECURITY_MANAGER role
2. Check JWT token validity
3. Review browser console for errors
4. Test API endpoint directly

### High False Positive Rate

1. Adjust thresholds in configuration
2. Whitelist trusted IP addresses
3. Review alert patterns
4. Fine-tune detection algorithms

## Performance Optimization

### Reduce Monitoring Overhead

```typescript
intervals: {
  metricsCollection: 300000,  // Increase to 5 minutes
  alertCheck: 60000           // Increase to 1 minute
}
```

### Implement Caching

Use Redis for frequently accessed metrics:

```typescript
// Cache security metrics
await redis.setex('security:metrics', 60, JSON.stringify(metrics))
```

### Optimize Database Queries

Add indexes for frequently queried fields:

```sql
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_ip_address ON audit_log(ip_address);
```

## Security Best Practices

1. **Secure Credentials**: Store API keys and tokens securely
2. **Encrypt Communications**: Use TLS for all communications
3. **Regular Updates**: Keep dependencies up to date
4. **Access Control**: Limit dashboard access to authorized users
5. **Audit Regularly**: Review security logs and alerts
6. **Test Procedures**: Conduct regular incident response drills
7. **Document Changes**: Maintain documentation of configurations

## Integration

### SIEM Integration

Export security events to external SIEM systems:

```typescript
// Configure SIEM webhook
notifications: {
  webhook: {
    enabled: true,
    url: 'https://your-siem-system.com/api/events'
  }
}
```

### Slack Integration

Receive alerts in Slack:

```typescript
notifications: {
  webhook: {
    enabled: true,
    url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
  }
}
```

### PagerDuty Integration

Escalate critical incidents to PagerDuty:

```typescript
// Configure PagerDuty webhook
notifications: {
  webhook: {
    enabled: true,
    url: 'https://events.pagerduty.com/v2/enqueue',
    headers: {
      'Authorization': 'Token token=YOUR_INTEGRATION_KEY'
    }
  }
}
```

## Maintenance

### Daily Tasks
- Review unacknowledged alerts
- Check dashboard for anomalies
- Verify notification delivery

### Weekly Tasks
- Review false positive rate
- Update IP whitelists/blacklists
- Check system performance

### Monthly Tasks
- Review and adjust thresholds
- Test incident response procedures
- Clean up old security events
- Generate compliance reports

### Quarterly Tasks
- Audit security monitoring effectiveness
- Update incident response playbooks
- Train team on new procedures
- Review and update documentation

## Documentation

- [Deployment Guide](./security-monitoring-deployment.md)
- [Training Guide](./security-team-training.md)
- [API Security Gateway](./api-security-gateway.md)
- [Incident Response Procedures](./incident-response-procedures.md)

## Support

For issues or questions:
- Check documentation in `server/docs/`
- Review logs in `server/logs/`
- Contact security team: security@example.com

## License

Copyright © 2024 Mosaajii POS. All rights reserved.
