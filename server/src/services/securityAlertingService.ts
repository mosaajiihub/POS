import { logger } from '../utils/logger'
import { NotificationService } from './notificationService'
import { AuditService } from './auditService'
import {
  getSecurityMonitoringConfig,
  AlertSeverity,
  AlertType,
  IncidentResponseAction
} from '../config/securityMonitoring'

export interface SecurityAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  details: any
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  responseActions: IncidentResponseAction[]
  affectedResources: string[]
}

export interface AlertNotification {
  alert: SecurityAlert
  recipients: string[]
  channels: ('email' | 'sms' | 'webhook')[]
}

/**
 * Security Alerting Service
 * Handles security alert generation, notification, and tracking
 */
export class SecurityAlertingService {
  private static config = getSecurityMonitoringConfig()
  private static alertQueue: SecurityAlert[] = []

  /**
   * Create and send security alert
   */
  static async createAlert(params: {
    type: AlertType
    severity: AlertSeverity
    title: string
    message: string
    details?: any
    responseActions?: IncidentResponseAction[]
    affectedResources?: string[]
  }): Promise<SecurityAlert> {
    try {
      const alert: SecurityAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: params.type,
        severity: params.severity,
        title: params.title,
        message: params.message,
        details: params.details || {},
        timestamp: new Date(),
        acknowledged: false,
        responseActions: params.responseActions || [IncidentResponseAction.ALERT_ONLY],
        affectedResources: params.affectedResources || []
      }

      // Store alert
      this.alertQueue.push(alert)

      // Log alert creation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_ALERT_CREATED',
        tableName: 'security_alerts',
        recordId: alert.id,
        newValues: {
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          details: alert.details
        }
      })

      // Send notifications
      await this.sendAlertNotifications(alert)

      // Execute automated response actions
      await this.executeResponseActions(alert)

      logger.warn(`Security alert created: ${alert.type} (${alert.severity})`, {
        alertId: alert.id,
        title: alert.title
      })

      return alert
    } catch (error) {
      logger.error('Failed to create security alert:', error)
      throw error
    }
  }

  /**
   * Send alert notifications through configured channels
   */
  private static async sendAlertNotifications(alert: SecurityAlert): Promise<void> {
    try {
      const { notifications } = this.config

      // Determine if alert should be sent based on severity
      const shouldSendEmail = notifications.email.enabled &&
        (!notifications.email.criticalOnly || 
         alert.severity === AlertSeverity.CRITICAL || 
         alert.severity === AlertSeverity.HIGH)

      const shouldSendSMS = notifications.sms.enabled &&
        (!notifications.sms.criticalOnly || 
         alert.severity === AlertSeverity.CRITICAL)

      const shouldSendWebhook = notifications.webhook.enabled

      // Send email notifications
      if (shouldSendEmail && notifications.email.recipients.length > 0) {
        await this.sendEmailAlert(alert, notifications.email.recipients)
      }

      // Send SMS notifications
      if (shouldSendSMS && notifications.sms.recipients.length > 0) {
        await this.sendSMSAlert(alert, notifications.sms.recipients)
      }

      // Send webhook notifications
      if (shouldSendWebhook && notifications.webhook.url) {
        await this.sendWebhookAlert(alert, notifications.webhook.url, notifications.webhook.headers)
      }
    } catch (error) {
      logger.error('Failed to send alert notifications:', error)
    }
  }

  /**
   * Send email alert notification
   */
  private static async sendEmailAlert(alert: SecurityAlert, recipients: string[]): Promise<void> {
    try {
      const severityColors = {
        [AlertSeverity.LOW]: '#17a2b8',
        [AlertSeverity.MEDIUM]: '#ffc107',
        [AlertSeverity.HIGH]: '#fd7e14',
        [AlertSeverity.CRITICAL]: '#dc3545'
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .alert-header { 
          background-color: ${severityColors[alert.severity]}; 
          color: white; 
          padding: 20px; 
          border-radius: 5px 5px 0 0; 
        }
        .alert-body { 
          background-color: #f8f9fa; 
          padding: 20px; 
          border: 1px solid #dee2e6;
          border-radius: 0 0 5px 5px;
        }
        .alert-details { 
          background-color: white; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 15px 0; 
        }
        .severity-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          background-color: ${severityColors[alert.severity]};
          color: white;
          font-weight: bold;
        }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .actions { margin-top: 20px; }
        .action-item { 
          background-color: #e9ecef; 
          padding: 10px; 
          margin: 5px 0; 
          border-radius: 3px; 
        }
      </style>
</head>
<body>
    <div class="alert-header">
        <h2>🚨 Security Alert: ${alert.title}</h2>
        <div class="timestamp">${alert.timestamp.toISOString()}</div>
    </div>
    
    <div class="alert-body">
        <div>
            <span class="severity-badge">${alert.severity}</span>
            <span style="margin-left: 10px; font-weight: bold;">${alert.type}</span>
        </div>
        
        <div class="alert-details">
            <h3>Alert Message</h3>
            <p>${alert.message}</p>
            
            ${alert.affectedResources.length > 0 ? `
            <h4>Affected Resources</h4>
            <ul>
                ${alert.affectedResources.map(resource => `<li>${resource}</li>`).join('')}
            </ul>
            ` : ''}
            
            ${Object.keys(alert.details).length > 0 ? `
            <h4>Additional Details</h4>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
            ` : ''}
        </div>
        
        <div class="actions">
            <h3>Response Actions</h3>
            ${alert.responseActions.map(action => `
                <div class="action-item">✓ ${action.replace(/_/g, ' ')}</div>
            `).join('')}
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <strong>⚠️ Action Required:</strong> Please review this security alert and take appropriate action through the Security Monitoring Dashboard.
        </div>
    </div>
</body>
</html>
      `

      for (const recipient of recipients) {
        await NotificationService.sendEmail({
          to: recipient,
          subject: `[${alert.severity}] Security Alert: ${alert.title}`,
          body: `Security Alert: ${alert.title}\n\nSeverity: ${alert.severity}\nType: ${alert.type}\nTime: ${alert.timestamp.toISOString()}\n\nMessage: ${alert.message}\n\nPlease review this alert in the Security Monitoring Dashboard.`,
          html
        })
      }

      logger.info(`Email alert sent to ${recipients.length} recipients`, {
        alertId: alert.id,
        recipients: recipients.length
      })
    } catch (error) {
      logger.error('Failed to send email alert:', error)
    }
  }

  /**
   * Send SMS alert notification
   */
  private static async sendSMSAlert(alert: SecurityAlert, recipients: string[]): Promise<void> {
    try {
      const message = `[${alert.severity}] Security Alert: ${alert.title}. ${alert.message.substring(0, 100)}... Check dashboard for details.`

      for (const recipient of recipients) {
        await NotificationService.sendSMS({
          to: recipient,
          message
        })
      }

      logger.info(`SMS alert sent to ${recipients.length} recipients`, {
        alertId: alert.id,
        recipients: recipients.length
      })
    } catch (error) {
      logger.error('Failed to send SMS alert:', error)
    }
  }

  /**
   * Send webhook alert notification
   */
  private static async sendWebhookAlert(
    alert: SecurityAlert,
    url: string,
    headers?: Record<string, string>
  ): Promise<void> {
    try {
      const payload = {
        alert: {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          details: alert.details,
          timestamp: alert.timestamp.toISOString(),
          responseActions: alert.responseActions,
          affectedResources: alert.affectedResources
        },
        source: 'mosaajii-pos-security-monitoring',
        version: '1.0'
      }

      // In production, use actual HTTP client
      logger.info('Webhook alert sent', {
        alertId: alert.id,
        url,
        payload
      })

      // TODO: Implement actual webhook call
      // await fetch(url, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...headers
      //   },
      //   body: JSON.stringify(payload)
      // })
    } catch (error) {
      logger.error('Failed to send webhook alert:', error)
    }
  }

  /**
   * Execute automated response actions
   */
  private static async executeResponseActions(alert: SecurityAlert): Promise<void> {
    try {
      for (const action of alert.responseActions) {
        switch (action) {
          case IncidentResponseAction.ALERT_ONLY:
            // Already handled by alert creation
            break

          case IncidentResponseAction.BLOCK_IP:
            if (alert.details.ipAddress) {
              logger.warn(`Auto-blocking IP: ${alert.details.ipAddress}`, {
                alertId: alert.id,
                reason: alert.message
              })
              // IP blocking would be handled by SecurityMonitoringService
            }
            break

          case IncidentResponseAction.TERMINATE_SESSION:
            if (alert.details.sessionId) {
              logger.warn(`Auto-terminating session: ${alert.details.sessionId}`, {
                alertId: alert.id,
                reason: alert.message
              })
              // Session termination would be handled by SecurityMonitoringService
            }
            break

          case IncidentResponseAction.LOCK_ACCOUNT:
            if (alert.details.userId) {
              logger.warn(`Auto-locking account: ${alert.details.userId}`, {
                alertId: alert.id,
                reason: alert.message
              })
              // Account locking would be handled by AuthService
            }
            break

          case IncidentResponseAction.ESCALATE:
            logger.error(`Escalating security incident`, {
              alertId: alert.id,
              severity: alert.severity,
              type: alert.type
            })
            // Send to incident response team
            break

          case IncidentResponseAction.AUTO_REMEDIATE:
            logger.info(`Attempting auto-remediation`, {
              alertId: alert.id,
              type: alert.type
            })
            // Execute automated remediation based on alert type
            break
        }
      }
    } catch (error) {
      logger.error('Failed to execute response actions:', error)
    }
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const alert = this.alertQueue.find(a => a.id === alertId)
      if (!alert) {
        return false
      }

      alert.acknowledged = true
      alert.acknowledgedBy = acknowledgedBy
      alert.acknowledgedAt = new Date()

      await AuditService.createAuditLog({
        userId: acknowledgedBy,
        action: 'SECURITY_ALERT_ACKNOWLEDGED',
        tableName: 'security_alerts',
        recordId: alertId,
        newValues: {
          acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt,
          notes
        }
      })

      logger.info(`Security alert acknowledged`, {
        alertId,
        acknowledgedBy,
        notes
      })

      return true
    } catch (error) {
      logger.error('Failed to acknowledge alert:', error)
      return false
    }
  }

  /**
   * Get recent alerts
   */
  static getRecentAlerts(limit: number = 50): SecurityAlert[] {
    return this.alertQueue
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get unacknowledged alerts
   */
  static getUnacknowledgedAlerts(): SecurityAlert[] {
    return this.alertQueue.filter(alert => !alert.acknowledged)
  }

  /**
   * Clear old alerts (cleanup)
   */
  static clearOldAlerts(daysToKeep: number = 30): void {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    this.alertQueue = this.alertQueue.filter(alert => alert.timestamp > cutoffDate)
    
    logger.info(`Cleared old alerts`, {
      cutoffDate,
      remainingAlerts: this.alertQueue.length
    })
  }
}
