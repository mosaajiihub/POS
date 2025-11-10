# Security Monitoring Quick Reference Guide

## Quick Access

### Dashboard URL
```
https://your-domain.com/admin/security-monitoring
```

### API Base URL
```
https://your-domain.com/api/security-monitoring
```

## Common Tasks

### 1. Check Security Status
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://your-domain.com/api/security-monitoring/status
```

### 2. View Security Metrics
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://your-domain.com/api/security-monitoring/metrics?days=7
```

### 3. Block IP Address
```bash
curl -X POST https://your-domain.com/api/security-monitoring/block-ip \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ipAddress": "192.168.1.100",
    "reason": "Brute force attack",
    "duration": 900000
  }'
```

### 4. Terminate Session
```bash
curl -X DELETE https://your-domain.com/api/security-monitoring/sessions/SESSION_ID \
  -H "Authorization: Bearer TOKEN"
```

### 5. Clear Failed Login Attempts
```bash
curl -X POST https://your-domain.com/api/security-monitoring/clear-attempts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "ipAddress": "192.168.1.100"
  }'
```

### 6. Test Alert System
```bash
curl -X POST https://your-domain.com/api/security-monitoring/test-alert \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "HIGH",
    "type": "TEST_ALERT",
    "message": "Test alert"
  }'
```

## Alert Severity Quick Reference

| Severity | Response Time | Action Required |
|----------|--------------|-----------------|
| LOW | 24 hours | Monitor |
| MEDIUM | 4 hours | Investigate |
| HIGH | 1 hour | Immediate action |
| CRITICAL | 15 minutes | Emergency response |

## Common Alert Types

| Alert Type | Typical Cause | First Response |
|-----------|---------------|----------------|
| BRUTE_FORCE_DETECTED | Multiple failed logins | Block IP, review accounts |
| SUSPICIOUS_LOGIN | Unusual location/device | Verify with user |
| UNAUTHORIZED_ACCESS | Access to restricted resource | Terminate session, investigate |
| DATA_BREACH_ATTEMPT | Unusual data access | Escalate immediately |
| UNUSUAL_ACTIVITY | Anomalous behavior | Investigate patterns |
| RATE_LIMIT_EXCEEDED | Too many requests | Check for attack |
| SYSTEM_COMPROMISE | System integrity issue | Isolate and escalate |

## Incident Response Quick Steps

### Brute Force Attack
1. Block attacking IP
2. Review affected accounts
3. Check for compromises
4. Update security rules
5. Document incident

### Suspicious Login
1. Review login details
2. Contact user if possible
3. Verify legitimacy
4. Terminate if suspicious
5. Enable MFA

### Unauthorized Access
1. Terminate sessions
2. Lock account
3. Investigate access logs
4. Assess damage
5. Notify user

### Data Breach
1. Isolate systems
2. Collect evidence
3. Escalate to management
4. Assess exposure
5. Notify legal/compliance

## Configuration Files

### Main Config
```
server/src/config/securityMonitoring.ts
```

### Environment Variables
```
server/.env
```

Key variables:
- `SECURITY_ALERT_EMAILS`
- `SECURITY_ALERT_PHONES`
- `SECURITY_WEBHOOK_URL`
- `SECURITY_WEBHOOK_TOKEN`

## Log Files

### Application Logs
```
server/logs/combined.log
server/logs/error.log
```

### View Recent Errors
```bash
tail -f server/logs/error.log | grep -i security
```

### View Recent Alerts
```bash
tail -f server/logs/combined.log | grep -i alert
```

## Dashboard Tabs

### Overview
- Key security metrics
- Top failed login IPs
- Recent security events
- Quick actions

### Sessions
- Active user sessions
- Session details
- Terminate sessions
- Filter and search

### Events
- All security events
- Filter by type/severity
- Event details
- Timeline view

### Alerts
- Active alerts
- Acknowledge alerts
- Alert details
- Response actions

## Keyboard Shortcuts (Dashboard)

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Refresh data |
| `Ctrl+F` | Search/filter |
| `Esc` | Close modal |
| `Tab` | Navigate tabs |

## Emergency Contacts

### Internal
- Security Manager: [Phone]
- IT Director: [Phone]
- On-Call: [Phone]

### External
- Legal: [Phone]
- Compliance: [Phone]
- Law Enforcement: [Phone]

## Escalation Criteria

### Escalate to Manager
- HIGH severity alerts
- Multiple related incidents
- Unusual patterns
- Unable to resolve

### Escalate to Executive
- CRITICAL severity
- Data breach confirmed
- System compromise
- Regulatory reporting needed

## Common Commands

### Check Service Status
```bash
systemctl status mosaajii-pos
```

### Restart Service
```bash
systemctl restart mosaajii-pos
```

### View Service Logs
```bash
journalctl -u mosaajii-pos -f
```

### Check Redis
```bash
redis-cli ping
```

### Check Database
```bash
psql -U postgres -d mosaajii_pos -c "SELECT COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '1 hour';"
```

## Troubleshooting

### Alerts Not Sending
1. Check email configuration in `.env`
2. Verify SMTP/API credentials
3. Check logs for errors
4. Test email service

### Dashboard Not Loading
1. Verify authentication
2. Check user permissions
3. Review browser console
4. Test API endpoints

### High False Positives
1. Review alert thresholds
2. Whitelist trusted IPs
3. Adjust sensitivity
4. Document patterns

### Performance Issues
1. Check monitoring intervals
2. Review data retention
3. Optimize queries
4. Enable caching

## Useful Queries

### Recent Failed Logins
```sql
SELECT * FROM audit_log 
WHERE action = 'FAILED_LOGIN' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Active Sessions Count
```sql
SELECT COUNT(*) FROM sessions 
WHERE is_active = true;
```

### Security Events by Type
```sql
SELECT action, COUNT(*) as count 
FROM audit_log 
WHERE action LIKE 'SECURITY_EVENT_%' 
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY action 
ORDER BY count DESC;
```

## Documentation Links

- [Full README](./SECURITY_MONITORING_README.md)
- [Deployment Guide](./security-monitoring-deployment.md)
- [Training Guide](./security-team-training.md)
- [Incident Response](./incident-response-procedures.md)

## Support

### Documentation
```
server/docs/
```

### Logs
```
server/logs/
```

### Configuration
```
server/src/config/securityMonitoring.ts
```

### Contact
- Email: security@example.com
- Slack: #security-team
- On-Call: [Schedule Link]

---

**Keep this guide handy for quick reference during security operations!**

**Last Updated**: November 7, 2025  
**Version**: 1.0
