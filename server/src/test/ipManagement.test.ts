import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IPReputationService, ipReputationService } from '../services/ipReputationService'
import { IPAccessControlMiddleware } from '../middleware/ipAccessControl'
import { getRedisClient } from '../config/redis'

// Mock Redis client
vi.mock('../config/redis', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    zAdd: vi.fn(),
    zRangeByScore: vi.fn(),
    zCard: vi.fn(),
    zRem: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    multi: vi.fn(() => ({
      zRemRangeByScore: vi.fn().mockReturnThis(),
      zCard: vi.fn().mockReturnThis(),
      zAdd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 0], [null, 5]])
    }))
  }))
}))

// Mock audit service
vi.mock('../services/auditService', () => ({
  AuditService: {
    createAuditLog: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// Mock axios for external API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        status: 'success',
        country: 'United States',
        countryCode: 'US',
        regionName: 'California',
        region: 'CA',
        city: 'San Francisco',
        lat: 37.7749,
        lon: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Test ISP',
        as: 'AS12345',
        org: 'Test Organization'
      }
    })
  }
}))

describe('IP Reputation Service', () => {
  let mockRedis: any

  beforeEach(() => {
    mockRedis = getRedisClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('IP Whitelist Management', () => {
    it('should add IP to whitelist successfully', async () => {
      mockRedis.setEx.mockResolvedValue('OK')

      const entry = await ipReputationService.addToWhitelist({
        ip: '192.168.1.100',
        description: 'Test whitelist entry',
        addedBy: 'test-user',
        isActive: true
      })

      expect(entry).toMatchObject({
        ip: '192.168.1.100',
        description: 'Test whitelist entry',
        addedBy: 'test-user',
        isActive: true
      })
      expect(entry.id).toBeDefined()
      expect(entry.addedAt).toBeInstanceOf(Date)
      expect(mockRedis.setEx).toHaveBeenCalled()
    })

    it('should retrieve whitelist entry', async () => {
      const testEntry = {
        id: 'test-id',
        ip: '192.168.1.100',
        description: 'Test entry',
        addedBy: 'test-user',
        addedAt: new Date(),
        isActive: true
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(testEntry))

      const entry = await ipReputationService.getWhitelistEntry('192.168.1.100')

      expect(entry).toMatchObject(testEntry)
      expect(mockRedis.get).toHaveBeenCalledWith('ip:whitelist:192.168.1.100')
    })

    it('should return null for non-existent whitelist entry', async () => {
      mockRedis.get.mockResolvedValue(null)

      const entry = await ipReputationService.getWhitelistEntry('192.168.1.200')

      expect(entry).toBeNull()
    })

    it('should remove IP from whitelist', async () => {
      const testEntry = {
        id: 'test-id',
        ip: '192.168.1.100',
        description: 'Test entry',
        addedBy: 'test-user',
        addedAt: new Date(),
        isActive: true
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(testEntry))
      mockRedis.del.mockResolvedValue(1)

      const result = await ipReputationService.removeFromWhitelist('192.168.1.100', 'admin-user')

      expect(result).toBe(true)
      expect(mockRedis.del).toHaveBeenCalledWith('ip:whitelist:192.168.1.100')
    })
  })

  describe('IP Blacklist Management', () => {
    it('should add IP to blacklist successfully', async () => {
      mockRedis.setEx.mockResolvedValue('OK')

      const entry = await ipReputationService.addToBlacklist({
        ip: '10.0.0.1',
        reason: 'Malicious activity detected',
        severity: 'high',
        blockedBy: 'security-admin',
        isActive: true,
        autoBlocked: false
      })

      expect(entry).toMatchObject({
        ip: '10.0.0.1',
        reason: 'Malicious activity detected',
        severity: 'high',
        blockedBy: 'security-admin',
        isActive: true,
        autoBlocked: false
      })
      expect(entry.id).toBeDefined()
      expect(entry.blockedAt).toBeInstanceOf(Date)
      expect(mockRedis.setEx).toHaveBeenCalled()
    })

    it('should retrieve blacklist entry', async () => {
      const testEntry = {
        id: 'test-id',
        ip: '10.0.0.1',
        reason: 'Test blacklist',
        severity: 'medium' as const,
        blockedBy: 'test-user',
        blockedAt: new Date(),
        isActive: true,
        autoBlocked: false
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(testEntry))

      const entry = await ipReputationService.getBlacklistEntry('10.0.0.1')

      expect(entry).toMatchObject(testEntry)
      expect(mockRedis.get).toHaveBeenCalledWith('ip:blacklist:10.0.0.1')
    })

    it('should remove IP from blacklist', async () => {
      const testEntry = {
        id: 'test-id',
        ip: '10.0.0.1',
        reason: 'Test blacklist',
        severity: 'medium' as const,
        blockedBy: 'test-user',
        blockedAt: new Date(),
        isActive: true,
        autoBlocked: false
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(testEntry))
      mockRedis.del.mockResolvedValue(1)

      const result = await ipReputationService.removeFromBlacklist('10.0.0.1', 'admin-user')

      expect(result).toBe(true)
      expect(mockRedis.del).toHaveBeenCalledWith('ip:blacklist:10.0.0.1')
    })
  })

  describe('IP Reputation Assessment', () => {
    it('should get IP reputation with geolocation data', async () => {
      mockRedis.get.mockResolvedValue(null) // No cached data

      const reputation = await ipReputationService.getIPReputation('8.8.8.8')

      expect(reputation).toMatchObject({
        ip: '8.8.8.8',
        reputation: expect.any(String),
        score: expect.any(Number),
        country: 'United States',
        lastUpdated: expect.any(Date),
        source: 'threat_intelligence'
      })
      expect(reputation.score).toBeGreaterThanOrEqual(0)
      expect(reputation.score).toBeLessThanOrEqual(100)
    })

    it('should return cached reputation data', async () => {
      const cachedReputation = {
        ip: '8.8.8.8',
        reputation: 'trusted',
        score: 85,
        country: 'United States',
        lastUpdated: new Date(),
        source: 'threat_intelligence'
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedReputation))

      const reputation = await ipReputationService.getIPReputation('8.8.8.8')

      expect(reputation).toMatchObject(cachedReputation)
    })

    it('should handle reputation assessment errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))

      const reputation = await ipReputationService.getIPReputation('8.8.8.8')

      expect(reputation).toMatchObject({
        ip: '8.8.8.8',
        reputation: 'unknown',
        score: 50,
        source: 'manual'
      })
    })
  })

  describe('IP Access Control', () => {
    it('should allow whitelisted IP', async () => {
      const whitelistEntry = {
        id: 'test-id',
        ip: '192.168.1.100',
        description: 'Trusted IP',
        addedBy: 'admin',
        addedAt: new Date(),
        isActive: true
      }

      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'ip:whitelist:192.168.1.100') {
          return Promise.resolve(JSON.stringify(whitelistEntry))
        }
        return Promise.resolve(null)
      })

      const result = await ipReputationService.isIPAllowed('192.168.1.100')

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe('IP is whitelisted')
      expect(result.rule).toMatchObject(whitelistEntry)
    })

    it('should block blacklisted IP', async () => {
      const blacklistEntry = {
        id: 'test-id',
        ip: '10.0.0.1',
        reason: 'Malicious activity',
        severity: 'high' as const,
        blockedBy: 'security',
        blockedAt: new Date(),
        isActive: true,
        autoBlocked: false
      }

      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'ip:blacklist:10.0.0.1') {
          return Promise.resolve(JSON.stringify(blacklistEntry))
        }
        return Promise.resolve(null)
      })

      const result = await ipReputationService.isIPAllowed('10.0.0.1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('blacklisted')
      expect(result.rule).toMatchObject(blacklistEntry)
    })

    it('should allow unknown IP by default', async () => {
      mockRedis.get.mockResolvedValue(null)
      mockRedis.keys.mockResolvedValue([])

      const result = await ipReputationService.isIPAllowed('203.0.113.1')

      expect(result.allowed).toBe(true)
      expect(result.reason).toBe('No specific rules found, default allow')
    })
  })

  describe('CIDR Range Matching', () => {
    it('should correctly match IP in CIDR range', async () => {
      const accessRule = {
        id: 'rule-1',
        type: 'deny' as const,
        cidr: '192.168.1.0/24',
        description: 'Block local network',
        priority: 1,
        isActive: true,
        createdBy: 'admin',
        createdAt: new Date()
      }

      mockRedis.keys.mockResolvedValue(['ip:rules:rule-1'])
      mockRedis.get.mockResolvedValue(JSON.stringify(accessRule))

      const result = await ipReputationService.isIPAllowed('192.168.1.50')

      expect(result.allowed).toBe(false)
      expect(result.rule).toMatchObject(accessRule)
    })

    it('should not match IP outside CIDR range', async () => {
      const accessRule = {
        id: 'rule-1',
        type: 'deny' as const,
        cidr: '192.168.1.0/24',
        description: 'Block local network',
        priority: 1,
        isActive: true,
        createdBy: 'admin',
        createdAt: new Date()
      }

      mockRedis.keys.mockResolvedValue(['ip:rules:rule-1'])
      mockRedis.get.mockResolvedValue(JSON.stringify(accessRule))

      const result = await ipReputationService.isIPAllowed('192.168.2.50')

      expect(result.allowed).toBe(true)
    })
  })

  describe('Access Rules Management', () => {
    it('should add access rule successfully', async () => {
      mockRedis.set.mockResolvedValue('OK')

      const rule = await ipReputationService.addAccessRule({
        type: 'deny',
        cidr: '10.0.0.0/8',
        description: 'Block private network',
        priority: 10,
        isActive: true,
        createdBy: 'admin'
      })

      expect(rule).toMatchObject({
        type: 'deny',
        cidr: '10.0.0.0/8',
        description: 'Block private network',
        priority: 10,
        isActive: true,
        createdBy: 'admin'
      })
      expect(rule.id).toBeDefined()
      expect(rule.createdAt).toBeInstanceOf(Date)
      expect(mockRedis.set).toHaveBeenCalled()
    })

    it('should retrieve all access rules', async () => {
      const rules = [
        {
          id: 'rule-1',
          type: 'allow' as const,
          ip: '192.168.1.1',
          description: 'Allow admin IP',
          priority: 1,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date()
        },
        {
          id: 'rule-2',
          type: 'deny' as const,
          cidr: '10.0.0.0/8',
          description: 'Block private network',
          priority: 10,
          isActive: true,
          createdBy: 'admin',
          createdAt: new Date()
        }
      ]

      mockRedis.keys.mockResolvedValue(['ip:rules:rule-1', 'ip:rules:rule-2'])
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'ip:rules:rule-1') return Promise.resolve(JSON.stringify(rules[0]))
        if (key === 'ip:rules:rule-2') return Promise.resolve(JSON.stringify(rules[1]))
        return Promise.resolve(null)
      })

      const retrievedRules = await ipReputationService.getAccessRules()

      expect(retrievedRules).toHaveLength(2)
      expect(retrievedRules[0].priority).toBeLessThanOrEqual(retrievedRules[1].priority)
    })
  })
})

