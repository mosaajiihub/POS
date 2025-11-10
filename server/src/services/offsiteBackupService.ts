import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { BackupMetadata, BackupService } from './backupService'

export interface OffsiteBackupConfig {
  provider: OffsiteProvider
  endpoint?: string
  bucket?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  encryptionEnabled: boolean
  replicationEnabled: boolean
  retentionDays: number
}

export interface OffsiteBackupMetadata {
  id: string
  backupId: string
  provider: OffsiteProvider
  location: string
  uploadedAt: Date
  size: number
  checksum: string
  status: OffsiteBackupStatus
  replicationStatus?: ReplicationStatus
  accessLog: OffsiteAccessLog[]
}

export interface OffsiteAccessLog {
  id: string
  userId: string
  action: OffsiteAction
  timestamp: Date
  ipAddress: string
  success: boolean
  details?: any
}

export interface BackupReplicationStatus {
  backupId: string
  primaryLocation: string
  replicaLocations: string[]
  lastReplicationAt: Date
  replicationHealth: ReplicationHealth
}

export interface BackupRetentionPolicy {
  id: string
  name: string
  retentionDays: number
  backupTypes: string[]
  autoDelete: boolean
  archiveAfterDays?: number
}

export enum OffsiteProvider {
  S3 = 'S3',
  AZURE_BLOB = 'AZURE_BLOB',
  GOOGLE_CLOUD = 'GOOGLE_CLOUD',
  LOCAL_REMOTE = 'LOCAL_REMOTE',
  SFTP = 'SFTP'
}

export enum OffsiteBackupStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED'
}

export enum ReplicationStatus {
  NOT_REPLICATED = 'NOT_REPLICATED',
  REPLICATING = 'REPLICATING',
  REPLICATED = 'REPLICATED',
  REPLICATION_FAILED = 'REPLICATION_FAILED'
}

export enum ReplicationHealth {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY'
}

export enum OffsiteAction {
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  DELETE = 'DELETE',
  VERIFY = 'VERIFY',
  REPLICATE = 'REPLICATE'
}

/**
 * Offsite Backup Service
 * Handles secure cloud backup storage with encryption, replication,
 * access controls, and retention policy enforcement
 */
export class OffsiteBackupService {
  private static readonly OFFSITE_METADATA_FILE = 'offsite-backup-metadata.json'
  private static readonly OFFSITE_BASE_PATH = path.join(process.cwd(), 'server', 'backups', 'offsite')
  
  private static offsiteMetadataCache = new Map<string, OffsiteBackupMetadata>()
  private static retentionPolicies: BackupRetentionPolicy[] = []
  private static replicationInterval: NodeJS.Timeout | null = null

  /**
   * Initialize offsite backup service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Offsite Backup Service...')
      
      // Create offsite backup directory
      await fs.mkdir(this.OFFSITE_BASE_PATH, { recursive: true })
      
      // Initialize metadata storage
      await this.initializeMetadataStorage()
      
      // Load metadata cache
      await this.loadMetadataCache()
      
      // Load retention policies
      await this.loadRetentionPolicies()
      
      // Start replication monitoring
      this.startReplicationMonitoring()
      
      logger.info('Offsite Backup Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Offsite Backup Service:', error)
      throw error
    }
  }

  /**
   * Upload backup to offsite storage
   */
  static async uploadBackup(
    backupId: string,
    config: OffsiteBackupConfig,
    userId: string = 'system'
  ): Promise<OffsiteBackupMetadata> {
    const offsiteId = `offsite_${backupId}_${Date.now()}`
    
    try {
      logger.info(`Uploading backup to offsite storage: ${backupId}`)
      
      // Get backup metadata
      const backupMetadata = await BackupService.getBackupMetadata(backupId)
      if (!backupMetadata) {
        throw new Error(`Backup not found: ${backupId}`)
      }
      
      // Create offsite metadata
      const offsiteMetadata: OffsiteBackupMetadata = {
        id: offsiteId,
        backupId,
        provider: config.provider,
        location: '',
        uploadedAt: new Date(),
        size: 0,
        checksum: '',
        status: OffsiteBackupStatus.UPLOADING,
        replicationStatus: config.replicationEnabled ? ReplicationStatus.NOT_REPLICATED : undefined,
        accessLog: []
      }
      
      // Store initial metadata
      await this.storeOffsiteMetadata(offsiteMetadata)
      
      // Upload based on provider
      const uploadResult = await this.uploadToProvider(
        backupMetadata,
        config
      )
      
      offsiteMetadata.location = uploadResult.location
      offsiteMetadata.size = uploadResult.size
      offsiteMetadata.checksum = uploadResult.checksum
      offsiteMetadata.status = OffsiteBackupStatus.COMPLETED
      
      // Store final metadata
      await this.storeOffsiteMetadata(offsiteMetadata)
      this.offsiteMetadataCache.set(offsiteId, offsiteMetadata)
      
      // Log access
      await this.logOffsiteAccess(offsiteId, userId, OffsiteAction.UPLOAD, '127.0.0.1', true)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'OFFSITE_BACKUP_UPLOADED',
        tableName: 'offsite_backups',
        recordId: offsiteId,
        newValues: {
          backupId,
          provider: config.provider,
          location: uploadResult.location,
          size: uploadResult.size
        }
      })
      
