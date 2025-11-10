import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { BackupService, BackupType } from '../services/backupService'
import { OffsiteBackupService, OffsiteProvider } from '../services/offsiteBackupService'
import { DisasterRecoveryService, RecoveryPriority, TestEnvironment } from '../services/disasterRecoveryService'

/**
 * Backup Controller
 * Handles HTTP requests for backup, offsite storage, and disaster recovery operations
 */
export class BackupController {
  /**
   * Create backup
   */
  static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const { name, type, retentionDays, encryptionEnabled, compressionEnabled, integrityCheckEnabled, offsiteEnabled, tags } = req.body
      const userId = (req as any).user?.id || 'system'
      
      const config = {
        name,
        type: type as BackupType,
        retentionDays: retentionDays || 30,
        encryptionEnabled: encryptionEnabled !== false,
        compressionEnabled: compressionEnabled !== false,
        integrityCheckEnabled: integrityCheckEnabled !== false,
        offsiteEnabled: offsiteEnabled || false,
        tags: tags || []
      }
      
      const backup = await BackupService.createBackup(config, userId)
      
      // Upload to offsite if enabled
      if (offsiteEnabled) {
        const offsiteConfig = {
          provider: OffsiteProvider.LOCAL_REMOTE,
          encryptionEnabled: true,
          replicationEnabled: false,
          retentionDays: retentionDays || 30
        }
        
        await OffsiteBackupService.uploadBackup(backup.id, offsiteConfig, userId)
      }
      
