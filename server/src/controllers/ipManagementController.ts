import { Request, Response } from 'express'
import { ipReputationService, IPWhitelistEntry, IPBlacklistEntry, IPAccessRule } from '../services/ipReputationService'
import { logger } from '../utils/logger'
import { z } from 'zod'

// Validation schemas
const addWhitelistSchema = z.object({
  ip: z.string().ip('Invalid IP address'),
  description: z.string().min(1, 'Description is required'),
  expiresAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional()
})

const addBlacklistSchema = z.object({
  ip: z.string().ip('Invalid IP address'),
  reason: z.string().min(1, 'Reason is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  expiresAt: z.string().datetime().optional(),
  threatTypes: z.array(z.string()).optional()
})

const addAccessRuleSchema = z.object({
  type: z.enum(['allow', 'deny']),
  ip: z.string().ip().optional(),
  cidr: z.string().optional(),
  country: z.string().optional(),
  asn: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  priority: z.number().int().min(1).max(1000)
})

const ipQuerySchema = z.object({
  ip: z.string().ip('Invalid IP address')
})

/**
 * IP Management Controller
 * Handles IP whitelist, blacklist, and reputation management
 */
export class IPManagementController {
  /**
   * Get IP reputation and access status
   */
  static async getIPInfo(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = ipQuerySchema.parse(req.params)
      const userId = (req as any).user?.id || 'anonymous'

      // Get comprehensive IP information
      const [allowanceResult, reputation, whitelistEntry, blacklistEntry] = await Promise.all([
        ipReputationService.isIPAllowed(ip),
        ipReputationService.getIPReputation(ip),
        ipReputationService.getWhitelistEntry(ip),
        ipReputationService.getBlacklistEntry(ip)
      ])

      const ipInfo = {
        ip,
        allowed: allowanceResult.allowed,
        reason: allowanceResult.reason,
        reputation,
        whitelist: whitelistEntry,
        blacklist: blacklistEntry,
        accessRule: allowanceResult.rule && 'priority' in allowanceResult.rule ? allowanceResult.rule : null,
        timestamp: new Date().toISOString()
      }

      logger.info(`IP info requested for ${ip} by user ${userId}`)

      res.json({
        success: true,
        data: ipInfo
      })
    } catch (error) {
      logger.error('Error getting IP info:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get IP information'
      })
    }
  }

  /**
   * Add IP to whitelist
   */
  static async addToWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = addWhitelistSchema.parse(req.body)
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const whitelistEntry = await ipReputationService.addToWhitelist({
        ...validatedData,
        addedBy: userId,
        isActive: true,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
      })

      logger.info(`IP ${validatedData.ip} added to whitelist by ${userEmail} (${userId})`)

      res.status(201).json({
        success: true,
        message: 'IP added to whitelist successfully',
        data: whitelistEntry
      })
    } catch (error) {
      logger.error('Error adding IP to whitelist:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add IP to whitelist'
      })
    }
  }

  /**
   * Add IP to blacklist
   */
  static async addToBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = addBlacklistSchema.parse(req.body)
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const blacklistEntry = await ipReputationService.addToBlacklist({
        ...validatedData,
        blockedBy: userId,
        isActive: true,
        autoBlocked: false,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
      })

      logger.info(`IP ${validatedData.ip} added to blacklist by ${userEmail} (${userId})`)

      res.status(201).json({
        success: true,
        message: 'IP added to blacklist successfully',
        data: blacklistEntry
      })
    } catch (error) {
      logger.error('Error adding IP to blacklist:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add IP to blacklist'
      })
    }
  }

  /**
   * Remove IP from whitelist
   */
  static async removeFromWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = ipQuerySchema.parse(req.params)
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const success = await ipReputationService.removeFromWhitelist(ip, userId)

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'IP not found in whitelist'
        })
        return
      }

      logger.info(`IP ${ip} removed from whitelist by ${userEmail} (${userId})`)

      res.json({
        success: true,
        message: 'IP removed from whitelist successfully'
      })
    } catch (error) {
      logger.error('Error removing IP from whitelist:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove IP from whitelist'
      })
    }
  }

  /**
   * Remove IP from blacklist
   */
  static async removeFromBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = ipQuerySchema.parse(req.params)
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const success = await ipReputationService.removeFromBlacklist(ip, userId)

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'IP not found in blacklist'
        })
        return
      }

      logger.info(`IP ${ip} removed from blacklist by ${userEmail} (${userId})`)

      res.json({
        success: true,
        message: 'IP removed from blacklist successfully'
      })
    } catch (error) {
      logger.error('Error removing IP from blacklist:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove IP from blacklist'
      })
    }
  }

  /**
   * Get all whitelist entries
   */
  static async getWhitelistEntries(req: Request, res: Response): Promise<void> {
    try {
      const entries = await ipReputationService.getWhitelistEntries()

      res.json({
        success: true,
        data: entries,
        count: entries.length
      })
    } catch (error) {
      logger.error('Error getting whitelist entries:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get whitelist entries'
      })
    }
  }

  /**
   * Get all blacklist entries
   */
  static async getBlacklistEntries(req: Request, res: Response): Promise<void> {
    try {
      const entries = await ipReputationService.getBlacklistEntries()

      res.json({
        success: true,
        data: entries,
        count: entries.length
      })
    } catch (error) {
      logger.error('Error getting blacklist entries:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get blacklist entries'
      })
    }
  }

  /**
   * Add access rule
   */
  static async addAccessRule(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = addAccessRuleSchema.parse(req.body)
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      // Validate that at least one target is specified
      if (!validatedData.ip && !validatedData.cidr && !validatedData.country && !validatedData.asn) {
        res.status(400).json({
          success: false,
          message: 'At least one target (ip, cidr, country, or asn) must be specified'
        })
        return
      }

      const accessRule = await ipReputationService.addAccessRule({
        ...validatedData,
        createdBy: userId,
        isActive: true
      })

      logger.info(`Access rule added by ${userEmail} (${userId}): ${validatedData.type} ${validatedData.ip || validatedData.cidr || validatedData.country || validatedData.asn}`)

      res.status(201).json({
        success: true,
        message: 'Access rule added successfully',
        data: accessRule
      })
    } catch (error) {
      logger.error('Error adding access rule:', error)
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add access rule'
      })
    }
  }

  /**
   * Get all access rules
   */
  static async getAccessRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = await ipReputationService.getAccessRules()

      res.json({
        success: true,
        data: rules,
        count: rules.length
      })
    } catch (error) {
      logger.error('Error getting access rules:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get access rules'
      })
    }
  }

  /**
   * Import threat intelligence
   */
  static async importThreatIntelligence(req: Request, res: Response): Promise<void> {
    try {
      const { source } = req.body
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      if (!source || typeof source !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Source parameter is required'
        })
        return
      }

      const result = await ipReputationService.importThreatIntelligence(source, userId)

      logger.info(`Threat intelligence import initiated by ${userEmail} (${userId}) from source: ${source}`)

      res.json({
        success: result.success,
        message: result.success 
          ? `Threat intelligence imported successfully. ${result.imported} IPs imported, ${result.errors} errors.`
          : 'Failed to import threat intelligence',
        data: {
          imported: result.imported,
          errors: result.errors,
          source
        }
      })
    } catch (error) {
      logger.error('Error importing threat intelligence:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to import threat intelligence'
      })
    }
  }

  /**
   * Get IP management statistics
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [whitelistEntries, blacklistEntries, accessRules] = await Promise.all([
        ipReputationService.getWhitelistEntries(),
        ipReputationService.getBlacklistEntries(),
        ipReputationService.getAccessRules()
      ])

      const statistics = {
        whitelist: {
          total: whitelistEntries.length,
          active: whitelistEntries.filter(e => e.isActive).length,
          expired: whitelistEntries.filter(e => e.expiresAt && new Date(e.expiresAt) < new Date()).length
        },
        blacklist: {
          total: blacklistEntries.length,
          active: blacklistEntries.filter(e => e.isActive).length,
          autoBlocked: blacklistEntries.filter(e => e.autoBlocked).length,
          bySeverity: {
            critical: blacklistEntries.filter(e => e.severity === 'critical').length,
            high: blacklistEntries.filter(e => e.severity === 'high').length,
            medium: blacklistEntries.filter(e => e.severity === 'medium').length,
            low: blacklistEntries.filter(e => e.severity === 'low').length
          }
        },
        accessRules: {
          total: accessRules.length,
          active: accessRules.filter(r => r.isActive).length,
          allow: accessRules.filter(r => r.type === 'allow').length,
          deny: accessRules.filter(r => r.type === 'deny').length
        },
        lastUpdated: new Date().toISOString()
      }

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Error getting IP management statistics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics'
      })
    }
  }

  /**
   * Bulk operations
   */
  static async bulkOperation(req: Request, res: Response): Promise<void> {
    try {
      const { operation, ips, ...operationData } = req.body
      const userId = (req as any).user?.id
      const userEmail = (req as any).user?.email

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      if (!operation || !Array.isArray(ips) || ips.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Operation and IPs array are required'
        })
        return
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (const ip of ips) {
        try {
          switch (operation) {
            case 'addToWhitelist':
              await ipReputationService.addToWhitelist({
                ip,
                description: operationData.description || `Bulk whitelist by ${userEmail}`,
                addedBy: userId,
                isActive: true,
                tags: operationData.tags
              })
              break

            case 'addToBlacklist':
              await ipReputationService.addToBlacklist({
                ip,
                reason: operationData.reason || `Bulk blacklist by ${userEmail}`,
                severity: operationData.severity || 'medium',
                blockedBy: userId,
                isActive: true,
                autoBlocked: false
              })
              break

            case 'removeFromWhitelist':
              await ipReputationService.removeFromWhitelist(ip, userId)
              break

            case 'removeFromBlacklist':
              await ipReputationService.removeFromBlacklist(ip, userId)
              break

            default:
              throw new Error(`Unknown operation: ${operation}`)
          }
          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(`${ip}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      logger.info(`Bulk operation ${operation} completed by ${userEmail} (${userId}): ${results.success} success, ${results.failed} failed`)

      res.json({
        success: true,
        message: `Bulk operation completed: ${results.success} successful, ${results.failed} failed`,
        data: results
      })
    } catch (error) {
      logger.error('Error in bulk operation:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation'
      })
    }
  }
}