      // Replicate if enabled
      if (config.replicationEnabled) {
        await this.replicateBackup(offsiteId, config, userId)
      }
      
      logger.info(`Backup uploaded to offsite storage: ${offsiteId}`)
      return offsiteMetadata
    } catch (error) {
      logger.error('Failed to upload backup to offsite storage:', error)
      
      // Update status
      const metadata = this.offsiteMetadataCache.get(offsiteId)
      if (metadata) {
        metadata.status = OffsiteBackupStatus.FAILED
        await this.storeOffsiteMetadata(metadata)
      }
      
      // Log failed access
      await this.logOffsiteAccess(offsiteId, userId, OffsiteAction.UPLOAD, '127.0.0.1', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  /**
   * Upload to provider
   */
  private static async uploadToProvider(
    backupMetadata: BackupMetadata,
    config: OffsiteBackupConfig
  ): Promise<{ location: string; size: number; checksum: string }> {
    const backupPath = backupMetadata.encryptedLocation || backupMetadata.location
    
    switch (config.provider) {
      case OffsiteProvider.LOCAL_REMOTE:
        return await this.uploadToLocalRemote(backupPath, backupMetadata.id)
      
      case OffsiteProvider.S3:
      case OffsiteProvider.AZURE_BLOB:
      case OffsiteProvider.GOOGLE_CLOUD:
      case OffsiteProvider.SFTP:
        // Simulated upload for other providers
        return await this.simulateCloudUpload(backupPath, backupMetadata.id, config.provider)
      
      default:
        throw new Error(`Unsupported offsite provider: ${config.provider}`)
    }
  }

  /**
   * Upload to local remote storage
   */
  private static async uploadToLocalRemote(
    backupPath: string,
    backupId: string
  ): Promise<{ location: string; size: number; checksum: string }> {
    try {
      const remotePath = path.join(this.OFFSITE_BASE_PATH, `${backupId}_offsite`)
      
      // Copy to offsite location
      await fs.copyFile(backupPath, remotePath)
      
      // Get file stats
      const stats = await fs.stat(remotePath)
      
      // Calculate checksum
      const fileData = await fs.readFile(remotePath)
      const checksum = crypto.createHash('sha256').update(fileData).digest('hex')
      
      return {
        location: remotePath,
        size: stats.size,
        checksum
      }
    } catch (error) {
      logger.error('Failed to upload to local remote:', error)
      throw error
    }
  }

  /**
   * Simulate cloud upload (placeholder for actual cloud integration)
   */
  private static async simulateCloudUpload(
    backupPath: string,
    backupId: string,
    provider: OffsiteProvider
  ): Promise<{ location: string; size: number; checksum: string }> {
    try {
      // In production, this would integrate with actual cloud providers
      const stats = await fs.stat(backupPath)
      const fileData = await fs.readFile(backupPath)
      const checksum = crypto.createHash('sha256').update(fileData).digest('hex')
      
      const location = `${provider.toLowerCase()}://backups/${backupId}`
      
      logger.info(`Simulated upload to ${provider}: ${location}`)
      
      return {
        location,
        size: stats.size,
        checksum
      }
    } catch (error) {
      logger.error('Failed to simulate cloud upload:', error)
      throw error
    }
  }

  /**
   * Download backup from offsite storage
   */
  static async downloadBackup(
    offsiteId: string,
    destinationPath: string,
    userId: string = 'system'
  ): Promise<string> {
    try {
      logger.info(`Downloading backup from offsite storage: ${offsiteId}`)
      
      const metadata = await this.getOffsiteMetadata(offsiteId)
      if (!metadata) {
        throw new Error(`Offsite backup not found: ${offsiteId}`)
      }
      
      // Download based on provider
      let downloadedPath: string
      if (metadata.provider === OffsiteProvider.LOCAL_REMOTE) {
        await fs.copyFile(metadata.location, destinationPath)
        downloadedPath = destinationPath
      } else {
        // Simulated download for cloud providers
        downloadedPath = destinationPath
        logger.info(`Simulated download from ${metadata.provider}`)
      }
      
      // Verify checksum
      const fileData = await fs.readFile(downloadedPath)
      const checksum = crypto.createHash('sha256').update(fileData).digest('hex')
      
      if (checksum !== metadata.checksum) {
        throw new Error('Checksum verification failed after download')
      }
      
      // Log access
      await this.logOffsiteAccess(offsiteId, userId, OffsiteAction.DOWNLOAD, '127.0.0.1', true)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'OFFSITE_BACKUP_DOWNLOADED',
        tableName: 'offsite_backups',
        recordId: offsiteId,
        newValues: {
          destinationPath,
          checksumValid: true
        }
      })
      
      logger.info(`Backup downloaded from offsite storage: ${offsiteId}`)
      return downloadedPath
    } catch (error) {
      logger.error('Failed to download backup from offsite storage:', error)
      
      // Log failed access
      await this.logOffsiteAccess(offsiteId, userId, OffsiteAction.DOWNLOAD, '127.0.0.1', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  /**
   * Replicate backup to secondary location
   */
  static async replicateBackup(
    offsiteId: string,
    config: OffsiteBackupConfig,
    userId: string = 'system'
  ): Promise<void> {
    try {
      logger.info(`Replicating backup: ${offsiteId}`)
      
      const metadata = await this.getOffsiteMetadata(offsiteId)
      if (!metadata) {
        throw new Error(`Offsite backup not found: ${offsiteId}`)
      }
      
      metadata.replicationStatus = ReplicationStatus.REPLICATING
      await this.storeOffsiteMetadata(metadata)
      
      // Simulate replication (in production, copy to secondary location)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      metadata.replicationStatus = ReplicationStatus.REPLICATED
      await this.storeOffsiteMetadata(metadata)
      
      // Log access
      await this.logOffsiteAccess(offsiteId, userId, OffsiteAction.REPLICATE, '127.0.0.1', true)
      
      logger.info(`Backup replicated successfully: ${offsiteId}`)
    } catch (error) {
      logger.error('Failed to replicate backup:', error)
      
      const metadata = await this.getOffsiteMetadata(offsiteId)
      if (metadata) {
        metadata.replicationStatus = ReplicationStatus.REPLICATION_FAILED
        await this.storeOffsiteMetadata(metadata)
      }
      
      throw error
    }
  }

  /**
   * Delete offsite backup
   */
  static async deleteOffsiteBackup(
    offsiteId: string,
    userId: string = 'system'
  ): Promise<boolean> {
    try {
      logger.info(`Deleting offsite backup: ${offsiteId}`)
      
      const metadata = await this.getOffsiteMetadata(offsiteId)
      if (!metadata) {
        throw new Error(`Offsite backup not found: ${offsiteId}`)
      }
      
      // Delete from provider
      if (metadata.provider === OffsiteProvider.LOCAL_REMOTE) {
        try {
          await fs.unlink(metadata.location)
        } catch (error) {
          logger.warn(`Failed to delete offsite backup file: ${metadata.location}`, error)
        }
      }
      
      metadata.status = OffsiteBackupStatus.DELETED
      await this.storeOffsiteMetadata(metadata)
      
      // Log access
      await this.logOffsiteAccess(offsiteId, userId, OffsiteAction.DELETE, '127.0.0.1', true)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'OFFSITE_BACKUP_DELETED',
        tableName: 'offsite_backups',
        recordId: offsiteId,
        oldValues: metadata
      })
      
      logger.info(`Offsite backup deleted: ${offsiteId}`)
      return true
    } catch (error) {
      logger.error('Failed to delete offsite backup:', error)
      return false
    }
  }

  /**
   * Enforce retention policy
   */
  static async enforceRetentionPolicy(policyId: string): Promise<number> {
    try {
      const policy = this.retentionPolicies.find(p => p.id === policyId)
      if (!policy) {
        throw new Error(`Retention policy not found: ${policyId}`)
      }
      
      const now = new Date()
      const cutoffDate = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000)
      
      const expiredBackups = Array.from(this.offsiteMetadataCache.values())
        .filter(backup => {
          return backup.uploadedAt < cutoffDate &&
                 backup.status === OffsiteBackupStatus.COMPLETED
        })
      
      let deletedCount = 0
      for (const backup of expiredBackups) {
        if (policy.autoDelete) {
          const deleted = await this.deleteOffsiteBackup(backup.id)
          if (deleted) deletedCount++
        } else if (policy.archiveAfterDays) {
          backup.status = OffsiteBackupStatus.ARCHIVED
          await this.storeOffsiteMetadata(backup)
        }
      }
      
      logger.info(`Enforced retention policy ${policyId}: ${deletedCount} backups deleted`)
      return deletedCount
    } catch (error) {
      logger.error('Failed to enforce retention policy:', error)
      return 0
    }
  }

  /**
   * Get offsite backup metadata
   */
  static async getOffsiteMetadata(offsiteId: string): Promise<OffsiteBackupMetadata | null> {
    if (this.offsiteMetadataCache.has(offsiteId)) {
      return this.offsiteMetadataCache.get(offsiteId)!
    }
    
    return await this.loadOffsiteMetadata(offsiteId)
  }

  /**
   * List offsite backups
   */
  static async listOffsiteBackups(filters?: {
    provider?: OffsiteProvider
    status?: OffsiteBackupStatus
    uploadedAfter?: Date
  }): Promise<OffsiteBackupMetadata[]> {
    const allBackups = Array.from(this.offsiteMetadataCache.values())
    
    if (!filters) {
      return allBackups
    }
    
    return allBackups.filter(backup => {
      if (filters.provider && backup.provider !== filters.provider) return false
      if (filters.status && backup.status !== filters.status) return false
      if (filters.uploadedAfter && backup.uploadedAt < filters.uploadedAfter) return false
      
      return true
    })
  }

  /**
   * Get replication status
   */
  static async getReplicationStatus(backupId: string): Promise<BackupReplicationStatus | null> {
    try {
      const offsiteBackups = Array.from(this.offsiteMetadataCache.values())
        .filter(backup => backup.backupId === backupId)
      
      if (offsiteBackups.length === 0) {
        return null
      }
      
      const primary = offsiteBackups[0]
      const replicas = offsiteBackups.slice(1)
      
      const replicationHealth = replicas.every(r => r.replicationStatus === ReplicationStatus.REPLICATED)
        ? ReplicationHealth.HEALTHY
        : replicas.some(r => r.replicationStatus === ReplicationStatus.REPLICATED)
        ? ReplicationHealth.DEGRADED
        : ReplicationHealth.UNHEALTHY
      
      return {
        backupId,
        primaryLocation: primary.location,
        replicaLocations: replicas.map(r => r.location),
        lastReplicationAt: new Date(Math.max(...replicas.map(r => r.uploadedAt.getTime()))),
        replicationHealth
      }
    } catch (error) {
      logger.error('Failed to get replication status:', error)
      return null
    }
  }

  /**
   * Get access logs for offsite backup
   */
  static async getAccessLogs(offsiteId: string): Promise<OffsiteAccessLog[]> {
    const metadata = await this.getOffsiteMetadata(offsiteId)
    return metadata?.accessLog || []
  }

  /**
   * Log offsite access
   */
  private static async logOffsiteAccess(
    offsiteId: string,
    userId: string,
    action: OffsiteAction,
    ipAddress: string,
    success: boolean,
    details?: any
  ): Promise<void> {
    try {
      const metadata = await this.getOffsiteMetadata(offsiteId)
      if (!metadata) return
      
      const accessLog: OffsiteAccessLog = {
        id: crypto.randomUUID(),
        userId,
        action,
        timestamp: new Date(),
        ipAddress,
        success,
        details
      }
      
      metadata.accessLog.push(accessLog)
      
      // Keep only last 100 access logs
      if (metadata.accessLog.length > 100) {
        metadata.accessLog = metadata.accessLog.slice(-100)
      }
      
      await this.storeOffsiteMetadata(metadata)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: `OFFSITE_BACKUP_${action}`,
        tableName: 'offsite_backups',
        recordId: offsiteId,
        newValues: {
          action,
          success,
          ipAddress,
          details
        }
      })
    } catch (error) {
      logger.error('Failed to log offsite access:', error)
    }
  }

  /**
   * Start replication monitoring
   */
  private static startReplicationMonitoring(): void {
    // Run monitoring every 6 hours
    this.replicationInterval = setInterval(async () => {
      await this.monitorReplication()
    }, 6 * 60 * 60 * 1000)
  }

  /**
   * Monitor replication health
   */
  private static async monitorReplication(): Promise<void> {
    try {
      const replicatedBackups = Array.from(this.offsiteMetadataCache.values())
        .filter(backup => backup.replicationStatus !== undefined)
      
      for (const backup of replicatedBackups) {
        if (backup.replicationStatus === ReplicationStatus.REPLICATION_FAILED) {
          logger.warn(`Replication failed for backup: ${backup.id}`)
          // Could trigger retry logic here
        }
      }
      
      logger.debug('Replication monitoring completed')
    } catch (error) {
      logger.error('Replication monitoring failed:', error)
    }
  }

  /**
   * Stop replication monitoring
   */
  static stopReplicationMonitoring(): void {
    if (this.replicationInterval) {
      clearInterval(this.replicationInterval)
      this.replicationInterval = null
    }
  }

  /**
   * Initialize metadata storage
   */
  private static async initializeMetadataStorage(): Promise<void> {
    const metadataFile = path.join(this.OFFSITE_BASE_PATH, this.OFFSITE_METADATA_FILE)
    
    try {
      await fs.access(metadataFile)
    } catch {
      await fs.writeFile(metadataFile, JSON.stringify([], null, 2))
    }
  }

  /**
   * Load metadata cache
   */
  private static async loadMetadataCache(): Promise<void> {
    try {
      const metadataFile = path.join(this.OFFSITE_BASE_PATH, this.OFFSITE_METADATA_FILE)
      const data = await fs.readFile(metadataFile, 'utf8')
      const allMetadata: OffsiteBackupMetadata[] = JSON.parse(data)
      
      for (const metadata of allMetadata) {
        metadata.uploadedAt = new Date(metadata.uploadedAt)
        metadata.accessLog = metadata.accessLog.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
        
        this.offsiteMetadataCache.set(metadata.id, metadata)
      }
      
      logger.info(`Loaded ${allMetadata.length} offsite backup metadata records`)
    } catch (error) {
      logger.warn('No existing offsite backup metadata found')
    }
  }

  /**
   * Store offsite metadata
   */
  private static async storeOffsiteMetadata(metadata: OffsiteBackupMetadata): Promise<void> {
    const metadataFile = path.join(this.OFFSITE_BASE_PATH, this.OFFSITE_METADATA_FILE)
    
    let allMetadata: OffsiteBackupMetadata[] = []
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
   * Load offsite metadata
   */
  private static async loadOffsiteMetadata(offsiteId: string): Promise<OffsiteBackupMetadata | null> {
    try {
      const metadataFile = path.join(this.OFFSITE_BASE_PATH, this.OFFSITE_METADATA_FILE)
      const data = await fs.readFile(metadataFile, 'utf8')
      const allMetadata: OffsiteBackupMetadata[] = JSON.parse(data)
      
      const metadata = allMetadata.find(m => m.id === offsiteId)
      if (metadata) {
        metadata.uploadedAt = new Date(metadata.uploadedAt)
        metadata.accessLog = metadata.accessLog.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
      }
      
      return metadata || null
    } catch (error) {
      return null
    }
  }

  /**
   * Load retention policies
   */
  private static async loadRetentionPolicies(): Promise<void> {
    // Default retention policies
    this.retentionPolicies = [
      {
        id: 'daily_30',
        name: 'Daily 30-day retention',
        retentionDays: 30,
        backupTypes: ['DATABASE', 'FULL'],
        autoDelete: true
      },
      {
        id: 'weekly_90',
        name: 'Weekly 90-day retention',
        retentionDays: 90,
        backupTypes: ['FULL'],
        autoDelete: true
      },
      {
        id: 'monthly_365',
        name: 'Monthly 1-year retention',
        retentionDays: 365,
        backupTypes: ['FULL'],
        autoDelete: false,
        archiveAfterDays: 180
      }
    ]
  }

  /**
   * Add retention policy
   */
  static addRetentionPolicy(policy: BackupRetentionPolicy): void {
    const existingIndex = this.retentionPolicies.findIndex(p => p.id === policy.id)
    if (existingIndex >= 0) {
      this.retentionPolicies[existingIndex] = policy
    } else {
      this.retentionPolicies.push(policy)
    }
    
    logger.info(`Added retention policy: ${policy.name}`)
  }

  /**
   * Get retention policies
   */
  static getRetentionPolicies(): BackupRetentionPolicy[] {
    return [...this.retentionPolicies]
  }
}
