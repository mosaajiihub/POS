import { Request, Response } from 'express'
import { DataEncryptionService } from '../services/dataEncryptionService'
import { KeyRotationService } from '../services/keyRotationService'
import { logger } from '../utils/logger'

/**
 * Data Encryption Controller
 * Handles HTTP requests for data encryption, key management, and rotation operations
 */
export class DataEncryptionController {
  /**
   * Initialize encryption service
   */
  static async initialize(req: Request, res: Response): Promise<void> {
    try {
      await DataEncryptionService.initialize()
      await KeyRotationService.initialize()
      
      res.json({
        success: true,
        message: 'Data encryption service initialized successfully'
      })
    } catch (error) {
      logger.error('Failed to initialize encryption service:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to initialize encryption service',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Generate new encryption key
   */
  static async generateKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId, algorithm, expirationDays } = req.body
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const key = await DataEncryptionService.generateEncryptionKey(keyId, algorithm, expirationDays)
      
      res.json({
        success: true,
        message: 'Encryption key generated successfully',
        key: {
          id: key.id,
          algorithm: key.algorithm,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          status: key.status,
          version: key.version
        }
      })
    } catch (error) {
      logger.error('Failed to generate encryption key:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to generate encryption key',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * List encryption keys
   */
  static async listKeys(req: Request, res: Response): Promise<void> {
    try {
      const keys = await DataEncryptionService.listEncryptionKeys()
      
      res.json({
        success: true,
        keys: keys.map(key => ({
          id: key.id,
          algorithm: key.algorithm,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          status: key.status,
          version: key.version
        }))
      })
    } catch (error) {
      logger.error('Failed to list encryption keys:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to list encryption keys',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Encrypt data
   */
  static async encryptData(req: Request, res: Response): Promise<void> {
    try {
      const { data, keyId } = req.body
      
      if (!data) {
        res.status(400).json({
          success: false,
          message: 'Data is required'
        })
        return
      }
      
      const result = await DataEncryptionService.encryptData(data, keyId)
      
      res.json({
        success: true,
        message: 'Data encrypted successfully',
        result: {
          keyId: result.keyId,
          algorithm: result.algorithm,
          iv: result.iv,
          tag: result.tag,
          timestamp: result.timestamp
          // Note: encryptedData is not returned for security reasons
        }
      })
    } catch (error) {
      logger.error('Failed to encrypt data:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to encrypt data',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Encrypt file
   */
  static async encryptFile(req: Request, res: Response): Promise<void> {
    try {
      const { filePath, keyId, deleteOriginal, compressionEnabled } = req.body
      
      if (!filePath) {
        res.status(400).json({
          success: false,
          message: 'File path is required'
        })
        return
      }
      
      const result = await DataEncryptionService.encryptFile({
        filePath,
        keyId,
        deleteOriginal,
        compressionEnabled
      })
      
      res.json({
        success: true,
        message: 'File encrypted successfully',
        result
      })
    } catch (error) {
      logger.error('Failed to encrypt file:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to encrypt file',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Decrypt file
   */
  static async decryptFile(req: Request, res: Response): Promise<void> {
    try {
      const { encryptedFilePath } = req.body
      
      if (!encryptedFilePath) {
        res.status(400).json({
          success: false,
          message: 'Encrypted file path is required'
        })
        return
      }
      
      const result = await DataEncryptionService.decryptFile(encryptedFilePath)
      
      res.json({
        success: true,
        message: 'File decrypted successfully',
        result
      })
    } catch (error) {
      logger.error('Failed to decrypt file:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to decrypt file',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Create encrypted backup
   */
  static async createEncryptedBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupPath, keyId, compressionEnabled, integrityCheck } = req.body
      
      if (!backupPath) {
        res.status(400).json({
          success: false,
          message: 'Backup path is required'
        })
        return
      }
      
      const result = await DataEncryptionService.createEncryptedBackup({
        backupPath,
        keyId,
        compressionEnabled,
        integrityCheck
      })
      
      res.json({
        success: true,
        message: 'Encrypted backup created successfully',
        result
      })
    } catch (error) {
      logger.error('Failed to create encrypted backup:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create encrypted backup',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Restore from encrypted backup
   */
  static async restoreFromEncryptedBackup(req: Request, res: Response): Promise<void> {
    try {
      const { encryptedBackupPath } = req.body
      
      if (!encryptedBackupPath) {
        res.status(400).json({
          success: false,
          message: 'Encrypted backup path is required'
        })
        return
      }
      
      const result = await DataEncryptionService.restoreFromEncryptedBackup(encryptedBackupPath)
      
      res.json({
        success: true,
        message: 'Backup restored successfully',
        result
      })
    } catch (error) {
      logger.error('Failed to restore from encrypted backup:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to restore from encrypted backup',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get PII fields configuration
   */
  static async getPIIFields(req: Request, res: Response): Promise<void> {
    try {
      const piiFields = DataEncryptionService.getPIIFields()
      
      res.json({
        success: true,
        piiFields
      })
    } catch (error) {
      logger.error('Failed to get PII fields:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get PII fields',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Add PII field configuration
   */
  static async addPIIField(req: Request, res: Response): Promise<void> {
    try {
      const { tableName, fieldName, encryptionRequired, keyRotationInterval } = req.body
      
      if (!tableName || !fieldName) {
        res.status(400).json({
          success: false,
          message: 'Table name and field name are required'
        })
        return
      }
      
      DataEncryptionService.addPIIField({
        tableName,
        fieldName,
        encryptionRequired: encryptionRequired !== false,
        keyRotationInterval: keyRotationInterval || 90
      })
      
      res.json({
        success: true,
        message: 'PII field configuration added successfully'
      })
    } catch (error) {
      logger.error('Failed to add PII field:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to add PII field',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Remove PII field configuration
   */
  static async removePIIField(req: Request, res: Response): Promise<void> {
    try {
      const { tableName, fieldName } = req.body
      
      if (!tableName || !fieldName) {
        res.status(400).json({
          success: false,
          message: 'Table name and field name are required'
        })
        return
      }
      
      const removed = DataEncryptionService.removePIIField(tableName, fieldName)
      
      res.json({
        success: removed,
        message: removed ? 'PII field configuration removed successfully' : 'PII field configuration not found'
      })
    } catch (error) {
      logger.error('Failed to remove PII field:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to remove PII field',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Create key rotation policy
   */
  static async createRotationPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { keyId, rotationIntervalDays, autoRotationEnabled, gracePeriodDays, notificationDays } = req.body
      
      if (!keyId || !rotationIntervalDays) {
        res.status(400).json({
          success: false,
          message: 'Key ID and rotation interval are required'
        })
        return
      }
      
      await KeyRotationService.createRotationPolicy({
        keyId,
        rotationIntervalDays,
        autoRotationEnabled: autoRotationEnabled !== false,
        gracePeriodDays: gracePeriodDays || 7,
        notificationDays: notificationDays || [30, 7, 1]
      })
      
      res.json({
        success: true,
        message: 'Key rotation policy created successfully'
      })
    } catch (error) {
      logger.error('Failed to create rotation policy:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create rotation policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * List rotation policies
   */
  static async listRotationPolicies(req: Request, res: Response): Promise<void> {
    try {
      const policies = KeyRotationService.listRotationPolicies()
      
      res.json({
        success: true,
        policies
      })
    } catch (error) {
      logger.error('Failed to list rotation policies:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to list rotation policies',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Rotate key manually
   */
  static async rotateKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId, reason } = req.body
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const result = await KeyRotationService.rotateKey(keyId, reason)
      
      res.json({
        success: result.success,
        message: result.success ? 'Key rotated successfully' : 'Key rotation failed',
        result
      })
    } catch (error) {
      logger.error('Failed to rotate key:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to rotate key',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get rotation schedule
   */
  static async getRotationSchedule(req: Request, res: Response): Promise<void> {
    try {
      const schedule = KeyRotationService.getRotationSchedule()
      
      res.json({
        success: true,
        schedule
      })
    } catch (error) {
      logger.error('Failed to get rotation schedule:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get rotation schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key rotation status
   */
  static async getKeyRotationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const status = await KeyRotationService.getKeyRotationStatus(keyId)
      
      res.json({
        success: true,
        status
      })
    } catch (error) {
      logger.error('Failed to get key rotation status:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key rotation status',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Schedule key rotation
   */
  static async scheduleKeyRotation(req: Request, res: Response): Promise<void> {
    try {
      const { keyId, scheduledDate, priority, reason, autoRotation } = req.body
      
      if (!keyId || !scheduledDate) {
        res.status(400).json({
          success: false,
          message: 'Key ID and scheduled date are required'
        })
        return
      }
      
      await KeyRotationService.scheduleKeyRotation(
        keyId,
        new Date(scheduledDate),
        priority || 'MEDIUM',
        reason || 'Manual scheduling',
        autoRotation || false
      )
      
      res.json({
        success: true,
        message: 'Key rotation scheduled successfully'
      })
    } catch (error) {
      logger.error('Failed to schedule key rotation:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to schedule key rotation',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Cancel scheduled rotation
   */
  static async cancelScheduledRotation(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.body
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const cancelled = await KeyRotationService.cancelScheduledRotation(keyId)
      
      res.json({
        success: cancelled,
        message: cancelled ? 'Scheduled rotation cancelled successfully' : 'No scheduled rotation found for the key'
      })
    } catch (error) {
      logger.error('Failed to cancel scheduled rotation:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to cancel scheduled rotation',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}