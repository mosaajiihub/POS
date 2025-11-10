import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

/**
 * Attribute-Based Access Control (ABAC) Service
 * Implements policy-based access control with context-aware decisions
 */

export interface AccessPolicy {
  id: string
  name: string
  description?: string
  resource: string
  action: string
  effect: 'ALLOW' | 'DENY'
  conditions: PolicyCondition[]
  priority: number
  isActive: boolean
}

export interface PolicyCondition {
  type: 'USER_ATTRIBUTE' | 'RESOURCE_ATTRIBUTE' | 'ENVIRONMENT' | 'TIME' | 'LOCATION'
  attribute: string
  operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'MATCHES'
  value: any
}

export interface AccessContext {
  userId: string
  resource: string
  action: string
  resourceAttributes?: Record<string, any>
  userAttributes?: Record<string, any>
  environment?: {
    ipAddress?: string
    userAgent?: string
    timestamp?: Date
    location?: {
      country?: string
      region?: string
      city?: string
      latitude?: number
      longitude?: number
    }
    timeOfDay?: string
    dayOfWeek?: string
  }
}

export interface PolicyEvaluationResult {
  decision: 'ALLOW' | 'DENY' | 'NOT_APPLICABLE'
  matchedPolicies: string[]
  reason: string
  evaluatedConditions: number
}

export class ABACService {
  private static policies: Map<string, AccessPolicy> = new Map()

  /**
   * Initialize ABAC system with default policies
   */
  static async initialize(): Promise<void> {
    try {
      // Load policies from database or configuration
      await this.loadPolicies()
      
      // Register default policies
      await this.registerDefaultPolicies()
      
      logger.info('ABAC system initialized successfully')
    } catch (error) {
      logger.error('ABAC initialization error:', error)
      throw error
    }
  }

  /**
   * Evaluate access request against policies
   */
  static async evaluateAccess(context: AccessContext): Promise<PolicyEvaluationResult> {
    try {
      const { userId, resource, action } = context

      // Get applicable policies
      const applicablePolicies = this.getApplicablePolicies(resource, action)

      if (applicablePolicies.length === 0) {
        return {
          decision: 'NOT_APPLICABLE',
          matchedPolicies: [],
          reason: 'No applicable policies found',
          evaluatedConditions: 0
        }
      }

      // Sort policies by priority (higher priority first)
      applicablePolicies.sort((a, b) => b.priority - a.priority)

      const matchedPolicies: string[] = []
      let evaluatedConditions = 0

      // Evaluate policies in priority order
      for (const policy of applicablePolicies) {
        if (!policy.isActive) continue

        const conditionsResult = await this.evaluateConditions(policy.conditions, context)
        evaluatedConditions += policy.conditions.length

        if (conditionsResult.allMatch) {
          matchedPolicies.push(policy.name)

          // First matching policy determines the decision
          const decision = policy.effect

          // Log policy evaluation
          await AuditService.logUserAction(userId, 'ABAC_POLICY_EVALUATED', {
            tableName: 'access_policies',
            recordId: policy.id,
            newValues: {
              policyName: policy.name,
              resource,
              action,
              decision,
              matchedConditions: conditionsResult.matchedConditions
            }
          })

          return {
            decision,
            matchedPolicies,
            reason: `Policy "${policy.name}" matched with effect ${decision}`,
            evaluatedConditions
          }
        }
      }

      // No policies matched - default deny
      return {
        decision: 'DENY',
        matchedPolicies,
        reason: 'No policies matched - default deny',
        evaluatedConditions
      }
    } catch (error) {
      logger.error('ABAC evaluation error:', error)
      return {
        decision: 'DENY',
        matchedPolicies: [],
        reason: 'Error evaluating policies',
        evaluatedConditions: 0
      }
    }
  }

  /**
   * Evaluate policy conditions
   */
  private static async evaluateConditions(
    conditions: PolicyCondition[],
    context: AccessContext
  ): Promise<{ allMatch: boolean; matchedConditions: number }> {
    let matchedConditions = 0

    for (const condition of conditions) {
      const matches = await this.evaluateCondition(condition, context)
      if (matches) {
        matchedConditions++
      } else {
        // All conditions must match (AND logic)
        return { allMatch: false, matchedConditions }
      }
    }

    return { allMatch: true, matchedConditions }
  }

