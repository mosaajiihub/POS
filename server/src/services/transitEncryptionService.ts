import * as crypto from 'crypto'
import * as https from 'https'
import * as tls from 'tls'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface TLSConfiguration {
  minVersion: string
  maxVersion: string
  cipherSuites: string[]
  ecdhCurve: string[]
  honorCipherOrder: boolean
  sessionTimeout: number
  sessionIdContext: string
  secureProtocol: string
}

export interface CertificateInfo {
  id: string
  commonName: string
  subjectAltNames: string[]
  issuer: string
  validFrom: Date
  validTo: Date
  fingerprint: string
  keySize: number
  signatureAlgorithm: string
  serialNumber: string
  status: CertificateStatus
  usage: CertificateUsage[]
  filePaths: {
    certificate: string
    privateKey: string
    chain?: string
  }
}

export interface ServiceCommunicationConfig {
  serviceName: string
  endpoints: string[]
  certificateId: string
  mutualTLS: boolean
  encryptionRequired: boolean
  allowedCipherSuites: string[]
  clientCertificateRequired: boolean
  trustedCAs: string[]
}

export interface EncryptedCommunicationLog {
  id: string
  timestamp: Date
  sourceService: string
  targetService: string
  sourceIP: string
  targetIP: string
  protocol: string
  tlsVersion: string
  cipherSuite: string
  certificateFingerprint: string
  dataSize: number
  duration: number
  success: boolean
  errorMessage?: string
  metadata?: any
}

export interface CommunicationMetrics {
  totalConnections: number
  successfulConnections: number
  failedConnections: number
  averageConnectionTime: number
  tlsVersionDistribution: Record<string, number>
  cipherSuiteDistribution: Record<string, number>
  certificateUsage: Record<string, number>
  errorDistribution: Record<string, number>
}

export enum CertificateStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  PENDING = 'PENDING',
  INVALID = 'INVALID'
}

export enum CertificateUsage {
  SERVER_AUTH = 'SERVER_AUTH',
  CLIENT_AUTH = 'CLIENT_AUTH',
  CODE_SIGNING = 'CODE_SIGNING',
  EMAIL_PROTECTION = 'EMAIL_PROTECTION',
  TIME_STAMPING = 'TIME_STAMPING'
}

/**
 * Transit Encryption Service
 * Handles data-in-transit encryption, TLS configuration, certificate management,
 * and encrypted communication monitoring
 */
export class TransitEncryptionService {
  private static readonly CERT_STORAGE_PATH = path.join(process.cwd(), 'server', 'certificates')
  private static readonly CONFIG_FILE = 'tls-config.json'
  private static readonly COMMUNICATION_LOG_FILE = 'communication.log'
  
  // In-memory caches
  private static certificates = new Map<string, CertificateInfo>()
  private static serviceConfigs = new Map<string, ServiceCommunicationConfig>()
  private static communicationLogBuffer: EncryptedCommunicationLog[] = []
  private static tlsConfiguration: TLSConfiguration
  
