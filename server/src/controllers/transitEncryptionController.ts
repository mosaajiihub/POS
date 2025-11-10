import { Request, Response } from 'express'
import { TransitEncryptionService, CertificateStatus, CertificateUsage } from '../services/transitEncryptionService'
import { logger } from '../utils/logger'

/**
 * Transit Encryption Controller
 * Handles HTTP requests for data-in-transit encryption operations
 */
export class TransitEncryptionController {
  /**
   * Initialize transit encryption service
   */
  static async initialize(req: Request, res: Response): Promise<void> {
    try {
      await TransitEncryptionService.initialize()
      
      res.json({
        success: true,
        message: 'Transit encryption service initialized successfully'
      })
    } catch (error) {
      logger.error('Failed to initialize transit encryption service:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to initialize transit encryption service',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Configure TLS settings
   */
  static async configureTLS(req: Request, res: Response): Promise<void> {
    try {
      const {
        minVersion,
        maxVersion,
        cipherSuites,
        ecdhCurve,
        honorCipherOrder,
        sessionTimeout,
        sessionIdContext,
        secureProtocol
      } = req.body
      
      await TransitEncryptionService.configureTLS({
        minVersion,
        maxVersion,
        cipherSuites,
        ecdhCurve,
        honorCipherOrder,
        sessionTimeout,
        sessionIdContext,
        secureProtocol
      })
      
      res.json({
        success: true,
        message: 'TLS configuration updated successfully'
      })
    } catch (error) {
      logger.error('Failed to configure TLS:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to configure TLS',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get TLS configuration
   */
  static async getTLSConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const config = TransitEncryptionService.getTLSConfiguration()
      
      res.json({
        success: true,
        config
      })
    } catch (error) {
      logger.error('Failed to get TLS configuration:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get TLS configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Install certificate
   */
  static async installCertificate(req: Request, res: Response): Promise<void> {
    try {
      const { certificateId, certificatePem, privateKeyPem, chainPem } = req.body
      
      if (!certificateId || !certificatePem || !privateKeyPem) {
        res.status(400).json({
          success: false,
          message: 'Certificate ID, certificate PEM, and private key PEM are required'
        })
        return
      }
      
      const certInfo = await TransitEncryptionService.installCertificate(
        certificateId,
        certificatePem,
        privateKeyPem,
        chainPem
      )
      
      res.json({
        success: true,
        message: 'Certificate installed successfully',
        certificate: {
          id: certInfo.id,
          commonName: certInfo.commonName,
          subjectAltNames: certInfo.subjectAltNames,
          issuer: certInfo.issuer,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          fingerprint: certInfo.fingerprint,
          keySize: certInfo.keySize,
          signatureAlgorithm: certInfo.signatureAlgorithm,
          serialNumber: certInfo.serialNumber,
          status: certInfo.status,
          usage: certInfo.usage
        }
      })
    } catch (error) {
      logger.error('Failed to install certificate:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to install certificate',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get certificate information
   */
  static async getCertificateInfo(req: Request, res: Response): Promise<void> {
    try {
      const { certificateId } = req.params
      
      if (!certificateId) {
        res.status(400).json({
          success: false,
          message: 'Certificate ID is required'
        })
        return
      }
      
      const certInfo = TransitEncryptionService.getCertificateInfo(certificateId)
      
      if (!certInfo) {
        res.status(404).json({
          success: false,
          message: 'Certificate not found'
        })
        return
      }
      
      res.json({
        success: true,
        certificate: {
          id: certInfo.id,
          commonName: certInfo.commonName,
          subjectAltNames: certInfo.subjectAltNames,
          issuer: certInfo.issuer,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          fingerprint: certInfo.fingerprint,
          keySize: certInfo.keySize,
          signatureAlgorithm: certInfo.signatureAlgorithm,
          serialNumber: certInfo.serialNumber,
          status: certInfo.status,
          usage: certInfo.usage
        }
      })
    } catch (error) {
      logger.error('Failed to get certificate info:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get certificate info',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * List certificates
   */
  static async listCertificates(req: Request, res: Response): Promise<void> {
    try {
      const { status, usage, expiringBefore } = req.query
      
      const filters: any = {}
      if (status) filters.status = status as CertificateStatus
      if (usage) filters.usage = usage as CertificateUsage
      if (expiringBefore) filters.expiringBefore = new Date(expiringBefore as string)
      
      const certificates = TransitEncryptionService.listCertificates(
        Object.keys(filters).length > 0 ? filters : undefined
      )
      
      res.json({
        success: true,
        certificates: certificates.map(cert => ({
          id: cert.id,
          commonName: cert.commonName,
          subjectAltNames: cert.subjectAltNames,
          issuer: cert.issuer,
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          fingerprint: cert.fingerprint,
          keySize: cert.keySize,
          signatureAlgorithm: cert.signatureAlgorithm,
          serialNumber: cert.serialNumber,
          status: cert.status,
          usage: cert.usage
        })),
        total: certificates.length
      })
    } catch (error) {
      logger.error('Failed to list certificates:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to list certificates',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Generate self-signed certificate
   */
  static async generateSelfSignedCertificate(req: Request, res: Response): Promise<void> {
    try {
      const { certificateId, commonName, subjectAltNames, validityDays } = req.body
      
      if (!certificateId || !commonName) {
        res.status(400).json({
          success: false,
          message: 'Certificate ID and common name are required'
        })
        return
      }
      
      const certInfo = await TransitEncryptionService.generateSelfSignedCertificate(
        certificateId,
        commonName,
        subjectAltNames || [],
        validityDays || 365
      )
      
      res.json({
        success: true,
        message: 'Self-signed certificate generated successfully',
        certificate: {
          id: certInfo.id,
          commonName: certInfo.commonName,
          subjectAltNames: certInfo.subjectAltNames,
          issuer: certInfo.issuer,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          fingerprint: certInfo.fingerprint,
          keySize: certInfo.keySize,
          signatureAlgorithm: certInfo.signatureAlgorithm,
          serialNumber: certInfo.serialNumber,
          status: certInfo.status,
          usage: certInfo.usage
        }
      })
    } catch (error) {
      logger.error('Failed to generate self-signed certificate:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to generate self-signed certificate',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Revoke certificate
   */
  static async revokeCertificate(req: Request, res: Response): Promise<void> {
    try {
      const { certificateId } = req.params
      const { reason } = req.body
      
      if (!certificateId) {
        res.status(400).json({
          success: false,
          message: 'Certificate ID is required'
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
      
      const success = await TransitEncryptionService.revokeCertificate(certificateId, reason)
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Certificate not found or revocation failed'
        })
        return
      }
      
      res.json({
        success: true,
        message: 'Certificate revoked successfully'
      })
    } catch (error) {
      logger.error('Failed to revoke certificate:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to revoke certificate',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Configure service communication
   */
  static async configureServiceCommunication(req: Request, res: Response): Promise<void> {
    try {
      const {
        serviceName,
        endpoints,
        certificateId,
        mutualTLS,
        encryptionRequired,
        allowedCipherSuites,
        clientCertificateRequired,
        trustedCAs
      } = req.body
      
      if (!serviceName || !endpoints || !certificateId) {
        res.status(400).json({
          success: false,
          message: 'Service name, endpoints, and certificate ID are required'
        })
        return
      }
      
      await TransitEncryptionService.configureServiceCommunication({
        serviceName,
        endpoints,
        certificateId,
        mutualTLS: mutualTLS || false,
        encryptionRequired: encryptionRequired !== false,
        allowedCipherSuites: allowedCipherSuites || [],
        clientCertificateRequired: clientCertificateRequired || false,
        trustedCAs: trustedCAs || []
      })
      
      res.json({
        success: true,
        message: 'Service communication configured successfully'
      })
    } catch (error) {
      logger.error('Failed to configure service communication:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to configure service communication',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get service configurations
   */
  static async getServiceConfigurations(req: Request, res: Response): Promise<void> {
    try {
      const configurations = TransitEncryptionService.getServiceConfigurations()
      
      res.json({
        success: true,
        configurations
      })
    } catch (error) {
      logger.error('Failed to get service configurations:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get service configurations',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Remove service configuration
   */
  static async removeServiceConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params
      
      if (!serviceName) {
        res.status(400).json({
          success: false,
          message: 'Service name is required'
        })
        return
      }
      
      const success = await TransitEncryptionService.removeServiceConfiguration(serviceName)
      
      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Service configuration not found'
        })
        return
      }
      
      res.json({
        success: true,
        message: 'Service configuration removed successfully'
      })
    } catch (error) {
      logger.error('Failed to remove service configuration:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to remove service configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Validate TLS connection
   */
  static async validateTLSConnection(req: Request, res: Response): Promise<void> {
    try {
      const { hostname, port, expectedCertificateFingerprint } = req.body
      
      if (!hostname || !port) {
        res.status(400).json({
          success: false,
          message: 'Hostname and port are required'
        })
        return
      }
      
      const validation = await TransitEncryptionService.validateTLSConnection(
        hostname,
        port,
        expectedCertificateFingerprint
      )
      
      res.json({
        success: true,
        validation
      })
    } catch (error) {
      logger.error('Failed to validate TLS connection:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to validate TLS connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get communication metrics
   */
  static async getCommunicationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query
      
      let timeRange: { start: Date; end: Date } | undefined
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        }
      }
      
      const metrics = await TransitEncryptionService.getCommunicationMetrics(timeRange)
      
      res.json({
        success: true,
        metrics
      })
    } catch (error) {
      logger.error('Failed to get communication metrics:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get communication metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get certificate statuses
   */
  static async getCertificateStatuses(req: Request, res: Response): Promise<void> {
    try {
      const statuses = Object.values(CertificateStatus).map(status => ({
        value: status,
        label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      res.json({
        success: true,
        statuses
      })
    } catch (error) {
      logger.error('Failed to get certificate statuses:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get certificate statuses',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get certificate usages
   */
  static async getCertificateUsages(req: Request, res: Response): Promise<void> {
    try {
      const usages = Object.values(CertificateUsage).map(usage => ({
        value: usage,
        label: usage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }))
      
      res.json({
        success: true,
        usages
      })
    } catch (error) {
      logger.error('Failed to get certificate usages:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get certificate usages',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}