      res.status(201).json({
        success: true,
        data: backup
      })
    } catch (error) {
      logger.error('Failed to create backup:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create backup'
      })
    }
  }

  /**
   * List backups
   */
  static async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const { type, status, tags } = req.query
      
      const filters: any = {}
      if (type) filters.type = type as BackupType
      if (status) filters.status = status
      if (tags) filters.tags = (tags as string).split(',')
      
      const backups = await BackupService.listBackups(filters)
      
      res.json({
        success: true,
        data: backups
      })
    } catch (error) {
      logger.error('Failed to list backups:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list backups'
      })
    }
  }

  /**
   * Get backup details
   */
  static async getBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupId } = req.params
      
      const backup = await BackupService.getBackupMetadata(backupId)
      
      if (!backup) {
        res.status(404).json({
          success: false,
          error: 'Backup not found'
        })
        return
      }
      
      res.json({
        success: true,
        data: backup
      })
    } catch (error) {
      logger.error('Failed to get backup:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backup'
      })
    }
  }

  /**
   * Verify backup
   */
  static async verifyBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupId } = req.params
      
      const verification = await BackupService.verifyBackup(backupId)
      
      res.json({
        success: true,
        data: verification
      })
    } catch (error) {
      logger.error('Failed to verify backup:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify backup'
      })
    }
  }

  /**
   * Delete backup
   */
  static async deleteBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupId } = req.params
      const userId = (req as any).user?.id || 'system'
      
      const deleted = await BackupService.deleteBackup(backupId, userId)
      
      res.json({
        success: deleted,
        message: deleted ? 'Backup deleted successfully' : 'Failed to delete backup'
      })
    } catch (error) {
      logger.error('Failed to delete backup:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete backup'
      })
    }
  }

  /**
   * Get backup alerts
   */
  static async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { severity, type, acknowledged } = req.query
      
      const filters: any = {}
      if (severity) filters.severity = severity
      if (type) filters.type = type
      if (acknowledged !== undefined) filters.acknowledged = acknowledged === 'true'
      
      const alerts = await BackupService.getAlerts(filters)
      
      res.json({
        success: true,
        data: alerts
      })
    } catch (error) {
      logger.error('Failed to get alerts:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get alerts'
      })
    }
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params
      
      const acknowledged = await BackupService.acknowledgeAlert(alertId)
      
      res.json({
        success: acknowledged,
        message: acknowledged ? 'Alert acknowledged' : 'Alert not found'
      })
    } catch (error) {
      logger.error('Failed to acknowledge alert:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acknowledge alert'
      })
    }
  }

  /**
   * Upload to offsite storage
   */
  static async uploadOffsite(req: Request, res: Response): Promise<void> {
    try {
      const { backupId } = req.params
      const { provider, replicationEnabled, retentionDays } = req.body
      const userId = (req as any).user?.id || 'system'
      
      const config = {
        provider: provider as OffsiteProvider || OffsiteProvider.LOCAL_REMOTE,
        encryptionEnabled: true,
        replicationEnabled: replicationEnabled || false,
        retentionDays: retentionDays || 30
      }
      
      const offsite = await OffsiteBackupService.uploadBackup(backupId, config, userId)
      
      res.status(201).json({
        success: true,
        data: offsite
      })
    } catch (error) {
      logger.error('Failed to upload to offsite:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload to offsite'
      })
    }
  }

  /**
   * List offsite backups
   */
  static async listOffsiteBackups(req: Request, res: Response): Promise<void> {
    try {
      const { provider, status } = req.query
      
      const filters: any = {}
      if (provider) filters.provider = provider as OffsiteProvider
      if (status) filters.status = status
      
      const backups = await OffsiteBackupService.listOffsiteBackups(filters)
      
      res.json({
        success: true,
        data: backups
      })
    } catch (error) {
      logger.error('Failed to list offsite backups:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list offsite backups'
      })
    }
  }

  /**
   * Create disaster recovery plan
   */
  static async createRecoveryPlan(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'system'
      const plan = await DisasterRecoveryService.createRecoveryPlan(req.body, userId)
      
      res.status(201).json({
        success: true,
        data: plan
      })
    } catch (error) {
      logger.error('Failed to create recovery plan:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create recovery plan'
      })
    }
  }

  /**
   * Execute disaster recovery plan
   */
  static async executeRecoveryPlan(req: Request, res: Response): Promise<void> {
    try {
      const { planId } = req.params
      const { reason } = req.body
      const userId = (req as any).user?.id || 'system'
      
      const execution = await DisasterRecoveryService.executeRecoveryPlan(planId, reason, userId)
      
      res.status(201).json({
        success: true,
        data: execution
      })
    } catch (error) {
      logger.error('Failed to execute recovery plan:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute recovery plan'
      })
    }
  }

  /**
   * Test disaster recovery plan
   */
  static async testRecoveryPlan(req: Request, res: Response): Promise<void> {
    try {
      const { planId } = req.params
      const { environment } = req.body
      const userId = (req as any).user?.id || 'system'
      
      const test = await DisasterRecoveryService.testRecoveryPlan(
        planId,
        environment as TestEnvironment || TestEnvironment.STAGING,
        userId
      )
      
      res.status(201).json({
        success: true,
        data: test
      })
    } catch (error) {
      logger.error('Failed to test recovery plan:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test recovery plan'
      })
    }
  }

  /**
   * List disaster recovery plans
   */
  static async listRecoveryPlans(req: Request, res: Response): Promise<void> {
    try {
      const { priority, status } = req.query
      
      const filters: any = {}
      if (priority) filters.priority = priority as RecoveryPriority
      if (status) filters.status = status
      
      const plans = await DisasterRecoveryService.listRecoveryPlans(filters)
      
      res.json({
        success: true,
        data: plans
      })
    } catch (error) {
      logger.error('Failed to list recovery plans:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list recovery plans'
      })
    }
  }

  /**
   * Get recovery plan execution
   */
  static async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params
      
      const execution = await DisasterRecoveryService.getExecution(executionId)
      
      if (!execution) {
        res.status(404).json({
          success: false,
          error: 'Execution not found'
        })
        return
      }
      
      res.json({
        success: true,
        data: execution
      })
    } catch (error) {
      logger.error('Failed to get execution:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get execution'
      })
    }
  }

  /**
   * Get test results
   */
  static async getTestResults(req: Request, res: Response): Promise<void> {
    try {
      const { planId } = req.query
      
      const tests = await DisasterRecoveryService.getTestResults(planId as string)
      
      res.json({
        success: true,
        data: tests
      })
    } catch (error) {
      logger.error('Failed to get test results:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get test results'
      })
    }
  }
}