  /**
   * Evaluate single condition
   */
  private static async evaluateCondition(
    condition: PolicyCondition,
    context: AccessContext
  ): Promise<boolean> {
    try {
      let actualValue: any

      // Get actual value based on condition type
      switch (condition.type) {
        case 'USER_ATTRIBUTE':
          actualValue = await this.getUserAttribute(context.userId, condition.attribute)
          break
        case 'RESOURCE_ATTRIBUTE':
          actualValue = context.resourceAttributes?.[condition.attribute]
          break
        case 'ENVIRONMENT':
          actualValue = context.environment?.[condition.attribute as keyof typeof context.environment]
          break
        case 'TIME':
          actualValue = await this.getTimeAttribute(condition.attribute, context.environment?.timestamp)
          break
        case 'LOCATION':
          actualValue = await this.getLocationAttribute(condition.attribute, context.environment?.location)
          break
        default:
          return false
      }

      // Evaluate based on operator
      return this.evaluateOperator(actualValue, condition.operator, condition.value)
    } catch (error) {
      logger.error('Condition evaluation error:', error)
      return false
    }
  }

  /**
   * Evaluate operator
   */
  private static evaluateOperator(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'EQUALS':
        return actualValue === expectedValue
      case 'NOT_EQUALS':
        return actualValue !== expectedValue
      case 'IN':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue)
      case 'NOT_IN':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue)
      case 'GREATER_THAN':
        return actualValue > expectedValue
      case 'LESS_THAN':
        return actualValue < expectedValue
      case 'CONTAINS':
        return String(actualValue).includes(String(expectedValue))
      case 'MATCHES':
        return new RegExp(expectedValue).test(String(actualValue))
      default:
        return false
    }
  }

  /**
   * Get user attribute
   */
  private static async getUserAttribute(userId: string, attribute: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: { isActive: true },
            include: { role: true }
          }
        }
      })

      if (!user) return null

      // Map common attributes
      const attributeMap: Record<string, any> = {
        'role': user.role,
        'status': user.status,
        'email': user.email,
        'paymentVerified': user.paymentVerified,
        'mfaEnabled': user.mfaEnabled,
        'roles': user.userRoles.map(ur => ur.role.name),
        'createdAt': user.createdAt,
        'lastLogin': user.lastLogin
      }

      return attributeMap[attribute]
    } catch (error) {
      logger.error('Get user attribute error:', error)
      return null
    }
  }

  /**
   * Get time-based attribute
   */
  private static async getTimeAttribute(attribute: string, timestamp?: Date): Promise<any> {
    const now = timestamp || new Date()

    const attributeMap: Record<string, any> = {
      'hour': now.getHours(),
      'dayOfWeek': now.getDay(), // 0 = Sunday, 6 = Saturday
      'dayOfMonth': now.getDate(),
      'month': now.getMonth() + 1,
      'year': now.getFullYear(),
      'isWeekend': now.getDay() === 0 || now.getDay() === 6,
      'isBusinessHours': now.getHours() >= 9 && now.getHours() < 17,
      'timestamp': now.getTime()
    }

    return attributeMap[attribute]
  }

  /**
   * Get location-based attribute
   */
  private static async getLocationAttribute(
    attribute: string,
    location?: AccessContext['environment']['location']
  ): Promise<any> {
    if (!location) return null

    const attributeMap: Record<string, any> = {
      'country': location.country,
      'region': location.region,
      'city': location.city,
      'latitude': location.latitude,
      'longitude': location.longitude
    }

    return attributeMap[attribute]
  }

  /**
   * Get applicable policies for resource and action
   */
  private static getApplicablePolicies(resource: string, action: string): AccessPolicy[] {
    const policies: AccessPolicy[] = []

    for (const policy of this.policies.values()) {
      // Check if policy applies to this resource and action
      if (
        (policy.resource === resource || policy.resource === '*') &&
        (policy.action === action || policy.action === '*')
      ) {
        policies.push(policy)
      }
    }

    return policies
  }

  /**
   * Register a new policy
   */
  static async registerPolicy(policy: Omit<AccessPolicy, 'id'>): Promise<AccessPolicy> {
    try {
      const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const fullPolicy: AccessPolicy = { id, ...policy }

      this.policies.set(id, fullPolicy)

      logger.info(`Policy registered: ${policy.name}`)

      return fullPolicy
    } catch (error) {
      logger.error('Register policy error:', error)
      throw error
    }
  }

  /**
   * Update existing policy
   */
  static async updatePolicy(id: string, updates: Partial<AccessPolicy>): Promise<AccessPolicy | null> {
    try {
      const policy = this.policies.get(id)
      if (!policy) return null

      const updatedPolicy = { ...policy, ...updates, id }
      this.policies.set(id, updatedPolicy)

      logger.info(`Policy updated: ${updatedPolicy.name}`)

      return updatedPolicy
    } catch (error) {
      logger.error('Update policy error:', error)
      throw error
    }
  }

  /**
   * Delete policy
   */
  static async deletePolicy(id: string): Promise<boolean> {
    try {
      const deleted = this.policies.delete(id)
      if (deleted) {
        logger.info(`Policy deleted: ${id}`)
      }
      return deleted
    } catch (error) {
      logger.error('Delete policy error:', error)
      return false
    }
  }

  /**
   * Get all policies
   */
  static async getAllPolicies(): Promise<AccessPolicy[]> {
    return Array.from(this.policies.values())
  }

  /**
   * Get policy by ID
   */
  static async getPolicy(id: string): Promise<AccessPolicy | null> {
    return this.policies.get(id) || null
  }

  /**
   * Load policies from storage
   */
  private static async loadPolicies(): Promise<void> {
    // In a real implementation, load from database
    // For now, policies are stored in memory
    this.policies.clear()
  }

  /**
   * Register default policies
   */
  private static async registerDefaultPolicies(): Promise<void> {
    // Business hours access policy
    await this.registerPolicy({
      name: 'Business Hours Access',
      description: 'Allow access only during business hours (9 AM - 5 PM)',
      resource: '*',
      action: '*',
      effect: 'ALLOW',
      priority: 10,
      isActive: false, // Disabled by default
      conditions: [
        {
          type: 'TIME',
          attribute: 'isBusinessHours',
          operator: 'EQUALS',
          value: true
        }
      ]
    })

    // Weekend restriction policy
    await this.registerPolicy({
      name: 'Weekend Restriction',
      description: 'Deny access on weekends',
      resource: 'system',
      action: 'configure',
      effect: 'DENY',
      priority: 20,
      isActive: false, // Disabled by default
      conditions: [
        {
          type: 'TIME',
          attribute: 'isWeekend',
          operator: 'EQUALS',
          value: true
        }
      ]
    })

    // MFA required for sensitive operations
    await this.registerPolicy({
      name: 'MFA Required for Admin Actions',
      description: 'Require MFA for administrative actions',
      resource: 'users',
      action: 'delete',
      effect: 'DENY',
      priority: 30,
      isActive: true,
      conditions: [
        {
          type: 'USER_ATTRIBUTE',
          attribute: 'mfaEnabled',
          operator: 'EQUALS',
          value: false
        }
      ]
    })

    // Payment verified users only
    await this.registerPolicy({
      name: 'Payment Verified Users',
      description: 'Allow access only for payment verified users',
      resource: '*',
      action: '*',
      effect: 'DENY',
      priority: 5,
      isActive: true,
      conditions: [
        {
          type: 'USER_ATTRIBUTE',
          attribute: 'paymentVerified',
          operator: 'EQUALS',
          value: false
        },
        {
          type: 'USER_ATTRIBUTE',
          attribute: 'role',
          operator: 'NOT_EQUALS',
          value: 'ADMIN'
        }
      ]
    })

    // Location-based access (example)
    await this.registerPolicy({
      name: 'Geo-Restriction Example',
      description: 'Example policy for location-based access control',
      resource: 'sensitive-data',
      action: 'read',
      effect: 'DENY',
      priority: 25,
      isActive: false, // Disabled by default
      conditions: [
        {
          type: 'LOCATION',
          attribute: 'country',
          operator: 'NOT_IN',
          value: ['US', 'CA', 'GB']
        }
      ]
    })

    logger.info('Default ABAC policies registered')
  }

  /**
   * Test policy against context
   */
  static async testPolicy(policyId: string, context: AccessContext): Promise<PolicyEvaluationResult> {
    try {
      const policy = this.policies.get(policyId)
      if (!policy) {
        return {
          decision: 'NOT_APPLICABLE',
          matchedPolicies: [],
          reason: 'Policy not found',
          evaluatedConditions: 0
        }
      }

      const conditionsResult = await this.evaluateConditions(policy.conditions, context)

      return {
        decision: conditionsResult.allMatch ? policy.effect : 'NOT_APPLICABLE',
        matchedPolicies: conditionsResult.allMatch ? [policy.name] : [],
        reason: conditionsResult.allMatch 
          ? `Policy matched with effect ${policy.effect}` 
          : 'Policy conditions did not match',
        evaluatedConditions: policy.conditions.length
      }
    } catch (error) {
      logger.error('Test policy error:', error)
      return {
        decision: 'NOT_APPLICABLE',
        matchedPolicies: [],
        reason: 'Error testing policy',
        evaluatedConditions: 0
      }
    }
  }
}