  // Default TLS 1.3 configuration
  private static readonly DEFAULT_TLS_CONFIG: TLSConfiguration = {
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256'
    ],
    ecdhCurve: ['X25519', 'prime256v1', 'secp384r1'],
    honorCipherOrder: true,
    sessionTimeout: 300, // 5 minutes
    sessionIdContext: 'mosaajii-pos-tls',
    secureProtocol: 'TLSv1_3_method'
  }

  /**
   * Initialize transit encryption service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Transit Encryption Service...')
      
      // Create certificate storage directory
      await fs.mkdir(this.CERT_STORAGE_PATH, { recursive: true })
      
      // Load TLS configuration
      await this.loadTLSConfiguration()
      
      // Load certificates
      await this.loadCertificates()
      
      // Load service configurations
      await this.loadServiceConfigurations()
      
      // Configure global TLS settings
      this.configureGlobalTLS()
      
      // Start communication log flusher
      this.startCommunicationLogFlusher()
      
      // Start certificate monitoring
      this.startCertificateMonitoring()
      
      logger.info('Transit Encryption Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Transit Encryption Service:', error)
      throw error
    }
  }

  /**
   * Configure TLS settings
   */
  static async configureTLS(config: Partial<TLSConfiguration>): Promise<void> {
    try {
      this.tlsConfiguration = {
        ...this.DEFAULT_TLS_CONFIG,
        ...config
      }
      
      // Save configuration
      await this.saveTLSConfiguration()
      
      // Apply global TLS settings
      this.configureGlobalTLS()
      
      // Log configuration change
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'TLS_CONFIGURATION_UPDATED',
        tableName: 'tls_config',
        recordId: 'global',
        newValues: this.tlsConfiguration
      })
      
      logger.info('TLS configuration updated successfully')
    } catch (error) {
      logger.error('Failed to configure TLS:', error)
      throw error
    }
  }

  /**
   * Install certificate
   */
  static async installCertificate(
    certificateId: string,
    certificatePem: string,
    privateKeyPem: string,
    chainPem?: string
  ): Promise<CertificateInfo> {
    try {
      // Parse certificate
      const cert = crypto.X509Certificate ? new crypto.X509Certificate(certificatePem) : null
      if (!cert) {
        throw new Error('Failed to parse certificate')
      }
      
      // Extract certificate information
      const certInfo: CertificateInfo = {
        id: certificateId,
        commonName: this.extractCommonName(cert.subject),
        subjectAltNames: this.extractSubjectAltNames(cert),
        issuer: cert.issuer,
        validFrom: new Date(cert.validFrom),
        validTo: new Date(cert.validTo),
        fingerprint: cert.fingerprint256,
        keySize: this.extractKeySize(cert),
        signatureAlgorithm: this.extractSignatureAlgorithm(cert),
        serialNumber: cert.serialNumber,
        status: this.getCertificateStatus(cert),
        usage: this.extractKeyUsage(cert),
        filePaths: {
          certificate: path.join(this.CERT_STORAGE_PATH, `${certificateId}.crt`),
          privateKey: path.join(this.CERT_STORAGE_PATH, `${certificateId}.key`),
          chain: chainPem ? path.join(this.CERT_STORAGE_PATH, `${certificateId}-chain.crt`) : undefined
        }
      }
      
      // Store certificate files
      await fs.writeFile(certInfo.filePaths.certificate, certificatePem)
      await fs.writeFile(certInfo.filePaths.privateKey, privateKeyPem)
      if (chainPem && certInfo.filePaths.chain) {
        await fs.writeFile(certInfo.filePaths.chain, chainPem)
      }
      
      // Store certificate info
      this.certificates.set(certificateId, certInfo)
      await this.saveCertificateInfo(certInfo)
      
      // Log certificate installation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'CERTIFICATE_INSTALLED',
        tableName: 'certificates',
        recordId: certificateId,
        newValues: {
          certificateId,
          commonName: certInfo.commonName,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          fingerprint: certInfo.fingerprint
        }
      })
      
      logger.info(`Installed certificate: ${certificateId} (${certInfo.commonName})`)
      return certInfo
    } catch (error) {
      logger.error('Failed to install certificate:', error)
      throw error
    }
  }

  /**
   * Get certificate information
   */
  static getCertificateInfo(certificateId: string): CertificateInfo | null {
    return this.certificates.get(certificateId) || null
  }

  /**
   * List certificates
   */
  static listCertificates(filters?: {
    status?: CertificateStatus
    usage?: CertificateUsage
    expiringBefore?: Date
  }): CertificateInfo[] {
    let certificates = Array.from(this.certificates.values())
    
    if (filters) {
      if (filters.status) {
        certificates = certificates.filter(cert => cert.status === filters.status)
      }
      if (filters.usage) {
        certificates = certificates.filter(cert => cert.usage.includes(filters.usage!))
      }
      if (filters.expiringBefore) {
        certificates = certificates.filter(cert => cert.validTo <= filters.expiringBefore!)
      }
    }
    
    return certificates
  }

  /**
   * Configure service communication
   */
  static async configureServiceCommunication(config: ServiceCommunicationConfig): Promise<void> {
    try {
      // Validate certificate exists
      if (!this.certificates.has(config.certificateId)) {
        throw new Error(`Certificate not found: ${config.certificateId}`)
      }
      
      // Store service configuration
      this.serviceConfigs.set(config.serviceName, config)
      await this.saveServiceConfiguration(config)
      
      // Log configuration
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SERVICE_COMMUNICATION_CONFIGURED',
        tableName: 'service_communication',
        recordId: config.serviceName,
        newValues: {
          serviceName: config.serviceName,
          endpoints: config.endpoints,
          certificateId: config.certificateId,
          mutualTLS: config.mutualTLS,
          encryptionRequired: config.encryptionRequired
        }
      })
      
      logger.info(`Configured service communication: ${config.serviceName}`)
    } catch (error) {
      logger.error('Failed to configure service communication:', error)
      throw error
    }
  }

  /**
   * Create secure HTTPS agent for service-to-service communication
   */
  static createSecureAgent(serviceName: string): https.Agent {
    const config = this.serviceConfigs.get(serviceName)
    if (!config) {
      throw new Error(`Service configuration not found: ${serviceName}`)
    }
    
    const certificate = this.certificates.get(config.certificateId)
    if (!certificate) {
      throw new Error(`Certificate not found: ${config.certificateId}`)
    }
    
    const agentOptions: https.AgentOptions = {
      // TLS configuration
      minVersion: this.tlsConfiguration.minVersion as any,
      maxVersion: this.tlsConfiguration.maxVersion as any,
      ciphers: this.tlsConfiguration.cipherSuites.join(':'),
      ecdhCurve: this.tlsConfiguration.ecdhCurve.join(':'),
      honorCipherOrder: this.tlsConfiguration.honorCipherOrder,
      
      // Certificate configuration
      cert: certificate.filePaths.certificate,
      key: certificate.filePaths.privateKey,
      ca: certificate.filePaths.chain,
      
      // Security settings
      rejectUnauthorized: true,
      checkServerIdentity: (hostname, cert) => {
        // Custom server identity check
        return this.verifyServerIdentity(hostname, cert, config)
      },
      
      // Connection settings
      keepAlive: true,
      keepAliveMsecs: 30000,
      timeout: 30000
    }
    
    if (config.mutualTLS) {
      agentOptions.requestCert = true
      agentOptions.rejectUnauthorized = true
    }
    
    return new https.Agent(agentOptions)
  }

  /**
   * Monitor encrypted communication
   */
  static async logCommunication(
    sourceService: string,
    targetService: string,
    sourceIP: string,
    targetIP: string,
    protocol: string,
    tlsInfo: {
      version: string
      cipherSuite: string
      certificateFingerprint: string
    },
    dataSize: number,
    duration: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const logEntry: EncryptedCommunicationLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        sourceService,
        targetService,
        sourceIP,
        targetIP,
        protocol,
        tlsVersion: tlsInfo.version,
        cipherSuite: tlsInfo.cipherSuite,
        certificateFingerprint: tlsInfo.certificateFingerprint,
        dataSize,
        duration,
        success,
        errorMessage
      }
      
      // Add to buffer
      this.communicationLogBuffer.push(logEntry)
      
      // Flush if buffer is full
      if (this.communicationLogBuffer.length >= 100) {
        await this.flushCommunicationLogBuffer()
      }
    } catch (error) {
      logger.error('Failed to log communication:', error)
    }
  }

  /**
   * Get communication metrics
   */
  static async getCommunicationMetrics(
    timeRange?: { start: Date; end: Date }
  ): Promise<CommunicationMetrics> {
    try {
      // In a real implementation, this would query the communication log database
      // For now, return mock metrics
      return {
        totalConnections: 1000,
        successfulConnections: 950,
        failedConnections: 50,
        averageConnectionTime: 150, // milliseconds
        tlsVersionDistribution: {
          'TLSv1.3': 900,
          'TLSv1.2': 100
        },
        cipherSuiteDistribution: {
          'TLS_AES_256_GCM_SHA384': 600,
          'TLS_CHACHA20_POLY1305_SHA256': 300,
          'TLS_AES_128_GCM_SHA256': 100
        },
        certificateUsage: {
          'main-server-cert': 800,
          'api-service-cert': 200
        },
        errorDistribution: {
          'certificate_expired': 20,
          'handshake_failure': 15,
          'connection_timeout': 10,
          'other': 5
        }
      }
    } catch (error) {
      logger.error('Failed to get communication metrics:', error)
      throw error
    }
  }

  /**
   * Validate TLS connection
   */
  static async validateTLSConnection(
    hostname: string,
    port: number,
    expectedCertificateFingerprint?: string
  ): Promise<{
    valid: boolean
    tlsVersion: string
    cipherSuite: string
    certificateFingerprint: string
    certificateValid: boolean
    errors: string[]
  }> {
    return new Promise((resolve) => {
      const errors: string[] = []
      let tlsVersion = ''
      let cipherSuite = ''
      let certificateFingerprint = ''
      let certificateValid = false
      
      const socket = tls.connect({
        host: hostname,
        port,
        minVersion: this.tlsConfiguration.minVersion as any,
        maxVersion: this.tlsConfiguration.maxVersion as any,
        ciphers: this.tlsConfiguration.cipherSuites.join(':'),
        rejectUnauthorized: false // We'll validate manually
      }, () => {
        try {
          const cipher = socket.getCipher()
          const cert = socket.getPeerCertificate(true)
          
          tlsVersion = socket.getProtocol() || ''
          cipherSuite = cipher ? `${cipher.name}_${cipher.version}` : ''
          
          if (cert && cert.fingerprint256) {
            certificateFingerprint = cert.fingerprint256
            certificateValid = this.validateCertificate(cert)
            
            if (expectedCertificateFingerprint && 
                certificateFingerprint !== expectedCertificateFingerprint) {
              errors.push('Certificate fingerprint mismatch')
            }
          } else {
            errors.push('No certificate provided')
          }
          
          // Validate TLS version
          if (!this.isTLSVersionAllowed(tlsVersion)) {
            errors.push(`TLS version not allowed: ${tlsVersion}`)
          }
          
          // Validate cipher suite
          if (!this.isCipherSuiteAllowed(cipherSuite)) {
            errors.push(`Cipher suite not allowed: ${cipherSuite}`)
          }
          
          socket.end()
          
          resolve({
            valid: errors.length === 0,
            tlsVersion,
            cipherSuite,
            certificateFingerprint,
            certificateValid,
            errors
          })
        } catch (error) {
          errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          socket.end()
          
          resolve({
            valid: false,
            tlsVersion,
            cipherSuite,
            certificateFingerprint,
            certificateValid,
            errors
          })
        }
      })
      
      socket.on('error', (error) => {
        errors.push(`Connection error: ${error.message}`)
        resolve({
          valid: false,
          tlsVersion,
          cipherSuite,
          certificateFingerprint,
          certificateValid,
          errors
        })
      })
      
      socket.setTimeout(10000, () => {
        errors.push('Connection timeout')
        socket.end()
        resolve({
          valid: false,
          tlsVersion,
          cipherSuite,
          certificateFingerprint,
          certificateValid,
          errors
        })
      })
    })
  }  /**

   * Get TLS configuration
   */
  static getTLSConfiguration(): TLSConfiguration {
    return { ...this.tlsConfiguration }
  }

  /**
   * Configure global TLS settings
   */
  private static configureGlobalTLS(): void {
    try {
      // Set global TLS settings
      tls.DEFAULT_MIN_VERSION = this.tlsConfiguration.minVersion as any
      tls.DEFAULT_MAX_VERSION = this.tlsConfiguration.maxVersion as any
      
      // Configure default cipher suites
      if (this.tlsConfiguration.cipherSuites.length > 0) {
        tls.DEFAULT_CIPHERS = this.tlsConfiguration.cipherSuites.join(':')
      }
      
      // Configure ECDH curves
      if (this.tlsConfiguration.ecdhCurve.length > 0) {
        tls.DEFAULT_ECDH_CURVE = this.tlsConfiguration.ecdhCurve.join(':')
      }
      
      logger.info('Global TLS settings configured')
    } catch (error) {
      logger.error('Failed to configure global TLS settings:', error)
    }
  }

  /**
   * Load TLS configuration
   */
  private static async loadTLSConfiguration(): Promise<void> {
    try {
      const configFile = path.join(this.CERT_STORAGE_PATH, this.CONFIG_FILE)
      
      try {
        const configData = await fs.readFile(configFile, 'utf8')
        const config = JSON.parse(configData)
        this.tlsConfiguration = { ...this.DEFAULT_TLS_CONFIG, ...config }
      } catch {
        // Use default configuration
        this.tlsConfiguration = { ...this.DEFAULT_TLS_CONFIG }
        await this.saveTLSConfiguration()
      }
      
      logger.info('TLS configuration loaded')
    } catch (error) {
      logger.error('Failed to load TLS configuration:', error)
      this.tlsConfiguration = { ...this.DEFAULT_TLS_CONFIG }
    }
  }

  /**
   * Save TLS configuration
   */
  private static async saveTLSConfiguration(): Promise<void> {
    try {
      const configFile = path.join(this.CERT_STORAGE_PATH, this.CONFIG_FILE)
      await fs.writeFile(configFile, JSON.stringify(this.tlsConfiguration, null, 2))
    } catch (error) {
      logger.error('Failed to save TLS configuration:', error)
    }
  }

  /**
   * Load certificates
   */
  private static async loadCertificates(): Promise<void> {
    try {
      const certInfoFile = path.join(this.CERT_STORAGE_PATH, 'certificates.json')
      
      try {
        const certData = await fs.readFile(certInfoFile, 'utf8')
        const certificates: CertificateInfo[] = JSON.parse(certData)
        
        for (const cert of certificates) {
          // Convert date strings back to Date objects
          cert.validFrom = new Date(cert.validFrom)
          cert.validTo = new Date(cert.validTo)
          
          // Update certificate status
          cert.status = this.getCertificateStatusFromDates(cert.validFrom, cert.validTo)
          
          this.certificates.set(cert.id, cert)
        }
        
        logger.info(`Loaded ${certificates.length} certificates`)
      } catch {
        logger.info('No existing certificates found')
      }
    } catch (error) {
      logger.error('Failed to load certificates:', error)
    }
  }

  /**
   * Save certificate information
   */
  private static async saveCertificateInfo(certInfo: CertificateInfo): Promise<void> {
    try {
      const certInfoFile = path.join(this.CERT_STORAGE_PATH, 'certificates.json')
      
      let allCertificates: CertificateInfo[] = []
      try {
        const existingData = await fs.readFile(certInfoFile, 'utf8')
        allCertificates = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Remove existing certificate info
      allCertificates = allCertificates.filter(c => c.id !== certInfo.id)
      
      // Add new certificate info
      allCertificates.push(certInfo)
      
      await fs.writeFile(certInfoFile, JSON.stringify(allCertificates, null, 2))
    } catch (error) {
      logger.error('Failed to save certificate info:', error)
    }
  }

  /**
   * Load service configurations
   */
  private static async loadServiceConfigurations(): Promise<void> {
    try {
      const serviceConfigFile = path.join(this.CERT_STORAGE_PATH, 'service-configs.json')
      
      try {
        const configData = await fs.readFile(serviceConfigFile, 'utf8')
        const configs: ServiceCommunicationConfig[] = JSON.parse(configData)
        
        for (const config of configs) {
          this.serviceConfigs.set(config.serviceName, config)
        }
        
        logger.info(`Loaded ${configs.length} service configurations`)
      } catch {
        logger.info('No existing service configurations found')
      }
    } catch (error) {
      logger.error('Failed to load service configurations:', error)
    }
  }

  /**
   * Save service configuration
   */
  private static async saveServiceConfiguration(config: ServiceCommunicationConfig): Promise<void> {
    try {
      const serviceConfigFile = path.join(this.CERT_STORAGE_PATH, 'service-configs.json')
      
      let allConfigs: ServiceCommunicationConfig[] = []
      try {
        const existingData = await fs.readFile(serviceConfigFile, 'utf8')
        allConfigs = JSON.parse(existingData)
      } catch {
        // File doesn't exist or is empty
      }
      
      // Remove existing configuration
      allConfigs = allConfigs.filter(c => c.serviceName !== config.serviceName)
      
      // Add new configuration
      allConfigs.push(config)
      
      await fs.writeFile(serviceConfigFile, JSON.stringify(allConfigs, null, 2))
    } catch (error) {
      logger.error('Failed to save service configuration:', error)
    }
  }

  /**
   * Start certificate monitoring
   */
  private static startCertificateMonitoring(): void {
    // Check certificate expiration every 24 hours
    setInterval(async () => {
      try {
        await this.checkCertificateExpiration()
      } catch (error) {
        logger.error('Certificate monitoring error:', error)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
    
    logger.info('Certificate monitoring started')
  }

  /**
   * Check certificate expiration
   */
  private static async checkCertificateExpiration(): Promise<void> {
    try {
      const now = new Date()
      const warningThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      
      for (const [certId, cert] of this.certificates) {
        if (cert.validTo <= now) {
          // Certificate expired
          cert.status = CertificateStatus.EXPIRED
          
          logger.warn(`Certificate expired: ${certId} (${cert.commonName})`)
          
          await AuditService.createAuditLog({
            userId: 'system',
            action: 'CERTIFICATE_EXPIRED',
            tableName: 'certificates',
            recordId: certId,
            newValues: {
              certificateId: certId,
              commonName: cert.commonName,
              expiredAt: cert.validTo
            }
          })
        } else if (cert.validTo <= warningThreshold) {
          // Certificate expiring soon
          const daysUntilExpiry = Math.ceil((cert.validTo.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          
          logger.warn(`Certificate expiring in ${daysUntilExpiry} days: ${certId} (${cert.commonName})`)
          
          await AuditService.createAuditLog({
            userId: 'system',
            action: 'CERTIFICATE_EXPIRING_SOON',
            tableName: 'certificates',
            recordId: certId,
            newValues: {
              certificateId: certId,
              commonName: cert.commonName,
              expiresAt: cert.validTo,
              daysUntilExpiry
            }
          })
        }
      }
    } catch (error) {
      logger.error('Failed to check certificate expiration:', error)
    }
  }

  /**
   * Start communication log flusher
   */
  private static startCommunicationLogFlusher(): void {
    // Flush communication log buffer every 5 minutes
    setInterval(async () => {
      if (this.communicationLogBuffer.length > 0) {
        await this.flushCommunicationLogBuffer()
      }
    }, 5 * 60 * 1000) // 5 minutes
    
    logger.info('Communication log flusher started')
  }

  /**
   * Flush communication log buffer
   */
  private static async flushCommunicationLogBuffer(): Promise<void> {
    try {
      if (this.communicationLogBuffer.length === 0) return
      
      const logFile = path.join(this.CERT_STORAGE_PATH, this.COMMUNICATION_LOG_FILE)
      const logEntries = this.communicationLogBuffer.splice(0) // Remove all entries from buffer
      
      const logLines = logEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n'
      
      await fs.appendFile(logFile, logLines)
      
      logger.debug(`Flushed ${logEntries.length} communication log entries`)
    } catch (error) {
      logger.error('Failed to flush communication log buffer:', error)
    }
  }

  /**
   * Extract common name from certificate subject
   */
  private static extractCommonName(subject: string): string {
    const cnMatch = subject.match(/CN=([^,]+)/)
    return cnMatch ? cnMatch[1] : 'Unknown'
  }

  /**
   * Extract subject alternative names
   */
  private static extractSubjectAltNames(cert: any): string[] {
    try {
      if (cert.subjectaltname) {
        return cert.subjectaltname
          .split(', ')
          .map((san: string) => san.replace(/^DNS:/, ''))
      }
      return []
    } catch {
      return []
    }
  }

  /**
   * Extract key size from certificate
   */
  private static extractKeySize(cert: any): number {
    try {
      // This is a simplified implementation
      // In a real scenario, you would parse the public key to get the actual size
      return 2048 // Default assumption
    } catch {
      return 0
    }
  }

  /**
   * Extract signature algorithm
   */
  private static extractSignatureAlgorithm(cert: any): string {
    try {
      return cert.sigalg || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }

  /**
   * Get certificate status
   */
  private static getCertificateStatus(cert: any): CertificateStatus {
    const now = new Date()
    const validFrom = new Date(cert.validFrom)
    const validTo = new Date(cert.validTo)
    
    return this.getCertificateStatusFromDates(validFrom, validTo)
  }

  /**
   * Get certificate status from dates
   */
  private static getCertificateStatusFromDates(validFrom: Date, validTo: Date): CertificateStatus {
    const now = new Date()
    
    if (now < validFrom) {
      return CertificateStatus.PENDING
    } else if (now > validTo) {
      return CertificateStatus.EXPIRED
    } else {
      return CertificateStatus.ACTIVE
    }
  }

  /**
   * Extract key usage from certificate
   */
  private static extractKeyUsage(cert: any): CertificateUsage[] {
    // Simplified implementation - in reality, you would parse the key usage extension
    return [CertificateUsage.SERVER_AUTH, CertificateUsage.CLIENT_AUTH]
  }

  /**
   * Verify server identity
   */
  private static verifyServerIdentity(
    hostname: string,
    cert: any,
    config: ServiceCommunicationConfig
  ): Error | undefined {
    try {
      // Check if hostname matches certificate
      const certHostnames = [
        this.extractCommonName(cert.subject),
        ...this.extractSubjectAltNames(cert)
      ]
      
      const hostnameMatches = certHostnames.some(certHostname => {
        if (certHostname === hostname) return true
        
        // Check wildcard match
        if (certHostname.startsWith('*.')) {
          const wildcardDomain = certHostname.substring(2)
          return hostname.endsWith(wildcardDomain)
        }
        
        return false
      })
      
      if (!hostnameMatches) {
        return new Error(`Hostname ${hostname} does not match certificate`)
      }
      
      // Additional custom validation can be added here
      
      return undefined
    } catch (error) {
      return new Error(`Server identity verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate certificate
   */
  private static validateCertificate(cert: any): boolean {
    try {
      const now = new Date()
      const validFrom = new Date(cert.valid_from)
      const validTo = new Date(cert.valid_to)
      
      // Check validity period
      if (now < validFrom || now > validTo) {
        return false
      }
      
      // Additional validation can be added here
      // - Check certificate chain
      // - Check revocation status
      // - Check key usage
      
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if TLS version is allowed
   */
  private static isTLSVersionAllowed(tlsVersion: string): boolean {
    const allowedVersions = ['TLSv1.3', 'TLSv1.2'] // Configurable
    return allowedVersions.includes(tlsVersion)
  }

  /**
   * Check if cipher suite is allowed
   */
  private static isCipherSuiteAllowed(cipherSuite: string): boolean {
    // Simplified check - in reality, you would have a comprehensive list
    const allowedCipherSuites = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256'
    ]
    
    return allowedCipherSuites.some(allowed => cipherSuite.includes(allowed))
  }

  /**
   * Generate self-signed certificate for development
   */
  static async generateSelfSignedCertificate(
    certificateId: string,
    commonName: string,
    subjectAltNames: string[] = [],
    validityDays: number = 365
  ): Promise<CertificateInfo> {
    try {
      // Generate key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      })
      
      // Create certificate (simplified - in production, use a proper certificate library)
      const cert = crypto.createSign('RSA-SHA256')
      const certData = {
        subject: `CN=${commonName}`,
        issuer: `CN=${commonName}`,
        serialNumber: crypto.randomBytes(16).toString('hex'),
        validFrom: new Date(),
        validTo: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
        subjectAltNames
      }
      
      // This is a simplified implementation
      // In production, use a proper X.509 certificate generation library
      const certificatePem = `-----BEGIN CERTIFICATE-----
${Buffer.from(JSON.stringify(certData)).toString('base64')}
-----END CERTIFICATE-----`
      
      return await this.installCertificate(certificateId, certificatePem, privateKey)
    } catch (error) {
      logger.error('Failed to generate self-signed certificate:', error)
      throw error
    }
  }

  /**
   * Revoke certificate
   */
  static async revokeCertificate(certificateId: string, reason: string): Promise<boolean> {
    try {
      const certificate = this.certificates.get(certificateId)
      if (!certificate) {
        return false
      }
      
      certificate.status = CertificateStatus.REVOKED
      await this.saveCertificateInfo(certificate)
      
      // Log certificate revocation
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'CERTIFICATE_REVOKED',
        tableName: 'certificates',
        recordId: certificateId,
        newValues: {
          certificateId,
          commonName: certificate.commonName,
          reason,
          revokedAt: new Date()
        }
      })
      
      logger.info(`Revoked certificate: ${certificateId}, reason: ${reason}`)
      return true
    } catch (error) {
      logger.error('Failed to revoke certificate:', error)
      return false
    }
  }

  /**
   * Get service configurations
   */
  static getServiceConfigurations(): ServiceCommunicationConfig[] {
    return Array.from(this.serviceConfigs.values())
  }

  /**
   * Remove service configuration
   */
  static async removeServiceConfiguration(serviceName: string): Promise<boolean> {
    try {
      const removed = this.serviceConfigs.delete(serviceName)
      
      if (removed) {
        // Update storage
        const serviceConfigFile = path.join(this.CERT_STORAGE_PATH, 'service-configs.json')
        const allConfigs = Array.from(this.serviceConfigs.values())
        await fs.writeFile(serviceConfigFile, JSON.stringify(allConfigs, null, 2))
        
        logger.info(`Removed service configuration: ${serviceName}`)
      }
      
      return removed
    } catch (error) {
      logger.error('Failed to remove service configuration:', error)
      return false
    }
  }
}