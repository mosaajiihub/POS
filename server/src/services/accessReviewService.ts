import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

/**
 * Access Review and Compliance Service
 * Implements periodic access reviews, certification, and compliance monitoring
 */

export interface AccessReview {
  id: string
  name: string
  description?: string
  reviewType: 'USER_ACCESS' | 'ROLE_PERMISSIONS' | 'SEGREGATION_OF_DUTIES' | 'COMPLIANCE_CHECK'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: Date
  completedDate?: Date
  reviewerId?: string
  scope: ReviewScope
  findings: ReviewFinding[]
  createdAt: Date
  updatedAt: Date
}

export interface ReviewScope {
  userIds?: string[]
  roleIds?: string[]
  resources?: string[]
  includeInactive?: boolean
}

export interface ReviewFinding {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  type: 'EXCESSIVE_PERMISSIONS' | 'INACTIVE_USER' | 'SOD_VIOLATION' | 'COMPLIANCE_VIOLATION' | 'ORPHANED_ROLE'
  description: string
  affectedEntity: string
  recommendation: string
  status: 'OPEN' | 'ACKNOWLEDGED' | 'REMEDIATED' | 'ACCEPTED_RISK'
  remediatedAt?: Date
  remediatedBy?: string
}

export interface CertificationCampaign {
  id: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  certifiers: string[]
  scope: ReviewScope
  certifications: AccessCertification[]
  completionRate: number
}

export interface AccessCertification {
  id: string
  campaignId: string
  userId: string
  certifierId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  roles: string[]
  permissions: string[]
  decision?: 'APPROVE' | 'REVOKE' | 'MODIFY'
  comments?: string
  certifiedAt?: Date
  expiresAt?: Date
}

export interface SoDRule {
  id: string
  name: string
  description: string
  conflictingPermissions: string[][]
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  isActive: boolean
}

export interface SoDViolation {
  id: string
  ruleId: string
  ruleName: string
  userId: string
  userName: string
  conflictingPermissions: string[]
  detectedAt: Date
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED'
  mitigationPlan?: string
}

export class AccessReviewService {
  private static reviews: Map<string, AccessReview> = new Map()
  private static campaigns: Map<string, CertificationCampaign> = new Map()
  private static sodRules: Map<string, SoDRule> = new Map()
  private static violations: Map<string, SoDViolation> = new Map()

  /**
   * Initialize access review system
   */
  static async initialize(): Promise<void> {
    try {
      await this.initializeSoDRules()
      logger.info('Access review system initialized')
    } catch (error) {
      logger.error('Access review initialization error:', error)
      throw error
    }
  }

