import { logger } from '../utils/logger'
import { prisma } from '../config/database'

/**
 * GDPR Compliance Service
 * Implements GDPR compliance framework for data privacy and protection
 */

export interface ConsentRecord {
  id: string
  userId: string
  consentType: ConsentType
  granted: boolean
  grantedAt?: Date
  revokedAt?: Date
  ipAddress?: string
  userAgent?: string
  version: string
}

export type ConsentType = 
  | 'DATA_PROCESSING'
  | 'MARKETING'
  | 'ANALYTICS'
  | 'THIRD_PARTY_SHARING'
  | 'PROFILING'

export interface DataSubjectRequest {
  id: string
  userId: string
  requestType: DataSubjectRequestType
  status: RequestStatus
  requestedAt: Date
  completedAt?: Date
  data?: any
}

export type DataSubjectRequestType =
  | 'ACCESS' // Right to access
  | 'RECTIFICATION' // Right to rectification
  | 'ERASURE' // Right to erasure (right to be forgotten)
  | 'PORTABILITY' // Right to data portability
  | 'RESTRICTION' // Right to restriction of processing
  | 'OBJECTION' // Right to object

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'

export interface LawfulBasis {
  basis: LawfulBasisType
  description: string
  dataCategories: string[]
  purposes: string[]
}

export type LawfulBasisType =
  | 'CONSENT'
  | 'CONTRACT'
  | 'LEGAL_OBLIGATION'
  | 'VITAL_INTERESTS'
  | 'PUBLIC_TASK'
  | 'LEGITIMATE_INTERESTS'

export interface BreachNotification {
  id: string
  breachType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  affectedRecords: number
  affectedUsers: string[]
  detectedAt: Date
  reportedAt?: Date
  description: string
  mitigationSteps: string[]
  status: 'DETECTED' | 'REPORTED' | 'MITIGATED' | 'CLOSED'
}

export interface GDPRComplianceReport {
  reportId: string
  generatedAt: Date
  consentCompliance: {
    totalUsers: number
    usersWithConsent: number
    complianceRate: number
  }
  dataSubjectRequests: {
    total: number
    pending: number
    completed: number
    averageCompletionTime: number
  }
  breaches: {
    total: number
    byStatus: Record<string, number>
  }
  recommendations: string[]
}

