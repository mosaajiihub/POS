import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { SecurityAlertingService } from './securityAlertingService'
import { AlertSeverity, AlertType, IncidentResponseAction } from '../config/securityMonitoring'

export interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  status: IncidentStatus
  type: IncidentType
  detectedAt: Date
  resolvedAt?: Date
  assignedTo?: string
  affectedSystems: string[]
  indicators: IncidentIndicator[]
  timeline: IncidentTimelineEntry[]
  responseActions: ResponseAction[]
  rootCause?: string
  remediation?: string
  lessonsLearned?: string
}

export enum IncidentStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  ERADICATED = 'ERADICATED',
  RECOVERING = 'RECOVERING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum IncidentType {
  BRUTE_FORCE_ATTACK = 'BRUTE_FORCE_ATTACK',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_BREACH = 'DATA_BREACH',
  MALWARE = 'MALWARE',
  DDOS_ATTACK = 'DDOS_ATTACK',
  INSIDER_THREAT = 'INSIDER_THREAT',
  PHISHING = 'PHISHING',
  VULNERABILITY_EXPLOIT = 'VULNERABILITY_EXPLOIT',
  SYSTEM_COMPROMISE = 'SYSTEM_COMPROMISE',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION'
}

export interface IncidentIndicator {
  type: string
  value: string
  confidence: number
  source: string
  timestamp: Date
}

export interface IncidentTimelineEntry {
  timestamp: Date
  event: string
  actor: string
  details: any
}

export interface ResponseAction {
  action: string
  executedBy: string
  executedAt: Date
  result: string
  automated: boolean
}

/**
 * Incident Response Service
 * Handles security incident detection, response, and management
 */
export class IncidentResponseService {
  private static incidents: Map<string, SecurityIncident> = new Map()
  private static incidentPlaybooks: Map<IncidentType, IncidentPlaybook> = new Map()

  /**
   * Initialize incident response playbooks
   */
  static initialize(): void {
    this.loadPlaybooks()
    logger.info('Incident Response Service initialized')
  }

  /**
   * Create security incident
   */
  static async createIncident(params: {
    title: string
    description: string
    severity: AlertSeverity
    type: IncidentType
    affectedSystems: string[]
    indicators?: IncidentIndicator[]
  }): Promise<SecurityIncident> {
    try {
      const incident: SecurityIncident = {
        id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: params.title,
        description: params.description,
        severity: params.severity,
        status: IncidentStatus.DETECTED,
        type: params.type,
        detectedAt: new Date(),
        affectedSystems: params.affectedSystems,
        indicators: params.indicators || [],
        timeline: [{
          timestamp: new Date(),
          event: 'Incident detected',
          actor: 'system',
          details: { description: params.description }
        }],
        responseActions: []
      }

      this.incidents.set(incident.id, incident)

      // Log incident creation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_INCIDENT_CREATED',
        tableName: 'security_incidents',
        recordId: incident.id,
        newValues: {
          title: incident.title,
          severity: incident.severity,
          type: incident.type,
          status: incident.status
        }
      })

      // Create security alert
      await SecurityAlertingService.createAlert({
        type: AlertType.SYSTEM_COMPROMISE,
        severity: params.severity,
        title: `Security Incident: ${params.title}`,
        message: params.description,
        details: {
          incidentId: incident.id,
          type: params.type,
          affectedSystems: params.affectedSystems
        },
        responseActions: [IncidentResponseAction.ESCALATE],
        affectedResources: params.affectedSystems
      })

      // Execute automated response based on playbook
      await this.executePlaybook(incident)

      logger.error(`Security incident created: ${incident.type}`, {
        incidentId: incident.id,
        severity: incident.severity
      })

