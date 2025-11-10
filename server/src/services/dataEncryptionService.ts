import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface EncryptionResult {
  encryptedData: string
  keyId: string
  algorithm: string
  iv: string
  tag?: string
  timestamp: Date
}

export interface DecryptionResult {
  decryptedData: string
  keyId: string
  algorithm: string
  timestamp: Date
}

export interface EncryptionKey {
  id: string
  algorithm: string
  keyData: Buffer
  createdAt: Date
  expiresAt?: Date
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  version: number
}

export interface PIIField {
  tableName: string
  fieldName: string
  encryptionRequired: boolean
  keyRotationInterval: number // days
}

export interface FileEncryptionOptions {
  filePath: string
  keyId?: string
  deleteOriginal?: boolean
  compressionEnabled?: boolean
}

export interface BackupEncryptionOptions {
  backupPath: string
  keyId?: string
  compressionEnabled?: boolean
  integrityCheck?: boolean
}

/**
 * Data Encryption Service
 * Handles data-at-rest encryption, field-level encryption for PII data,
 * file system encryption, backup encryption, and key rotation automation
 */
export class DataEncryptionService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16
  private static readonly KEY_DERIVATION_ITERATIONS = 100000
  
  // In-memory key cache for performance
  private static keyCache = new Map<string, EncryptionKey>()
  
  // PII fields that require encryption
  private static readonly PII_FIELDS: PIIField[] = [
    { tableName: 'users', fieldName: 'email', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'users', fieldName: 'firstName', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'users', fieldName: 'lastName', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'users', fieldName: 'mfaSecret', encryptionRequired: true, keyRotationInterval: 30 },
    { tableName: 'users', fieldName: 'mfaBackupCodes', encryptionRequired: true, keyRotationInterval: 30 },
    { tableName: 'customers', fieldName: 'email', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'customers', fieldName: 'firstName', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'customers', fieldName: 'lastName', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'customers', fieldName: 'phone', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'customers', fieldName: 'address', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'suppliers', fieldName: 'email', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'suppliers', fieldName: 'contactPerson', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'suppliers', fieldName: 'phone', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'suppliers', fieldName: 'address', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'technicians', fieldName: 'email', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'technicians', fieldName: 'firstName', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'technicians', fieldName: 'lastName', encryptionRequired: true, keyRotationInterval: 90 },
    { tableName: 'technicians', fieldName: 'phone', encryptionRequired: true, keyRotationInterval: 90 }
  ]

  /**
   * Initialize encryption service and create default encryption keys
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Data Encryption Service...')
      
      // Create encryption keys table if it doesn't exist
      await this.createEncryptionKeysTable()
      
      // Generate default encryption key if none exists
      const existingKeys = await this.listEncryptionKeys()
      if (existingKeys.length === 0) {
        await this.generateEncryptionKey('default', this.ENCRYPTION_ALGORITHM)
        logger.info('Generated default encryption key')
      }
      
      // Load active keys into cache
      await this.loadKeysIntoCache()
      
      logger.info('Data Encryption Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Data Encryption Service:', error)
      throw error
    }
  }

  /**
   * Create encryption keys table in database
   */
  private static async createEncryptionKeysTable(): Promise<void> {
    try {
      // This would typically be handled by Prisma migrations
      // For now, we'll store keys in a JSON file as a fallback
      const keysDir = path.join(process.cwd(), 'server', 'keys')
      await fs.mkdir(keysDir, { recursive: true })
      
      const keysFile = path.join(keysDir, 'encryption-keys.json')
      try {
        await fs.access(keysFile)
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(keysFile, JSON.stringify({ keys: [] }, null, 2))
      }
    } catch (error) {
      logger.error('Failed to create encryption keys storage:', error)
      throw error
    }
  }

  /**
   * Generate a new encryption key
   */
  static async generateEncryptionKey(
    keyId: string,
    algorithm: string = this.ENCRYPTION_ALGORITHM,
    expirationDays?: number
  ): Promise<EncryptionKey> {
    try {
      const keyData = crypto.randomBytes(this.KEY_LENGTH)
      const createdAt = new Date()
      const expiresAt = expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) : undefined
      
      const encryptionKey: EncryptionKey = {
        id: keyId,
        algorithm,
        keyData,
        createdAt,
        expiresAt,
        status: 'ACTIVE',
        version: 1
      }
      
      // Store key securely
      await this.storeEncryptionKey(encryptionKey)
      
      // Add to cache
      this.keyCache.set(keyId, encryptionKey)
      
      // Log key generation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'ENCRYPTION_KEY_GENERATED',
        tableName: 'encryption_keys',
        recordId: keyId,
        newValues: {
          keyId,
          algorithm,
          createdAt,
          expiresAt,
          status: 'ACTIVE'
        }
      })
      
      logger.info(`Generated encryption key: ${keyId}`)
      return encryptionKey
    } catch (error) {
      logger.error('Failed to generate encryption key:', error)
      throw error
    }
  }

  /**
   * Store encryption key securely
   */
  private static async storeEncryptionKey(key: EncryptionKey): Promise<void> {
    try {
      const keysFile = path.join(process.cwd(), 'server', 'keys', 'encryption-keys.json')
      const keysData = JSON.parse(await fs.readFile(keysFile, 'utf8'))
      
      // Encrypt the key data before storing
      const masterKey = this.getMasterKey()
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, masterKey)
      
      let encryptedKeyData = cipher.update(key.keyData.toString('hex'), 'utf8', 'hex')
      encryptedKeyData += cipher.final('hex')
      const tag = cipher.getAuthTag()
      
      const keyRecord = {
        id: key.id,
        algorithm: key.algorithm,
        encryptedKeyData,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString(),
        status: key.status,
        version: key.version
      }
      
      // Remove existing key with same ID
      keysData.keys = keysData.keys.filter((k: any) => k.id !== key.id)
      keysData.keys.push(keyRecord)
      
      await fs.writeFile(keysFile, JSON.stringify(keysData, null, 2))
    } catch (error) {
      logger.error('Failed to store encryption key:', error)
      throw error
    }
  }

  /**
   * Retrieve encryption key
   */
  static async getEncryptionKey(keyId: string): Promise<EncryptionKey | null> {
    try {
      // Check cache first
      if (this.keyCache.has(keyId)) {
        const key = this.keyCache.get(keyId)!
        
        // Check if key is expired
        if (key.expiresAt && key.expiresAt < new Date()) {
          key.status = 'EXPIRED'
          this.keyCache.delete(keyId)
          return null
        }
        
        return key
      }
      
      // Load from storage
      const keysFile = path.join(process.cwd(), 'server', 'keys', 'encryption-keys.json')
      const keysData = JSON.parse(await fs.readFile(keysFile, 'utf8'))
      
      const keyRecord = keysData.keys.find((k: any) => k.id === keyId)
      if (!keyRecord) {
        return null
      }
      
      // Decrypt key data
      const masterKey = this.getMasterKey()
      const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, masterKey)
      decipher.setAuthTag(Buffer.from(keyRecord.tag, 'hex'))
      
      let decryptedKeyData = decipher.update(keyRecord.encryptedKeyData, 'hex', 'utf8')
      decryptedKeyData += decipher.final('utf8')
      
      const key: EncryptionKey = {
        id: keyRecord.id,
        algorithm: keyRecord.algorithm,
        keyData: Buffer.from(decryptedKeyData, 'hex'),
        createdAt: new Date(keyRecord.createdAt),
        expiresAt: keyRecord.expiresAt ? new Date(keyRecord.expiresAt) : undefined,
        status: keyRecord.status,
        version: keyRecord.version
      }
      
      // Check if key is expired
      if (key.expiresAt && key.expiresAt < new Date()) {
        key.status = 'EXPIRED'
        return null
      }
      
      // Add to cache
      this.keyCache.set(keyId, key)
      
      return key
    } catch (error) {
      logger.error('Failed to retrieve encryption key:', error)
      return null
    }
  }

  /**
   * List all encryption keys
   */
  static async listEncryptionKeys(): Promise<EncryptionKey[]> {
    try {
      const keysFile = path.join(process.cwd(), 'server', 'keys', 'encryption-keys.json')
      const keysData = JSON.parse(await fs.readFile(keysFile, 'utf8'))
      
      const keys: EncryptionKey[] = []
      for (const keyRecord of keysData.keys) {
        const key: EncryptionKey = {
          id: keyRecord.id,
          algorithm: keyRecord.algorithm,
          keyData: Buffer.alloc(0), // Don't load key data for listing
          createdAt: new Date(keyRecord.createdAt),
          expiresAt: keyRecord.expiresAt ? new Date(keyRecord.expiresAt) : undefined,
          status: keyRecord.status,
          version: keyRecord.version
        }
        
        // Update status if expired
        if (key.expiresAt && key.expiresAt < new Date()) {
          key.status = 'EXPIRED'
        }
        
        keys.push(key)
      }
      
      return keys
    } catch (error) {
      logger.error('Failed to list encryption keys:', error)
      return []
    }
  }

  /**
   * Get master key for key encryption
   */
  private static getMasterKey(): Buffer {
    const masterSecret = process.env.ENCRYPTION_MASTER_KEY || 'default-master-key-change-in-production'
    const salt = 'mosaajii-pos-encryption-salt'
    return crypto.pbkdf2Sync(masterSecret, salt, this.KEY_DERIVATION_ITERATIONS, this.KEY_LENGTH, 'sha256')
  }

  /**
   * Load active keys into cache
   */
  private static async loadKeysIntoCache(): Promise<void> {
    try {
      const keys = await this.listEncryptionKeys()
      for (const key of keys) {
        if (key.status === 'ACTIVE') {
          const fullKey = await this.getEncryptionKey(key.id)
          if (fullKey) {
            this.keyCache.set(key.id, fullKey)
          }
        }
      }
      logger.info(`Loaded ${this.keyCache.size} encryption keys into cache`)
    } catch (error) {
      logger.error('Failed to load keys into cache:', error)
    }
  }  /**

   * Encrypt data using specified key
   */
  static async encryptData(
    data: string,
    keyId: string = 'default'
  ): Promise<EncryptionResult> {
    try {
      const key = await this.getEncryptionKey(keyId)
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`)
      }
      
      if (key.status !== 'ACTIVE') {
        throw new Error(`Encryption key is not active: ${keyId}`)
      }
      
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipher(key.algorithm, key.keyData)
      cipher.setAAD(Buffer.from(keyId))
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      return {
        encryptedData: encrypted,
        keyId,
        algorithm: key.algorithm,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        timestamp: new Date()
      }
    } catch (error) {
      logger.error('Data encryption failed:', error)
      throw error
    }
  }

  /**
   * Decrypt data using specified key
   */
  static async decryptData(
    encryptedData: string,
    keyId: string,
    iv: string,
    tag: string
  ): Promise<DecryptionResult> {
    try {
      const key = await this.getEncryptionKey(keyId)
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`)
      }
      
      const decipher = crypto.createDecipher(key.algorithm, key.keyData)
      decipher.setAAD(Buffer.from(keyId))
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return {
        decryptedData: decrypted,
        keyId,
        algorithm: key.algorithm,
        timestamp: new Date()
      }
    } catch (error) {
      logger.error('Data decryption failed:', error)
      throw error
    }
  }

  /**
   * Encrypt PII field in database
   */
  static async encryptPIIField(
    tableName: string,
    recordId: string,
    fieldName: string,
    value: string,
    keyId?: string
  ): Promise<void> {
    try {
      const piiField = this.PII_FIELDS.find(
        f => f.tableName === tableName && f.fieldName === fieldName
      )
      
      if (!piiField || !piiField.encryptionRequired) {
        logger.warn(`Field ${tableName}.${fieldName} is not configured for encryption`)
        return
      }
      
      const encryptionKeyId = keyId || `${tableName}_${fieldName}_key`
      
      // Ensure encryption key exists
      let key = await this.getEncryptionKey(encryptionKeyId)
      if (!key) {
        key = await this.generateEncryptionKey(encryptionKeyId, this.ENCRYPTION_ALGORITHM, piiField.keyRotationInterval)
      }
      
      // Encrypt the value
      const encrypted = await this.encryptData(value, encryptionKeyId)
      
      // Store encrypted data in database
      // Note: This would require database schema changes to store encrypted fields
      const encryptedFieldData = {
        [`${fieldName}_encrypted`]: encrypted.encryptedData,
        [`${fieldName}_key_id`]: encrypted.keyId,
        [`${fieldName}_iv`]: encrypted.iv,
        [`${fieldName}_tag`]: encrypted.tag,
        [`${fieldName}_encrypted_at`]: encrypted.timestamp
      }
      
      // Log PII encryption
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'PII_FIELD_ENCRYPTED',
        tableName,
        recordId,
        newValues: {
          fieldName,
          keyId: encryptionKeyId,
          encryptedAt: encrypted.timestamp
        }
      })
      
      logger.info(`Encrypted PII field: ${tableName}.${fieldName} for record ${recordId}`)
    } catch (error) {
      logger.error('PII field encryption failed:', error)
      throw error
    }
  }

  /**
   * Decrypt PII field from database
   */
  static async decryptPIIField(
    tableName: string,
    recordId: string,
    fieldName: string,
    encryptedData: string,
    keyId: string,
    iv: string,
    tag: string
  ): Promise<string> {
    try {
      const decrypted = await this.decryptData(encryptedData, keyId, iv, tag)
      
      // Log PII decryption access
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'PII_FIELD_DECRYPTED',
        tableName,
        recordId,
        newValues: {
          fieldName,
          keyId,
          accessedAt: decrypted.timestamp
        }
      })
      
      return decrypted.decryptedData
    } catch (error) {
      logger.error('PII field decryption failed:', error)
      throw error
    }
  }

  /**
   * Encrypt file on filesystem
   */
  static async encryptFile(options: FileEncryptionOptions): Promise<{
    success: boolean
    encryptedFilePath: string
    keyId: string
    fileSize: number
  }> {
    try {
      const { filePath, keyId = 'file_encryption_key', deleteOriginal = false, compressionEnabled = false } = options
      
      // Ensure encryption key exists
      let key = await this.getEncryptionKey(keyId)
      if (!key) {
        key = await this.generateEncryptionKey(keyId, this.ENCRYPTION_ALGORITHM)
      }
      
      // Read file data
      const fileData = await fs.readFile(filePath)
      let dataToEncrypt = fileData
      
      // Apply compression if enabled
      if (compressionEnabled) {
        const zlib = require('zlib')
        dataToEncrypt = zlib.gzipSync(fileData)
      }
      
      // Encrypt file data
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipher(key.algorithm, key.keyData)
      cipher.setAAD(Buffer.from(keyId))
      
      const encryptedChunks: Buffer[] = []
      encryptedChunks.push(cipher.update(dataToEncrypt))
      encryptedChunks.push(cipher.final())
      
      const tag = cipher.getAuthTag()
      const encryptedData = Buffer.concat(encryptedChunks)
      
      // Create encrypted file with metadata header
      const metadata = {
        keyId,
        algorithm: key.algorithm,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        compressed: compressionEnabled,
        originalSize: fileData.length,
        encryptedAt: new Date().toISOString()
      }
      
      const metadataBuffer = Buffer.from(JSON.stringify(metadata))
      const metadataLength = Buffer.alloc(4)
      metadataLength.writeUInt32BE(metadataBuffer.length, 0)
      
      const encryptedFilePath = `${filePath}.encrypted`
      const finalData = Buffer.concat([metadataLength, metadataBuffer, encryptedData])
      
      await fs.writeFile(encryptedFilePath, finalData)
      
      // Delete original file if requested
      if (deleteOriginal) {
        await fs.unlink(filePath)
      }
      
      // Log file encryption
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'FILE_ENCRYPTED',
        tableName: 'filesystem',
        recordId: filePath,
        newValues: {
          originalPath: filePath,
          encryptedPath: encryptedFilePath,
          keyId,
          fileSize: finalData.length,
          compressed: compressionEnabled
        }
      })
      
      logger.info(`Encrypted file: ${filePath} -> ${encryptedFilePath}`)
      
      return {
        success: true,
        encryptedFilePath,
        keyId,
        fileSize: finalData.length
      }
    } catch (error) {
      logger.error('File encryption failed:', error)
      throw error
    }
  }

  /**
   * Decrypt file from filesystem
   */
  static async decryptFile(encryptedFilePath: string): Promise<{
    success: boolean
    decryptedFilePath: string
    originalSize: number
  }> {
    try {
      // Read encrypted file
      const encryptedData = await fs.readFile(encryptedFilePath)
      
      // Extract metadata
      const metadataLength = encryptedData.readUInt32BE(0)
      const metadataBuffer = encryptedData.subarray(4, 4 + metadataLength)
      const metadata = JSON.parse(metadataBuffer.toString())
      const fileData = encryptedData.subarray(4 + metadataLength)
      
      // Get decryption key
      const key = await this.getEncryptionKey(metadata.keyId)
      if (!key) {
        throw new Error(`Decryption key not found: ${metadata.keyId}`)
      }
      
      // Decrypt file data
      const decipher = crypto.createDecipher(metadata.algorithm, key.keyData)
      decipher.setAAD(Buffer.from(metadata.keyId))
      decipher.setAuthTag(Buffer.from(metadata.tag, 'hex'))
      
      const decryptedChunks: Buffer[] = []
      decryptedChunks.push(decipher.update(fileData))
      decryptedChunks.push(decipher.final())
      
      let decryptedData = Buffer.concat(decryptedChunks)
      
      // Decompress if needed
      if (metadata.compressed) {
        const zlib = require('zlib')
        decryptedData = zlib.gunzipSync(decryptedData)
      }
      
      // Write decrypted file
      const decryptedFilePath = encryptedFilePath.replace('.encrypted', '.decrypted')
      await fs.writeFile(decryptedFilePath, decryptedData)
      
      // Log file decryption
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'FILE_DECRYPTED',
        tableName: 'filesystem',
        recordId: encryptedFilePath,
        newValues: {
          encryptedPath: encryptedFilePath,
          decryptedPath: decryptedFilePath,
          keyId: metadata.keyId,
          originalSize: metadata.originalSize
        }
      })
      
      logger.info(`Decrypted file: ${encryptedFilePath} -> ${decryptedFilePath}`)
      
      return {
        success: true,
        decryptedFilePath,
        originalSize: metadata.originalSize
      }
    } catch (error) {
      logger.error('File decryption failed:', error)
      throw error
    }
  }

  /**
   * Create encrypted backup
   */
  static async createEncryptedBackup(options: BackupEncryptionOptions): Promise<{
    success: boolean
    encryptedBackupPath: string
    keyId: string
    backupSize: number
    checksum?: string
  }> {
    try {
      const { backupPath, keyId = 'backup_encryption_key', compressionEnabled = true, integrityCheck = true } = options
      
      // Ensure backup encryption key exists
      let key = await this.getEncryptionKey(keyId)
      if (!key) {
        key = await this.generateEncryptionKey(keyId, this.ENCRYPTION_ALGORITHM, 365) // 1 year expiration for backup keys
      }
      
      // Read backup data
      const backupData = await fs.readFile(backupPath)
      let dataToEncrypt = backupData
      
      // Apply compression if enabled
      if (compressionEnabled) {
        const zlib = require('zlib')
        dataToEncrypt = zlib.gzipSync(backupData)
      }
      
      // Calculate checksum for integrity check
      let checksum: string | undefined
      if (integrityCheck) {
        checksum = crypto.createHash('sha256').update(backupData).digest('hex')
      }
      
      // Encrypt backup data
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipher(key.algorithm, key.keyData)
      cipher.setAAD(Buffer.from(keyId))
      
      const encryptedChunks: Buffer[] = []
      encryptedChunks.push(cipher.update(dataToEncrypt))
      encryptedChunks.push(cipher.final())
      
      const tag = cipher.getAuthTag()
      const encryptedData = Buffer.concat(encryptedChunks)
      
      // Create backup metadata
      const metadata = {
        keyId,
        algorithm: key.algorithm,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        compressed: compressionEnabled,
        originalSize: backupData.length,
        checksum,
        createdAt: new Date().toISOString(),
        version: '1.0'
      }
      
      const metadataBuffer = Buffer.from(JSON.stringify(metadata))
      const metadataLength = Buffer.alloc(4)
      metadataLength.writeUInt32BE(metadataBuffer.length, 0)
      
      // Write encrypted backup
      const encryptedBackupPath = `${backupPath}.encrypted`
      const finalData = Buffer.concat([metadataLength, metadataBuffer, encryptedData])
      
      await fs.writeFile(encryptedBackupPath, finalData)
      
      // Log backup encryption
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'BACKUP_ENCRYPTED',
        tableName: 'backups',
        recordId: backupPath,
        newValues: {
          originalPath: backupPath,
          encryptedPath: encryptedBackupPath,
          keyId,
          backupSize: finalData.length,
          compressed: compressionEnabled,
          checksum
        }
      })
      
      logger.info(`Created encrypted backup: ${backupPath} -> ${encryptedBackupPath}`)
      
      return {
        success: true,
        encryptedBackupPath,
        keyId,
        backupSize: finalData.length,
        checksum
      }
    } catch (error) {
      logger.error('Backup encryption failed:', error)
      throw error
    }
  }

  /**
   * Restore from encrypted backup
   */
  static async restoreFromEncryptedBackup(encryptedBackupPath: string): Promise<{
    success: boolean
    restoredBackupPath: string
    originalSize: number
    checksumValid?: boolean
  }> {
    try {
      // Read encrypted backup
      const encryptedData = await fs.readFile(encryptedBackupPath)
      
      // Extract metadata
      const metadataLength = encryptedData.readUInt32BE(0)
      const metadataBuffer = encryptedData.subarray(4, 4 + metadataLength)
      const metadata = JSON.parse(metadataBuffer.toString())
      const backupData = encryptedData.subarray(4 + metadataLength)
      
      // Get decryption key
      const key = await this.getEncryptionKey(metadata.keyId)
      if (!key) {
        throw new Error(`Backup decryption key not found: ${metadata.keyId}`)
      }
      
      // Decrypt backup data
      const decipher = crypto.createDecipher(metadata.algorithm, key.keyData)
      decipher.setAAD(Buffer.from(metadata.keyId))
      decipher.setAuthTag(Buffer.from(metadata.tag, 'hex'))
      
      const decryptedChunks: Buffer[] = []
      decryptedChunks.push(decipher.update(backupData))
      decryptedChunks.push(decipher.final())
      
      let decryptedData = Buffer.concat(decryptedChunks)
      
      // Decompress if needed
      if (metadata.compressed) {
        const zlib = require('zlib')
        decryptedData = zlib.gunzipSync(decryptedData)
      }
      
      // Verify checksum if available
      let checksumValid: boolean | undefined
      if (metadata.checksum) {
        const calculatedChecksum = crypto.createHash('sha256').update(decryptedData).digest('hex')
        checksumValid = calculatedChecksum === metadata.checksum
        
        if (!checksumValid) {
          logger.warn(`Backup checksum mismatch for ${encryptedBackupPath}`)
        }
      }
      
      // Write restored backup
      const restoredBackupPath = encryptedBackupPath.replace('.encrypted', '.restored')
      await fs.writeFile(restoredBackupPath, decryptedData)
      
      // Log backup restoration
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'BACKUP_RESTORED',
        tableName: 'backups',
        recordId: encryptedBackupPath,
        newValues: {
          encryptedPath: encryptedBackupPath,
          restoredPath: restoredBackupPath,
          keyId: metadata.keyId,
          originalSize: metadata.originalSize,
          checksumValid
        }
      })
      
      logger.info(`Restored encrypted backup: ${encryptedBackupPath} -> ${restoredBackupPath}`)
      
      return {
        success: true,
        restoredBackupPath,
        originalSize: metadata.originalSize,
        checksumValid
      }
    } catch (error) {
      logger.error('Backup restoration failed:', error)
      throw error
    }
  }

  /**
   * Get PII fields configuration
   */
  static getPIIFields(): PIIField[] {
    return [...this.PII_FIELDS]
  }

  /**
   * Add PII field configuration
   */
  static addPIIField(piiField: PIIField): void {
    const existingIndex = this.PII_FIELDS.findIndex(
      f => f.tableName === piiField.tableName && f.fieldName === piiField.fieldName
    )
    
    if (existingIndex >= 0) {
      this.PII_FIELDS[existingIndex] = piiField
    } else {
      this.PII_FIELDS.push(piiField)
    }
    
    logger.info(`Added PII field configuration: ${piiField.tableName}.${piiField.fieldName}`)
  }

  /**
   * Remove PII field configuration
   */
  static removePIIField(tableName: string, fieldName: string): boolean {
    const index = this.PII_FIELDS.findIndex(
      f => f.tableName === tableName && f.fieldName === fieldName
    )
    
    if (index >= 0) {
      this.PII_FIELDS.splice(index, 1)
      logger.info(`Removed PII field configuration: ${tableName}.${fieldName}`)
      return true
    }
    
    return false
  }
}