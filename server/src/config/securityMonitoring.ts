/**
 * Security Monitoring Configuration
 * Centralized configuration for security monitoring, alerting, and incident response
 */

export interface SecurityMonitoringConfig {
  // Alert thresholds
  thresholds: {
    failedLoginAttempts: number
    suspiciousActivityScore: number
    concurrentSessions: number
    rateLimitViolations: number
    criticalVulnerabilities: number
  }

  // Alert notification settings
  notifications: {
    email: {
      enabled: boolean
      recipients: string[]
      criticalOnly: boolean
    }
    sms: {
      enabled: boolean
      recipients: string[]
      criticalOnly: boolean
    }
    webhook: {
      enabled: boolean
      url?: string
      headers?: Record<string, string>
    }
  }

  // Monitoring intervals (in milliseconds)
  intervals: {
    metricsCollection: number
    alertCheck: number
    sessionCleanup: number
    reportGeneration: number
  }

  // Retention periods (in days)
  retention: {
    securityEvents: number
    alerts: number
    auditLogs: number
    sessionHistory: number
  }

  // Incident response settings
  incidentResponse: {
    autoBlock: {
      enabled: boolean
      thresholds: {
        failedLogins: number
        suspiciousActivities: number
      }
      duration: number // in minutes
    }
    autoTerminate: {
      enabled: boolean
      suspiciousSessionThreshold: number
    }
  }

  // Dashboard settings
  dashboard: {
    refreshInterval: number // in seconds
    metricsWindow: number // in days
    maxEventsDisplay: number
  }
}

export const defaultSecurityMonitoringConfig: SecurityMonitoringConfig = {
  thresholds: {
    failedLoginAttempts: 5,
    suspiciousActivityScore: 75,
    concurrentSessions: 3,
    rateLimitViolations: 10,
    criticalVulnerabilities: 1
  },

  notifications: {
    email: {
      enabled: true,
      recipients: process.env.SECURITY_ALERT_EMAILS?.split(',') || ['admin@example.com'],
      criticalOnly: false
    },
    sms: {
      enabled: false,
      recipients: process.env.SECURITY_ALERT_PHONES?.split(',') || [],
      criticalOnly: true
    },
    webhook: {
      enabled: false,
      url: process.env.SECURITY_WEBHOOK_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN || ''}`
      }
    }
  },

  intervals: {
    metricsCollection: 60000, // 1 minute
    alertCheck: 30000, // 30 seconds
    sessionCleanup: 300000, // 5 minutes
    reportGeneration: 86400000 // 24 hours
  },

  retention: {
    securityEvents: 90,
    alerts: 180,
    auditLogs: 365,
    sessionHistory: 30
  },

  incidentResponse: {
    autoBlock: {
      enabled: true,
      thresholds: {
        failedLogins: 5,
        suspiciousActivities: 3
      },
      duration: 15 // minutes
    },
    autoTerminate: {
      enabled: true,
      suspiciousSessionThreshold: 80
    }
  },

  dashboard: {
    refreshInterval: 30, // seconds
    metricsWindow: 7, // days
    maxEventsDisplay: 50
  }
}

/**
 * Get security monitoring configuration
 */
export function getSecurityMonitoringConfig(): SecurityMonitoringConfig {
  return {
    ...defaultSecurityMonitoringConfig,
    // Override with environment-specific settings if needed
  }
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Alert types
 */
export enum AlertType {
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DATA_BREACH_ATTEMPT = 'DATA_BREACH_ATTEMPT',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VULNERABILITY_DETECTED = 'VULNERABILITY_DETECTED',
  SYSTEM_COMPROMISE = 'SYSTEM_COMPROMISE',
  IP_BLOCKED = 'IP_BLOCKED',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION'
}

/**
 * Incident response actions
 */
export enum IncidentResponseAction {
  ALERT_ONLY = 'ALERT_ONLY',
  BLOCK_IP = 'BLOCK_IP',
  TERMINATE_SESSION = 'TERMINATE_SESSION',
  LOCK_ACCOUNT = 'LOCK_ACCOUNT',
  ESCALATE = 'ESCALATE',
  AUTO_REMEDIATE = 'AUTO_REMEDIATE'
}
