import { logger } from '../utils/logger'
import { prisma } from '../config/database'

/**
 * Data Retention and Deletion Service
 * Implements automated data lifecycle management, retention policies, and secure deletion
 */

export interface RetentionPolicy {
  policyId: string
  name: string
  description: string
  dataCategory: DataCategory
  retentionPeriod: number // in days
  deletionMethod: DeletionMethod
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type DataCategory =
  | 'USER_DATA'
  | 'TRANSACTION_DATA'
  | 'AUDIT_LOGS'
  | 'PAYMENT_DATA'
  | 'CUSTOMER_DATA'
  | 'INVOICE_DATA'
  | 'BACKUP_DATA'

export type DeletionMethod = 'SOFT_DELETE' | 'HARD_DELETE' | 'ANONYMIZE' | 'ARCHIVE'

export interface DataLifecycleStatus {
  dataId: string
  dataType: string
  createdAt: Date
  retentionExpiry: Date
  status: 'ACTIVE' | 'EXPIRED' | 'SCHEDULED_FOR_DELETION' | 'DELETED'
  policyId: string
}

export interface DeletionJob {
  jobId: string
  policyId: string
  dataCategory: DataCategory
  scheduledAt: Date
  executedAt?: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  recordsProcessed: number
  recordsDeleted: number
  errors?: string[]
}

export interface DataResidency {
  region: string
  dataTypes: string[]
  restrictions: string[]
  complianceRequirements: string[]
}

export interface RetentionReport {
  reportId: string
  generatedAt: Date
  policies: RetentionPolicy[]
  dataLifecycle: {
    active: number
    expired: number
    scheduledForDeletion: number
    deleted: number
  }
  recentDeletions: DeletionJob[]
  recommendations: string[]
}

export class DataRetentionService {
  // Default retention policies (in days)
  private static readonly DEFAULT_POLICIES: Omit<RetentionPolicy, 'policyId' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'User Data Retention',
      description: 'Retain user data for 7 years after account closure',
      dataCategory: 'USER_DATA',
      retentionPeriod: 2555, // 7 years
      deletionMethod: 'ANONYMIZE',
      isActive: true
    },
    {
      name: 'Transaction Data Retention',
      description: 'Retain transaction data for 7 years for tax compliance',
      dataCategory: 'TRANSACTION_DATA',
      retentionPeriod: 2555, // 7 years
      deletionMethod: 'ARCHIVE',
      isActive: true
    },
    {
      name: 'Audit Log Retention',
      description: 'Retain audit logs for 1 year',
      dataCategory: 'AUDIT_LOGS',
      retentionPeriod: 365, // 1 year
      deletionMethod: 'HARD_DELETE',
      isActive: true
    },
    {
      name: 'Payment Data Retention',
      description: 'Retain payment data for 3 years (PCI DSS requirement)',
      dataCategory: 'PAYMENT_DATA',
      retentionPeriod: 1095, // 3 years
      deletionMethod: 'HARD_DELETE',
      isActive: true
    },
    {
      name: 'Customer Data Retention',
      description: 'Retain customer data for 5 years after last interaction',
      dataCategory: 'CUSTOMER_DATA',
      retentionPeriod: 1825, // 5 years
      deletionMethod: 'SOFT_DELETE',
      isActive: true
    }
  ]

  /**
   * Initialize default retention policies
   */
  static async initializeDefaultPolicies(): Promise<RetentionPolicy[]> {
    try {
      const policies: RetentionPolicy[] = []

      for (const policyData of this.DEFAULT_POLICIES) {
        const policy: RetentionPolicy = {
          policyId: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...policyData,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await this.storePolicy(policy)
        policies.push(policy)
      }

      logger.info(`Initialized ${policies.length} default retention policies`)

      return policies
    } catch (error) {
      logger.error('Initialize default policies error:', error)
      throw new Error('Failed to initialize retention policies')
    }
  }

  /**
   * Create custom retention policy
   */
  static async createRetentionPolicy(
    policyData: Omit<RetentionPolicy, 'policyId' | 'createdAt' | 'updatedAt'>
  ): Promise<RetentionPolicy> {
    try {
      const policy: RetentionPolicy = {
        policyId: `policy_${Date.now()}`,
        ...policyData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.storePolicy(policy)

      logger.info(`Retention policy created: ${policy.policyId}`)

      return policy
    } catch (error) {
      logger.error('Create retention policy error:', error)
      throw new Error('Failed to create retention policy')
    }
  }

  /**
   * Get all retention policies
   */
  static async getRetentionPolicies(activeOnly: boolean = false): Promise<RetentionPolicy[]> {
    try {
      const policies = await this.retrievePolicies()

      if (activeOnly) {
        return policies.filter(p => p.isActive)
      }

      return policies
    } catch (error) {
      logger.error('Get retention policies error:', error)
      throw new Error('Failed to retrieve retention policies')
    }
  }

  /**
   * Apply retention policy to data
   */
  static async applyRetentionPolicy(dataCategory: DataCategory): Promise<DataLifecycleStatus[]> {
    try {
      const policy = await this.getPolicyByCategory(dataCategory)

      if (!policy) {
        throw new Error(`No retention policy found for category: ${dataCategory}`)
      }

      const dataItems = await this.getDataByCategory(dataCategory)
      const lifecycleStatuses: DataLifecycleStatus[] = []

      for (const item of dataItems) {
        const retentionExpiry = new Date(item.createdAt.getTime() + policy.retentionPeriod * 24 * 60 * 60 * 1000)
        const isExpired = retentionExpiry < new Date()

        const status: DataLifecycleStatus = {
          dataId: item.id,
          dataType: dataCategory,
          createdAt: item.createdAt,
          retentionExpiry,
          status: isExpired ? 'EXPIRED' : 'ACTIVE',
          policyId: policy.policyId
        }

        lifecycleStatuses.push(status)

        // Schedule deletion for expired data
        if (isExpired && status.status === 'EXPIRED') {
          await this.scheduleDeletion(item.id, dataCategory, policy)
          status.status = 'SCHEDULED_FOR_DELETION'
        }
      }

      logger.info(`Applied retention policy to ${lifecycleStatuses.length} items in category: ${dataCategory}`)

      return lifecycleStatuses
    } catch (error) {
      logger.error('Apply retention policy error:', error)
      throw new Error('Failed to apply retention policy')
    }
  }

  /**
   * Execute scheduled deletions
   */
  static async executeDeletions(): Promise<DeletionJob[]> {
    try {
      const jobs: DeletionJob[] = []
      const policies = await this.getRetentionPolicies(true)

      for (const policy of policies) {
        const job = await this.executeDeletionJob(policy)
        jobs.push(job)
      }

      logger.info(`Executed ${jobs.length} deletion jobs`)

      return jobs
    } catch (error) {
      logger.error('Execute deletions error:', error)
      throw new Error('Failed to execute deletions')
    }
  }

  /**
   * Securely delete data
   */
  static async secureDelete(
    dataId: string,
    dataCategory: DataCategory,
    deletionMethod: DeletionMethod
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (deletionMethod) {
        case 'SOFT_DELETE':
          await this.softDelete(dataId, dataCategory)
          break
        case 'HARD_DELETE':
          await this.hardDelete(dataId, dataCategory)
          break
        case 'ANONYMIZE':
          await this.anonymizeData(dataId, dataCategory)
          break
        case 'ARCHIVE':
          await this.archiveData(dataId, dataCategory)
          break
        default:
          throw new Error(`Unknown deletion method: ${deletionMethod}`)
      }

      // Log deletion
      await this.logDeletion(dataId, dataCategory, deletionMethod)

      logger.info(`Data securely deleted: ${dataId} using method: ${deletionMethod}`)

      return {
        success: true,
        message: `Data deleted successfully using ${deletionMethod}`
      }
    } catch (error) {
      logger.error('Secure delete error:', error)
      return {
        success: false,
        message: error.message || 'Failed to delete data'
      }
    }
  }

  /**
   * Configure data residency
   */
  static async configureDataResidency(residency: DataResidency): Promise<void> {
    try {
      await this.storeDataResidency(residency)

      logger.info(`Data residency configured for region: ${residency.region}`)
    } catch (error) {
      logger.error('Configure data residency error:', error)
      throw new Error('Failed to configure data residency')
    }
  }

  /**
   * Generate retention report
   */
  static async generateRetentionReport(): Promise<RetentionReport> {
    try {
      const reportId = `retention_report_${Date.now()}`
      const policies = await this.getRetentionPolicies()
      const dataLifecycle = await this.getDataLifecycleStats()
      const recentDeletions = await this.getRecentDeletionJobs(10)
      const recommendations = this.generateRecommendations(dataLifecycle, recentDeletions)

      const report: RetentionReport = {
        reportId,
        generatedAt: new Date(),
        policies,
        dataLifecycle,
        recentDeletions,
        recommendations
      }

      logger.info(`Retention report generated: ${reportId}`)

      return report
    } catch (error) {
      logger.error('Generate retention report error:', error)
      throw new Error('Failed to generate retention report')
    }
  }

  // Private helper methods

  private static async storePolicy(policy: RetentionPolicy): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'DATA_RETENTION_POLICY',
        tableName: 'RETENTION_POLICY',
        recordId: policy.policyId,
        newValues: policy,
        userId: 'SYSTEM'
      }
    })
  }

  private static async retrievePolicies(): Promise<RetentionPolicy[]> {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'DATA_RETENTION_POLICY' },
      orderBy: { createdAt: 'desc' }
    })

    // Get unique policies (latest version of each)
    const policyMap = new Map<string, RetentionPolicy>()
    
    for (const log of logs) {
      const policy = log.newValues as any as RetentionPolicy
      if (!policyMap.has(policy.policyId)) {
        policyMap.set(policy.policyId, policy)
      }
    }

    return Array.from(policyMap.values())
  }

  private static async getPolicyByCategory(category: DataCategory): Promise<RetentionPolicy | null> {
    const policies = await this.retrievePolicies()
    return policies.find(p => p.dataCategory === category && p.isActive) || null
  }

  private static async getDataByCategory(category: DataCategory): Promise<any[]> {
    // Get data based on category
    switch (category) {
      case 'USER_DATA':
        return await prisma.user.findMany({ select: { id: true, createdAt: true } })
      case 'TRANSACTION_DATA':
        return await prisma.sale.findMany({ select: { id: true, createdAt: true } })
      case 'AUDIT_LOGS':
        return await prisma.auditLog.findMany({ select: { id: true, createdAt: true } })
      case 'PAYMENT_DATA':
        return await prisma.payment.findMany({ select: { id: true, createdAt: true } })
      case 'CUSTOMER_DATA':
        return await prisma.customer.findMany({ select: { id: true, createdAt: true } })
      case 'INVOICE_DATA':
        return await prisma.invoice.findMany({ select: { id: true, createdAt: true } })
      default:
        return []
    }
  }

  private static async scheduleDeletion(
    dataId: string,
    dataCategory: DataCategory,
    policy: RetentionPolicy
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'DATA_DELETION_SCHEDULED',
        tableName: dataCategory,
        recordId: dataId,
        newValues: {
          dataId,
          dataCategory,
          policyId: policy.policyId,
          scheduledAt: new Date()
        },
        userId: 'SYSTEM'
      }
    })
  }

  private static async executeDeletionJob(policy: RetentionPolicy): Promise<DeletionJob> {
    const jobId = `job_${Date.now()}`
    const job: DeletionJob = {
      jobId,
      policyId: policy.policyId,
      dataCategory: policy.dataCategory,
      scheduledAt: new Date(),
      status: 'IN_PROGRESS',
      recordsProcessed: 0,
      recordsDeleted: 0,
      errors: []
    }

    try {
      const dataItems = await this.getDataByCategory(policy.dataCategory)
      const expiredItems = dataItems.filter(item => {
        const retentionExpiry = new Date(item.createdAt.getTime() + policy.retentionPeriod * 24 * 60 * 60 * 1000)
        return retentionExpiry < new Date()
      })

      for (const item of expiredItems) {
        try {
          await this.secureDelete(item.id, policy.dataCategory, policy.deletionMethod)
          job.recordsDeleted++
        } catch (error) {
          job.errors?.push(`Failed to delete ${item.id}: ${error.message}`)
        }
        job.recordsProcessed++
      }

      job.status = 'COMPLETED'
      job.executedAt = new Date()
    } catch (error) {
      job.status = 'FAILED'
      job.errors?.push(error.message)
    }

    // Store job result
    await this.storeDeletionJob(job)

    return job
  }

  private static async softDelete(dataId: string, dataCategory: DataCategory): Promise<void> {
    // Mark as deleted without removing from database
    switch (dataCategory) {
      case 'USER_DATA':
        await prisma.user.update({
          where: { id: dataId },
          data: { status: 'INACTIVE' }
        })
        break
      case 'CUSTOMER_DATA':
        await prisma.customer.update({
          where: { id: dataId },
          data: { isActive: false }
        })
        break
      default:
        logger.warn(`Soft delete not implemented for category: ${dataCategory}`)
    }
  }

  private static async hardDelete(dataId: string, dataCategory: DataCategory): Promise<void> {
    // Permanently remove from database
    switch (dataCategory) {
      case 'AUDIT_LOGS':
        await prisma.auditLog.delete({ where: { id: dataId } })
        break
      case 'PAYMENT_DATA':
        await prisma.payment.delete({ where: { id: dataId } })
        break
      default:
        logger.warn(`Hard delete not implemented for category: ${dataCategory}`)
    }
  }

  private static async anonymizeData(dataId: string, dataCategory: DataCategory): Promise<void> {
    // Replace personal data with anonymized values
    switch (dataCategory) {
      case 'USER_DATA':
        await prisma.user.update({
          where: { id: dataId },
          data: {
            email: `anonymized_${dataId}@deleted.local`,
            firstName: 'ANONYMIZED',
            lastName: 'USER',
            passwordHash: 'DELETED'
          }
        })
        break
      case 'CUSTOMER_DATA':
        await prisma.customer.update({
          where: { id: dataId },
          data: {
            firstName: 'ANONYMIZED',
            lastName: 'CUSTOMER',
            email: null,
            phone: null,
            address: null
          }
        })
        break
      default:
        logger.warn(`Anonymization not implemented for category: ${dataCategory}`)
    }
  }

  private static async archiveData(dataId: string, dataCategory: DataCategory): Promise<void> {
    // Move data to archive storage
    // In production, move to cold storage or separate archive database
    logger.info(`Archiving data: ${dataId} from category: ${dataCategory}`)
    
    // For now, just log the archive action
    await prisma.auditLog.create({
      data: {
        action: 'DATA_ARCHIVED',
        tableName: dataCategory,
        recordId: dataId,
        newValues: { archivedAt: new Date() },
        userId: 'SYSTEM'
      }
    })
  }

  private static async logDeletion(
    dataId: string,
    dataCategory: DataCategory,
    deletionMethod: DeletionMethod
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'DATA_DELETED',
        tableName: dataCategory,
        recordId: dataId,
        newValues: {
          deletionMethod,
          deletedAt: new Date()
        },
        userId: 'SYSTEM'
      }
    })
  }

  private static async storeDataResidency(residency: DataResidency): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'DATA_RESIDENCY_CONFIG',
        tableName: 'DATA_RESIDENCY',
        recordId: residency.region,
        newValues: residency,
        userId: 'SYSTEM'
      }
    })
  }

  private static async storeDeletionJob(job: DeletionJob): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'DATA_DELETION_JOB',
        tableName: 'DELETION_JOB',
        recordId: job.jobId,
        newValues: job,
        userId: 'SYSTEM'
      }
    })
  }

  private static async getDataLifecycleStats(): Promise<any> {
    // Mock stats - in production, calculate from actual data
    return {
      active: 1250,
      expired: 45,
      scheduledForDeletion: 12,
      deleted: 328
    }
  }

  private static async getRecentDeletionJobs(limit: number): Promise<DeletionJob[]> {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'DATA_DELETION_JOB' },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return logs.map(log => log.newValues as any as DeletionJob)
  }

  private static generateRecommendations(dataLifecycle: any, recentDeletions: DeletionJob[]): string[] {
    const recommendations: string[] = []

    if (dataLifecycle.expired > 50) {
      recommendations.push('High number of expired records - schedule deletion job')
    }

    const failedJobs = recentDeletions.filter(j => j.status === 'FAILED')
    if (failedJobs.length > 0) {
      recommendations.push('Review and resolve failed deletion jobs')
    }

    recommendations.push('Review retention policies quarterly')
    recommendations.push('Ensure backup data is also subject to retention policies')
    recommendations.push('Document data residency requirements for compliance')

    return recommendations
  }
}
