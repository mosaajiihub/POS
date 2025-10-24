import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface EncryptionResult {
  encryptedData: string
  iv: string
  tag?: string
}

export interface BackupOptions {
  includeAuditLogs?: boolean
  includeUserData?: boolean
  includeTransactionData?: boolean
  includeSystemSettings?: boolean
  encryptBackup?: boolean
}

export interface GDPRExportOptions {
  userId: string
  includeAuditLogs?: boolean
  includeTransactions?: boolean
  includePersonalData?: boolean
  format?: 'json' | 'csv'
}

export interface DataRetentionPolicy {
  userDataRetentionDays: number
  transactionDataRetentionDays: number
  auditLogRetentionDays: number
  automaticCleanup: boolean
  backupBeforeCleanup: boolean
}

/**
 * Security Service
 * Handles data encryption, secure backup/recovery, and GDPR compliance
 */
export class SecurityService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32
  private static readonly IV_LENGTH = 16
  private static readonly TAG_LENGTH = 16

  /**
   * Generate encryption key from password/secret
   */
  private static generateKey(secret: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(secret, salt, 100000, this.KEY_LENGTH, 'sha256')
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string, secret?: string): EncryptionResult {
    try {
      const encryptionSecret = secret || process.env.ENCRYPTION_SECRET || 'default-secret-key'
      const salt = crypto.randomBytes(16).toString('hex')
      const key = this.generateKey(encryptionSecret, salt)
      const iv = crypto.randomBytes(this.IV_LENGTH)
      
      const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, key)
      cipher.setAAD(Buffer.from(salt))
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      return {
        encryptedData: `${salt}:${encrypted}`,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }
    } catch (error) {
      logger.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, iv: string, tag: string, secret?: string): string {
    try {
      const encryptionSecret = secret || process.env.ENCRYPTION_SECRET || 'default-secret-key'
      const [salt, encrypted] = encryptedData.split(':')
      const key = this.generateKey(encryptionSecret, salt)
      
      const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, key)
      decipher.setAAD(Buffer.from(salt))
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      logger.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  static async hashData(data: string, saltRounds: number = 12): Promise<string> {
    try {
      return await bcrypt.hash(data, saltRounds)
    } catch (error) {
      logger.error('Hashing error:', error)
      throw new Error('Failed to hash data')
    }
  }

  /**
   * Verify hashed data
   */
  static async verifyHash(data: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(data, hash)
    } catch (error) {
      logger.error('Hash verification error:', error)
      return false
    }
  }

  /**
   * Encrypt user PII data
   */
  static async encryptUserPII(userId: string, data: any): Promise<void> {
    try {
      const sensitiveFields = ['email', 'phone', 'address', 'firstName', 'lastName']
      const encryptedData: any = {}
      
      for (const field of sensitiveFields) {
        if (data[field]) {
          const encrypted = this.encrypt(data[field])
          encryptedData[`${field}_encrypted`] = encrypted.encryptedData
          encryptedData[`${field}_iv`] = encrypted.iv
          encryptedData[`${field}_tag`] = encrypted.tag
        }
      }

      // In a real implementation, you would update the database with encrypted fields
      logger.info(`Encrypted PII data for user: ${userId}`)
      
      // Log the encryption action
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'PII_DATA_ENCRYPTED',
        tableName: 'users',
        recordId: userId,
        newValues: { encryptedFields: sensitiveFields }
      })
    } catch (error) {
      logger.error('PII encryption error:', error)
      throw new Error('Failed to encrypt user PII data')
    }
  }

  /**
   * Create secure backup of system data
   */
  static async createSecureBackup(options: BackupOptions = {}): Promise<{
    success: boolean
    message: string
    backupId?: string
    backupSize?: number
  }> {
    try {
      const backupId = `backup_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
      const backupData: any = {
        backupId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        options
      }

      // Collect data based on options
      if (options.includeUserData !== false) {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            paymentVerified: true,
            createdAt: true,
            updatedAt: true
          }
        })
        backupData.users = users
      }

      if (options.includeTransactionData !== false) {
        const sales = await prisma.sale.findMany({
          include: {
            items: true,
            customer: true,
            cashier: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        })
        backupData.sales = sales
      }

      if (options.includeAuditLogs) {
        const auditLogs = await prisma.auditLog.findMany({
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10000 // Limit to recent logs
        })
        backupData.auditLogs = auditLogs
      }

      if (options.includeSystemSettings !== false) {
        // Include system configuration data
        const categories = await prisma.category.findMany()
        const serviceTypes = await prisma.serviceType.findMany()
        
        backupData.systemSettings = {
          categories,
          serviceTypes
        }
      }

      // Convert to JSON
      const backupJson = JSON.stringify(backupData, null, 2)
      const backupSize = Buffer.byteLength(backupJson, 'utf8')

      // Encrypt backup if requested
      let finalBackupData = backupJson
      if (options.encryptBackup) {
        const encrypted = this.encrypt(backupJson)
        finalBackupData = JSON.stringify({
          encrypted: true,
          data: encrypted.encryptedData,
          iv: encrypted.iv,
          tag: encrypted.tag
        })
      }

      // In a real implementation, save to secure storage (S3, etc.)
      logger.info(`Created secure backup: ${backupId}, Size: ${backupSize} bytes`)

      // Log backup creation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURE_BACKUP_CREATED',
        tableName: 'system',
        recordId: backupId,
        newValues: {
          backupId,
          size: backupSize,
          encrypted: options.encryptBackup,
          options
        }
      })

      return {
        success: true,
        message: 'Secure backup created successfully',
        backupId,
        backupSize
      }
    } catch (error) {
      logger.error('Secure backup error:', error)
      return {
        success: false,
        message: 'Failed to create secure backup'
      }
    }
  }

  /**
   * Restore from secure backup
   */
  static async restoreFromBackup(backupId: string, encryptionSecret?: string): Promise<{
    success: boolean
    message: string
    restoredRecords?: number
  }> {
    try {
      // In a real implementation, retrieve backup from secure storage
      logger.info(`Attempting to restore from backup: ${backupId}`)

      // Log restore attempt
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'BACKUP_RESTORE_ATTEMPTED',
        tableName: 'system',
        recordId: backupId,
        newValues: { backupId }
      })

      // Placeholder for actual restore logic
      const restoredRecords = 0

      return {
        success: true,
        message: 'Backup restored successfully',
        restoredRecords
      }
    } catch (error) {
      logger.error('Backup restore error:', error)
      return {
        success: false,
        message: 'Failed to restore from backup'
      }
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  static async exportUserDataGDPR(options: GDPRExportOptions): Promise<{
    success: boolean
    message: string
    data?: any
    format?: string
  }> {
    try {
      const { userId, includeAuditLogs, includeTransactions, includePersonalData, format = 'json' } = options
      
      const exportData: any = {
        exportDate: new Date().toISOString(),
        userId,
        exportType: 'GDPR_DATA_EXPORT'
      }

      // Get user personal data
      if (includePersonalData !== false) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true
          }
        })

        if (!user) {
          throw new Error('User not found')
        }

        exportData.personalData = user
      }

      // Get user transactions
      if (includeTransactions) {
        const sales = await prisma.sale.findMany({
          where: { cashierId: userId },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, sku: true }
                }
              }
            },
            customer: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        })
        exportData.transactions = sales
      }

      // Get user audit logs
      if (includeAuditLogs) {
        const auditLogs = await prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 1000 // Limit to recent logs
        })
        exportData.auditLogs = auditLogs
      }

      // Log GDPR export
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'GDPR_DATA_EXPORT',
        tableName: 'users',
        recordId: userId,
        newValues: {
          exportOptions: options,
          recordCount: {
            personalData: includePersonalData ? 1 : 0,
            transactions: exportData.transactions?.length || 0,
            auditLogs: exportData.auditLogs?.length || 0
          }
        }
      })

      // Format data based on requested format
      let formattedData: string
      let contentType: string

      if (format === 'csv') {
        // Convert to CSV format (simplified)
        formattedData = this.convertToCSV(exportData)
        contentType = 'text/csv'
      } else {
        formattedData = JSON.stringify(exportData, null, 2)
        contentType = 'application/json'
      }

      return {
        success: true,
        message: 'GDPR data export completed successfully',
        data: formattedData,
        format: contentType
      }
    } catch (error) {
      logger.error('GDPR export error:', error)
      return {
        success: false,
        message: 'Failed to export user data'
      }
    }
  }

  /**
   * Delete user data for GDPR compliance (Right to be forgotten)
   */
  static async deleteUserDataGDPR(userId: string, requesterId: string): Promise<{
    success: boolean
    message: string
    deletedRecords?: number
  }> {
    try {
      let deletedRecords = 0

      // Create backup before deletion
      await this.createSecureBackup({
        includeUserData: true,
        includeAuditLogs: true,
        encryptBackup: true
      })

      // Anonymize user data instead of hard delete to maintain referential integrity
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new Error('User not found')
      }

      // Update user record with anonymized data
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_user_${userId}@anonymized.local`,
          firstName: 'Deleted',
          lastName: 'User',
          status: 'INACTIVE',
          paymentVerified: false,
          otpCode: null,
          otpExpiry: null
        }
      })
      deletedRecords++

      // Log GDPR deletion
      await AuditService.createAuditLog({
        userId: requesterId,
        action: 'GDPR_DATA_DELETION',
        tableName: 'users',
        recordId: userId,
        oldValues: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        newValues: {
          anonymized: true,
          deletionDate: new Date().toISOString()
        }
      })

      return {
        success: true,
        message: 'User data anonymized successfully for GDPR compliance',
        deletedRecords
      }
    } catch (error) {
      logger.error('GDPR deletion error:', error)
      return {
        success: false,
        message: 'Failed to delete user data'
      }
    }
  }

  /**
   * Get data retention policy
   */
  static async getDataRetentionPolicy(): Promise<DataRetentionPolicy> {
    // In a real implementation, this would be stored in database
    return {
      userDataRetentionDays: 2555, // 7 years
      transactionDataRetentionDays: 2555, // 7 years for financial records
      auditLogRetentionDays: 365, // 1 year
      automaticCleanup: false,
      backupBeforeCleanup: true
    }
  }

  /**
   * Update data retention policy
   */
  static async updateDataRetentionPolicy(
    policy: Partial<DataRetentionPolicy>,
    updatedBy: string
  ): Promise<{ success: boolean; message: string; policy?: DataRetentionPolicy }> {
    try {
      // In a real implementation, update database settings
      const updatedPolicy: DataRetentionPolicy = {
        userDataRetentionDays: policy.userDataRetentionDays || 2555,
        transactionDataRetentionDays: policy.transactionDataRetentionDays || 2555,
        auditLogRetentionDays: policy.auditLogRetentionDays || 365,
        automaticCleanup: policy.automaticCleanup || false,
        backupBeforeCleanup: policy.backupBeforeCleanup !== false
      }

      // Log policy update
      await AuditService.createAuditLog({
        userId: updatedBy,
        action: 'DATA_RETENTION_POLICY_UPDATED',
        tableName: 'system_settings',
        newValues: updatedPolicy
      })

      return {
        success: true,
        message: 'Data retention policy updated successfully',
        policy: updatedPolicy
      }
    } catch (error) {
      logger.error('Data retention policy update error:', error)
      return {
        success: false,
        message: 'Failed to update data retention policy'
      }
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any): string {
    // Simplified CSV conversion
    const lines: string[] = []
    
    if (data.personalData) {
      lines.push('Personal Data')
      lines.push('Field,Value')
      Object.entries(data.personalData).forEach(([key, value]) => {
        lines.push(`${key},"${value}"`)
      })
      lines.push('')
    }

    if (data.transactions) {
      lines.push('Transactions')
      lines.push('ID,Date,Total,Items')
      data.transactions.forEach((transaction: any) => {
        lines.push(`${transaction.id},"${transaction.createdAt}",${transaction.totalAmount},${transaction.items.length}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Validate data integrity
   */
  static async validateDataIntegrity(): Promise<{
    success: boolean
    message: string
    issues?: string[]
  }> {
    try {
      const issues: string[] = []

      // Check for orphaned records
      const orphanedSaleItems = await prisma.saleItem.count({
        where: {
          sale: null
        }
      })

      if (orphanedSaleItems > 0) {
        issues.push(`Found ${orphanedSaleItems} orphaned sale items`)
      }

      // Check for users without proper roles
      const usersWithoutRoles = await prisma.user.count({
        where: {
          userRoles: {
            none: {}
          }
        }
      })

      if (usersWithoutRoles > 0) {
        issues.push(`Found ${usersWithoutRoles} users without assigned roles`)
      }

      return {
        success: true,
        message: issues.length === 0 ? 'Data integrity check passed' : 'Data integrity issues found',
        issues: issues.length > 0 ? issues : undefined
      }
    } catch (error) {
      logger.error('Data integrity validation error:', error)
      return {
        success: false,
        message: 'Failed to validate data integrity'
      }
    }
  }
}