  /**
   * Create access review
   */
  static async createAccessReview(
    reviewData: Omit<AccessReview, 'id' | 'findings' | 'createdAt' | 'updatedAt'>,
    creatorId: string
  ): Promise<AccessReview> {
    try {
      const id = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const review: AccessReview = {
        id,
        ...reviewData,
        findings: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.reviews.set(id, review)

      // Log audit trail
      await AuditService.logUserAction(creatorId, 'ACCESS_REVIEW_CREATED', {
        tableName: 'access_reviews',
        recordId: id,
        newValues: {
          name: review.name,
          reviewType: review.reviewType,
          scheduledDate: review.scheduledDate
        }
      })

      logger.info(`Access review created: ${review.name}`)

      return review
    } catch (error) {
      logger.error('Create access review error:', error)
      throw error
    }
  }

  /**
   * Conduct user access review
   */
  static async conductUserAccessReview(reviewId: string, reviewerId: string): Promise<AccessReview> {
    try {
      const review = this.reviews.get(reviewId)
      if (!review) {
        throw new Error('Review not found')
      }

      review.status = 'IN_PROGRESS'
      review.reviewerId = reviewerId
      review.findings = []

      // Get users in scope
      const userIds = review.scope.userIds || []
      const users = await prisma.user.findMany({
        where: userIds.length > 0 ? { id: { in: userIds } } : {},
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true }
                  }
                }
              }
            }
          }
        }
      })

      // Review each user
      for (const user of users) {
        // Check for inactive users with active roles
        if (user.status !== 'ACTIVE' && user.userRoles.length > 0) {
          review.findings.push({
            id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity: 'HIGH',
            type: 'INACTIVE_USER',
            description: `Inactive user ${user.email} has ${user.userRoles.length} active role(s)`,
            affectedEntity: user.id,
            recommendation: 'Remove all role assignments from inactive user',
            status: 'OPEN'
          })
        }

        // Check for excessive permissions
        const allPermissions = new Set<string>()
        user.userRoles.forEach(ur => {
          ur.role.permissions.forEach(rp => {
            allPermissions.add(`${rp.permission.resource}:${rp.permission.action}`)
          })
        })

        if (allPermissions.size > 50) {
          review.findings.push({
            id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity: 'MEDIUM',
            type: 'EXCESSIVE_PERMISSIONS',
            description: `User ${user.email} has ${allPermissions.size} permissions across ${user.userRoles.length} roles`,
            affectedEntity: user.id,
            recommendation: 'Review and consolidate user permissions',
            status: 'OPEN'
          })
        }

        // Check for SoD violations
        const sodViolations = await this.checkSoDViolations(user.id, Array.from(allPermissions))
        sodViolations.forEach(violation => {
          review.findings.push({
            id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity: 'CRITICAL',
            type: 'SOD_VIOLATION',
            description: `SoD violation: ${violation.ruleName}`,
            affectedEntity: user.id,
            recommendation: 'Remove conflicting permissions or implement compensating controls',
            status: 'OPEN'
          })
        })
      }

      review.status = 'COMPLETED'
      review.completedDate = new Date()
      review.updatedAt = new Date()

      this.reviews.set(reviewId, review)

      // Log completion
      await AuditService.logUserAction(reviewerId, 'ACCESS_REVIEW_COMPLETED', {
        tableName: 'access_reviews',
        recordId: reviewId,
        newValues: {
          findingsCount: review.findings.length,
          criticalFindings: review.findings.filter(f => f.severity === 'CRITICAL').length
        }
      })

      logger.info(`Access review completed: ${review.name} with ${review.findings.length} findings`)

      return review
    } catch (error) {
      logger.error('Conduct user access review error:', error)
      throw error
    }
  }

  /**
   * Create certification campaign
   */
  static async createCertificationCampaign(
    campaignData: Omit<CertificationCampaign, 'id' | 'certifications' | 'completionRate'>,
    creatorId: string
  ): Promise<CertificationCampaign> {
    try {
      const id = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const campaign: CertificationCampaign = {
        id,
        ...campaignData,
        certifications: [],
        completionRate: 0
      }

      // Generate certifications for users in scope
      const userIds = campaign.scope.userIds || []
      const users = await prisma.user.findMany({
        where: userIds.length > 0 ? { id: { in: userIds } } : {},
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true }
                  }
                }
              }
            }
          }
        }
      })

      for (const user of users) {
        const roles = user.userRoles.map(ur => ur.role.name)
        const permissions = new Set<string>()
        user.userRoles.forEach(ur => {
          ur.role.permissions.forEach(rp => {
            permissions.add(`${rp.permission.resource}:${rp.permission.action}`)
          })
        })

        // Assign to first certifier (round-robin could be implemented)
        const certifierId = campaign.certifiers[0]

        campaign.certifications.push({
          id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          campaignId: id,
          userId: user.id,
          certifierId,
          status: 'PENDING',
          roles,
          permissions: Array.from(permissions),
          expiresAt: campaign.endDate
        })
      }

      this.campaigns.set(id, campaign)

      // Log audit trail
      await AuditService.logUserAction(creatorId, 'CERTIFICATION_CAMPAIGN_CREATED', {
        tableName: 'certification_campaigns',
        recordId: id,
        newValues: {
          name: campaign.name,
          certificationsCount: campaign.certifications.length
        }
      })

      logger.info(`Certification campaign created: ${campaign.name} with ${campaign.certifications.length} certifications`)

      return campaign
    } catch (error) {
      logger.error('Create certification campaign error:', error)
      throw error
    }
  }

  /**
   * Certify user access
   */
  static async certifyUserAccess(
    certificationId: string,
    certifierId: string,
    decision: 'APPROVE' | 'REVOKE' | 'MODIFY',
    comments?: string
  ): Promise<AccessCertification> {
    try {
      // Find certification
      let certification: AccessCertification | undefined
      let campaign: CertificationCampaign | undefined

      for (const c of this.campaigns.values()) {
        const cert = c.certifications.find(cert => cert.id === certificationId)
        if (cert) {
          certification = cert
          campaign = c
          break
        }
      }

      if (!certification || !campaign) {
        throw new Error('Certification not found')
      }

      // Verify certifier
      if (certification.certifierId !== certifierId) {
        throw new Error('Unauthorized certifier')
      }

      // Update certification
      certification.decision = decision
      certification.comments = comments
      certification.certifiedAt = new Date()
      certification.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'

      // Apply decision
      if (decision === 'REVOKE') {
        // Revoke all roles
        for (const roleName of certification.roles) {
          const role = await prisma.role.findUnique({ where: { name: roleName } })
          if (role) {
            await prisma.userRole_Assignment.updateMany({
              where: {
                userId: certification.userId,
                roleId: role.id,
                isActive: true
              },
              data: { isActive: false }
            })
          }
        }
      }

      // Update completion rate
      const completedCount = campaign.certifications.filter(
        c => c.status === 'APPROVED' || c.status === 'REJECTED'
      ).length
      campaign.completionRate = (completedCount / campaign.certifications.length) * 100

      // Log audit trail
      await AuditService.logUserAction(certifierId, 'ACCESS_CERTIFIED', {
        tableName: 'access_certifications',
        recordId: certificationId,
        newValues: {
          userId: certification.userId,
          decision,
          comments
        }
      })

      logger.info(`Access certified: ${certificationId} with decision ${decision}`)

      return certification
    } catch (error) {
      logger.error('Certify user access error:', error)
      throw error
    }
  }

  /**
   * Check segregation of duties violations
   */
  static async checkSoDViolations(userId: string, permissions: string[]): Promise<SoDViolation[]> {
    try {
      const violations: SoDViolation[] = []

      // Check each SoD rule
      for (const rule of this.sodRules.values()) {
        if (!rule.isActive) continue

        // Check if user has conflicting permissions
        for (const conflictSet of rule.conflictingPermissions) {
          const hasAll = conflictSet.every(perm => permissions.includes(perm))
          
          if (hasAll) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { firstName: true, lastName: true, email: true }
            })

            const violation: SoDViolation = {
              id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ruleId: rule.id,
              ruleName: rule.name,
              userId,
              userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
              conflictingPermissions: conflictSet,
              detectedAt: new Date(),
              status: 'OPEN'
            }

            violations.push(violation)
            this.violations.set(violation.id, violation)
          }
        }
      }

      return violations
    } catch (error) {
      logger.error('Check SoD violations error:', error)
      return []
    }
  }

  /**
   * Get all access reviews
   */
  static async getAllReviews(): Promise<AccessReview[]> {
    return Array.from(this.reviews.values())
  }

  /**
   * Get review by ID
   */
  static async getReview(reviewId: string): Promise<AccessReview | null> {
    return this.reviews.get(reviewId) || null
  }

  /**
   * Get all certification campaigns
   */
  static async getAllCampaigns(): Promise<CertificationCampaign[]> {
    return Array.from(this.campaigns.values())
  }

  /**
   * Get campaign by ID
   */
  static async getCampaign(campaignId: string): Promise<CertificationCampaign | null> {
    return this.campaigns.get(campaignId) || null
  }

  /**
   * Get pending certifications for certifier
   */
  static async getPendingCertifications(certifierId: string): Promise<AccessCertification[]> {
    const pending: AccessCertification[] = []

    for (const campaign of this.campaigns.values()) {
      const certs = campaign.certifications.filter(
        c => c.certifierId === certifierId && c.status === 'PENDING'
      )
      pending.push(...certs)
    }

    return pending
  }

  /**
   * Get all SoD violations
   */
  static async getAllViolations(): Promise<SoDViolation[]> {
    return Array.from(this.violations.values())
  }

  /**
   * Get open SoD violations
   */
  static async getOpenViolations(): Promise<SoDViolation[]> {
    return Array.from(this.violations.values()).filter(v => v.status === 'OPEN')
  }

  /**
   * Mitigate SoD violation
   */
  static async mitigateViolation(
    violationId: string,
    mitigationPlan: string,
    mitigatorId: string
  ): Promise<SoDViolation> {
    try {
      const violation = this.violations.get(violationId)
      if (!violation) {
        throw new Error('Violation not found')
      }

      violation.status = 'MITIGATED'
      violation.mitigationPlan = mitigationPlan

      this.violations.set(violationId, violation)

      // Log audit trail
      await AuditService.logUserAction(mitigatorId, 'SOD_VIOLATION_MITIGATED', {
        tableName: 'sod_violations',
        recordId: violationId,
        newValues: {
          mitigationPlan,
          status: 'MITIGATED'
        }
      })

      logger.info(`SoD violation mitigated: ${violationId}`)

      return violation
    } catch (error) {
      logger.error('Mitigate violation error:', error)
      throw error
    }
  }

  /**
   * Initialize SoD rules
   */
  private static async initializeSoDRules(): Promise<void> {
    // Create/Approve vs Execute/Process separation
    await this.registerSoDRule({
      name: 'Create and Execute Separation',
      description: 'Users should not be able to both create and execute transactions',
      conflictingPermissions: [
        ['sales:create', 'sales:void'],
        ['invoices:create', 'invoices:approve'],
        ['payments:create', 'payments:verify']
      ],
      severity: 'CRITICAL',
      isActive: true
    })

    // User management separation
    await this.registerSoDRule({
      name: 'User Management Separation',
      description: 'Users should not be able to both create users and assign roles',
      conflictingPermissions: [
        ['users:create', 'roles:assign']
      ],
      severity: 'HIGH',
      isActive: true
    })

    // Financial controls separation
    await this.registerSoDRule({
      name: 'Financial Controls Separation',
      description: 'Users should not have both financial and approval permissions',
      conflictingPermissions: [
        ['expenses:create', 'expenses:approve'],
        ['payments:create', 'payments:approve']
      ],
      severity: 'CRITICAL',
      isActive: true
    })

    logger.info('SoD rules initialized')
  }

  /**
   * Register SoD rule
   */
  private static async registerSoDRule(
    ruleData: Omit<SoDRule, 'id'>
  ): Promise<SoDRule> {
    const id = `sod_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const rule: SoDRule = { id, ...ruleData }
    this.sodRules.set(id, rule)
    return rule
  }

  /**
   * Get all SoD rules
   */
  static async getAllSoDRules(): Promise<SoDRule[]> {
    return Array.from(this.sodRules.values())
  }

  /**
   * Get compliance summary
   */
  static async getComplianceSummary(): Promise<{
    totalReviews: number
    completedReviews: number
    pendingReviews: number
    totalFindings: number
    criticalFindings: number
    openViolations: number
    activeCampaigns: number
    pendingCertifications: number
  }> {
    const reviews = Array.from(this.reviews.values())
    const campaigns = Array.from(this.campaigns.values())
    const violations = Array.from(this.violations.values())

    const allFindings = reviews.flatMap(r => r.findings)

    return {
      totalReviews: reviews.length,
      completedReviews: reviews.filter(r => r.status === 'COMPLETED').length,
      pendingReviews: reviews.filter(r => r.status === 'PENDING').length,
      totalFindings: allFindings.length,
      criticalFindings: allFindings.filter(f => f.severity === 'CRITICAL').length,
      openViolations: violations.filter(v => v.status === 'OPEN').length,
      activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
      pendingCertifications: campaigns.reduce(
        (sum, c) => sum + c.certifications.filter(cert => cert.status === 'PENDING').length,
        0
      )
    }
  }
}