      return incident
    } catch (error) {
      logger.error('Failed to create security incident:', error)
      throw error
    }
  }

  /**
   * Update incident status
   */
  static async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    updatedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const incident = this.incidents.get(incidentId)
      if (!incident) {
        return false
      }

      const oldStatus = incident.status
      incident.status = status

      if (status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED) {
        incident.resolvedAt = new Date()
      }

      // Add timeline entry
      incident.timeline.push({
        timestamp: new Date(),
        event: `Status changed from ${oldStatus} to ${status}`,
        actor: updatedBy,
        details: { notes }
      })

      await AuditService.createAuditLog({
        userId: updatedBy,
        action: 'SECURITY_INCIDENT_STATUS_UPDATED',
        tableName: 'security_incidents',
        recordId: incidentId,
        oldValues: { status: oldStatus },
        newValues: { status, notes }
      })

      logger.info(`Incident status updated`, {
        incidentId,
        oldStatus,
        newStatus: status,
        updatedBy
      })

      return true
    } catch (error) {
      logger.error('Failed to update incident status:', error)
      return false
    }
  }

  /**
   * Add response action to incident
   */
  static async addResponseAction(
    incidentId: string,
    action: string,
    executedBy: string,
    result: string,
    automated: boolean = false
  ): Promise<boolean> {
    try {
      const incident = this.incidents.get(incidentId)
      if (!incident) {
        return false
      }

      const responseAction: ResponseAction = {
        action,
        executedBy,
        executedAt: new Date(),
        result,
        automated
      }

      incident.responseActions.push(responseAction)

      incident.timeline.push({
        timestamp: new Date(),
        event: `Response action executed: ${action}`,
        actor: executedBy,
        details: { result, automated }
      })

      await AuditService.createAuditLog({
        userId: executedBy,
        action: 'INCIDENT_RESPONSE_ACTION',
        tableName: 'security_incidents',
        recordId: incidentId,
        newValues: responseAction
      })

      logger.info(`Response action added to incident`, {
        incidentId,
        action,
        executedBy,
        automated
      })

      return true
    } catch (error) {
      logger.error('Failed to add response action:', error)
      return false
    }
  }

  /**
   * Execute incident response playbook
   */
  private static async executePlaybook(incident: SecurityIncident): Promise<void> {
    try {
      const playbook = this.incidentPlaybooks.get(incident.type)
      if (!playbook) {
        logger.warn(`No playbook found for incident type: ${incident.type}`)
        return
      }

      logger.info(`Executing playbook for incident type: ${incident.type}`, {
        incidentId: incident.id,
        playbookSteps: playbook.steps.length
      })

      for (const step of playbook.steps) {
        if (step.automated) {
          await this.executeAutomatedStep(incident, step)
        }
      }
    } catch (error) {
      logger.error('Failed to execute playbook:', error)
    }
  }

  /**
   * Execute automated playbook step
   */
  private static async executeAutomatedStep(
    incident: SecurityIncident,
    step: PlaybookStep
  ): Promise<void> {
    try {
      logger.info(`Executing automated step: ${step.action}`, {
        incidentId: incident.id,
        step: step.action
      })

      let result = 'Executed successfully'

      // Execute step based on action type
      switch (step.action) {
        case 'ISOLATE_AFFECTED_SYSTEMS':
          result = 'Systems isolated (simulated)'
          break
        case 'BLOCK_MALICIOUS_IPS':
          result = 'IPs blocked (simulated)'
          break
        case 'TERMINATE_SUSPICIOUS_SESSIONS':
          result = 'Sessions terminated (simulated)'
          break
        case 'COLLECT_FORENSIC_DATA':
          result = 'Forensic data collected (simulated)'
          break
        case 'NOTIFY_SECURITY_TEAM':
          result = 'Security team notified'
          break
        default:
          result = 'Action not implemented'
      }

      await this.addResponseAction(
        incident.id,
        step.action,
        'system',
        result,
        true
      )
    } catch (error) {
      logger.error('Failed to execute automated step:', error)
    }
  }

  /**
   * Get incident by ID
   */
  static getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId)
  }

  /**
   * Get all incidents
   */
  static getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }

  /**
   * Get active incidents
   */
  static getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => 
        incident.status !== IncidentStatus.RESOLVED &&
        incident.status !== IncidentStatus.CLOSED
      )
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }

  /**
   * Load incident response playbooks
   */
  private static loadPlaybooks(): void {
    // Brute Force Attack Playbook
    this.incidentPlaybooks.set(IncidentType.BRUTE_FORCE_ATTACK, {
      type: IncidentType.BRUTE_FORCE_ATTACK,
      name: 'Brute Force Attack Response',
      steps: [
        {
          order: 1,
          action: 'BLOCK_MALICIOUS_IPS',
          description: 'Block IP addresses involved in brute force attack',
          automated: true
        },
        {
          order: 2,
          action: 'NOTIFY_SECURITY_TEAM',
          description: 'Notify security team of brute force attack',
          automated: true
        },
        {
          order: 3,
          action: 'REVIEW_AFFECTED_ACCOUNTS',
          description: 'Review and secure affected user accounts',
          automated: false
        },
        {
          order: 4,
          action: 'UPDATE_SECURITY_RULES',
          description: 'Update rate limiting and security rules',
          automated: false
        }
      ]
    })

    // Unauthorized Access Playbook
    this.incidentPlaybooks.set(IncidentType.UNAUTHORIZED_ACCESS, {
      type: IncidentType.UNAUTHORIZED_ACCESS,
      name: 'Unauthorized Access Response',
      steps: [
        {
          order: 1,
          action: 'TERMINATE_SUSPICIOUS_SESSIONS',
          description: 'Terminate all suspicious sessions',
          automated: true
        },
        {
          order: 2,
          action: 'LOCK_AFFECTED_ACCOUNTS',
          description: 'Lock affected user accounts',
          automated: true
        },
        {
          order: 3,
          action: 'COLLECT_FORENSIC_DATA',
          description: 'Collect forensic data for investigation',
          automated: true
        },
        {
          order: 4,
          action: 'NOTIFY_SECURITY_TEAM',
          description: 'Notify security team and affected users',
          automated: true
        },
        {
          order: 5,
          action: 'INVESTIGATE_ACCESS_LOGS',
          description: 'Investigate access logs and audit trails',
          automated: false
        }
      ]
    })

    // System Compromise Playbook
    this.incidentPlaybooks.set(IncidentType.SYSTEM_COMPROMISE, {
      type: IncidentType.SYSTEM_COMPROMISE,
      name: 'System Compromise Response',
      steps: [
        {
          order: 1,
          action: 'ISOLATE_AFFECTED_SYSTEMS',
          description: 'Isolate compromised systems from network',
          automated: true
        },
        {
          order: 2,
          action: 'COLLECT_FORENSIC_DATA',
          description: 'Collect forensic evidence',
          automated: true
        },
        {
          order: 3,
          action: 'NOTIFY_SECURITY_TEAM',
          description: 'Escalate to security team immediately',
          automated: true
        },
        {
          order: 4,
          action: 'ASSESS_DAMAGE',
          description: 'Assess extent of compromise',
          automated: false
        },
        {
          order: 5,
          action: 'RESTORE_FROM_BACKUP',
          description: 'Restore systems from clean backups',
          automated: false
        }
      ]
    })

    logger.info(`Loaded ${this.incidentPlaybooks.size} incident response playbooks`)
  }
}

interface IncidentPlaybook {
  type: IncidentType
  name: string
  steps: PlaybookStep[]
}

interface PlaybookStep {
  order: number
  action: string
  description: string
  automated: boolean
}

// Initialize service
IncidentResponseService.initialize()
