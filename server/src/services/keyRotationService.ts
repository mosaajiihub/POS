import * as crypto from 'crypto'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { DataEncryptionService, EncryptionKey } from './dataEncryptionService'

export interface KeyRotationPolicy {
  keyId: string
  rotationIntervalDays: number
  autoRotationEnabled: boolean
  gracePeriodDays: number
  notificationDays: number[]
  lastRotationDate?: Date
  nextRotationDate?: Date
}

export interface KeyRotationResult {
  success: boolean
  oldKeyId: string
  newKeyId: string
  rotationDate: Date
  affectedRecords?: number
  errors?: string[]
}

export interface KeyRotationSchedule {
  keyId: string
  scheduledDate: Date
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  autoRotation: boolean
}

/**
 * Key Rotation Service
 * Handles automated encryption key rotation, policy management,
 * and re-encryption of data with new keys
 */
export class KeyRotationService {
  private static rotationPolicies = new Map<string, KeyRotationPolicy>()
  private static rotationSchedule: KeyRotationSchedule[] = []
  private static isRotationRunning = false

  /**
   * Initialize key rotation service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Key Rotation Service...')
      
      // Load rotation policies
      await this.loadRotationPolicies()
      
      // Schedule automatic rotations
      await this.scheduleAutomaticRotations()
      
      // Start rotation scheduler
      this.startRotationScheduler()
      
      logger.info('Key Rotation Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Key Rotation Service:', error)
      throw error
    }
  }

  /**
   * Create or update key rotation policy
   */
  static async createRotationPolicy(policy: KeyRotationPolicy): Promise<void> {
    try {
      // Validate policy
      if (policy.rotationIntervalDays < 1) {
        throw new Error('Rotation interval must be at least 1 day')
      }
      
      if (policy.gracePeriodDays < 0) {
        throw new Error('Grace period cannot be negative')
      }
      
      // Calculate next rotation date
      const lastRotation = policy.lastRotationDate || new Date()
      policy.nextRotationDate = new Date(
        lastRotation.getTime() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000
      )
      
      // Store policy
      this.rotationPolicies.set(policy.keyId, policy)
      await this.saveRotationPolicies()
      
      // Schedule rotation if auto-rotation is enabled
      if (policy.autoRotationEnabled) {
        await this.scheduleKeyRotation(policy.keyId, policy.nextRotationDate, 'MEDIUM', 'Automatic rotation policy', true)
      }
      
      // Log policy creation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'KEY_ROTATION_POLICY_CREATED',
        tableName: 'key_rotation_policies',
        recordId: policy.keyId,
        newValues: policy
      })
      
