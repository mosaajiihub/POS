import { Router } from 'express'
import { DataEncryptionController } from '../controllers/dataEncryptionController'
import { KeyManagementController } from '../controllers/keyManagementController'
import { TransitEncryptionController } from '../controllers/transitEncryptionController'
import { EncryptionComplianceController } from '../controllers/encryptionComplianceController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Encryption service management
router.post('/initialize', DataEncryptionController.initialize)

// Key management service
router.post('/key-management/initialize', KeyManagementController.initialize)

// Key lifecycle management
router.post('/key-management/keys', KeyManagementController.generateKey)
router.get('/key-management/keys', KeyManagementController.listKeys)
router.get('/key-management/keys/:keyId', KeyManagementController.getKeyMetadata)
router.put('/key-management/keys/:keyId', KeyManagementController.updateKeyMetadata)
router.delete('/key-management/keys/:keyId/revoke', KeyManagementController.revokeKey)

// Key escrow and recovery
router.post('/key-management/keys/:keyId/escrow', KeyManagementController.createKeyEscrow)
router.post('/key-management/keys/:keyId/recovery', KeyManagementController.requestKeyRecovery)

// Key usage and statistics
router.get('/key-management/keys/:keyId/statistics', KeyManagementController.getKeyUsageStatistics)

// Key management metadata
router.get('/key-management/types', KeyManagementController.getKeyTypes)
router.get('/key-management/purposes', KeyManagementController.getKeyPurposes)
router.get('/key-management/operations', KeyManagementController.getKeyOperations)

// Transit encryption service
router.post('/transit/initialize', TransitEncryptionController.initialize)

// TLS configuration
router.post('/transit/tls/configure', TransitEncryptionController.configureTLS)
router.get('/transit/tls/configuration', TransitEncryptionController.getTLSConfiguration)

// Certificate management
router.post('/transit/certificates', TransitEncryptionController.installCertificate)
router.get('/transit/certificates', TransitEncryptionController.listCertificates)
router.get('/transit/certificates/:certificateId', TransitEncryptionController.getCertificateInfo)
router.post('/transit/certificates/generate', TransitEncryptionController.generateSelfSignedCertificate)
router.delete('/transit/certificates/:certificateId/revoke', TransitEncryptionController.revokeCertificate)

// Service communication configuration
router.post('/transit/services', TransitEncryptionController.configureServiceCommunication)
router.get('/transit/services', TransitEncryptionController.getServiceConfigurations)
router.delete('/transit/services/:serviceName', TransitEncryptionController.removeServiceConfiguration)

// Communication monitoring
router.post('/transit/validate', TransitEncryptionController.validateTLSConnection)
router.get('/transit/metrics', TransitEncryptionController.getCommunicationMetrics)

// Transit encryption metadata
router.get('/transit/certificate-statuses', TransitEncryptionController.getCertificateStatuses)
router.get('/transit/certificate-usages', TransitEncryptionController.getCertificateUsages)

// Encryption compliance service
router.post('/compliance/initialize', EncryptionComplianceController.initialize)

// Compliance standards management
router.get('/compliance/standards', EncryptionComplianceController.getComplianceStandards)
router.post('/compliance/standards', EncryptionComplianceController.createComplianceStandard)

// Compliance assessments
router.post('/compliance/assessments', EncryptionComplianceController.conductComplianceAssessment)
router.get('/compliance/assessments', EncryptionComplianceController.listComplianceAssessments)
router.get('/compliance/assessments/:assessmentId', EncryptionComplianceController.getComplianceAssessment)

// Compliance reporting
router.post('/compliance/reports', EncryptionComplianceController.generateComplianceReport)

// Audit logging
router.post('/compliance/audit/log', EncryptionComplianceController.logAuditEvent)

// Key usage tracking
router.post('/compliance/key-usage/track', EncryptionComplianceController.trackKeyUsage)
router.get('/compliance/key-usage/metrics', EncryptionComplianceController.getKeyUsageMetrics)

// Performance monitoring
router.post('/compliance/performance/record', EncryptionComplianceController.recordPerformanceMetrics)
router.get('/compliance/performance/summary', EncryptionComplianceController.getPerformanceMetricsSummary)

// Compliance metadata
router.get('/compliance/metadata', EncryptionComplianceController.getComplianceMetadata)

// Key management
router.post('/keys/generate', DataEncryptionController.generateKey)
router.get('/keys', DataEncryptionController.listKeys)

// Data encryption
router.post('/encrypt', DataEncryptionController.encryptData)

// File encryption
router.post('/files/encrypt', DataEncryptionController.encryptFile)
router.post('/files/decrypt', DataEncryptionController.decryptFile)

// Backup encryption
router.post('/backups/encrypt', DataEncryptionController.createEncryptedBackup)
router.post('/backups/restore', DataEncryptionController.restoreFromEncryptedBackup)

// PII field management
router.get('/pii-fields', DataEncryptionController.getPIIFields)
router.post('/pii-fields', DataEncryptionController.addPIIField)
router.delete('/pii-fields', DataEncryptionController.removePIIField)

// Key rotation management
router.post('/rotation/policies', DataEncryptionController.createRotationPolicy)
router.get('/rotation/policies', DataEncryptionController.listRotationPolicies)
router.post('/rotation/rotate', DataEncryptionController.rotateKey)
router.get('/rotation/schedule', DataEncryptionController.getRotationSchedule)
router.get('/rotation/status/:keyId', DataEncryptionController.getKeyRotationStatus)
router.post('/rotation/schedule', DataEncryptionController.scheduleKeyRotation)
router.delete('/rotation/schedule', DataEncryptionController.cancelScheduledRotation)

export default router