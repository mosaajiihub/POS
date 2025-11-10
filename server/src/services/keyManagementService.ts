import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface KeyMetadata {
  id: string
  name: string
  description?: string
  keyType: KeyType
  algorithm: string
  keySize: number
  purpose: KeyPurpose[]
  createdBy: string
  createdAt: Date
  expiresAt?: Date
  lastUsedAt?: Date
  usageCount: number
  status: KeyStatus
  version: number
  tags: string[]
  accessPolicy: KeyAccessPolicy
}

export interface KeyAccessPolicy {
  allowedUsers: string[]
  allowedRoles: string[]
  allowedOperations: KeyOperation[]
  ipWhitelist?: string[]
  timeRestrictions?: TimeRestriction[]
  requireMFA: boolean
  maxUsageCount?: number
  auditLevel: AuditLevel
}

export interface TimeRestriction {
  startTime: string // HH:MM format
  endTime: string   // HH:MM format
  daysOfWeek: number[] // 0-6, Sunday = 0
  timezone: string
}

export interface KeyEscrowRecord {
  keyId: string
  escrowId: string
  escrowedBy: string
  escrowedAt: Date
  recoveryShares: number
  threshold: number
  escrowData: string // Encrypted key shares
  recoveryInstructions: string
  status: EscrowStatus
}

export interface KeyRecoveryRequest {
  requestId: string
  keyId: string
  requestedBy: string
  requestedAt: Date
  reason: string
  approvals: KeyRecoveryApproval[]
  requiredApprovals: number
  status: RecoveryStatus
  completedAt?: Date
}

export interface KeyRecoveryApproval {
  approvedBy: string
  approvedAt: Date
  shareProvided: boolean
  comments?: string
}

export interface KeyUsageLog {
  id: string
  keyId: string
  operation: KeyOperation
  userId: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  success: boolean
  errorMessage?: string
  metadata?: any
}

export interface KeyLifecycleEvent {
  id: string
  keyId: string
  eventType: LifecycleEventType
  eventDate: Date
  performedBy: string
  details: any
  previousState?: any
  newState?: any
}

export enum KeyType {
  SYMMETRIC = 'SYMMETRIC',
  ASYMMETRIC_RSA = 'ASYMMETRIC_RSA',
  ASYMMETRIC_EC = 'ASYMMETRIC_EC',
  HMAC = 'HMAC',
  DERIVED = 'DERIVED'
}

export enum KeyPurpose {
  ENCRYPTION = 'ENCRYPTION',
  DECRYPTION = 'DECRYPTION',
  SIGNING = 'SIGNING',
  VERIFICATION = 'VERIFICATION',
  KEY_DERIVATION = 'KEY_DERIVATION',
  AUTHENTICATION = 'AUTHENTICATION'
}

export enum KeyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  COMPROMISED = 'COMPROMISED',
  PENDING_ACTIVATION = 'PENDING_ACTIVATION'
}

export enum KeyOperation {
  GENERATE = 'GENERATE',
  RETRIEVE = 'RETRIEVE',
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT',
  SIGN = 'SIGN',
  VERIFY = 'VERIFY',
  DERIVE = 'DERIVE',
  ROTATE = 'ROTATE',
  REVOKE = 'REVOKE',
  ESCROW = 'ESCROW',
  RECOVER = 'RECOVER'
}

export enum AuditLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  DETAILED = 'DETAILED',
  FULL = 'FULL'
}

export enum EscrowStatus {
  ACTIVE = 'ACTIVE',
  RECOVERED = 'RECOVERED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

export enum RecoveryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export enum LifecycleEventType {
  CREATED = 'CREATED',
  ACTIVATED = 'ACTIVATED',
  USED = 'USED',
  ROTATED = 'ROTATED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  COMPROMISED = 'COMPROMISED',
  ESCROWED = 'ESCROWED',
  RECOVERED = 'RECOVERED'
}

/**
 * Key Management Service
 * Provides comprehensive key lifecycle management including generation,
 * storage, access control, audit logging, escrow, and recovery
 */
export class KeyManagementService {
  private static readonly KEY_STORAGE_PATH = path.join(process.cwd(), 'server', 'keys')
  private static readonly METADATA_FILE = 'key-metadata.json'
  private static readonly ESCROW_FILE = 'key-escrow.json'
  private static readonly USAGE_LOG_FILE = 'key-usage.log'
  
