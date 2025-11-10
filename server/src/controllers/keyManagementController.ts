import { Request, Response } from 'express'
import { KeyManagementService, KeyType, KeyPurpose, KeyStatus, KeyOperation } from '../services/keyManagementService'
import { logger } from '../utils/logger'

/**
 * Key Management Controller
 * Handles HTTP requests for key management operations
 */
export class KeyManagementController {
  /**
   * Initialize key management service
   */
  static async initialize(req: Request, res: Response): Promise<void> {
    try {
      await KeyManagementService.initialize()
      
      res.json({
        success: true,
        message: 'Key management service initialized successfully'
      })
    } catch (error) {
      logger.error('Failed to initialize key management service:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to initialize key management service',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Generate new key
   */
  static async generateKey(req: Request, res: Response): Promise<void> {
    try {
      const {
        keyId,
        keyType,
        keySize,
        name,
        description,
        purpose,
        expiresAt,
        tags,
        accessPolicy
      } = req.body
      
      const userId = (req as any).user?.id || 'system'
      
      if (!keyId || !keyType || !keySize) {
        res.status(400).json({
          success: false,
          message: 'Key ID, type, and size are required'
        })
        return
      }
      
      // Validate key type
      if (!Object.values(KeyType).includes(keyType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid key type'
        })
        return
      }
      
      const metadata = await KeyManagementService.generateKey(
        keyId,
        keyType,
        keySize,
        {
          name,
          description,
          purpose: purpose || [KeyPurpose.ENCRYPTION, KeyPurpose.DECRYPTION],
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          tags: tags || [],
          accessPolicy
        },
        userId
      )
      
      res.json({
        success: true,
        message: 'Key generated successfully',
        metadata: {
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          keyType: metadata.keyType,
          algorithm: metadata.algorithm,
          keySize: metadata.keySize,
          purpose: metadata.purpose,
          createdBy: metadata.createdBy,
          createdAt: metadata.createdAt,
          expiresAt: metadata.expiresAt,
          status: metadata.status,
          version: metadata.version,
          tags: metadata.tags
        }
      })
    } catch (error) {
      logger.error('Failed to generate key:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to generate key',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key metadata
   */
  static async getKeyMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const metadata = await KeyManagementService.getKeyMetadata(keyId)
      
      if (!metadata) {
        res.status(404).json({
          success: false,
          message: 'Key not found'
        })
        return
      }
      
      res.json({
        success: true,
        metadata: {
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          keyType: metadata.keyType,
          algorithm: metadata.algorithm,
          keySize: metadata.keySize,
          purpose: metadata.purpose,
          createdBy: metadata.createdBy,
          createdAt: metadata.createdAt,
          expiresAt: metadata.expiresAt,
          lastUsedAt: metadata.lastUsedAt,
          usageCount: metadata.usageCount,
          status: metadata.status,
          version: metadata.version,
          tags: metadata.tags,
          accessPolicy: metadata.accessPolicy
        }
      })
    } catch (error) {
      logger.error('Failed to get key metadata:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key metadata',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * List keys
   */
  static async listKeys(req: Request, res: Response): Promise<void> {
    try {
      const {
        keyType,
        status,
        purpose,
        createdBy,
        tags,
        expiringBefore
      } = req.query
      
      const filters: any = {}
      
      if (keyType) filters.keyType = keyType as KeyType
      if (status) filters.status = status as KeyStatus
      if (purpose) filters.purpose = purpose as KeyPurpose
      if (createdBy) filters.createdBy = createdBy as string
      if (tags) filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string]
      if (expiringBefore) filters.expiringBefore = new Date(expiringBefore as string)
      
      const keys = await KeyManagementService.listKeys(Object.keys(filters).length > 0 ? filters : undefined)
      
      res.json({
        success: true,
        keys: keys.map(key => ({
          id: key.id,
          name: key.name,
          description: key.description,
          keyType: key.keyType,
          algorithm: key.algorithm,
          keySize: key.keySize,
          purpose: key.purpose,
          createdBy: key.createdBy,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          lastUsedAt: key.lastUsedAt,
          usageCount: key.usageCount,
          status: key.status,
          version: key.version,
          tags: key.tags
        })),
        total: keys.length
      })
    } catch (error) {
      logger.error('Failed to list keys:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to list keys',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Update key metadata
   */
  static async updateKeyMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      const updates = req.body
      const userId = (req as any).user?.id || 'system'
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      // Convert expiresAt to Date if provided
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt)
      }
      
      const updatedMetadata = await KeyManagementService.updateKeyMetadata(keyId, updates, userId)
      
      if (!updatedMetadata) {
        res.status(404).json({
          success: false,
          message: 'Key not found'
        })
        return
      }
      
      res.json({
        success: true,
        message: 'Key metadata updated successfully',
        metadata: {
          id: updatedMetadata.id,
          name: updatedMetadata.name,
          description: updatedMetadata.description,
          keyType: updatedMetadata.keyType,
          algorithm: updatedMetadata.algorithm,
          keySize: updatedMetadata.keySize,
          purpose: updatedMetadata.purpose,
          createdBy: updatedMetadata.createdBy,
          createdAt: updatedMetadata.createdAt,
          expiresAt: updatedMetadata.expiresAt,
          lastUsedAt: updatedMetadata.lastUsedAt,
          usageCount: updatedMetadata.usageCount,
          status: updatedMetadata.status,
          version: updatedMetadata.version,
          tags: updatedMetadata.tags,
          accessPolicy: updatedMetadata.accessPolicy
        }
      })
    } catch (error) {
      logger.error('Failed to update key metadata:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update key metadata',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Revoke key
   */
  static async revokeKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      const { reason } = req.body
      const userId = (req as any).user?.id || 'system'
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Revocation reason is required'
        })
        return
      }
      
      const success = await KeyManagementService.revokeKey(keyId, reason, userId)
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Key not found or revocation failed'
        })
        return
      }
      
      res.json({
        success: true,
        message: 'Key revoked successfully'
      })
    } catch (error) {
      logger.error('Failed to revoke key:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to revoke key',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Create key escrow
   */
  static async createKeyEscrow(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      const { recoveryShares, threshold, recoveryInstructions } = req.body
      const userId = (req as any).user?.id || 'system'
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const escrowRecord = await KeyManagementService.createKeyEscrow(
        keyId,
        userId,
        recoveryShares || 3,
        threshold || 2,
        recoveryInstructions || 'Standard key recovery procedure'
      )
      
      res.json({
        success: true,
        message: 'Key escrow created successfully',
        escrow: {
          keyId: escrowRecord.keyId,
          escrowId: escrowRecord.escrowId,
          escrowedBy: escrowRecord.escrowedBy,
          escrowedAt: escrowRecord.escrowedAt,
          recoveryShares: escrowRecord.recoveryShares,
          threshold: escrowRecord.threshold,
          recoveryInstructions: escrowRecord.recoveryInstructions,
          status: escrowRecord.status
        }
      })
    } catch (error) {
      logger.error('Failed to create key escrow:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to create key escrow',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Request key recovery
   */
  static async requestKeyRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      const { reason, requiredApprovals } = req.body
      const userId = (req as any).user?.id || 'system'
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Recovery reason is required'
        })
        return
      }
      
      const recoveryRequest = await KeyManagementService.requestKeyRecovery(
        keyId,
        userId,
        reason,
        requiredApprovals || 2
      )
      
      res.json({
        success: true,
        message: 'Key recovery requested successfully',
        request: {
          requestId: recoveryRequest.requestId,
          keyId: recoveryRequest.keyId,
          requestedBy: recoveryRequest.requestedBy,
          requestedAt: recoveryRequest.requestedAt,
          reason: recoveryRequest.reason,
          requiredApprovals: recoveryRequest.requiredApprovals,
          status: recoveryRequest.status
        }
      })
    } catch (error) {
      logger.error('Failed to request key recovery:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to request key recovery',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key usage statistics
   */
  static async getKeyUsageStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params
      
      if (!keyId) {
        res.status(400).json({
          success: false,
          message: 'Key ID is required'
        })
        return
      }
      
      const statistics = await KeyManagementService.getKeyUsageStatistics(keyId)
      
      res.json({
        success: true,
        statistics
      })
    } catch (error) {
      logger.error('Failed to get key usage statistics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key usage statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key types
   */
  static async getKeyTypes(req: Request, res: Response): Promise<void> {
    try {
      const keyTypes = Object.values(KeyType).map(type => ({
        value: type,
        label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        supportedSizes: this.getSupportedKeySizes(type)
      }))
      
      res.json({
        success: true,
        keyTypes
      })
    } catch (error) {
      logger.error('Failed to get key types:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key types',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key purposes
   */
  static async getKeyPurposes(req: Request, res: Response): Promise<void> {
    try {
      const purposes = Object.values(KeyPurpose).map(purpose => ({
        value: purpose,
        label: purpose.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      res.json({
        success: true,
        purposes
      })
    } catch (error) {
      logger.error('Failed to get key purposes:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key purposes',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get key operations
   */
  static async getKeyOperations(req: Request, res: Response): Promise<void> {
    try {
      const operations = Object.values(KeyOperation).map(operation => ({
        value: operation,
        label: operation.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      res.json({
        success: true,
        operations
      })
    } catch (error) {
      logger.error('Failed to get key operations:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get key operations',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get supported key sizes for a key type
   */
  private static getSupportedKeySizes(keyType: KeyType): number[] {
    const supportedSizes: Record<KeyType, number[]> = {
      [KeyType.SYMMETRIC]: [128, 192, 256],
      [KeyType.ASYMMETRIC_RSA]: [2048, 3072, 4096],
      [KeyType.ASYMMETRIC_EC]: [256, 384, 521],
      [KeyType.HMAC]: [128, 192, 256, 512],
      [KeyType.DERIVED]: [128, 192, 256]
    }
    
    return supportedSizes[keyType] || []
  }
}