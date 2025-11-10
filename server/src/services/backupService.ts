import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { DataEncryptionService } from './dataEncryptionService'
import { KeyManagementService, KeyType, KeyPurpose } from './keyManagementService'

const execAsync = promisify(exec)

export interface BackupMetadata {
  id: string
  name: string
  type: BackupType
  status: BackupStatus
  createdAt: Date
  completedAt?: Date
  size: number
  encryptedSize?: number
  keyId: string
  checksum: string
  encryptedChecksum?: string
  location: string
  encryptedLocation?: string
  retentionDays: number
  expiresAt: Date
  tags: string[]
  metadata: Record<string, any>
}

export interface BackupConfig {
  name: string
  type: BackupType
  schedule?: string
  retentionDays: number
  encryptionEnabled: boolean
  compressionEnabled: boolean
  integrityCheckEnabled: boolean
  offsiteEnabled: boolean
  tags?: string[]
}

export interface BackupVerificationResult {
  backupId: string
  valid: boolean
  checksumValid: boolean
  encryptionValid: boolean
  sizeValid: boolean
  errors: string[]
  verifiedAt: Date
}

export interface BackupAlert {
  id: string
  backupId?: string
  severity: AlertSeverity
  type: AlertType
  message: string
  details: any
  createdAt: Date
  acknowledged: boolean
}

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  DATABASE = 'DATABASE',
  FILES = 'FILES',
  CONFIGURATION = 'CONFIGURATION'
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum AlertType {
  BACKUP_FAILED = 'BACKUP_FAILED',
  BACKUP_COMPLETED = 'BACKUP_COMPLETED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  RETENTION_EXPIRED = 'RETENTION_EXPIRED',
  KEY_ROTATION_REQUIRED = 'KEY_ROTATION_REQUIRED'
}

/**
 * Backup Service
 * Handles automated encrypted backup procedures, integrity verification,
 * and backup monitoring with alerting
 */
export class BackupService {
  private static readonly BACKUP_BASE_PATH = path.join(process.cwd(), 'server', 'backups')
  private static readonly BACKUP_METADATA_FILE = 'backup-metadata.json'
  private static readonly BACKUP_ALERTS_FILE = 'backup-alerts.json'
  private static readonly DEFAULT_RETENTION_DAYS = 30
  private static readonly BACKUP_KEY_PREFIX = 'backup_key_'
  
  private static backupMetadataCache = new Map<string, BackupMetadata>()
  private static backupAlertsCache: BackupAlert[] = []
  private static monitoringInterval: NodeJS.Timeout | null = null

