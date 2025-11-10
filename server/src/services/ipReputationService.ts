import { getRedisClient } from '../config/redis'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import axios from 'axios'

export interface IPReputationData {
  ip: string
  reputation: 'trusted' | 'suspicious' | 'malicious' | 'unknown'
  score: number // 0-100, higher is more trustworthy
  country?: string
  region?: string
  city?: string
  isp?: string
  asn?: string
  threatTypes?: string[]
  lastUpdated: Date
  source: 'manual' | 'threat_intelligence' | 'geolocation' | 'behavioral'
}

export interface IPWhitelistEntry {
  id: string
  ip: string
  cidr?: string
  description: string
  addedBy: string
  addedAt: Date
  expiresAt?: Date
  isActive: boolean
  tags?: string[]
}

export interface IPBlacklistEntry {
  id: string
  ip: string
  cidr?: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  blockedBy: string
  blockedAt: Date
  expiresAt?: Date
  isActive: boolean
  threatTypes?: string[]
  autoBlocked: boolean
}

export interface GeolocationData {
  ip: string
  country: string
  countryCode: string
  region: string
  regionCode: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  asn: string
  organization: string
}

export interface ThreatIntelligenceData {
  ip: string
  isMalicious: boolean
  threatTypes: string[]
  confidence: number
  lastSeen?: Date
  sources: string[]
}

export interface IPAccessRule {
  id: string
  type: 'allow' | 'deny'
  ip?: string
  cidr?: string
  country?: string
  asn?: string
  description: string
  priority: number
  isActive: boolean
  createdBy: string
  createdAt: Date
}

/**
 * IP Reputation and Management Service
 * Handles IP whitelist/blacklist, geolocation, and threat intelligence
 */
export class IPReputationService {
  private redis = getRedisClient()
  private readonly WHITELIST_PREFIX = 'ip:whitelist:'
  private readonly BLACKLIST_PREFIX = 'ip:blacklist:'
  private readonly REPUTATION_PREFIX = 'ip:reputation:'
  private readonly GEOLOCATION_PREFIX = 'ip:geo:'
  private readonly THREAT_INTEL_PREFIX = 'ip:threat:'
  private readonly ACCESS_RULES_PREFIX = 'ip:rules:'

  // Threat intelligence API configurations
  private readonly threatIntelAPIs = {
    abuseIPDB: {
      url: 'https://api.abuseipdb.com/api/v2/check',
      key: process.env.ABUSEIPDB_API_KEY,
      enabled: !!process.env.ABUSEIPDB_API_KEY
    },
    virusTotal: {
      url: 'https://www.virustotal.com/vtapi/v2/ip-address/report',
      key: process.env.VIRUSTOTAL_API_KEY,
      enabled: !!process.env.VIRUSTOTAL_API_KEY
    }
  }

  // Geolocation API configuration
  private readonly geoLocationAPI = {
    url: 'http://ip-api.com/json',
    enabled: true // Free service, no API key required
  }

  /**
   * Check if IP is allowed based on whitelist, blacklist, and access rules
   */
  async isIPAllowed(ip: string): Promise<{
    allowed: boolean
    reason?: string
    rule?: IPAccessRule | IPWhitelistEntry | IPBlacklistEntry
    reputation?: IPReputationData
  }> {
    try {
      // First check whitelist (highest priority)
      const whitelistEntry = await this.getWhitelistEntry(ip)
      if (whitelistEntry && whitelistEntry.isActive) {
        return {
          allowed: true,
          reason: 'IP is whitelisted',
          rule: whitelistEntry
        }
      }

      // Check blacklist
      const blacklistEntry = await this.getBlacklistEntry(ip)
      if (blacklistEntry && blacklistEntry.isActive) {
        return {
          allowed: false,
          reason: `IP is blacklisted: ${blacklistEntry.reason}`,
          rule: blacklistEntry
        }
      }

      // Check access rules
      const accessRule = await this.evaluateAccessRules(ip)
      if (accessRule) {
        return {
          allowed: accessRule.type === 'allow',
          reason: `Access rule: ${accessRule.description}`,
          rule: accessRule
        }
      }

      // Get IP reputation for additional context
      const reputation = await this.getIPReputation(ip)
      
      // Default allow with reputation context
      return {
        allowed: true,
        reason: 'No specific rules found, default allow',
        reputation
      }
    } catch (error) {
      logger.error('Error checking IP allowance:', error)
      // Default to allow on error to avoid blocking legitimate traffic
      return {
        allowed: true,
        reason: 'Error checking IP rules, default allow'
      }
    }
  }