      logger.info(`Created key rotation policy for key: ${policy.keyId}`)
    } catch (error) {
      logger.error('Failed to create rotation policy:', error)
      throw error
    }
  }

  /**
   * Get key rotation policy
   */
  static getRotationPolicy(keyId: string): KeyRotationPolicy | undefined {
    return this.rotationPolicies.get(keyId)
  }

  /**
   * List all rotation policies
   */
  static listRotationPolicies(): KeyRotationPolicy[] {
    return Array.from(this.rotationPolicies.values())
  }

  /**
   * Schedule key rotation
   */
  static async scheduleKeyRotation(
    keyId: string,
    scheduledDate: Date,
    priority: 'HIGH' | 'MEDIUM' | 'LOW',
    reason: string,
    autoRotation: boolean = false
  ): Promise<void> {
    try {
      // Remove existing schedule for the same key
      this.rotationSchedule = this.rotationSchedule.filter(s => s.keyId !== keyId)
      
      // Add new schedule
      const schedule: KeyRotationSchedule = {
        keyId,
        scheduledDate,
        priority,
        reason,
        autoRotation
      }
      
      this.rotationSchedule.push(schedule)
      
      // Sort by priority and date
      this.rotationSchedule.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.scheduledDate.getTime() - b.scheduledDate.getTime()
      })
      
      // Log scheduling
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'KEY_ROTATION_SCHEDULED',
        tableName: 'key_rotation_schedule',
        recordId: keyId,
        newValues: schedule
      })
      
      logger.info(`Scheduled key rotation for ${keyId} on ${scheduledDate.toISOString()}`)
    } catch (error) {
      logger.error('Failed to schedule key rotation:', error)
      throw error
    }
  }

  /**
   * Rotate encryption key
   */
  static async rotateKey(keyId: string, reason: string = 'Manual rotation'): Promise<KeyRotationResult> {
    try {
      logger.info(`Starting key rotation for: ${keyId}`)
      
      // Get current key
      const currentKey = await DataEncryptionService.getEncryptionKey(keyId)
      if (!currentKey) {
        throw new Error(`Key not found: ${keyId}`)
      }
      
      // Generate new key
      const newKeyId = `${keyId}_v${currentKey.version + 1}`
      const newKey = await DataEncryptionService.generateEncryptionKey(
        newKeyId,
        currentKey.algorithm,
        this.getKeyExpirationDays(keyId)
      )
      
      // Mark old key as expired after grace period
      const policy = this.getRotationPolicy(keyId)
      const gracePeriodMs = (policy?.gracePeriodDays || 7) * 24 * 60 * 60 * 1000
      
      setTimeout(async () => {
        await this.expireKey(keyId)
      }, gracePeriodMs)
      
      // Re-encrypt data with new key
      const affectedRecords = await this.reEncryptDataWithNewKey(keyId, newKeyId)
      
      // Update rotation policy
      if (policy) {
        policy.lastRotationDate = new Date()
        policy.nextRotationDate = new Date(
          Date.now() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000
        )
        this.rotationPolicies.set(keyId, policy)
        await this.saveRotationPolicies()
      }
      
      // Remove from rotation schedule
      this.rotationSchedule = this.rotationSchedule.filter(s => s.keyId !== keyId)
      
      // Log rotation completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'KEY_ROTATION_COMPLETED',
        tableName: 'encryption_keys',
        recordId: keyId,
        oldValues: { keyId, version: currentKey.version },
        newValues: { 
          newKeyId, 
          version: newKey.version, 
          rotationDate: new Date(),
          reason,
          affectedRecords
        }
      })
      
      logger.info(`Key rotation completed: ${keyId} -> ${newKeyId}, affected records: ${affectedRecords}`)
      
      return {
        success: true,
        oldKeyId: keyId,
        newKeyId,
        rotationDate: new Date(),
        affectedRecords
      }
    } catch (error) {
      logger.error('Key rotation failed:', error)
      
      return {
        success: false,
        oldKeyId: keyId,
        newKeyId: '',
        rotationDate: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Re-encrypt data with new key
   */
  private static async reEncryptDataWithNewKey(oldKeyId: string, newKeyId: string): Promise<number> {
    try {
      let affectedRecords = 0
      
      // Get PII fields that use this key
      const piiFields = DataEncryptionService.getPIIFields()
      const fieldsToReEncrypt = piiFields.filter(field => {
        const fieldKeyId = `${field.tableName}_${field.fieldName}_key`
        return fieldKeyId === oldKeyId
      })
      
      // Re-encrypt each field type
      for (const field of fieldsToReEncrypt) {
        const records = await this.getEncryptedRecords(field.tableName, field.fieldName, oldKeyId)
        
        for (const record of records) {
          try {
            // Decrypt with old key
            const decryptedValue = await DataEncryptionService.decryptData(
              record.encryptedData,
              oldKeyId,
              record.iv,
              record.tag
            )
            
            // Encrypt with new key
            const newEncrypted = await DataEncryptionService.encryptData(
              decryptedValue.decryptedData,
              newKeyId
            )
            
            // Update database record
            await this.updateEncryptedRecord(
              field.tableName,
              record.id,
              field.fieldName,
              newEncrypted
            )
            
            affectedRecords++
          } catch (recordError) {
            logger.error(`Failed to re-encrypt record ${record.id}:`, recordError)
          }
        }
      }
      
      return affectedRecords
    } catch (error) {
      logger.error('Failed to re-encrypt data with new key:', error)
      throw error
    }
  }

  /**
   * Get encrypted records for a specific field and key
   */
  private static async getEncryptedRecords(
    tableName: string,
    fieldName: string,
    keyId: string
  ): Promise<Array<{
    id: string
    encryptedData: string
    iv: string
    tag: string
  }>> {
    try {
      // This is a simplified implementation
      // In a real scenario, you would query the database for encrypted records
      // For now, return empty array as the database schema doesn't include encrypted fields yet
      return []
    } catch (error) {
      logger.error('Failed to get encrypted records:', error)
      return []
    }
  }

  /**
   * Update encrypted record in database
   */
  private static async updateEncryptedRecord(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: any
  ): Promise<void> {
    try {
      // This would update the database record with new encrypted data
      // Implementation depends on the database schema for encrypted fields
      logger.info(`Updated encrypted record: ${tableName}.${recordId}.${fieldName}`)
    } catch (error) {
      logger.error('Failed to update encrypted record:', error)
      throw error
    }
  }

  /**
   * Expire encryption key
   */
  private static async expireKey(keyId: string): Promise<void> {
    try {
      const key = await DataEncryptionService.getEncryptionKey(keyId)
      if (key) {
        key.status = 'EXPIRED'
        
        // Log key expiration
        await AuditService.createAuditLog({
          userId: 'system',
          action: 'ENCRYPTION_KEY_EXPIRED',
          tableName: 'encryption_keys',
          recordId: keyId,
          newValues: { status: 'EXPIRED', expiredAt: new Date() }
        })
        
        logger.info(`Expired encryption key: ${keyId}`)
      }
    } catch (error) {
      logger.error('Failed to expire key:', error)
    }
  }

  /**
   * Get key expiration days based on policy
   */
  private static getKeyExpirationDays(keyId: string): number {
    const policy = this.getRotationPolicy(keyId)
    return policy ? policy.rotationIntervalDays : 90 // Default 90 days
  }

  /**
   * Schedule automatic rotations
   */
  private static async scheduleAutomaticRotations(): Promise<void> {
    try {
      const now = new Date()
      
      for (const policy of this.rotationPolicies.values()) {
        if (policy.autoRotationEnabled && policy.nextRotationDate) {
          if (policy.nextRotationDate <= now) {
            // Schedule immediate rotation
            await this.scheduleKeyRotation(
              policy.keyId,
              now,
              'HIGH',
              'Overdue automatic rotation',
              true
            )
          } else {
            // Schedule future rotation
            await this.scheduleKeyRotation(
              policy.keyId,
              policy.nextRotationDate,
              'MEDIUM',
              'Scheduled automatic rotation',
              true
            )
          }
        }
      }
    } catch (error) {
      logger.error('Failed to schedule automatic rotations:', error)
    }
  }

  /**
   * Start rotation scheduler
   */
  private static startRotationScheduler(): void {
    // Check for due rotations every hour
    setInterval(async () => {
      if (this.isRotationRunning) {
        return
      }
      
      try {
        await this.processScheduledRotations()
      } catch (error) {
        logger.error('Rotation scheduler error:', error)
      }
    }, 60 * 60 * 1000) // 1 hour
    
    logger.info('Key rotation scheduler started')
  }

  /**
   * Process scheduled rotations
   */
  private static async processScheduledRotations(): Promise<void> {
    try {
      this.isRotationRunning = true
      const now = new Date()
      
      // Get due rotations
      const dueRotations = this.rotationSchedule.filter(s => s.scheduledDate <= now)
      
      for (const rotation of dueRotations) {
        try {
          logger.info(`Processing scheduled rotation for key: ${rotation.keyId}`)
          
          const result = await this.rotateKey(rotation.keyId, rotation.reason)
          
          if (result.success) {
            logger.info(`Scheduled rotation completed successfully: ${rotation.keyId}`)
          } else {
            logger.error(`Scheduled rotation failed: ${rotation.keyId}`, result.errors)
          }
          
          // Remove from schedule
          this.rotationSchedule = this.rotationSchedule.filter(s => s.keyId !== rotation.keyId)
          
        } catch (rotationError) {
          logger.error(`Failed to process rotation for ${rotation.keyId}:`, rotationError)
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled rotations:', error)
    } finally {
      this.isRotationRunning = false
    }
  }

  /**
   * Send rotation notifications
   */
  private static async sendRotationNotifications(): Promise<void> {
    try {
      const now = new Date()
      
      for (const policy of this.rotationPolicies.values()) {
        if (!policy.nextRotationDate || !policy.notificationDays.length) {
          continue
        }
        
        const daysUntilRotation = Math.ceil(
          (policy.nextRotationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
        
        if (policy.notificationDays.includes(daysUntilRotation)) {
          // Send notification (implement notification service)
          logger.info(`Key rotation notification: ${policy.keyId} due in ${daysUntilRotation} days`)
          
          // Log notification
          await AuditService.createAuditLog({
            userId: 'system',
            action: 'KEY_ROTATION_NOTIFICATION_SENT',
            tableName: 'key_rotation_policies',
            recordId: policy.keyId,
            newValues: {
              daysUntilRotation,
              nextRotationDate: policy.nextRotationDate
            }
          })
        }
      }
    } catch (error) {
      logger.error('Failed to send rotation notifications:', error)
    }
  }

  /**
   * Load rotation policies from storage
   */
  private static async loadRotationPolicies(): Promise<void> {
    try {
      // In a real implementation, load from database
      // For now, create default policies for PII fields
      const piiFields = DataEncryptionService.getPIIFields()
      
      for (const field of piiFields) {
        const keyId = `${field.tableName}_${field.fieldName}_key`
        
        if (!this.rotationPolicies.has(keyId)) {
          const policy: KeyRotationPolicy = {
            keyId,
            rotationIntervalDays: field.keyRotationInterval,
            autoRotationEnabled: true,
            gracePeriodDays: 7,
            notificationDays: [30, 7, 1], // Notify 30, 7, and 1 days before rotation
            nextRotationDate: new Date(Date.now() + field.keyRotationInterval * 24 * 60 * 60 * 1000)
          }
          
          this.rotationPolicies.set(keyId, policy)
        }
      }
      
      logger.info(`Loaded ${this.rotationPolicies.size} key rotation policies`)
    } catch (error) {
      logger.error('Failed to load rotation policies:', error)
    }
  }

  /**
   * Save rotation policies to storage
   */
  private static async saveRotationPolicies(): Promise<void> {
    try {
      // In a real implementation, save to database
      logger.info('Saved key rotation policies')
    } catch (error) {
      logger.error('Failed to save rotation policies:', error)
    }
  }

  /**
   * Get rotation schedule
   */
  static getRotationSchedule(): KeyRotationSchedule[] {
    return [...this.rotationSchedule]
  }

  /**
   * Cancel scheduled rotation
   */
  static async cancelScheduledRotation(keyId: string): Promise<boolean> {
    try {
      const initialLength = this.rotationSchedule.length
      this.rotationSchedule = this.rotationSchedule.filter(s => s.keyId !== keyId)
      
      const cancelled = this.rotationSchedule.length < initialLength
      
      if (cancelled) {
        await AuditService.createAuditLog({
          userId: 'system',
          action: 'KEY_ROTATION_CANCELLED',
          tableName: 'key_rotation_schedule',
          recordId: keyId,
          newValues: { cancelledAt: new Date() }
        })
        
        logger.info(`Cancelled scheduled rotation for key: ${keyId}`)
      }
      
      return cancelled
    } catch (error) {
      logger.error('Failed to cancel scheduled rotation:', error)
      return false
    }
  }

  /**
   * Get key rotation status
   */
  static async getKeyRotationStatus(keyId: string): Promise<{
    hasPolicy: boolean
    policy?: KeyRotationPolicy
    isScheduled: boolean
    nextRotation?: Date
    daysUntilRotation?: number
  }> {
    try {
      const policy = this.getRotationPolicy(keyId)
      const scheduled = this.rotationSchedule.find(s => s.keyId === keyId)
      
      let daysUntilRotation: number | undefined
      const nextRotation = policy?.nextRotationDate || scheduled?.scheduledDate
      
      if (nextRotation) {
        daysUntilRotation = Math.ceil(
          (nextRotation.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
      }
      
      return {
        hasPolicy: !!policy,
        policy,
        isScheduled: !!scheduled,
        nextRotation,
        daysUntilRotation
      }
    } catch (error) {
      logger.error('Failed to get key rotation status:', error)
      return {
        hasPolicy: false,
        isScheduled: false
      }
    }
  }
}