  // In-memory caches
  private static keyMetadataCache = new Map<string, KeyMetadata>()
  private static keyEscrowCache = new Map<string, KeyEscrowRecord>()
  private static usageLogBuffer: KeyUsageLog[] = []

  /**
   * Initialize key management service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Key Management Service...')
      
      // Create key storage directory
      await fs.mkdir(this.KEY_STORAGE_PATH, { recursive: true })
      
      // Initialize metadata storage
      await this.initializeMetadataStorage()
      
      // Initialize escrow storage
      await this.initializeEscrowStorage()
      
      // Load metadata into cache
      await this.loadMetadataCache()
      
      // Load escrow records into cache
      await this.loadEscrowCache()
      
      // Start usage log flusher
      this.startUsageLogFlusher()
      
      logger.info('Key Management Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Key Management Service:', error)
      throw error
    }
  }

  /**
   * Generate a new cryptographic key
   */
  static async generateKey(
    keyId: string,
    keyType: KeyType,
    keySize: number,
    metadata: Partial<KeyMetadata>,
    createdBy: string
  ): Promise<KeyMetadata> {
    try {
      // Validate key parameters
      this.validateKeyParameters(keyType, keySize)
      
      // Check if key already exists
      if (await this.keyExists(keyId)) {
        throw new Error(`Key already exists: ${keyId}`)
      }
      
      // Generate key material
      const keyMaterial = await this.generateKeyMaterial(keyType, keySize)
      
      // Create key metadata
      const keyMetadata: KeyMetadata = {
        id: keyId,
        name: metadata.name || keyId,
        description: metadata.description,
        keyType,
        algorithm: this.getAlgorithmForKeyType(keyType),
        keySize,
        purpose: metadata.purpose || [KeyPurpose.ENCRYPTION, KeyPurpose.DECRYPTION],
        createdBy,
        createdAt: new Date(),
        expiresAt: metadata.expiresAt,
        lastUsedAt: undefined,
        usageCount: 0,
        status: KeyStatus.ACTIVE,
        version: 1,
        tags: metadata.tags || [],
        accessPolicy: metadata.accessPolicy || this.getDefaultAccessPolicy(createdBy)
      }
      
      // Store key material securely
      await this.storeKeyMaterial(keyId, keyMaterial)
      
      // Store metadata
      await this.storeKeyMetadata(keyMetadata)
      
      // Add to cache
      this.keyMetadataCache.set(keyId, keyMetadata)
      
      // Log key generation
      await this.logKeyUsage({
        keyId,
        operation: KeyOperation.GENERATE,
        userId: createdBy,
        ipAddress: 'system',
        userAgent: 'KeyManagementService',
        timestamp: new Date(),
        success: true,
        metadata: { keyType, keySize, algorithm: keyMetadata.algorithm }
      })
      
      // Record lifecycle event
      await this.recordLifecycleEvent({
        keyId,
        eventType: LifecycleEventType.CREATED,
        eventDate: new Date(),
        performedBy: createdBy,
        details: { keyType, keySize, algorithm: keyMetadata.algorithm },
        newState: keyMetadata
      })
      
      // Create audit log
      await AuditService.createAuditLog({
        userId: createdBy,
        action: 'ENCRYPTION_KEY_GENERATED',
        tableName: 'key_management',
        recordId: keyId,
        newValues: {
          keyId,
          keyType,
          keySize,
          algorithm: keyMetadata.algorithm,
          purpose: keyMetadata.purpose
        }
      })
      
      logger.info(`Generated encryption key: ${keyId} (${keyType}, ${keySize} bits)`)
      return keyMetadata
    } catch (error) {
      logger.error('Failed to generate key:', error)
      
      // Log failed generation
      await this.logKeyUsage({
        keyId,
        operation: KeyOperation.GENERATE,
        userId: createdBy,
        ipAddress: 'system',
        userAgent: 'KeyManagementService',
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  /**
   * Retrieve key metadata
   */
  static async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    try {
      // Check cache first
      if (this.keyMetadataCache.has(keyId)) {
        return this.keyMetadataCache.get(keyId)!
      }
      
      // Load from storage
      const metadata = await this.loadKeyMetadata(keyId)
      if (metadata) {
        this.keyMetadataCache.set(keyId, metadata)
      }
      
      return metadata
    } catch (error) {
      logger.error('Failed to get key metadata:', error)
      return null
    }
  }

  /**
   * Retrieve key material (with access control)
   */
  static async getKeyMaterial(
    keyId: string,
    userId: string,
    operation: KeyOperation,
    context: { ipAddress: string; userAgent: string }
  ): Promise<Buffer | null> {
    try {
      // Get key metadata
      const metadata = await this.getKeyMetadata(keyId)
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`)
      }
      
      // Check access permissions
      await this.checkKeyAccess(metadata, userId, operation, context)
      
      // Load key material
      const keyMaterial = await this.loadKeyMaterial(keyId)
      if (!keyMaterial) {
        throw new Error(`Key material not found: ${keyId}`)
      }
      
      // Update usage statistics
      await this.updateKeyUsage(keyId, operation)
      
      // Log key access
      await this.logKeyUsage({
        keyId,
        operation,
        userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date(),
        success: true
      })
      
      return keyMaterial
    } catch (error) {
      logger.error('Failed to get key material:', error)
      
      // Log failed access
      await this.logKeyUsage({
        keyId,
        operation,
        userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  /**
   * List keys with filtering
   */
  static async listKeys(filters?: {
    keyType?: KeyType
    status?: KeyStatus
    purpose?: KeyPurpose
    createdBy?: string
    tags?: string[]
    expiringBefore?: Date
  }): Promise<KeyMetadata[]> {
    try {
      const allKeys = Array.from(this.keyMetadataCache.values())
      
      if (!filters) {
        return allKeys
      }
      
      return allKeys.filter(key => {
        if (filters.keyType && key.keyType !== filters.keyType) return false
        if (filters.status && key.status !== filters.status) return false
        if (filters.purpose && !key.purpose.includes(filters.purpose)) return false
        if (filters.createdBy && key.createdBy !== filters.createdBy) return false
        if (filters.expiringBefore && key.expiresAt && key.expiresAt > filters.expiringBefore) return false
        if (filters.tags && !filters.tags.some(tag => key.tags.includes(tag))) return false
        
        return true
      })
    } catch (error) {
      logger.error('Failed to list keys:', error)
      return []
    }
  }

  /**
   * Update key metadata
   */
  static async updateKeyMetadata(
    keyId: string,
    updates: Partial<KeyMetadata>,
    updatedBy: string
  ): Promise<KeyMetadata | null> {
    try {
      const currentMetadata = await this.getKeyMetadata(keyId)
      if (!currentMetadata) {
        throw new Error(`Key not found: ${keyId}`)
      }
      
      // Create updated metadata
      const updatedMetadata: KeyMetadata = {
        ...currentMetadata,
        ...updates,
        id: keyId, // Prevent ID changes
        version: currentMetadata.version + 1
      }
      
      // Store updated metadata
      await this.storeKeyMetadata(updatedMetadata)
      
      // Update cache
      this.keyMetadataCache.set(keyId, updatedMetadata)
      
      // Record lifecycle event
      await this.recordLifecycleEvent({
        keyId,
        eventType: LifecycleEventType.USED,
        eventDate: new Date(),
        performedBy: updatedBy,
        details: { operation: 'metadata_update', updates },
        previousState: currentMetadata,
        newState: updatedMetadata
      })
      
      // Create audit log
      await AuditService.createAuditLog({
        userId: updatedBy,
        action: 'ENCRYPTION_KEY_UPDATED',
        tableName: 'key_management',
        recordId: keyId,
        oldValues: currentMetadata,
        newValues: updatedMetadata
      })
      
      logger.info(`Updated key metadata: ${keyId}`)
      return updatedMetadata
    } catch (error) {
      logger.error('Failed to update key metadata:', error)
      throw error
    }
  }

  /**
   * Revoke key
   */
  static async revokeKey(keyId: string, reason: string, revokedBy: string): Promise<boolean> {
    try {
      const metadata = await this.getKeyMetadata(keyId)
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`)
      }
      
      // Update status to revoked
      const updatedMetadata = await this.updateKeyMetadata(
        keyId,
        { status: KeyStatus.REVOKED },
        revokedBy
      )
      
      if (!updatedMetadata) {
        return false
      }
      
      // Record lifecycle event
      await this.recordLifecycleEvent({
        keyId,
        eventType: LifecycleEventType.REVOKED,
        eventDate: new Date(),
        performedBy: revokedBy,
        details: { reason },
        previousState: metadata,
        newState: updatedMetadata
      })
      
      // Log key revocation
      await this.logKeyUsage({
        keyId,
        operation: KeyOperation.REVOKE,
        userId: revokedBy,
        ipAddress: 'system',
        userAgent: 'KeyManagementService',
        timestamp: new Date(),
        success: true,
        metadata: { reason }
      })
      
      logger.info(`Revoked key: ${keyId}, reason: ${reason}`)
      return true
    } catch (error) {
      logger.error('Failed to revoke key:', error)
      return false
    }
  }  /**

   * Create key escrow
   */
  static async createKeyEscrow(
    keyId: string,
    escrowedBy: string,
    recoveryShares: number = 3,
    threshold: number = 2,
    recoveryInstructions: string = 'Standard key recovery procedure'
  ): Promise<KeyEscrowRecord> {
    try {
      const metadata = await this.getKeyMetadata(keyId)
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`)
      }
      
      // Get key material
      const keyMaterial = await this.loadKeyMaterial(keyId)
      if (!keyMaterial) {
        throw new Error(`Key material not found: ${keyId}`)
      }
      
      // Generate escrow shares using Shamir's Secret Sharing
      const escrowShares = this.generateEscrowShares(keyMaterial, recoveryShares, threshold)
      
      // Create escrow record
      const escrowId = `escrow_${keyId}_${Date.now()}`
      const escrowRecord: KeyEscrowRecord = {
        keyId,
        escrowId,
        escrowedBy,
        escrowedAt: new Date(),
        recoveryShares,
        threshold,
        escrowData: this.encryptEscrowData(escrowShares),
        recoveryInstructions,
        status: EscrowStatus.ACTIVE
      }
      
      // Store escrow record
      await this.storeEscrowRecord(escrowRecord)
      
      // Add to cache
      this.keyEscrowCache.set(escrowId, escrowRecord)
      
      // Record lifecycle event
      await this.recordLifecycleEvent({
        keyId,
        eventType: LifecycleEventType.ESCROWED,
        eventDate: new Date(),
        performedBy: escrowedBy,
        details: { escrowId, recoveryShares, threshold },
        newState: { escrowed: true, escrowId }
      })
      
      // Log escrow creation
      await this.logKeyUsage({
        keyId,
        operation: KeyOperation.ESCROW,
        userId: escrowedBy,
        ipAddress: 'system',
        userAgent: 'KeyManagementService',
        timestamp: new Date(),
        success: true,
        metadata: { escrowId, recoveryShares, threshold }
      })
      
      // Create audit log
      await AuditService.createAuditLog({
        userId: escrowedBy,
        action: 'KEY_ESCROW_CREATED',
        tableName: 'key_escrow',
        recordId: escrowId,
        newValues: {
          keyId,
          escrowId,
          recoveryShares,
          threshold,
          recoveryInstructions
        }
      })
      
      logger.info(`Created key escrow: ${escrowId} for key: ${keyId}`)
      return escrowRecord
    } catch (error) {
      logger.error('Failed to create key escrow:', error)
      throw error
    }
  }

  /**
   * Request key recovery
   */
  static async requestKeyRecovery(
    keyId: string,
    requestedBy: string,
    reason: string,
    requiredApprovals: number = 2
  ): Promise<KeyRecoveryRequest> {
    try {
      // Check if key has escrow
      const escrowRecord = Array.from(this.keyEscrowCache.values())
        .find(record => record.keyId === keyId && record.status === EscrowStatus.ACTIVE)
      
      if (!escrowRecord) {
        throw new Error(`No active escrow found for key: ${keyId}`)
      }
      
      // Create recovery request
      const requestId = `recovery_${keyId}_${Date.now()}`
      const recoveryRequest: KeyRecoveryRequest = {
        requestId,
        keyId,
        requestedBy,
        requestedAt: new Date(),
        reason,
        approvals: [],
        requiredApprovals,
        status: RecoveryStatus.PENDING
      }
      
      // Store recovery request (in a real implementation, this would be in database)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId: requestedBy,
        action: 'KEY_RECOVERY_REQUESTED',
        tableName: 'key_recovery',
        recordId: requestId,
        newValues: {
          keyId,
          requestId,
          reason,
          requiredApprovals
        }
      })
      
      logger.info(`Key recovery requested: ${requestId} for key: ${keyId}`)
      return recoveryRequest
    } catch (error) {
      logger.error('Failed to request key recovery:', error)
      throw error
    }
  }

  /**
   * Get key usage statistics
   */
  static async getKeyUsageStatistics(keyId: string): Promise<{
    totalUsage: number
    lastUsed?: Date
    operationCounts: Record<KeyOperation, number>
    userCounts: Record<string, number>
    recentActivity: KeyUsageLog[]
  }> {
    try {
      const metadata = await this.getKeyMetadata(keyId)
      if (!metadata) {
        throw new Error(`Key not found: ${keyId}`)
      }
      
      // In a real implementation, this would query the usage log database
      const recentActivity: KeyUsageLog[] = []
      const operationCounts: Record<KeyOperation, number> = {} as any
      const userCounts: Record<string, number> = {}
      
      // Initialize operation counts
      Object.values(KeyOperation).forEach(op => {
        operationCounts[op] = 0
      })
      
      return {
        totalUsage: metadata.usageCount,
        lastUsed: metadata.lastUsedAt,
        operationCounts,
        userCounts,
        recentActivity
      }
    } catch (error) {
      logger.error('Failed to get key usage statistics:', error)
      throw error
    }
  }

  /**
   * Validate key parameters
   */
  private static validateKeyParameters(keyType: KeyType, keySize: number): void {
    const validSizes: Record<KeyType, number[]> = {
      [KeyType.SYMMETRIC]: [128, 192, 256],
      [KeyType.ASYMMETRIC_RSA]: [2048, 3072, 4096],
      [KeyType.ASYMMETRIC_EC]: [256, 384, 521],
      [KeyType.HMAC]: [128, 192, 256, 512],
      [KeyType.DERIVED]: [128, 192, 256]
    }
    
    if (!validSizes[keyType].includes(keySize)) {
      throw new Error(`Invalid key size ${keySize} for key type ${keyType}`)
    }
  }

  /**
   * Generate key material based on type and size
   */
  private static async generateKeyMaterial(keyType: KeyType, keySize: number): Promise<Buffer> {
    switch (keyType) {
      case KeyType.SYMMETRIC:
      case KeyType.HMAC:
      case KeyType.DERIVED:
        return crypto.randomBytes(keySize / 8)
      
      case KeyType.ASYMMETRIC_RSA:
        const rsaKeyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: keySize,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        })
        return Buffer.from(JSON.stringify({
          publicKey: rsaKeyPair.publicKey,
          privateKey: rsaKeyPair.privateKey
        }))
      
      case KeyType.ASYMMETRIC_EC:
        const ecKeyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: keySize === 256 ? 'prime256v1' : keySize === 384 ? 'secp384r1' : 'secp521r1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        })
        return Buffer.from(JSON.stringify({
          publicKey: ecKeyPair.publicKey,
          privateKey: ecKeyPair.privateKey
        }))
      
      default:
        throw new Error(`Unsupported key type: ${keyType}`)
    }
  }

  /**
   * Get algorithm for key type
   */
  private static getAlgorithmForKeyType(keyType: KeyType): string {
    switch (keyType) {
      case KeyType.SYMMETRIC:
        return 'aes-256-gcm'
      case KeyType.ASYMMETRIC_RSA:
        return 'rsa'
      case KeyType.ASYMMETRIC_EC:
        return 'ec'
      case KeyType.HMAC:
        return 'hmac-sha256'
      case KeyType.DERIVED:
        return 'pbkdf2'
      default:
        return 'unknown'
    }
  }

  /**
   * Get default access policy
   */
  private static getDefaultAccessPolicy(createdBy: string): KeyAccessPolicy {
    return {
      allowedUsers: [createdBy],
      allowedRoles: ['ADMIN', 'MANAGER'],
      allowedOperations: [
        KeyOperation.ENCRYPT,
        KeyOperation.DECRYPT,
        KeyOperation.SIGN,
        KeyOperation.VERIFY
      ],
      requireMFA: false,
      auditLevel: AuditLevel.BASIC
    }
  }

  /**
   * Check key access permissions
   */
  private static async checkKeyAccess(
    metadata: KeyMetadata,
    userId: string,
    operation: KeyOperation,
    context: { ipAddress: string; userAgent: string }
  ): Promise<void> {
    const policy = metadata.accessPolicy
    
    // Check if key is active
    if (metadata.status !== KeyStatus.ACTIVE) {
      throw new Error(`Key is not active: ${metadata.status}`)
    }
    
    // Check expiration
    if (metadata.expiresAt && metadata.expiresAt < new Date()) {
      throw new Error('Key has expired')
    }
    
    // Check operation permissions
    if (!policy.allowedOperations.includes(operation)) {
      throw new Error(`Operation not allowed: ${operation}`)
    }
    
    // Check user permissions
    if (!policy.allowedUsers.includes(userId)) {
      // Check role permissions (simplified - would need user role lookup)
      const hasRoleAccess = policy.allowedRoles.includes('ADMIN') // Simplified check
      if (!hasRoleAccess) {
        throw new Error('User not authorized for this key')
      }
    }
    
    // Check IP whitelist
    if (policy.ipWhitelist && !policy.ipWhitelist.includes(context.ipAddress)) {
      throw new Error('IP address not whitelisted')
    }
    
    // Check usage limits
    if (policy.maxUsageCount && metadata.usageCount >= policy.maxUsageCount) {
      throw new Error('Key usage limit exceeded')
    }
    
    // Check time restrictions
    if (policy.timeRestrictions) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const currentDay = now.getDay()
      
      const isAllowed = policy.timeRestrictions.some(restriction => {
        return restriction.daysOfWeek.includes(currentDay) &&
               currentTime >= restriction.startTime &&
               currentTime <= restriction.endTime
      })
      
      if (!isAllowed) {
        throw new Error('Key access not allowed at this time')
      }
    }
  }

  /**
   * Update key usage statistics
   */
  private static async updateKeyUsage(keyId: string, operation: KeyOperation): Promise<void> {
    try {
      const metadata = await this.getKeyMetadata(keyId)
      if (metadata) {
        metadata.usageCount++
        metadata.lastUsedAt = new Date()
        
        await this.storeKeyMetadata(metadata)
        this.keyMetadataCache.set(keyId, metadata)
      }
    } catch (error) {
      logger.error('Failed to update key usage:', error)
    }
  }

  /**
   * Log key usage
   */
  private static async logKeyUsage(usage: Omit<KeyUsageLog, 'id'>): Promise<void> {
    try {
      const logEntry: KeyUsageLog = {
        id: crypto.randomUUID(),
        ...usage
      }
      
      // Add to buffer
      this.usageLogBuffer.push(logEntry)
      
      // Flush if buffer is full
      if (this.usageLogBuffer.length >= 100) {
        await this.flushUsageLogBuffer()
      }
    } catch (error) {
      logger.error('Failed to log key usage:', error)
    }
  }

  /**
   * Record lifecycle event
   */
  private static async recordLifecycleEvent(event: Omit<KeyLifecycleEvent, 'id'>): Promise<void> {
    try {
      const lifecycleEvent: KeyLifecycleEvent = {
        id: crypto.randomUUID(),
        ...event
      }
      
      // In a real implementation, store in database
      logger.info(`Key lifecycle event: ${event.eventType} for key ${event.keyId}`)
    } catch (error) {
      logger.error('Failed to record lifecycle event:', error)
    }
  }

  /**
   * Generate escrow shares using Shamir's Secret Sharing
   */
  private static generateEscrowShares(
    keyMaterial: Buffer,
    shares: number,
    threshold: number
  ): string[] {
    // Simplified implementation - in production, use a proper Shamir's Secret Sharing library
    const secret = keyMaterial.toString('hex')
    const escrowShares: string[] = []
    
    for (let i = 0; i < shares; i++) {
      const share = crypto.createHash('sha256')
        .update(secret + i.toString())
        .digest('hex')
      escrowShares.push(`${i + 1}:${share}`)
    }
    
    return escrowShares
  }

  /**
   * Encrypt escrow data
   */
  private static encryptEscrowData(escrowShares: string[]): string {
    const masterKey = this.getMasterKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-gcm', masterKey)
    
    let encrypted = cipher.update(JSON.stringify(escrowShares), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`
  }

  /**
   * Get master key for escrow encryption
   */
  private static getMasterKey(): Buffer {
    const masterSecret = process.env.ENCRYPTION_MASTER_KEY || 'default-master-key'
    const salt = 'key-management-escrow-salt'
    return crypto.pbkdf2Sync(masterSecret, salt, 100000, 32, 'sha256')
  }

  /**
   * Check if key exists
   */
  private static async keyExists(keyId: string): Promise<boolean> {
    return this.keyMetadataCache.has(keyId) || await this.loadKeyMetadata(keyId) !== null
  }

  /**
   * Store key material securely
   */
  private static async storeKeyMaterial(keyId: string, keyMaterial: Buffer): Promise<void> {
    try {
      const keyFile = path.join(this.KEY_STORAGE_PATH, `${keyId}.key`)
      
      // Encrypt key material before storage
      const masterKey = this.getMasterKey()
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipher('aes-256-gcm', masterKey)
      
      let encrypted = cipher.update(keyMaterial)
      encrypted = Buffer.concat([encrypted, cipher.final()])
      
      const tag = cipher.getAuthTag()
      const finalData = Buffer.concat([iv, tag, encrypted])
      
      await fs.writeFile(keyFile, finalData)
    } catch (error) {
      logger.error('Failed to store key material:', error)
      throw error
    }
  }

  /**
   * Load key material
   */
  private static async loadKeyMaterial(keyId: string): Promise<Buffer | null> {
    try {
      const keyFile = path.join(this.KEY_STORAGE_PATH, `${keyId}.key`)
      
      try {
        const encryptedData = await fs.readFile(keyFile)
        
        // Decrypt key material
        const masterKey = this.getMasterKey()
        const iv = encryptedData.subarray(0, 16)
        const tag = encryptedData.subarray(16, 32)
        const encrypted = encryptedData.subarray(32)
        
        const decipher = crypto.createDecipher('aes-256-gcm', masterKey)
        decipher.setAuthTag(tag)
        
        let decrypted = decipher.update(encrypted)
        decrypted = Buffer.concat([decrypted, decipher.final()])
        
        return decrypted
      } catch (fileError) {
        return null
      }
    } catch (error) {
      logger.error('Failed to load key material:', error)
      return null
    }
  }

  /**
   * Store key metadata
   */
  private static async storeKeyMetadata(metadata: KeyMetadata): Promise<void> {
    try {
      const metadataFile = path.join(this.KEY_STORAGE_PATH, this.METADATA_FILE)
      
      let allMetadata: KeyMetadata[] = []
      try {
        const existingData = await fs.readFile(metadataFile, 'utf8')
        allMetadata = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Remove existing metadata for this key
      allMetadata = allMetadata.filter(m => m.id !== metadata.id)
      
      // Add new metadata
      allMetadata.push(metadata)
      
      await fs.writeFile(metadataFile, JSON.stringify(allMetadata, null, 2))
    } catch (error) {
      logger.error('Failed to store key metadata:', error)
      throw error
    }
  }

  /**
   * Load key metadata
   */
  private static async loadKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    try {
      const metadataFile = path.join(this.KEY_STORAGE_PATH, this.METADATA_FILE)
      
      try {
        const data = await fs.readFile(metadataFile, 'utf8')
        const allMetadata: KeyMetadata[] = JSON.parse(data)
        
        const metadata = allMetadata.find(m => m.id === keyId)
        if (metadata) {
          // Convert date strings back to Date objects
          metadata.createdAt = new Date(metadata.createdAt)
          if (metadata.expiresAt) metadata.expiresAt = new Date(metadata.expiresAt)
          if (metadata.lastUsedAt) metadata.lastUsedAt = new Date(metadata.lastUsedAt)
        }
        
        return metadata || null
      } catch {
        return null
      }
    } catch (error) {
      logger.error('Failed to load key metadata:', error)
      return null
    }
  }

  /**
   * Initialize metadata storage
   */
  private static async initializeMetadataStorage(): Promise<void> {
    try {
      const metadataFile = path.join(this.KEY_STORAGE_PATH, this.METADATA_FILE)
      
      try {
        await fs.access(metadataFile)
      } catch {
        await fs.writeFile(metadataFile, JSON.stringify([], null, 2))
      }
    } catch (error) {
      logger.error('Failed to initialize metadata storage:', error)
      throw error
    }
  }

  /**
   * Initialize escrow storage
   */
  private static async initializeEscrowStorage(): Promise<void> {
    try {
      const escrowFile = path.join(this.KEY_STORAGE_PATH, this.ESCROW_FILE)
      
      try {
        await fs.access(escrowFile)
      } catch {
        await fs.writeFile(escrowFile, JSON.stringify([], null, 2))
      }
    } catch (error) {
      logger.error('Failed to initialize escrow storage:', error)
      throw error
    }
  }

  /**
   * Load metadata cache
   */
  private static async loadMetadataCache(): Promise<void> {
    try {
      const metadataFile = path.join(this.KEY_STORAGE_PATH, this.METADATA_FILE)
      
      try {
        const data = await fs.readFile(metadataFile, 'utf8')
        const allMetadata: KeyMetadata[] = JSON.parse(data)
        
        for (const metadata of allMetadata) {
          // Convert date strings back to Date objects
          metadata.createdAt = new Date(metadata.createdAt)
          if (metadata.expiresAt) metadata.expiresAt = new Date(metadata.expiresAt)
          if (metadata.lastUsedAt) metadata.lastUsedAt = new Date(metadata.lastUsedAt)
          
          this.keyMetadataCache.set(metadata.id, metadata)
        }
        
        logger.info(`Loaded ${allMetadata.length} key metadata records into cache`)
      } catch {
        logger.info('No existing metadata found, starting with empty cache')
      }
    } catch (error) {
      logger.error('Failed to load metadata cache:', error)
    }
  }

  /**
   * Load escrow cache
   */
  private static async loadEscrowCache(): Promise<void> {
    try {
      const escrowFile = path.join(this.KEY_STORAGE_PATH, this.ESCROW_FILE)
      
      try {
        const data = await fs.readFile(escrowFile, 'utf8')
        const allEscrow: KeyEscrowRecord[] = JSON.parse(data)
        
        for (const escrow of allEscrow) {
          escrow.escrowedAt = new Date(escrow.escrowedAt)
          this.keyEscrowCache.set(escrow.escrowId, escrow)
        }
        
        logger.info(`Loaded ${allEscrow.length} escrow records into cache`)
      } catch {
        logger.info('No existing escrow records found, starting with empty cache')
      }
    } catch (error) {
      logger.error('Failed to load escrow cache:', error)
    }
  }

  /**
   * Store escrow record
   */
  private static async storeEscrowRecord(escrow: KeyEscrowRecord): Promise<void> {
    try {
      const escrowFile = path.join(this.KEY_STORAGE_PATH, this.ESCROW_FILE)
      
      let allEscrow: KeyEscrowRecord[] = []
      try {
        const existingData = await fs.readFile(escrowFile, 'utf8')
        allEscrow = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Remove existing escrow for this key
      allEscrow = allEscrow.filter(e => e.escrowId !== escrow.escrowId)
      
      // Add new escrow
      allEscrow.push(escrow)
      
      await fs.writeFile(escrowFile, JSON.stringify(allEscrow, null, 2))
    } catch (error) {
      logger.error('Failed to store escrow record:', error)
      throw error
    }
  }

  /**
   * Start usage log flusher
   */
  private static startUsageLogFlusher(): void {
    // Flush usage log buffer every 5 minutes
    setInterval(async () => {
      if (this.usageLogBuffer.length > 0) {
        await this.flushUsageLogBuffer()
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Flush usage log buffer
   */
  private static async flushUsageLogBuffer(): Promise<void> {
    try {
      if (this.usageLogBuffer.length === 0) return
      
      const logFile = path.join(this.KEY_STORAGE_PATH, this.USAGE_LOG_FILE)
      const logEntries = this.usageLogBuffer.splice(0) // Remove all entries from buffer
      
      const logLines = logEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n'
      
      await fs.appendFile(logFile, logLines)
      
      logger.debug(`Flushed ${logEntries.length} usage log entries`)
    } catch (error) {
      logger.error('Failed to flush usage log buffer:', error)
    }
  }
}