  /**
   * Add IP to whitelist
   */
  async addToWhitelist(entry: Omit<IPWhitelistEntry, 'id' | 'addedAt'>): Promise<IPWhitelistEntry> {
    try {
      const id = `whitelist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const whitelistEntry: IPWhitelistEntry = {
        id,
        ...entry,
        addedAt: new Date()
      }

      const key = `${this.WHITELIST_PREFIX}${entry.ip}`
      await this.redis.setEx(
        key,
        entry.expiresAt ? Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000) : 86400 * 365, // 1 year default
        JSON.stringify(whitelistEntry)
      )

      // Log the addition
      await AuditService.createAuditLog({
        userId: entry.addedBy,
        action: 'IP_WHITELIST_ADDED',
        newValues: whitelistEntry,
        ipAddress: entry.ip
      })

      logger.info(`IP added to whitelist: ${entry.ip} by ${entry.addedBy}`)
      return whitelistEntry
    } catch (error) {
      logger.error('Error adding IP to whitelist:', error)
      throw new Error('Failed to add IP to whitelist')
    }
  }

  /**
   * Add IP to blacklist
   */
  async addToBlacklist(entry: Omit<IPBlacklistEntry, 'id' | 'blockedAt'>): Promise<IPBlacklistEntry> {
    try {
      const id = `blacklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const blacklistEntry: IPBlacklistEntry = {
        id,
        ...entry,
        blockedAt: new Date()
      }

      const key = `${this.BLACKLIST_PREFIX}${entry.ip}`
      await this.redis.setEx(
        key,
        entry.expiresAt ? Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000) : 86400 * 30, // 30 days default
        JSON.stringify(blacklistEntry)
      )

      // Log the addition
      await AuditService.createAuditLog({
        userId: entry.blockedBy,
        action: 'IP_BLACKLIST_ADDED',
        newValues: blacklistEntry,
        ipAddress: entry.ip
      })

      logger.warn(`IP added to blacklist: ${entry.ip} by ${entry.blockedBy} - ${entry.reason}`)
      return blacklistEntry
    } catch (error) {
      logger.error('Error adding IP to blacklist:', error)
      throw new Error('Failed to add IP to blacklist')
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeFromWhitelist(ip: string, removedBy: string): Promise<boolean> {
    try {
      const key = `${this.WHITELIST_PREFIX}${ip}`
      const entry = await this.getWhitelistEntry(ip)
      
      if (!entry) {
        return false
      }

      await this.redis.del(key)

      // Log the removal
      await AuditService.createAuditLog({
        userId: removedBy,
        action: 'IP_WHITELIST_REMOVED',
        oldValues: entry,
        ipAddress: ip
      })

      logger.info(`IP removed from whitelist: ${ip} by ${removedBy}`)
      return true
    } catch (error) {
      logger.error('Error removing IP from whitelist:', error)
      return false
    }
  }

  /**
   * Remove IP from blacklist
   */
  async removeFromBlacklist(ip: string, removedBy: string): Promise<boolean> {
    try {
      const key = `${this.BLACKLIST_PREFIX}${ip}`
      const entry = await this.getBlacklistEntry(ip)
      
      if (!entry) {
        return false
      }

      await this.redis.del(key)

      // Log the removal
      await AuditService.createAuditLog({
        userId: removedBy,
        action: 'IP_BLACKLIST_REMOVED',
        oldValues: entry,
        ipAddress: ip
      })

      logger.info(`IP removed from blacklist: ${ip} by ${removedBy}`)
      return true
    } catch (error) {
      logger.error('Error removing IP from blacklist:', error)
      return false
    }
  }

  /**
   * Get whitelist entry for IP
   */
  async getWhitelistEntry(ip: string): Promise<IPWhitelistEntry | null> {
    try {
      const key = `${this.WHITELIST_PREFIX}${ip}`
      const data = await this.redis.get(key)
      
      if (!data) {
        return null
      }

      const entry = JSON.parse(data) as IPWhitelistEntry
      
      // Check if entry has expired
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        await this.redis.del(key)
        return null
      }

      return entry
    } catch (error) {
      logger.error('Error getting whitelist entry:', error)
      return null
    }
  }

