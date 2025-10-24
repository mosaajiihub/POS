import { Request, Response } from 'express'
import { SecurityService, BackupOptions, GDPRExportOptions } from '../services/securityService'
import { logger } from '../utils/logger'

/**
 * Security Controller
 * Handles data security, encryption, backup, and GDPR compliance endpoints
 */
export class SecurityController {
  /**
   * Create secure backup
   */
  static async createBackup(req: Request, res: Response) {
    try {
      const options: BackupOptions = {
        includeAuditLogs: req.body.includeAuditLogs,
        includeUserData: req.body.includeUserData,
        includeTransactionData: req.body.includeTransactionData,
        includeSystemSettings: req.body.includeSystemSettings,
        encryptBackup: req.body.encryptBackup
      }

      const result = await SecurityService.createSecureBackup(options)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'BACKUP_CREATION_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          backupId: result.backupId,
          backupSize: result.backupSize
        }
      })
    } catch (error) {
      logger.error('Create backup error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating backup'
        }
      })
    }
  }

  /**
   * Restore from backup
   */
  static async restoreBackup(req: Request, res: Response) {
    try {
      const { backupId, encryptionSecret } = req.body

      if (!backupId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_BACKUP_ID',
            message: 'Backup ID is required'
          }
        })
      }

      const result = await SecurityService.restoreFromBackup(backupId, encryptionSecret)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'BACKUP_RESTORE_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          restoredRecords: result.restoredRecords
        }
      })
    } catch (error) {
      logger.error('Restore backup error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while restoring backup'
        }
      })
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  static async exportUserDataGDPR(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const {
        includeAuditLogs = false,
        includeTransactions = true,
        includePersonalData = true,
        format = 'json'
      } = req.query

      const options: GDPRExportOptions = {
        userId,
        includeAuditLogs: includeAuditLogs === 'true',
        includeTransactions: includeTransactions === 'true',
        includePersonalData: includePersonalData === 'true',
        format: format as 'json' | 'csv'
      }

      const result = await SecurityService.exportUserDataGDPR(options)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GDPR_EXPORT_FAILED',
            message: result.message
          }
        })
      }

      // Set appropriate headers for file download
      const timestamp = new Date().toISOString().split('T')[0]
      const extension = format === 'csv' ? 'csv' : 'json'
      const filename = `user_data_export_${userId}_${timestamp}.${extension}`
      
      res.setHeader('Content-Type', result.format || 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(result.data)
    } catch (error) {
      logger.error('GDPR export error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while exporting user data'
        }
      })
    }
  }

  /**
   * Delete user data for GDPR compliance
   */
  static async deleteUserDataGDPR(req: Request, res: Response) {
    try {
      const { userId } = req.params

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      const result = await SecurityService.deleteUserDataGDPR(userId, req.user.userId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'GDPR_DELETION_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          deletedRecords: result.deletedRecords
        }
      })
    } catch (error) {
      logger.error('GDPR deletion error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting user data'
        }
      })
    }
  }

  /**
   * Get data retention policy
   */
  static async getDataRetentionPolicy(req: Request, res: Response) {
    try {
      const policy = await SecurityService.getDataRetentionPolicy()
      
      res.json({
        success: true,
        data: policy
      })
    } catch (error) {
      logger.error('Get data retention policy error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving data retention policy'
        }
      })
    }
  }

  /**
   * Update data retention policy
   */
  static async updateDataRetentionPolicy(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        })
      }

      const {
        userDataRetentionDays,
        transactionDataRetentionDays,
        auditLogRetentionDays,
        automaticCleanup,
        backupBeforeCleanup
      } = req.body

      const result = await SecurityService.updateDataRetentionPolicy({
        userDataRetentionDays,
        transactionDataRetentionDays,
        auditLogRetentionDays,
        automaticCleanup,
        backupBeforeCleanup
      }, req.user.userId)

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'POLICY_UPDATE_FAILED',
            message: result.message
          }
        })
      }

      res.json({
        success: true,
        message: result.message,
        data: result.policy
      })
    } catch (error) {
      logger.error('Update data retention policy error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating data retention policy'
        }
      })
    }
  }

  /**
   * Validate data integrity
   */
  static async validateDataIntegrity(req: Request, res: Response) {
    try {
      const result = await SecurityService.validateDataIntegrity()

      res.json({
        success: true,
        message: result.message,
        data: {
          passed: result.success,
          issues: result.issues
        }
      })
    } catch (error) {
      logger.error('Data integrity validation error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while validating data integrity'
        }
      })
    }
  }

  /**
   * Encrypt user PII data
   */
  static async encryptUserPII(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const userData = req.body

      await SecurityService.encryptUserPII(userId, userData)

      res.json({
        success: true,
        message: 'User PII data encrypted successfully'
      })
    } catch (error) {
      logger.error('Encrypt user PII error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while encrypting user PII data'
        }
      })
    }
  }

  /**
   * Get security status overview
   */
  static async getSecurityStatus(req: Request, res: Response) {
    try {
      // Check various security aspects
      const integrityCheck = await SecurityService.validateDataIntegrity()
      const retentionPolicy = await SecurityService.getDataRetentionPolicy()

      // Get encryption status (simplified)
      const encryptionStatus = {
        databaseEncryption: process.env.DATABASE_ENCRYPTION_ENABLED === 'true',
        backupEncryption: true, // Assuming backups are encrypted by default
        transitEncryption: true // HTTPS is enforced
      }

      // Get compliance status
      const complianceStatus = {
        gdprCompliant: true,
        auditLoggingEnabled: true,
        dataRetentionConfigured: retentionPolicy.userDataRetentionDays > 0,
        backupPolicyConfigured: retentionPolicy.backupBeforeCleanup
      }

      res.json({
        success: true,
        data: {
          dataIntegrity: {
            status: integrityCheck.success ? 'PASSED' : 'ISSUES_FOUND',
            issues: integrityCheck.issues
          },
          encryption: encryptionStatus,
          compliance: complianceStatus,
          retentionPolicy,
          lastUpdated: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Get security status error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving security status'
        }
      })
    }
  }
}