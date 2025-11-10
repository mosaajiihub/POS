# IP Management System Documentation

## Overview

The IP Management System provides comprehensive IP whitelist, blacklist, and reputation management capabilities for the Mosaajii POS system. It includes dynamic IP reputation assessment, geolocation-based access controls, and threat intelligence integration.

## Features

### 1. IP Whitelist Management
- Add trusted IP addresses with descriptions and expiration dates
- Support for tags and metadata
- Automatic expiration handling
- Bulk operations support

### 2. IP Blacklist Management
- Block malicious IP addresses with severity levels
- Support for threat types and auto-blocking
- Temporary and permanent blocking options
- Integration with threat intelligence feeds

### 3. Dynamic IP Reputation Assessment
- Real-time reputation scoring (0-100 scale)
- Integration with external threat intelligence APIs
- Geolocation data enrichment
- Caching for performance optimization

### 4. Access Rules Engine
- CIDR range support
- Country-based blocking
- ASN-based rules
- Priority-based rule evaluation

### 5. Geolocation-Based Access Control
- Country-level blocking/allowing
- ISP and organization filtering
- Timezone and region-based rules

### 6. Threat Intelligence Integration
- AbuseIPDB integration
- VirusTotal support (configurable)
- Custom threat feed support
- Automated threat data updates

## Architecture

### Core Components

#### IPReputationService
Main service class that handles all IP management operations.

```typescript
import { ipReputationService } from '../services/ipReputationService'

// Check if IP is allowed
const result = await ipReputationService.isIPAllowed('192.168.1.100')

// Get IP reputation
const reputation = await ipReputationService.getIPReputation('8.8.8.8')

// Add to whitelist
const entry = await ipReputationService.addToWhitelist({
  ip: '192.168.1.100',
  description: 'Trusted office IP',
  addedBy: 'admin',
  isActive: true
})
```

#### IPAccessControlMiddleware
Express middleware for request-level IP access control.

```typescript
import { moderateIPAccessControl } from '../middleware/ipAccessControl'

// Apply to all API routes
app.use('/api/', moderateIPAccessControl)
```

#### IPManagementController
REST API controller for IP management operations.

### Data Models

#### IPReputationData
```typescript
interface IPReputationData {
  ip: string
  reputation: 'trusted' | 'suspicious' | 'malicious' | 'unknown'
  score: number // 0-100, higher is more trustworthy
  country?: string
  region?: string
  city?: string
  isp?: string
  asn?: string
  threatTypes?: string[]
  lastUpdated: Date
  source: 'manual' | 'threat_intelligence' | 'geolocation' | 'behavioral'
}
```

#### IPWhitelistEntry
```typescript
interface IPWhitelistEntry {
  id: string
  ip: string
  cidr?: string
  description: string
  addedBy: string
  addedAt: Date
  expiresAt?: Date
  isActive: boolean
  tags?: string[]
}
```

#### IPBlacklistEntry
```typescript
interface IPBlacklistEntry {
  id: string
  ip: string
  cidr?: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  blockedBy: string
  blockedAt: Date
  expiresAt?: Date
  isActive: boolean
  threatTypes?: string[]
  autoBlocked: boolean
}
```

## API Endpoints

### IP Information
- `GET /api/ip-management/info/:ip` - Get comprehensive IP information

### Whitelist Management
- `GET /api/ip-management/whitelist` - List all whitelist entries
- `POST /api/ip-management/whitelist` - Add IP to whitelist
- `DELETE /api/ip-management/whitelist/:ip` - Remove IP from whitelist

### Blacklist Management
- `GET /api/ip-management/blacklist` - List all blacklist entries
- `POST /api/ip-management/blacklist` - Add IP to blacklist
- `DELETE /api/ip-management/blacklist/:ip` - Remove IP from blacklist

### Access Rules
- `GET /api/ip-management/rules` - List all access rules
- `POST /api/ip-management/rules` - Add new access rule

### Threat Intelligence
- `POST /api/ip-management/threat-intelligence/import` - Import threat intelligence data

### Statistics
- `GET /api/ip-management/statistics` - Get IP management statistics

### Bulk Operations
- `POST /api/ip-management/bulk` - Perform bulk operations

## Configuration

### Environment Variables

```bash
# Threat Intelligence APIs
ABUSEIPDB_API_KEY=your_abuseipdb_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key

# Redis Configuration (required for caching)
REDIS_URL=redis://localhost:6379
```

### Middleware Configuration

```typescript
import { createIPAccessControl } from '../middleware/ipAccessControl'

// Strict configuration (production)
const strictIPControl = createIPAccessControl({
  enableWhitelist: true,
  enableBlacklist: true,
  enableGeolocationBlocking: true,
  enableThreatIntelligence: true,
  blockedCountries: ['CN', 'RU', 'KP', 'IR'],
  minimumReputationScore: 60,
  autoBlockSuspiciousIPs: true,
  logAllRequests: true
})

// Moderate configuration (default)
const moderateIPControl = createIPAccessControl({
  enableWhitelist: true,
  enableBlacklist: true,
  enableGeolocationBlocking: false,
  enableThreatIntelligence: true,
  minimumReputationScore: 30,
  autoBlockSuspiciousIPs: false,
  logAllRequests: false
})

// Basic configuration (minimal)
const basicIPControl = createIPAccessControl({
  enableWhitelist: true,
  enableBlacklist: true,
  enableGeolocationBlocking: false,
  enableThreatIntelligence: false,
  logAllRequests: false
})
```