  /**
   * Get blacklist entry for IP
   */
  async getBlacklistEntry(ip: string): Promise<IPBlacklistEntry | null> {
    try {
      const key = `${this.BLACKLIST_PREFIX}${ip}`
      const data = await this.redis.get(key)
      
      if (!data) {
        return null
      }

      const entry = JSON.parse(data) as IPBlacklistEntry
      
      // Check if entry has expired
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        await this.redis.del(key)
        return null
      }

      return entry
    } catch (error) {
      logger.error('Error getting blacklist entry:', error)
      return null
    }
  }

  /**
   * Get IP reputation data
   */
  async getIPReputation(ip: string, forceRefresh: boolean = false): Promise<IPReputationData> {
    try {
      const key = `${this.REPUTATION_PREFIX}${ip}`
      
      if (!forceRefresh) {
        const cached = await this.redis.get(key)
        if (cached) {
          const reputation = JSON.parse(cached) as IPReputationData
          // Return cached data if less than 24 hours old
          if (new Date().getTime() - new Date(reputation.lastUpdated).getTime() < 24 * 60 * 60 * 1000) {
            return reputation
          }
        }
      }

      // Gather reputation data from multiple sources
      const [geoData, threatData] = await Promise.allSettled([
        this.getGeolocationData(ip),
        this.getThreatIntelligenceData(ip)
      ])

      const geo = geoData.status === 'fulfilled' ? geoData.value : null
      const threat = threatData.status === 'fulfilled' ? threat.value : null

      // Calculate reputation score
      let score = 50 // Neutral starting point
      let reputation: 'trusted' | 'suspicious' | 'malicious' | 'unknown' = 'unknown'
      const threatTypes: string[] = []

      // Adjust score based on threat intelligence
      if (threat) {
        if (threat.isMalicious) {
          score = Math.max(0, score - 40)
          reputation = 'malicious'
          threatTypes.push(...threat.threatTypes)
        } else {
          score = Math.min(100, score + 10)
        }
      }

      // Adjust score based on geolocation
      if (geo) {
        // Known high-risk countries (simplified example)
        const highRiskCountries = ['CN', 'RU', 'KP', 'IR']
        if (highRiskCountries.includes(geo.countryCode)) {
          score = Math.max(0, score - 15)
          if (reputation === 'unknown') reputation = 'suspicious'
        }
      }

      // Determine final reputation
      if (score >= 80) reputation = 'trusted'
      else if (score >= 60) reputation = 'unknown'
      else if (score >= 30) reputation = 'suspicious'
      else reputation = 'malicious'

      const reputationData: IPReputationData = {
        ip,
        reputation,
        score,
        country: geo?.country,
        region: geo?.region,
        city: geo?.city,
        isp: geo?.isp,
        asn: geo?.asn,
        threatTypes: threatTypes.length > 0 ? threatTypes : undefined,
        lastUpdated: new Date(),
        source: 'threat_intelligence'
      }

      // Cache the reputation data for 24 hours
      await this.redis.setEx(key, 86400, JSON.stringify(reputationData))

      return reputationData
    } catch (error) {
      logger.error('Error getting IP reputation:', error)
      return {
        ip,
        reputation: 'unknown',
        score: 50,
        lastUpdated: new Date(),
        source: 'manual'
      }
    }
  }

  /**
   * Get geolocation data for IP
   */
  async getGeolocationData(ip: string): Promise<GeolocationData | null> {
    try {
      const key = `${this.GEOLOCATION_PREFIX}${ip}`
      
      // Check cache first
      const cached = await this.redis.get(key)
      if (cached) {
        return JSON.parse(cached) as GeolocationData
      }

      if (!this.geoLocationAPI.enabled) {
        return null
      }

      const response = await axios.get(`${this.geoLocationAPI.url}/${ip}`, {
        timeout: 5000,
        params: {
          fields: 'status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,as,org'
        }
      })

      if (response.data.status === 'success') {
        const geoData: GeolocationData = {
          ip,
          country: response.data.country,
          countryCode: response.data.countryCode,
          region: response.data.regionName,
          regionCode: response.data.region,
          city: response.data.city,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone,
          isp: response.data.isp,
          asn: response.data.as,
          organization: response.data.org
        }

        // Cache for 7 days
        await this.redis.setEx(key, 604800, JSON.stringify(geoData))
        return geoData
      }

      return null
    } catch (error) {
      logger.error('Error getting geolocation data:', error)
      return null
    }
  }

  /**
   * Get threat intelligence data for IP
   */
  async getThreatIntelligenceData(ip: string): Promise<ThreatIntelligenceData | null> {
    try {
      const key = `${this.THREAT_INTEL_PREFIX}${ip}`
      
      // Check cache first
      const cached = await this.redis.get(key)
      if (cached) {
        return JSON.parse(cached) as ThreatIntelligenceData
      }

      const threatData: ThreatIntelligenceData = {
        ip,
        isMalicious: false,
        threatTypes: [],
        confidence: 0,
        sources: []
      }

      // Check AbuseIPDB
      if (this.threatIntelAPIs.abuseIPDB.enabled) {
        try {
          const response = await axios.get(this.threatIntelAPIs.abuseIPDB.url, {
            headers: {
              'Key': this.threatIntelAPIs.abuseIPDB.key,
              'Accept': 'application/json'
            },
            params: {
              ipAddress: ip,
              maxAgeInDays: 90,
              verbose: ''
            },
            timeout: 5000
          })

          if (response.data.abuseConfidencePercentage > 25) {
            threatData.isMalicious = true
            threatData.confidence = Math.max(threatData.confidence, response.data.abuseConfidencePercentage)
            threatData.sources.push('AbuseIPDB')
            
            if (response.data.usageType) {
              threatData.threatTypes.push(response.data.usageType)
            }
          }
        } catch (error) {
          logger.warn('AbuseIPDB API error:', error.message)
        }
      }

      // Cache for 6 hours
      await this.redis.setEx(key, 21600, JSON.stringify(threatData))
      return threatData
    } catch (error) {
      logger.error('Error getting threat intelligence data:', error)
      return null
    }
  }

  /**
   * Evaluate access rules for IP
   */
  async evaluateAccessRules(ip: string): Promise<IPAccessRule | null> {
    try {
      // Get all active access rules sorted by priority
      const rulesPattern = `${this.ACCESS_RULES_PREFIX}*`
      const keys = await this.redis.keys(rulesPattern)
      
      const rules: IPAccessRule[] = []
      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          const rule = JSON.parse(data) as IPAccessRule
          if (rule.isActive) {
            rules.push(rule)
          }
        }
      }

      // Sort by priority (lower number = higher priority)
      rules.sort((a, b) => a.priority - b.priority)

      // Evaluate rules in priority order
      for (const rule of rules) {
        if (this.matchesRule(ip, rule)) {
          return rule
        }
      }

      return null
    } catch (error) {
      logger.error('Error evaluating access rules:', error)
      return null
    }
  }

  /**
   * Check if IP matches access rule
   */
  private matchesRule(ip: string, rule: IPAccessRule): boolean {
    try {
      // Direct IP match
      if (rule.ip && rule.ip === ip) {
        return true
      }

      // CIDR match
      if (rule.cidr && this.isIPInCIDR(ip, rule.cidr)) {
        return true
      }

      // Country match (requires geolocation data)
      if (rule.country) {
        // This would require async geolocation lookup
        // For now, return false - implement async rule evaluation if needed
        return false
      }

      // ASN match (requires geolocation data)
      if (rule.asn) {
        // This would require async geolocation lookup
        // For now, return false - implement async rule evaluation if needed
        return false
      }

      return false
    } catch (error) {
      logger.error('Error matching rule:', error)
      return false
    }
  }

  /**
   * Check if IP is in CIDR range
   */
  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, prefixLength] = cidr.split('/')
      const prefix = parseInt(prefixLength, 10)
      
      // Convert IP addresses to integers for comparison
      const ipInt = this.ipToInt(ip)
      const networkInt = this.ipToInt(network)
      
      // Create subnet mask
      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0
      
      return (ipInt & mask) === (networkInt & mask)
    } catch (error) {
      logger.error('Error checking CIDR:', error)
      return false
    }
  }

  /**
   * Convert IP address to integer
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  }

  /**
   * Add access rule
   */
  async addAccessRule(rule: Omit<IPAccessRule, 'id' | 'createdAt'>): Promise<IPAccessRule> {
    try {
      const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const accessRule: IPAccessRule = {
        id,
        ...rule,
        createdAt: new Date()
      }

      const key = `${this.ACCESS_RULES_PREFIX}${id}`
      await this.redis.set(key, JSON.stringify(accessRule))

      // Log the addition
      await AuditService.createAuditLog({
        userId: rule.createdBy,
        action: 'IP_ACCESS_RULE_ADDED',
        newValues: accessRule
      })

      logger.info(`IP access rule added: ${rule.type} ${rule.ip || rule.cidr || rule.country} by ${rule.createdBy}`)
      return accessRule
    } catch (error) {
      logger.error('Error adding access rule:', error)
      throw new Error('Failed to add access rule')
    }
  }

  /**
   * Get all whitelist entries
   */
  async getWhitelistEntries(): Promise<IPWhitelistEntry[]> {
    try {
      const pattern = `${this.WHITELIST_PREFIX}*`
      const keys = await this.redis.keys(pattern)
      
      const entries: IPWhitelistEntry[] = []
      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          const entry = JSON.parse(data) as IPWhitelistEntry
          // Filter out expired entries
          if (!entry.expiresAt || new Date(entry.expiresAt) > new Date()) {
            entries.push(entry)
          }
        }
      }

      return entries.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    } catch (error) {
      logger.error('Error getting whitelist entries:', error)
      return []
    }
  }

  /**
   * Get all blacklist entries
   */
  async getBlacklistEntries(): Promise<IPBlacklistEntry[]> {
    try {
      const pattern = `${this.BLACKLIST_PREFIX}*`
      const keys = await this.redis.keys(pattern)
      
      const entries: IPBlacklistEntry[] = []
      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          const entry = JSON.parse(data) as IPBlacklistEntry
          // Filter out expired entries
          if (!entry.expiresAt || new Date(entry.expiresAt) > new Date()) {
            entries.push(entry)
          }
        }
      }

      return entries.sort((a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime())
    } catch (error) {
      logger.error('Error getting blacklist entries:', error)
      return []
    }
  }

  /**
   * Get all access rules
   */
  async getAccessRules(): Promise<IPAccessRule[]> {
    try {
      const pattern = `${this.ACCESS_RULES_PREFIX}*`
      const keys = await this.redis.keys(pattern)
      
      const rules: IPAccessRule[] = []
      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          rules.push(JSON.parse(data) as IPAccessRule)
        }
      }

      return rules.sort((a, b) => a.priority - b.priority)
    } catch (error) {
      logger.error('Error getting access rules:', error)
      return []
    }
  }

  /**
   * Bulk import IPs to blacklist from threat intelligence
   */
  async importThreatIntelligence(source: string, importedBy: string): Promise<{
    success: boolean
    imported: number
    errors: number
  }> {
    try {
      let imported = 0
      let errors = 0

      // This is a placeholder for threat intelligence feed integration
      // In a real implementation, you would fetch from various threat feeds
      const threatIPs = [
        // Example threat IPs - replace with actual feed data
      ]

      for (const threatIP of threatIPs) {
        try {
          await this.addToBlacklist({
            ip: threatIP,
            reason: `Threat intelligence import from ${source}`,
            severity: 'high',
            blockedBy: importedBy,
            isActive: true,
            autoBlocked: true,
            threatTypes: ['malware', 'botnet']
          })
          imported++
        } catch (error) {
          errors++
          logger.error(`Error importing threat IP ${threatIP}:`, error)
        }
      }

      // Log the import
      await AuditService.createAuditLog({
        userId: importedBy,
        action: 'THREAT_INTELLIGENCE_IMPORT',
        newValues: {
          source,
          imported,
          errors,
          timestamp: new Date().toISOString()
        }
      })

      return { success: true, imported, errors }
    } catch (error) {
      logger.error('Error importing threat intelligence:', error)
      return { success: false, imported: 0, errors: 1 }
    }
  }
}

// Export singleton instance
export const ipReputationService = new IPReputationService()