describe('IP Access Control Middleware', () => {
  let middleware: IPAccessControlMiddleware
  let mockReq: any
  let mockRes: any
  let mockNext: any

  beforeEach(() => {
    middleware = new IPAccessControlMiddleware({
      enableWhitelist: true,
      enableBlacklist: true,
      enableThreatIntelligence: true,
      minimumReputationScore: 30
    })

    mockReq = {
      headers: {
        'x-forwarded-for': '203.0.113.1',
        'user-agent': 'Test Browser'
      },
      path: '/api/test',
      method: 'GET'
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis()
    }

    mockNext = vi.fn()
  })

  it('should allow legitimate IP addresses', async () => {
    const middlewareFunc = middleware.createMiddleware()

    // Mock IP reputation service to return good reputation
    vi.spyOn(ipReputationService, 'isIPAllowed').mockResolvedValue({
      allowed: true,
      reason: 'No specific rules found, default allow'
    })

    vi.spyOn(ipReputationService, 'getIPReputation').mockResolvedValue({
      ip: '203.0.113.1',
      reputation: 'trusted',
      score: 85,
      country: 'United States',
      lastUpdated: new Date(),
      source: 'threat_intelligence'
    })

    await middlewareFunc(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
    expect(mockReq.ipInfo).toBeDefined()
    expect(mockReq.ipInfo.ip).toBe('203.0.113.1')
  })

  it('should block blacklisted IP addresses', async () => {
    const middlewareFunc = middleware.createMiddleware()

    // Mock IP reputation service to return blocked status
    vi.spyOn(ipReputationService, 'isIPAllowed').mockResolvedValue({
      allowed: false,
      reason: 'IP is blacklisted: Malicious activity detected'
    })

    await middlewareFunc(mockReq, mockRes, mockNext)

    expect(mockNext).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Access denied',
        reason: 'IP is blacklisted: Malicious activity detected'
      })
    )
  })

  it('should handle middleware errors gracefully', async () => {
    const middlewareFunc = middleware.createMiddleware()

    // Mock IP reputation service to throw error
    vi.spyOn(ipReputationService, 'isIPAllowed').mockRejectedValue(new Error('Service error'))

    await middlewareFunc(mockReq, mockRes, mockNext)

    // Should continue on error to avoid blocking legitimate requests
    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should skip localhost in development', async () => {
    process.env.NODE_ENV = 'development'
    mockReq.headers['x-forwarded-for'] = '127.0.0.1'

    const middlewareFunc = middleware.createMiddleware()

    await middlewareFunc(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  it('should add security headers for allowed requests', async () => {
    const middlewareFunc = middleware.createMiddleware()

    vi.spyOn(ipReputationService, 'isIPAllowed').mockResolvedValue({
      allowed: true,
      reason: 'No specific rules found, default allow'
    })

    vi.spyOn(ipReputationService, 'getIPReputation').mockResolvedValue({
      ip: '203.0.113.1',
      reputation: 'trusted',
      score: 85,
      country: 'United States',
      lastUpdated: new Date(),
      source: 'threat_intelligence'
    })

    await middlewareFunc(mockReq, mockRes, mockNext)

    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'X-IP-Reputation-Score': '85',
        'X-IP-Country': 'United States'
      })
    )
  })
})