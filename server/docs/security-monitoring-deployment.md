# Security Monitoring and Alerting Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying and configuring the security monitoring and alerting system for the Mosaajii POS application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Deployment Steps](#deployment-steps)
4. [Alert Configuration](#alert-configuration)
5. [Incident Response Setup](#incident-response-setup)
6. [Monitoring Dashboard](#monitoring-dashboard)
7. [Testing and Validation](#testing-and-validation)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 18+ installed
- PostgreSQL or compatible database
- Redis for session management and caching
- Email service (SendGrid, AWS SES, or SMTP)
- SMS service (optional - Twilio, AWS SNS)
- Webhook endpoint (optional - Slack, PagerDuty, etc.)

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mosaajii_pos"

# Redis
REDIS_URL="redis://localhost:6379"

# Security Monitoring
SECURITY_ALERT_EMAILS="admin@example.com,security@example.com"
SECURITY_ALERT_PHONES="+1234567890,+0987654321"  # Optional
SECURITY_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"  # Optional
SECURITY_WEBHOOK_TOKEN="your-webhook-token"  # Optional

# Email Service (choose one)
# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"

# AWS SES
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"

# SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# SMS Service (optional)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

## Configuration

### 1. Security Monitoring Configuration

The security monitoring system is configured in `server/src/config/securityMonitoring.ts`. Key configuration options:

```typescript
{
  thresholds: {
    failedLoginAttempts: 5,        // Trigger alert after N failed attempts
    suspiciousActivityScore: 75,    // Suspicious activity threshold (0-100)
    concurrentSessions: 3,          // Max concurrent sessions per user
    rateLimitViolations: 10,        // Rate limit violations before alert
    criticalVulnerabilities: 1      // Critical vulnerabilities before alert
  },

  notifications: {
    email: {
      enabled: true,
      recipients: ['admin@example.com'],
      criticalOnly: false           // Send all alerts or critical only
    },
    sms: {
      enabled: false,
      recipients: ['+1234567890'],
      criticalOnly: true            // SMS for critical alerts only
    },
    webhook: {
      enabled: false,
      url: 'https://your-webhook-url',
      headers: { 'Authorization': 'Bearer token' }
    }
  },

  intervals: {
    metricsCollection: 60000,       // Collect metrics every 1 minute
    alertCheck: 30000,              // Check for alerts every 30 seconds
    sessionCleanup: 300000,         // Clean up sessions every 5 minutes
    reportGeneration: 86400000      // Generate reports daily
  },

  retention: {
    securityEvents: 90,             // Keep security events for 90 days
    alerts: 180,                    // Keep alerts for 180 days
    auditLogs: 365,                 // Keep audit logs for 1 year
    sessionHistory: 30              // Keep session history for 30 days
  }
}
```

### 2. Alert Severity Levels

- **LOW**: Informational events, no immediate action required
- **MEDIUM**: Potential security issues, review recommended
- **HIGH**: Security threats detected, action required
- **CRITICAL**: Severe security incidents, immediate action required

### 3. Alert Types

- `BRUTE_FORCE_DETECTED`: Multiple failed login attempts detected
- `SUSPICIOUS_LOGIN`: Login from unusual location or device
- `UNAUTHORIZED_ACCESS`: Attempt to access restricted resources
- `PRIVILEGE_ESCALATION`: Attempt to gain elevated privileges
- `DATA_BREACH_ATTEMPT`: Suspicious data access patterns
- `UNUSUAL_ACTIVITY`: Anomalous user behavior detected
- `RATE_LIMIT_EXCEEDED`: API rate limits exceeded
- `VULNERABILITY_DETECTED`: Security vulnerability found
- `SYSTEM_COMPROMISE`: System integrity compromised
- `IP_BLOCKED`: IP address blocked due to suspicious activity

## Deployment Steps

### Step 1: Install Dependencies

```bash
cd server
npm install
```

### Step 2: Configure Environment Variables

Create or update `.env` file with required variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Step 3: Database Setup

Ensure your database schema includes audit logging tables:

```bash
npx prisma migrate deploy
```

### Step 4: Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

### Step 5: Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Step 6: Verify Deployment

Check that security monitoring endpoints are accessible:

```bash
# Get security metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/security-monitoring/metrics

# Get active sessions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/security-monitoring/sessions
```

## Alert Configuration

### Email Alerts

#### Using SendGrid

```typescript
// server/src/services/notificationService.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

static async sendEmail(notification: EmailNotification) {
  const msg = {
    to: notification.to,
    from: 'security@yourdomain.com',
    subject: notification.subject,
    text: notification.body,
    html: notification.html
  }
  
  await sgMail.send(msg)
}
```

#### Using AWS SES

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({ region: process.env.AWS_REGION })

static async sendEmail(notification: EmailNotification) {
  const command = new SendEmailCommand({
    Source: 'security@yourdomain.com',
    Destination: { ToAddresses: [notification.to] },
    Message: {
      Subject: { Data: notification.subject },
      Body: {
        Text: { Data: notification.body },
        Html: { Data: notification.html }
      }
    }
  })
  
  await sesClient.send(command)
}
```

### SMS Alerts

#### Using Twilio

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

static async sendSMS(notification: SMSNotification) {
  await client.messages.create({
    body: notification.message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: notification.to
  })
}
```

### Webhook Alerts

#### Slack Integration

```typescript
static async sendWebhookAlert(alert: SecurityAlert, url: string) {
  const payload = {
    text: `🚨 Security Alert: ${alert.title}`,
    attachments: [{
      color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
      fields: [
        { title: 'Severity', value: alert.severity, short: true },
        { title: 'Type', value: alert.type, short: true },
        { title: 'Message', value: alert.message, short: false }
      ],
      footer: 'Mosaajii POS Security',
      ts: Math.floor(alert.timestamp.getTime() / 1000)
    }]
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}
```

## Incident Response Setup

### 1. Define Incident Response Team

Create a team with defined roles:

- **Incident Commander**: Coordinates response efforts
- **Security Analyst**: Investigates and analyzes incidents
- **System Administrator**: Implements technical remediation
- **Communications Lead**: Handles internal/external communications

### 2. Configure Incident Response Playbooks

Playbooks are defined in `server/src/services/incidentResponseService.ts`. Customize based on your organization's needs:

```typescript
// Example: Custom playbook for data breach
this.incidentPlaybooks.set(IncidentType.DATA_BREACH, {
  type: IncidentType.DATA_BREACH,
  name: 'Data Breach Response',
  steps: [
    {
      order: 1,
      action: 'ISOLATE_AFFECTED_SYSTEMS',
      description: 'Immediately isolate affected systems',
      automated: true
    },
    {
      order: 2,
      action: 'NOTIFY_LEGAL_TEAM',
      description: 'Notify legal and compliance teams',
      automated: true
    },
    {
      order: 3,
      action: 'ASSESS_DATA_EXPOSURE',
      description: 'Determine what data was exposed',
      automated: false
    },
    {
      order: 4,
      action: 'NOTIFY_AFFECTED_USERS',
      description: 'Notify affected users per regulations',
      automated: false
    }
  ]
})
```

### 3. Test Incident Response Procedures

Run regular incident response drills:

```bash
# Simulate brute force attack
npm run test:incident-response -- --type=brute-force

# Simulate unauthorized access
npm run test:incident-response -- --type=unauthorized-access
```

## Monitoring Dashboard

### Accessing the Dashboard

1. Navigate to the admin panel: `https://your-domain.com/admin`
2. Click on "Security Monitoring" in the sidebar
3. View real-time security metrics and alerts

### Dashboard Features

- **Overview Tab**: Key security metrics and statistics
- **Sessions Tab**: Active user sessions with termination controls
- **Events Tab**: Detailed security event log
- **Alerts Tab**: Active security alerts requiring attention

### Dashboard Permissions

Only users with `ADMIN` or `SECURITY_MANAGER` roles can access the security monitoring dashboard.

## Testing and Validation

### 1. Test Alert Generation

```bash
# Test failed login alert
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Repeat 5+ times to trigger brute force alert
```

### 2. Test Email Notifications

```bash
# Trigger test alert
curl -X POST http://localhost:3000/api/security-monitoring/test-alert \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"severity":"HIGH","type":"TEST_ALERT"}'
```

### 3. Test Incident Response

```bash
# Create test incident
curl -X POST http://localhost:3000/api/incident-response/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"BRUTE_FORCE_ATTACK","severity":"HIGH"}'
```

### 4. Verify Metrics Collection

```bash
# Check metrics endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/security-monitoring/metrics?days=7
```

## Troubleshooting

### Alerts Not Being Sent

1. **Check email configuration**:
   ```bash
   # Test email service
   npm run test:email
   ```

2. **Verify environment variables**:
   ```bash
   echo $SECURITY_ALERT_EMAILS
   echo $SENDGRID_API_KEY
   ```

3. **Check logs**:
   ```bash
   tail -f server/logs/error.log | grep "alert"
   ```

### Dashboard Not Loading

1. **Verify authentication**:
   - Ensure user has ADMIN or SECURITY_MANAGER role
   - Check JWT token validity

2. **Check API endpoints**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/security-monitoring/metrics
   ```

3. **Review browser console** for JavaScript errors

### High False Positive Rate

1. **Adjust thresholds** in `securityMonitoring.ts`:
   ```typescript
   thresholds: {
     failedLoginAttempts: 10,  // Increase from 5
     suspiciousActivityScore: 85  // Increase from 75
   }
   ```

2. **Whitelist trusted IPs**:
   ```bash
   curl -X POST http://localhost:3000/api/security-monitoring/whitelist-ip \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{"ipAddress":"192.168.1.100","reason":"Office network"}'
   ```

### Performance Issues

1. **Optimize metrics collection interval**:
   ```typescript
   intervals: {
     metricsCollection: 300000,  // Increase to 5 minutes
     alertCheck: 60000  // Increase to 1 minute
   }
   ```

2. **Implement data retention cleanup**:
   ```bash
   # Run cleanup job
   npm run cleanup:security-events
   ```

3. **Use Redis caching** for frequently accessed metrics

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Review unacknowledged alerts
   - Check false positive rate
   - Verify notification delivery

2. **Monthly**:
   - Review and update alert thresholds
   - Test incident response procedures
   - Clean up old security events

3. **Quarterly**:
   - Audit security monitoring effectiveness
   - Update incident response playbooks
   - Train team on new procedures

### Backup and Recovery

1. **Backup security data**:
   ```bash
   npm run backup:security-data
   ```

2. **Export audit logs**:
   ```bash
   npm run export:audit-logs -- --days=90
   ```

## Support and Resources

- **Documentation**: `/server/docs/`
- **API Reference**: `/server/docs/api-security-gateway.md`
- **Incident Response**: `/server/docs/incident-response-procedures.md`
- **Security Testing**: `/server/docs/security-testing-framework.md`

## Next Steps

1. Configure email/SMS providers
2. Set up webhook integrations
3. Train security team on dashboard usage
4. Schedule regular incident response drills
5. Establish on-call rotation for security alerts
6. Document organization-specific procedures
7. Integrate with existing SIEM/SOC tools