  /**
   * Initialize backup service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Backup Service...')
      
      // Create backup directories
      await fs.mkdir(this.BACKUP_BASE_PATH, { recursive: true })
      await fs.mkdir(path.join(this.BACKUP_BASE_PATH, 'database'), { recursive: true })
      await fs.mkdir(path.join(this.BACKUP_BASE_PATH, 'files'), { recursive: true })
      await fs.mkdir(path.join(this.BACKUP_BASE_PATH, 'config'), { recursive: true })
      
      // Initialize metadata storage
      await this.initializeMetadataStorage()
      
      // Load metadata cache
      await this.loadMetadataCache()
      
      // Start monitoring
      this.startBackupMonitoring()
      
      logger.info('Backup Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Backup Service:', error)
      throw error
    }
  }

  /**
   * Create encrypted backup
   */
  static async createBackup(config: BackupConfig, userId: string = 'system'): Promise<BackupMetadata> {
    const backupId = `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    
    try {
      logger.info(`Creating backup: ${config.name} (${config.type})`)
      
      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        name: config.name,
        type: config.type,
        status: BackupStatus.IN_PROGRESS,
        createdAt: new Date(),
        size: 0,
        keyId: '',
        checksum: '',
        location: '',
        retentionDays: config.retentionDays,
        expiresAt: new Date(Date.now() + config.retentionDays * 24 * 60 * 60 * 1000),
        tags: config.tags || [],
        metadata: {}
      }
      
      // Store initial metadata
      await this.storeBackupMetadata(metadata)
      
      // Generate backup encryption key
      const keyId = `${this.BACKUP_KEY_PREFIX}${backupId}`
      await KeyManagementService.generateKey(
        keyId,
        KeyType.SYMMETRIC,
        256,
        {
          name: `Backup Key for ${config.name}`,
          description: `Encryption key for backup ${backupId}`,
          purpose: [KeyPurpose.ENCRYPTION, KeyPurpose.DECRYPTION],
          expiresAt: metadata.expiresAt,
          tags: ['backup', config.type.toLowerCase()]
        },
        userId
      )
      
      metadata.keyId = keyId
      
      // Create backup based on type
      let backupPath: string
      switch (config.type) {
        case BackupType.DATABASE:
          backupPath = await this.createDatabaseBackup(backupId)
          break
        case BackupType.FILES:
          backupPath = await this.createFilesBackup(backupId)
          break
        case BackupType.CONFIGURATION:
          backupPath = await this.createConfigurationBackup(backupId)
          break
        case BackupType.FULL:
          backupPath = await this.createFullBackup(backupId)
          break
        default:
          throw new Error(`Unsupported backup type: ${config.type}`)
      }
      
      metadata.location = backupPath
      
      // Get backup size
      const stats = await fs.stat(backupPath)
      metadata.size = stats.size
      
      // Calculate checksum
      metadata.checksum = await this.calculateChecksum(backupPath)
      
      // Encrypt backup if enabled
      if (config.encryptionEnabled) {
        const encryptedPath = await this.encryptBackup(backupPath, keyId, config.compressionEnabled)
        metadata.encryptedLocation = encryptedPath
        
        const encryptedStats = await fs.stat(encryptedPath)
        metadata.encryptedSize = encryptedStats.size
        
        metadata.encryptedChecksum = await this.calculateChecksum(encryptedPath)
        
        // Delete unencrypted backup
        await fs.unlink(backupPath)
      }
      
      // Verify backup integrity if enabled
      if (config.integrityCheckEnabled) {
        metadata.status = BackupStatus.VERIFYING
        await this.storeBackupMetadata(metadata)
        
        const verification = await this.verifyBackup(backupId)
        if (!verification.valid) {
          metadata.status = BackupStatus.FAILED
          await this.storeBackupMetadata(metadata)
          
          await this.createAlert({
            backupId,
            severity: AlertSeverity.ERROR,
            type: AlertType.VERIFICATION_FAILED,
            message: `Backup verification failed: ${config.name}`,
            details: verification
          })
          
          throw new Error(`Backup verification failed: ${verification.errors.join(', ')}`)
        }
        
        metadata.status = BackupStatus.VERIFIED
      } else {
        metadata.status = BackupStatus.COMPLETED
      }
      
      metadata.completedAt = new Date()
      
      // Store final metadata
      await this.storeBackupMetadata(metadata)
      this.backupMetadataCache.set(backupId, metadata)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'BACKUP_CREATED',
        tableName: 'backups',
        recordId: backupId,
        newValues: {
          name: config.name,
          type: config.type,
          size: metadata.size,
          encrypted: config.encryptionEnabled,
          location: metadata.encryptedLocation || metadata.location
        }
      })
      
      // Create success alert
      await this.createAlert({
        backupId,
        severity: AlertSeverity.INFO,
        type: AlertType.BACKUP_COMPLETED,
        message: `Backup completed successfully: ${config.name}`,
        details: { size: metadata.size, duration: Date.now() - metadata.createdAt.getTime() }
      })
      
      logger.info(`Backup created successfully: ${backupId}`)
      return metadata
    } catch (error) {
      logger.error('Failed to create backup:', error)
      
      // Update metadata status
      const metadata = this.backupMetadataCache.get(backupId)
      if (metadata) {
        metadata.status = BackupStatus.FAILED
        metadata.completedAt = new Date()
        await this.storeBackupMetadata(metadata)
      }
      
      // Create failure alert
      await this.createAlert({
        backupId,
        severity: AlertSeverity.CRITICAL,
        type: AlertType.BACKUP_FAILED,
        message: `Backup failed: ${config.name}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      throw error
    }
  }

  /**
   * Create database backup
   */
  private static async createDatabaseBackup(backupId: string): Promise<string> {
    try {
      const backupPath = path.join(this.BACKUP_BASE_PATH, 'database', `${backupId}.db`)
      const dbPath = path.join(process.cwd(), 'server', 'prisma', 'dev.db')
      
      // Copy database file
      await fs.copyFile(dbPath, backupPath)
      
      logger.info(`Database backup created: ${backupPath}`)
      return backupPath
    } catch (error) {
      logger.error('Failed to create database backup:', error)
      throw error
    }
  }

  /**
   * Create files backup
   */
  private static async createFilesBackup(backupId: string): Promise<string> {
    try {
      const backupPath = path.join(this.BACKUP_BASE_PATH, 'files', `${backupId}.tar`)
      const sourcePath = path.join(process.cwd(), 'server', 'uploads')
      
      // Create tar archive
      await execAsync(`tar -cf "${backupPath}" -C "${path.dirname(sourcePath)}" "${path.basename(sourcePath)}"`)
      
      logger.info(`Files backup created: ${backupPath}`)
      return backupPath
    } catch (error) {
      logger.error('Failed to create files backup:', error)
      throw error
    }
  }

  /**
   * Create configuration backup
   */
  private static async createConfigurationBackup(backupId: string): Promise<string> {
    try {
      const backupPath = path.join(this.BACKUP_BASE_PATH, 'config', `${backupId}.json`)
      
      // Collect configuration files
      const config = {
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        files: {
          // Add configuration data here
        }
      }
      
      await fs.writeFile(backupPath, JSON.stringify(config, null, 2))
      
      logger.info(`Configuration backup created: ${backupPath}`)
      return backupPath
    } catch (error) {
      logger.error('Failed to create configuration backup:', error)
      throw error
    }
  }

  /**
   * Create full backup
   */
  private static async createFullBackup(backupId: string): Promise<string> {
    try {
      const backupPath = path.join(this.BACKUP_BASE_PATH, `${backupId}_full.tar`)
      
      // Create full system backup
      const sourcePath = path.join(process.cwd(), 'server')
      await execAsync(`tar -cf "${backupPath}" -C "${path.dirname(sourcePath)}" --exclude=node_modules --exclude=dist --exclude=backups "${path.basename(sourcePath)}"`)
      
      logger.info(`Full backup created: ${backupPath}`)
      return backupPath
    } catch (error) {
      logger.error('Failed to create full backup:', error)
      throw error
    }
  }

  /**
   * Encrypt backup
   */
  private static async encryptBackup(
    backupPath: string,
    keyId: string,
    compressionEnabled: boolean
  ): Promise<string> {
    try {
      const result = await DataEncryptionService.createEncryptedBackup({
        backupPath,
        keyId,
        compressionEnabled,
        integrityCheck: true
      })
      
      logger.info(`Backup encrypted: ${result.encryptedBackupPath}`)
      return result.encryptedBackupPath
    } catch (error) {
      logger.error('Failed to encrypt backup:', error)
      throw error
    }
  }

  /**
   * Calculate file checksum
   */
  private static async calculateChecksum(filePath: string): Promise<string> {
    try {
      const fileData = await fs.readFile(filePath)
      return crypto.createHash('sha256').update(fileData).digest('hex')
    } catch (error) {
      logger.error('Failed to calculate checksum:', error)
      throw error
    }
  }

  /**
   * Verify backup integrity
   */
  static async verifyBackup(backupId: string): Promise<BackupVerificationResult> {
    try {
      const metadata = await this.getBackupMetadata(backupId)
      if (!metadata) {
        throw new Error(`Backup not found: ${backupId}`)
      }
      
      const result: BackupVerificationResult = {
        backupId,
        valid: true,
        checksumValid: false,
        encryptionValid: false,
        sizeValid: false,
        errors: [],
        verifiedAt: new Date()
      }
      
      const backupPath = metadata.encryptedLocation || metadata.location
      
      // Check if file exists
      try {
        await fs.access(backupPath)
      } catch {
        result.valid = false
        result.errors.push('Backup file not found')
        return result
      }
      
      // Verify file size
      const stats = await fs.stat(backupPath)
      const expectedSize = metadata.encryptedSize || metadata.size
      result.sizeValid = stats.size === expectedSize
      if (!result.sizeValid) {
        result.valid = false
        result.errors.push(`Size mismatch: expected ${expectedSize}, got ${stats.size}`)
      }
      
      // Verify checksum
      const currentChecksum = await this.calculateChecksum(backupPath)
      const expectedChecksum = metadata.encryptedChecksum || metadata.checksum
      result.checksumValid = currentChecksum === expectedChecksum
      if (!result.checksumValid) {
        result.valid = false
        result.errors.push('Checksum verification failed')
      }
      
      // Verify encryption if applicable
      if (metadata.encryptedLocation) {
        try {
          // Try to read encrypted metadata
          const encryptedData = await fs.readFile(backupPath)
          const metadataLength = encryptedData.readUInt32BE(0)
          const metadataBuffer = encryptedData.subarray(4, 4 + metadataLength)
          JSON.parse(metadataBuffer.toString())
          result.encryptionValid = true
        } catch {
          result.valid = false
          result.encryptionValid = false
          result.errors.push('Encryption verification failed')
        }
      } else {
        result.encryptionValid = true
      }
      
      logger.info(`Backup verification ${result.valid ? 'passed' : 'failed'}: ${backupId}`)
      return result
    } catch (error) {
      logger.error('Failed to verify backup:', error)
      throw error
    }
  }

  /**
   * Get backup metadata
   */
  static async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    if (this.backupMetadataCache.has(backupId)) {
      return this.backupMetadataCache.get(backupId)!
    }
    
    return await this.loadBackupMetadata(backupId)
  }

  /**
   * List backups with filtering
   */
  static async listBackups(filters?: {
    type?: BackupType
    status?: BackupStatus
    tags?: string[]
    createdAfter?: Date
    createdBefore?: Date
  }): Promise<BackupMetadata[]> {
    const allBackups = Array.from(this.backupMetadataCache.values())
    
    if (!filters) {
      return allBackups
    }
    
    return allBackups.filter(backup => {
      if (filters.type && backup.type !== filters.type) return false
      if (filters.status && backup.status !== filters.status) return false
      if (filters.tags && !filters.tags.some(tag => backup.tags.includes(tag))) return false
      if (filters.createdAfter && backup.createdAt < filters.createdAfter) return false
      if (filters.createdBefore && backup.createdAt > filters.createdBefore) return false
      
      return true
    })
  }

  /**
   * Delete backup
   */
  static async deleteBackup(backupId: string, userId: string = 'system'): Promise<boolean> {
    try {
      const metadata = await this.getBackupMetadata(backupId)
      if (!metadata) {
        throw new Error(`Backup not found: ${backupId}`)
      }
      
      // Delete backup file
      const backupPath = metadata.encryptedLocation || metadata.location
      try {
        await fs.unlink(backupPath)
      } catch (error) {
        logger.warn(`Failed to delete backup file: ${backupPath}`, error)
      }
      
      // Remove from cache
      this.backupMetadataCache.delete(backupId)
      
      // Update metadata storage
      await this.removeBackupMetadata(backupId)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'BACKUP_DELETED',
        tableName: 'backups',
        recordId: backupId,
        oldValues: metadata
      })
      
      logger.info(`Backup deleted: ${backupId}`)
      return true
    } catch (error) {
      logger.error('Failed to delete backup:', error)
      return false
    }
  }

  /**
   * Clean up expired backups
   */
  static async cleanupExpiredBackups(): Promise<number> {
    try {
      const now = new Date()
      const expiredBackups = Array.from(this.backupMetadataCache.values())
        .filter(backup => backup.expiresAt < now)
      
      let deletedCount = 0
      for (const backup of expiredBackups) {
        const deleted = await this.deleteBackup(backup.id)
        if (deleted) {
          deletedCount++
          
          await this.createAlert({
            backupId: backup.id,
            severity: AlertSeverity.INFO,
            type: AlertType.RETENTION_EXPIRED,
            message: `Backup expired and deleted: ${backup.name}`,
            details: { expiresAt: backup.expiresAt }
          })
        }
      }
      
      logger.info(`Cleaned up ${deletedCount} expired backups`)
      return deletedCount
    } catch (error) {
      logger.error('Failed to cleanup expired backups:', error)
      return 0
    }
  }

  /**
   * Create backup alert
   */
  private static async createAlert(alert: Omit<BackupAlert, 'id' | 'createdAt' | 'acknowledged'>): Promise<BackupAlert> {
    const fullAlert: BackupAlert = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      acknowledged: false,
      ...alert
    }
    
    this.backupAlertsCache.push(fullAlert)
    await this.storeAlerts()
    
    logger.info(`Backup alert created: ${alert.type} - ${alert.message}`)
    return fullAlert
  }

  /**
   * Get backup alerts
   */
  static async getAlerts(filters?: {
    severity?: AlertSeverity
    type?: AlertType
    acknowledged?: boolean
  }): Promise<BackupAlert[]> {
    let alerts = [...this.backupAlertsCache]
    
    if (filters) {
      alerts = alerts.filter(alert => {
        if (filters.severity && alert.severity !== filters.severity) return false
        if (filters.type && alert.type !== filters.type) return false
        if (filters.acknowledged !== undefined && alert.acknowledged !== filters.acknowledged) return false
        return true
      })
    }
    
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.backupAlertsCache.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      await this.storeAlerts()
      return true
    }
    return false
  }

  /**
   * Start backup monitoring
   */
  private static startBackupMonitoring(): void {
    // Run monitoring every hour
    this.monitoringInterval = setInterval(async () => {
      await this.runBackupMonitoring()
    }, 60 * 60 * 1000)
    
    // Run initial monitoring
    this.runBackupMonitoring().catch(error => {
      logger.error('Initial backup monitoring failed:', error)
    })
  }

  /**
   * Run backup monitoring checks
   */
  private static async runBackupMonitoring(): Promise<void> {
    try {
      // Check for expired backups
      await this.cleanupExpiredBackups()
      
      // Verify recent backups
      const recentBackups = Array.from(this.backupMetadataCache.values())
        .filter(backup => {
          const daysSinceCreation = (Date.now() - backup.createdAt.getTime()) / (24 * 60 * 60 * 1000)
          return daysSinceCreation <= 7 && backup.status === BackupStatus.COMPLETED
        })
      
      for (const backup of recentBackups) {
        const verification = await this.verifyBackup(backup.id)
        if (!verification.valid) {
          await this.createAlert({
            backupId: backup.id,
            severity: AlertSeverity.WARNING,
            type: AlertType.VERIFICATION_FAILED,
            message: `Backup integrity check failed: ${backup.name}`,
            details: verification
          })
        }
      }
      
      logger.debug('Backup monitoring completed')
    } catch (error) {
      logger.error('Backup monitoring failed:', error)
    }
  }

  /**
   * Stop backup monitoring
   */
  static stopBackupMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Initialize metadata storage
   */
  private static async initializeMetadataStorage(): Promise<void> {
    const metadataFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_METADATA_FILE)
    const alertsFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_ALERTS_FILE)
    
    try {
      await fs.access(metadataFile)
    } catch {
      await fs.writeFile(metadataFile, JSON.stringify([], null, 2))
    }
    
    try {
      await fs.access(alertsFile)
    } catch {
      await fs.writeFile(alertsFile, JSON.stringify([], null, 2))
    }
  }

  /**
   * Load metadata cache
   */
  private static async loadMetadataCache(): Promise<void> {
    try {
      const metadataFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_METADATA_FILE)
      const data = await fs.readFile(metadataFile, 'utf8')
      const allMetadata: BackupMetadata[] = JSON.parse(data)
      
      for (const metadata of allMetadata) {
        metadata.createdAt = new Date(metadata.createdAt)
        if (metadata.completedAt) metadata.completedAt = new Date(metadata.completedAt)
        metadata.expiresAt = new Date(metadata.expiresAt)
        
        this.backupMetadataCache.set(metadata.id, metadata)
      }
      
      // Load alerts
      const alertsFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_ALERTS_FILE)
      const alertsData = await fs.readFile(alertsFile, 'utf8')
      this.backupAlertsCache = JSON.parse(alertsData).map((alert: any) => ({
        ...alert,
        createdAt: new Date(alert.createdAt)
      }))
      
      logger.info(`Loaded ${allMetadata.length} backup metadata records`)
    } catch (error) {
      logger.warn('No existing backup metadata found')
    }
  }

  /**
   * Store backup metadata
   */
  private static async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_METADATA_FILE)
    
    let allMetadata: BackupMetadata[] = []
    try {
      const data = await fs.readFile(metadataFile, 'utf8')
      allMetadata = JSON.parse(data)
    } catch {
      // File doesn't exist or is empty
    }
    
    allMetadata = allMetadata.filter(m => m.id !== metadata.id)
    allMetadata.push(metadata)
    
    await fs.writeFile(metadataFile, JSON.stringify(allMetadata, null, 2))
  }

  /**
   * Load backup metadata
   */
  private static async loadBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_METADATA_FILE)
      const data = await fs.readFile(metadataFile, 'utf8')
      const allMetadata: BackupMetadata[] = JSON.parse(data)
      
      const metadata = allMetadata.find(m => m.id === backupId)
      if (metadata) {
        metadata.createdAt = new Date(metadata.createdAt)
        if (metadata.completedAt) metadata.completedAt = new Date(metadata.completedAt)
        metadata.expiresAt = new Date(metadata.expiresAt)
      }
      
      return metadata || null
    } catch (error) {
      return null
    }
  }

  /**
   * Remove backup metadata
   */
  private static async removeBackupMetadata(backupId: string): Promise<void> {
    const metadataFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_METADATA_FILE)
    
    try {
      const data = await fs.readFile(metadataFile, 'utf8')
      let allMetadata: BackupMetadata[] = JSON.parse(data)
      
      allMetadata = allMetadata.filter(m => m.id !== backupId)
      
      await fs.writeFile(metadataFile, JSON.stringify(allMetadata, null, 2))
    } catch (error) {
      logger.error('Failed to remove backup metadata:', error)
    }
  }

  /**
   * Store alerts
   */
  private static async storeAlerts(): Promise<void> {
    const alertsFile = path.join(this.BACKUP_BASE_PATH, this.BACKUP_ALERTS_FILE)
    await fs.writeFile(alertsFile, JSON.stringify(this.backupAlertsCache, null, 2))
  }
}
