import { Router } from 'express'
import { IPManagementController } from '../controllers/ipManagementController'
import { authenticateToken } from '../middleware/auth'
import { inputValidation } from '../middleware/inputValidation'

const router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// IP Information
router.get('/info/:ip', IPManagementController.getIPInfo)

// Whitelist Management
router.get('/whitelist', IPManagementController.getWhitelistEntries)
router.post('/whitelist', 
  inputValidation({
    body: {
      ip: { type: 'string', required: true, pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' },
      description: { type: 'string', required: true, minLength: 1, maxLength: 500 },
      expiresAt: { type: 'string', required: false },
      tags: { type: 'array', required: false, items: { type: 'string' } }
    }
  }),
  IPManagementController.addToWhitelist
)
router.delete('/whitelist/:ip', IPManagementController.removeFromWhitelist)

// Blacklist Management
router.get('/blacklist', IPManagementController.getBlacklistEntries)
router.post('/blacklist',
  inputValidation({
    body: {
      ip: { type: 'string', required: true, pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' },
      reason: { type: 'string', required: true, minLength: 1, maxLength: 500 },
      severity: { type: 'string', required: true, enum: ['low', 'medium', 'high', 'critical'] },
      expiresAt: { type: 'string', required: false },
      threatTypes: { type: 'array', required: false, items: { type: 'string' } }
    }
  }),
  IPManagementController.addToBlacklist
)
router.delete('/blacklist/:ip', IPManagementController.removeFromBlacklist)

// Access Rules Management
router.get('/rules', IPManagementController.getAccessRules)
router.post('/rules',
  inputValidation({
    body: {
      type: { type: 'string', required: true, enum: ['allow', 'deny'] },
      ip: { type: 'string', required: false, pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' },
      cidr: { type: 'string', required: false },
      country: { type: 'string', required: false, minLength: 2, maxLength: 3 },
      asn: { type: 'string', required: false },
      description: { type: 'string', required: true, minLength: 1, maxLength: 500 },
      priority: { type: 'number', required: true, minimum: 1, maximum: 1000 }
    }
  }),
  IPManagementController.addAccessRule
)

// Threat Intelligence
router.post('/threat-intelligence/import',
  inputValidation({
    body: {
      source: { type: 'string', required: true, minLength: 1, maxLength: 100 }
    }
  }),
  IPManagementController.importThreatIntelligence
)

// Statistics
router.get('/statistics', IPManagementController.getStatistics)

// Bulk Operations
router.post('/bulk',
  inputValidation({
    body: {
      operation: { type: 'string', required: true, enum: ['addToWhitelist', 'addToBlacklist', 'removeFromWhitelist', 'removeFromBlacklist'] },
      ips: { type: 'array', required: true, minItems: 1, maxItems: 100, items: { type: 'string', pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' } },
      description: { type: 'string', required: false, maxLength: 500 },
      reason: { type: 'string', required: false, maxLength: 500 },
      severity: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
      tags: { type: 'array', required: false, items: { type: 'string' } }
    }
  }),
  IPManagementController.bulkOperation
)

export default router