export class GDPRComplianceService {
  /**
   * Record user consent (GDPR Article 7)
   */
  static async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    try {
      const version = '1.0' // Version of consent terms

      const consent: ConsentRecord = {
        id: `consent_${Date.now()}`,
        userId,
        consentType,
        granted,
        grantedAt: granted ? new Date() : undefined,
        revokedAt: !granted ? new Date() : undefined,
        ipAddress,
        userAgent,
        version
      }

      // Store consent record
      await this.storeConsentRecord(consent)

      // Audit log
      await this.logGDPREvent({
        eventType: 'CONSENT_RECORDED',
        userId,
        action: granted ? 'GRANT' : 'REVOKE',
        resource: 'CONSENT',
        details: { consentType, version }
      })

      logger.info(`Consent recorded for user ${userId}: ${consentType} = ${granted}`)

      return consent
    } catch (error) {
      logger.error('Record consent error:', error)
      throw new Error('Failed to record consent')
    }
  }

  /**
   * Get user consent status
   */
  static async getUserConsent(userId: string, consentType?: ConsentType): Promise<ConsentRecord[]> {
    try {
      // Retrieve consent records from storage
      const consents = await this.retrieveConsentRecords(userId, consentType)
      return consents
    } catch (error) {
      logger.error('Get user consent error:', error)
      throw new Error('Failed to retrieve consent')
    }
  }

  /**
   * Handle data subject access request (GDPR Article 15)
   */
  static async handleAccessRequest(userId: string): Promise<DataSubjectRequest> {
    try {
      const requestId = `dsr_${Date.now()}`

      // Collect all user data
      const userData = await this.collectUserData(userId)

      const request: DataSubjectRequest = {
        id: requestId,
        userId,
        requestType: 'ACCESS',
        status: 'COMPLETED',
        requestedAt: new Date(),
        completedAt: new Date(),
        data: userData
      }

      // Store request
      await this.storeDataSubjectRequest(request)

      // Audit log
      await this.logGDPREvent({
        eventType: 'DATA_ACCESS_REQUEST',
        userId,
        action: 'ACCESS',
        resource: 'USER_DATA',
        details: { requestId }
      })

      logger.info(`Data access request completed for user ${userId}`)

      return request
    } catch (error) {
      logger.error('Handle access request error:', error)
      throw new Error('Failed to process access request')
    }
  }

  /**
   * Handle data erasure request (GDPR Article 17 - Right to be forgotten)
   */
  static async handleErasureRequest(userId: string, reason?: string): Promise<DataSubjectRequest> {
    try {
      const requestId = `dsr_${Date.now()}`

      // Validate if erasure is allowed
      const canErase = await this.validateErasureRequest(userId)

      if (!canErase.allowed) {
        const request: DataSubjectRequest = {
          id: requestId,
          userId,
          requestType: 'ERASURE',
          status: 'REJECTED',
          requestedAt: new Date(),
          data: { reason: canErase.reason }
        }

        await this.storeDataSubjectRequest(request)
        return request
      }

      // Anonymize or delete user data
      await this.eraseUserData(userId)

      const request: DataSubjectRequest = {
        id: requestId,
        userId,
        requestType: 'ERASURE',
        status: 'COMPLETED',
        requestedAt: new Date(),
        completedAt: new Date()
      }

      await this.storeDataSubjectRequest(request)

      // Audit log
      await this.logGDPREvent({
        eventType: 'DATA_ERASURE_REQUEST',
        userId,
        action: 'ERASE',
        resource: 'USER_DATA',
        details: { requestId, reason }
      })

      logger.info(`Data erasure request completed for user ${userId}`)

      return request
    } catch (error) {
      logger.error('Handle erasure request error:', error)
      throw new Error('Failed to process erasure request')
    }
  }

  /**
   * Handle data portability request (GDPR Article 20)
   */
  static async handlePortabilityRequest(userId: string, format: 'JSON' | 'CSV' = 'JSON'): Promise<DataSubjectRequest> {
    try {
      const requestId = `dsr_${Date.now()}`

      // Collect user data in portable format
      const userData = await this.collectUserData(userId)
      const portableData = format === 'JSON' 
        ? JSON.stringify(userData, null, 2)
        : this.convertToCSV(userData)

      const request: DataSubjectRequest = {
        id: requestId,
        userId,
        requestType: 'PORTABILITY',
        status: 'COMPLETED',
        requestedAt: new Date(),
        completedAt: new Date(),
        data: { format, data: portableData }
      }

      await this.storeDataSubjectRequest(request)

      // Audit log
      await this.logGDPREvent({
        eventType: 'DATA_PORTABILITY_REQUEST',
        userId,
        action: 'EXPORT',
        resource: 'USER_DATA',
        details: { requestId, format }
      })

      logger.info(`Data portability request completed for user ${userId}`)

      return request
    } catch (error) {
      logger.error('Handle portability request error:', error)
      throw new Error('Failed to process portability request')
    }
  }

  /**
   * Validate lawful basis for data processing (GDPR Article 6)
   */
  static async validateLawfulBasis(
    userId: string,
    processingPurpose: string
  ): Promise<{ valid: boolean; basis?: LawfulBasis; reason?: string }> {
    try {
      // Check if user has given consent
      const consents = await this.getUserConsent(userId, 'DATA_PROCESSING')
      const hasConsent = consents.some(c => c.granted && !c.revokedAt)

      if (hasConsent) {
        return {
          valid: true,
          basis: {
            basis: 'CONSENT',
            description: 'User has provided explicit consent',
            dataCategories: ['personal_data', 'transaction_data'],
            purposes: [processingPurpose]
          }
        }
      }

      // Check other lawful bases (contract, legal obligation, etc.)
      // This is a simplified implementation
      return {
        valid: false,
        reason: 'No valid lawful basis for data processing'
      }
    } catch (error) {
      logger.error('Validate lawful basis error:', error)
      throw new Error('Failed to validate lawful basis')
    }
  }

  /**
   * Report data breach (GDPR Article 33)
   */
  static async reportDataBreach(breach: Omit<BreachNotification, 'id' | 'reportedAt' | 'status'>): Promise<BreachNotification> {
    try {
      const breachNotification: BreachNotification = {
        id: `breach_${Date.now()}`,
        ...breach,
        reportedAt: new Date(),
        status: 'REPORTED'
      }

      // Store breach notification
      await this.storeBreachNotification(breachNotification)

      // Notify supervisory authority if required (within 72 hours)
      if (breach.severity === 'HIGH' || breach.severity === 'CRITICAL') {
        await this.notifySupervisoryAuthority(breachNotification)
      }

      // Notify affected users
      await this.notifyAffectedUsers(breachNotification)

      // Audit log
      await this.logGDPREvent({
        eventType: 'DATA_BREACH_REPORTED',
        userId: 'SYSTEM',
        action: 'REPORT',
        resource: 'DATA_BREACH',
        details: { breachId: breachNotification.id, severity: breach.severity }
      })

      logger.warn(`Data breach reported: ${breachNotification.id}`)

      return breachNotification
    } catch (error) {
      logger.error('Report data breach error:', error)
      throw new Error('Failed to report data breach')
    }
  }

  /**
   * Generate GDPR compliance report
   */
  static async generateComplianceReport(): Promise<GDPRComplianceReport> {
    try {
      const reportId = `gdpr_report_${Date.now()}`

      // Collect compliance metrics
      const consentMetrics = await this.getConsentMetrics()
      const requestMetrics = await this.getDataSubjectRequestMetrics()
      const breachMetrics = await this.getBreachMetrics()
      const recommendations = this.generateRecommendations(consentMetrics, requestMetrics, breachMetrics)

      const report: GDPRComplianceReport = {
        reportId,
        generatedAt: new Date(),
        consentCompliance: consentMetrics,
        dataSubjectRequests: requestMetrics,
        breaches: breachMetrics,
        recommendations
      }

      logger.info(`GDPR compliance report generated: ${reportId}`)

      return report
    } catch (error) {
      logger.error('Generate GDPR compliance report error:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  // Private helper methods

  private static async collectUserData(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          sales: true,
          payments: true,
          auditLogs: {
            take: 100,
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Remove sensitive data
      const { passwordHash, mfaSecret, mfaBackupCodes, ...userData } = user

      return {
        personalData: userData,
        collectedAt: new Date(),
        dataCategories: ['identity', 'contact', 'transaction', 'audit']
      }
    } catch (error) {
      logger.error('Collect user data error:', error)
      throw error
    }
  }

  private static async eraseUserData(userId: string): Promise<void> {
    try {
      // Anonymize user data instead of hard delete (for audit trail)
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@anonymized.local`,
          firstName: 'DELETED',
          lastName: 'USER',
          passwordHash: 'DELETED',
          mfaSecret: null,
          mfaBackupCodes: null,
          status: 'INACTIVE'
        }
      })

      logger.info(`User data erased: ${userId}`)
    } catch (error) {
      logger.error('Erase user data error:', error)
      throw error
    }
  }

  private static async validateErasureRequest(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if user has active transactions or legal obligations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sales: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
            }
          }
        }
      }
    })

    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // Allow erasure if no recent transactions
    if (user.sales.length === 0) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: 'User has recent transactions. Data must be retained for legal compliance.'
    }
  }

  private static convertToCSV(data: any): string {
    // Simple CSV conversion
    const headers = Object.keys(data.personalData || {})
    const values = Object.values(data.personalData || {})
    
    return `${headers.join(',')}\n${values.join(',')}`
  }

  private static async storeConsentRecord(consent: ConsentRecord): Promise<void> {
    // Store in audit log for now
    await prisma.auditLog.create({
      data: {
        action: 'GDPR_CONSENT',
        tableName: 'CONSENT',
        recordId: consent.id,
        newValues: consent,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        userId: consent.userId
      }
    })
  }

  private static async retrieveConsentRecords(userId: string, consentType?: ConsentType): Promise<ConsentRecord[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'GDPR_CONSENT',
        ...(consentType && {
          newValues: {
            path: ['consentType'],
            equals: consentType
          }
        })
      },
      orderBy: { createdAt: 'desc' }
    })

    return logs.map(log => log.newValues as any as ConsentRecord)
  }

  private static async storeDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'GDPR_DATA_SUBJECT_REQUEST',
        tableName: 'DATA_SUBJECT_REQUEST',
        recordId: request.id,
        newValues: request,
        userId: request.userId
      }
    })
  }

  private static async storeBreachNotification(breach: BreachNotification): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'GDPR_BREACH_NOTIFICATION',
        tableName: 'BREACH_NOTIFICATION',
        recordId: breach.id,
        newValues: breach,
        userId: 'SYSTEM'
      }
    })
  }

  private static async notifySupervisoryAuthority(breach: BreachNotification): Promise<void> {
    // In production, integrate with supervisory authority notification system
    logger.warn(`Supervisory authority notification required for breach: ${breach.id}`)
  }

  private static async notifyAffectedUsers(breach: BreachNotification): Promise<void> {
    // Notify affected users
    logger.info(`Notifying ${breach.affectedUsers.length} affected users`)
  }

  private static async logGDPREvent(event: {
    eventType: string
    userId: string
    action: string
    resource: string
    details?: any
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: `GDPR_${event.eventType}`,
        tableName: event.resource,
        recordId: event.details?.requestId || event.details?.breachId || 'N/A',
        newValues: event.details,
        userId: event.userId
      }
    })
  }

  private static async getConsentMetrics(): Promise<any> {
    const totalUsers = await prisma.user.count()
    const usersWithConsent = await prisma.auditLog.count({
      where: {
        action: 'GDPR_CONSENT',
        newValues: {
          path: ['granted'],
          equals: true
        }
      },
      distinct: ['userId']
    })

    return {
      totalUsers,
      usersWithConsent,
      complianceRate: totalUsers > 0 ? Math.round((usersWithConsent / totalUsers) * 100) : 0
    }
  }

  private static async getDataSubjectRequestMetrics(): Promise<any> {
    const requests = await prisma.auditLog.findMany({
      where: {
        action: 'GDPR_DATA_SUBJECT_REQUEST'
      }
    })

    const pending = requests.filter(r => (r.newValues as any).status === 'PENDING').length
    const completed = requests.filter(r => (r.newValues as any).status === 'COMPLETED').length

    return {
      total: requests.length,
      pending,
      completed,
      averageCompletionTime: 24 // hours (mock)
    }
  }

  private static async getBreachMetrics(): Promise<any> {
    const breaches = await prisma.auditLog.findMany({
      where: {
        action: 'GDPR_BREACH_NOTIFICATION'
      }
    })

    const byStatus = breaches.reduce((acc, breach) => {
      const status = (breach.newValues as any).status
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: breaches.length,
      byStatus
    }
  }

  private static generateRecommendations(
    consentMetrics: any,
    requestMetrics: any,
    breachMetrics: any
  ): string[] {
    const recommendations: string[] = []

    if (consentMetrics.complianceRate < 80) {
      recommendations.push('Improve consent collection rate to meet GDPR requirements')
    }

    if (requestMetrics.pending > 0) {
      recommendations.push('Process pending data subject requests within 30 days')
    }

    if (breachMetrics.total > 0) {
      recommendations.push('Review and strengthen data breach prevention measures')
    }

    recommendations.push('Conduct regular GDPR compliance audits')
    recommendations.push('Provide GDPR training to all staff members')
    recommendations.push('Review and update privacy policies regularly')

    return recommendations
  }
}