## Usage Examples

### Adding IPs to Whitelist

```bash
curl -X POST http://localhost:5000/api/ip-management/whitelist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ip": "192.168.1.100",
    "description": "Office network gateway",
    "tags": ["office", "trusted"],
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

### Adding IPs to Blacklist

```bash
curl -X POST http://localhost:5000/api/ip-management/blacklist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ip": "10.0.0.1",
    "reason": "Malicious activity detected - multiple failed login attempts",
    "severity": "high",
    "threatTypes": ["brute_force", "suspicious_activity"],
    "expiresAt": "2024-06-01T00:00:00Z"
  }'
```

### Creating Access Rules

```bash
curl -X POST http://localhost:5000/api/ip-management/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "deny",
    "cidr": "172.16.0.0/16",
    "description": "Block private network range",
    "priority": 100
  }'
```

### Bulk Operations

```bash
curl -X POST http://localhost:5000/api/ip-management/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "operation": "addToBlacklist",
    "ips": ["10.0.0.1", "10.0.0.2", "10.0.0.3"],
    "reason": "Bulk import from threat intelligence",
    "severity": "medium"
  }'
```

## Security Considerations

### 1. Access Control
- All IP management endpoints require authentication
- Role-based access control for administrative functions
- Audit logging for all IP management operations

### 2. Rate Limiting
- API endpoints are protected by rate limiting
- Bulk operations have size limits to prevent abuse

### 3. Data Validation
- All IP addresses are validated using regex patterns
- Input sanitization for descriptions and reasons
- CIDR notation validation for network ranges

### 4. Caching Strategy
- IP reputation data cached for 24 hours
- Geolocation data cached for 7 days
- Threat intelligence data cached for 6 hours

### 5. Error Handling
- Graceful degradation on external API failures
- Default allow policy on system errors
- Comprehensive error logging

## Performance Optimization

### 1. Caching
- Redis-based caching for all reputation data
- Configurable cache TTL values
- Cache warming for frequently accessed IPs

### 2. Async Operations
- Non-blocking external API calls
- Parallel processing for bulk operations
- Background threat intelligence updates

### 3. Database Optimization
- Indexed IP address fields
- Efficient CIDR range queries
- Pagination for large result sets

## Monitoring and Alerting

### 1. Metrics
- IP access attempts (allowed/blocked)
- Reputation score distributions
- Cache hit/miss ratios
- External API response times

### 2. Alerts
- High-severity IP blocks
- Threat intelligence import failures
- Unusual access patterns
- System performance degradation

### 3. Audit Logging
- All IP management operations
- Access control decisions
- Configuration changes
- System errors and warnings

## Troubleshooting

### Common Issues

#### 1. External API Failures
```
Error: Threat intelligence API timeout
Solution: Check API keys and network connectivity
```

#### 2. Redis Connection Issues
```
Error: Redis connection failed
Solution: Verify Redis server status and configuration
```

#### 3. CIDR Range Matching
```
Issue: IP not matching expected CIDR range
Solution: Verify CIDR notation and IP format
```

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Health Checks
Monitor system health via:
```bash
curl http://localhost:5000/health
```

## Testing

### Unit Tests
```bash
npm test -- ipManagement.test.ts --run
```

### Integration Tests
```bash
npm test -- ipManagement.integration.test.ts --run
```

### Manual Testing Script
```bash
npx tsx src/scripts/testIPManagement.ts
```

## Deployment

### Production Checklist
- [ ] Configure threat intelligence API keys
- [ ] Set up Redis cluster for high availability
- [ ] Enable strict IP access control
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation
- [ ] Test failover scenarios
- [ ] Document incident response procedures

### Environment-Specific Configuration

#### Development
- Relaxed IP controls
- Local Redis instance
- Debug logging enabled
- Mock external APIs

#### Staging
- Production-like configuration
- Shared Redis instance
- Limited threat intelligence
- Comprehensive testing

#### Production
- Strict IP controls
- Redis cluster
- Full threat intelligence integration
- Monitoring and alerting
- Audit logging

## Support and Maintenance

### Regular Tasks
- Review and update threat intelligence feeds
- Clean up expired whitelist/blacklist entries
- Monitor system performance metrics
- Update geolocation databases

### Backup and Recovery
- Regular Redis backups
- Configuration backup
- Disaster recovery procedures
- Data retention policies

### Updates and Patches
- Security updates for dependencies
- Threat intelligence feed updates
- Performance optimizations
- Bug fixes and improvements