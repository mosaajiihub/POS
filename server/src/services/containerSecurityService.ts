import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface ContainerScanResult {
  scanId: string
  timestamp: Date
  imageId: string
  imageName: string
  imageTag: string
  totalVulnerabilities: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  vulnerabilities: ContainerVulnerability[]
  configurationIssues: ConfigurationIssue[]
  complianceScore: number
  riskScore: number
  recommendations: string[]
}

export interface ContainerVulnerability {
  id: string
  cveId?: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  packageName: string
  installedVersion: string
  fixedVersion?: string
  layer: string
  vector: string
  exploitability: number
  impact: number
}

export interface ConfigurationIssue {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  title: string
  description: string
  recommendation: string
  dockerfile?: string
  line?: number
}

export interface InfraScanResult {
  scanId: string
  timestamp: Date
  scanType: 'TERRAFORM' | 'KUBERNETES' | 'DOCKER_COMPOSE' | 'CLOUDFORMATION'
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  issues: InfrastructureIssue[]
  complianceChecks: ComplianceCheck[]
  securityScore: number
  recommendations: string[]
}

export interface InfrastructureIssue {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  title: string
  description: string
  resource: string
  file: string
  line?: number
  rule: string
  recommendation: string
  cis?: string
  nist?: string
}

export interface ComplianceCheck {
  id: string
  framework: 'CIS' | 'NIST' | 'SOC2' | 'PCI_DSS' | 'GDPR'
  control: string
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_APPLICABLE'
  description: string
  evidence?: string
  recommendation?: string
}

export interface KubernetesSecurityPolicy {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace?: string
  }
  spec: {
    podSecurityStandards?: PodSecurityStandards
    networkPolicies?: NetworkPolicy[]
    rbacPolicies?: RBACPolicy[]
    securityContexts?: SecurityContext[]
  }
}

export interface PodSecurityStandards {
  enforce: 'privileged' | 'baseline' | 'restricted'
  audit: 'privileged' | 'baseline' | 'restricted'
  warn: 'privileged' | 'baseline' | 'restricted'
}

export interface NetworkPolicy {
  name: string
  podSelector: any
  policyTypes: string[]
  ingress?: any[]
  egress?: any[]
}

export interface RBACPolicy {
  name: string
  subjects: any[]
  roleRef: any
  rules: any[]
}

export interface SecurityContext {
  runAsNonRoot: boolean
  runAsUser?: number
  runAsGroup?: number
  fsGroup?: number
  capabilities?: {
    add?: string[]
    drop?: string[]
  }
  seccompProfile?: {
    type: string
    localhostProfile?: string
  }
  seLinuxOptions?: any
}

export interface CloudResourceAssessment {
  resourceId: string
  resourceType: string
  region: string
  securityGroups?: SecurityGroupAssessment[]
  iamPolicies?: IAMPolicyAssessment[]
  encryption?: EncryptionAssessment
  logging?: LoggingAssessment
  networking?: NetworkingAssessment
  complianceScore: number
  recommendations: string[]
}

export interface SecurityGroupAssessment {
  groupId: string
  groupName: string
  issues: SecurityGroupIssue[]
  riskScore: number
}

export interface SecurityGroupIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  description: string
  port?: number
  protocol?: string
  source?: string
  recommendation: string
}

export interface IAMPolicyAssessment {
  policyName: string
  policyArn: string
  issues: IAMIssue[]
  riskScore: number
}

export interface IAMIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  description: string
  action?: string
  resource?: string
  recommendation: string
}

export interface EncryptionAssessment {
  atRest: boolean
  inTransit: boolean
  keyManagement: 'AWS_MANAGED' | 'CUSTOMER_MANAGED' | 'NONE'
  issues: string[]
  recommendations: string[]
}

export interface LoggingAssessment {
  enabled: boolean
  logTypes: string[]
  retention: number
  issues: string[]
  recommendations: string[]
}

export interface NetworkingAssessment {
  publicAccess: boolean
  vpcConfiguration: boolean
  subnetConfiguration: boolean
  issues: string[]
  recommendations: string[]
}

/**
 * Container and Infrastructure Security Service
 * Handles container image scanning, infrastructure configuration validation, and cloud security assessment
 */
export class ContainerSecurityService {
  private static readonly CONTAINER_SCAN_TIMEOUT = 300000 // 5 minutes
  private static readonly INFRA_SCAN_TIMEOUT = 180000 // 3 minutes

  /**
   * Scan container image for vulnerabilities
   */
  static async scanContainerImage(imageId: string): Promise<ContainerScanResult> {
    try {
      const scanId = `container_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      logger.info(`Starting container image scan: ${scanId} for image: ${imageId}`)

      // Parse image name and tag
      const [imageName, imageTag = 'latest'] = imageId.split(':')

      // Run container vulnerability scan
      const vulnerabilities = await this.runContainerVulnerabilityScan(imageId)
      
      // Run configuration analysis
      const configIssues = await this.analyzeContainerConfiguration(imageId)

      // Calculate metrics
      const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length
      const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length
      const mediumCount = vulnerabilities.filter(v => v.severity === 'MEDIUM').length
      const lowCount = vulnerabilities.filter(v => v.severity === 'LOW').length

      const riskScore = this.calculateContainerRiskScore(vulnerabilities, configIssues)
      const complianceScore = this.calculateComplianceScore(configIssues)
      const recommendations = this.generateContainerRecommendations(vulnerabilities, configIssues)

      const result: ContainerScanResult = {
        scanId,
        timestamp: new Date(),
        imageId,
        imageName,
        imageTag,
        totalVulnerabilities: vulnerabilities.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        vulnerabilities,
        configurationIssues: configIssues,
        complianceScore,
        riskScore,
        recommendations
      }

      // Store scan results
      await this.storeContainerScanResults(result)

      // Log scan completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'CONTAINER_SCAN_COMPLETED',
        tableName: 'container_scans',
        recordId: scanId,
        newValues: {
          imageId,
          totalVulnerabilities: vulnerabilities.length,
          criticalCount,
          highCount,
          riskScore,
          complianceScore
        }
      })

      return result
    } catch (error) {
      logger.error(`Container image scan failed for ${imageId}:`, error)
      throw new Error(`Container scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate infrastructure configuration security
   */
  static async validateInfrastructureConfiguration(configPath: string): Promise<InfraScanResult> {
    try {
      const scanId = `infra_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      logger.info(`Starting infrastructure security scan: ${scanId} for path: ${configPath}`)

      // Determine scan type based on files
      const scanType = this.determineScanType(configPath)
      
      // Run infrastructure security scan
      const issues = await this.runInfrastructureSecurityScan(configPath, scanType)
      
      // Run compliance checks
      const complianceChecks = await this.runComplianceChecks(configPath, scanType)

      // Calculate metrics
      const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length
      const highIssues = issues.filter(i => i.severity === 'HIGH').length
      const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length
      const lowIssues = issues.filter(i => i.severity === 'LOW').length

      const securityScore = this.calculateInfraSecurityScore(issues, complianceChecks)
      const recommendations = this.generateInfraRecommendations(issues, complianceChecks)

      const result: InfraScanResult = {
        scanId,
        timestamp: new Date(),
        scanType,
        totalIssues: issues.length,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        issues,
        complianceChecks,
        securityScore,
        recommendations
      }

      // Store scan results
      await this.storeInfraScanResults(result)

      // Log scan completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'INFRASTRUCTURE_SCAN_COMPLETED',
        tableName: 'infrastructure_scans',
        recordId: scanId,
        newValues: {
          scanType,
          configPath,
          totalIssues: issues.length,
          criticalIssues,
          highIssues,
          securityScore
        }
      })

      return result
    } catch (error) {
      logger.error(`Infrastructure configuration scan failed for ${configPath}:`, error)
      throw new Error(`Infrastructure scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enforce Kubernetes security policies
   */
  static async enforceKubernetesSecurityPolicies(policies: KubernetesSecurityPolicy[]): Promise<{
    success: boolean
    message: string
    appliedPolicies: number
    errors: string[]
  }> {
    try {
      logger.info(`Enforcing ${policies.length} Kubernetes security policies`)

      const appliedPolicies: string[] = []
      const errors: string[] = []

      for (const policy of policies) {
        try {
          // In a real implementation, apply policies using kubectl or Kubernetes API
          await this.applyKubernetesPolicy(policy)
          appliedPolicies.push(policy.metadata.name)
        } catch (error) {
          const errorMsg = `Failed to apply policy ${policy.metadata.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error(errorMsg)
        }
      }

      // Log policy enforcement
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'KUBERNETES_POLICIES_ENFORCED',
        tableName: 'kubernetes_policies',
        newValues: {
          totalPolicies: policies.length,
          appliedPolicies: appliedPolicies.length,
          errors: errors.length,
          policyNames: appliedPolicies
        }
      })

      return {
        success: errors.length === 0,
        message: `Applied ${appliedPolicies.length} of ${policies.length} security policies`,
        appliedPolicies: appliedPolicies.length,
        errors
      }
    } catch (error) {
      logger.error('Kubernetes security policy enforcement failed:', error)
      return {
        success: false,
        message: 'Failed to enforce Kubernetes security policies',
        appliedPolicies: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Assess cloud resource security
   */
  static async assessCloudResourceSecurity(resourceId: string, resourceType: string): Promise<CloudResourceAssessment> {
    try {
      logger.info(`Assessing cloud resource security: ${resourceType}/${resourceId}`)

      // In a real implementation, integrate with cloud provider APIs (AWS, Azure, GCP)
      // For now, return mock assessment
      
      const assessment: CloudResourceAssessment = {
        resourceId,
        resourceType,
        region: 'us-east-1',
        securityGroups: await this.assessSecurityGroups(resourceId),
        iamPolicies: await this.assessIAMPolicies(resourceId),
        encryption: await this.assessEncryption(resourceId),
        logging: await this.assessLogging(resourceId),
        networking: await this.assessNetworking(resourceId),
        complianceScore: 85,
        recommendations: [
          'Enable encryption at rest and in transit',
          'Implement least privilege access policies',
          'Enable comprehensive logging and monitoring',
          'Review and tighten security group rules'
        ]
      }

      // Log assessment
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'CLOUD_RESOURCE_ASSESSED',
        tableName: 'cloud_assessments',
        recordId: resourceId,
        newValues: {
          resourceType,
          complianceScore: assessment.complianceScore,
          recommendationCount: assessment.recommendations.length
        }
      })

      return assessment
    } catch (error) {
      logger.error(`Cloud resource assessment failed for ${resourceId}:`, error)
      throw new Error(`Cloud assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Run container vulnerability scan (placeholder implementation)
   */
  private static async runContainerVulnerabilityScan(imageId: string): Promise<ContainerVulnerability[]> {
    try {
      // In a real implementation, integrate with tools like Trivy, Clair, Snyk, etc.
      // For now, return mock vulnerabilities
      
      return [
        {
          id: 'CVE-2023-1234',
          cveId: 'CVE-2023-1234',
          severity: 'HIGH',
          title: 'Buffer overflow in libssl',
          description: 'A buffer overflow vulnerability in OpenSSL library',
          packageName: 'libssl1.1',
          installedVersion: '1.1.1f-1ubuntu2.16',
          fixedVersion: '1.1.1f-1ubuntu2.17',
          layer: 'sha256:abc123...',
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
          exploitability: 8.5,
          impact: 8.0
        }
      ]
    } catch (error) {
      logger.error('Container vulnerability scan failed:', error)
      return []
    }
  }

  /**
   * Analyze container configuration
   */
  private static async analyzeContainerConfiguration(imageId: string): Promise<ConfigurationIssue[]> {
    try {
      // In a real implementation, analyze Dockerfile and container configuration
      // For now, return mock configuration issues
      
      return [
        {
          id: 'config_001',
          severity: 'MEDIUM',
          category: 'Security',
          title: 'Running as root user',
          description: 'Container is configured to run as root user',
          recommendation: 'Create and use a non-root user in the Dockerfile',
          dockerfile: 'Dockerfile',
          line: 15
        }
      ]
    } catch (error) {
      logger.error('Container configuration analysis failed:', error)
      return []
    }
  }

  /**
   * Determine infrastructure scan type
   */
  private static determineScanType(configPath: string): 'TERRAFORM' | 'KUBERNETES' | 'DOCKER_COMPOSE' | 'CLOUDFORMATION' {
    if (fs.existsSync(path.join(configPath, 'main.tf')) || 
        fs.existsSync(path.join(configPath, '*.tf'))) {
      return 'TERRAFORM'
    }
    
    if (fs.existsSync(path.join(configPath, 'docker-compose.yml')) ||
        fs.existsSync(path.join(configPath, 'docker-compose.yaml'))) {
      return 'DOCKER_COMPOSE'
    }
    
    if (fs.existsSync(path.join(configPath, '*.yaml')) ||
        fs.existsSync(path.join(configPath, '*.yml'))) {
      return 'KUBERNETES'
    }
    
    return 'CLOUDFORMATION'
  }

  /**
   * Run infrastructure security scan
   */
  private static async runInfrastructureSecurityScan(
    configPath: string, 
    scanType: 'TERRAFORM' | 'KUBERNETES' | 'DOCKER_COMPOSE' | 'CLOUDFORMATION'
  ): Promise<InfrastructureIssue[]> {
    try {
      // In a real implementation, integrate with tools like Checkov, Terrascan, kube-score, etc.
      // For now, return mock issues
      
      return [
        {
          id: 'infra_001',
          severity: 'HIGH',
          category: 'Security',
          title: 'S3 bucket allows public read access',
          description: 'S3 bucket is configured to allow public read access',
          resource: 'aws_s3_bucket.example',
          file: 'main.tf',
          line: 25,
          rule: 'CKV_AWS_20',
          recommendation: 'Remove public read access and use IAM policies for controlled access',
          cis: '2.1.1',
          nist: 'AC-3'
        }
      ]
    } catch (error) {
      logger.error('Infrastructure security scan failed:', error)
      return []
    }
  }

  /**
   * Run compliance checks
   */
  private static async runComplianceChecks(
    configPath: string,
    scanType: 'TERRAFORM' | 'KUBERNETES' | 'DOCKER_COMPOSE' | 'CLOUDFORMATION'
  ): Promise<ComplianceCheck[]> {
    try {
      // In a real implementation, run compliance checks against various frameworks
      // For now, return mock compliance checks
      
      return [
        {
          id: 'cis_001',
          framework: 'CIS',
          control: '2.1.1',
          status: 'FAIL',
          description: 'Ensure S3 bucket access logging is enabled',
          evidence: 'S3 bucket does not have access logging configured',
          recommendation: 'Enable S3 bucket access logging'
        }
      ]
    } catch (error) {
      logger.error('Compliance checks failed:', error)
      return []
    }
  }

  /**
   * Apply Kubernetes security policy
   */
  private static async applyKubernetesPolicy(policy: KubernetesSecurityPolicy): Promise<void> {
    try {
      // In a real implementation, use kubectl or Kubernetes API to apply policies
      logger.info(`Applied Kubernetes security policy: ${policy.metadata.name}`)
    } catch (error) {
      logger.error(`Failed to apply Kubernetes policy ${policy.metadata.name}:`, error)
      throw error
    }
  }

  /**
   * Calculate container risk score
   */
  private static calculateContainerRiskScore(
    vulnerabilities: ContainerVulnerability[],
    configIssues: ConfigurationIssue[]
  ): number {
    let score = 0
    
    // Score based on vulnerabilities
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'CRITICAL':
          score += 10
          break
        case 'HIGH':
          score += 7
          break
        case 'MEDIUM':
          score += 4
          break
        case 'LOW':
          score += 1
          break
      }
    })

    // Score based on configuration issues
    configIssues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL':
          score += 8
          break
        case 'HIGH':
          score += 5
          break
        case 'MEDIUM':
          score += 3
          break
        case 'LOW':
          score += 1
          break
      }
    })

    return Math.min(100, score)
  }

  /**
   * Calculate compliance score
   */
  private static calculateComplianceScore(configIssues: ConfigurationIssue[]): number {
    const totalIssues = configIssues.length
    const criticalIssues = configIssues.filter(i => i.severity === 'CRITICAL').length
    const highIssues = configIssues.filter(i => i.severity === 'HIGH').length

    if (totalIssues === 0) return 100
    
    const penalty = (criticalIssues * 20) + (highIssues * 10) + ((totalIssues - criticalIssues - highIssues) * 5)
    return Math.max(0, 100 - penalty)
  }

  /**
   * Calculate infrastructure security score
   */
  private static calculateInfraSecurityScore(
    issues: InfrastructureIssue[],
    complianceChecks: ComplianceCheck[]
  ): number {
    let score = 100
    
    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 15
          break
        case 'HIGH':
          score -= 10
          break
        case 'MEDIUM':
          score -= 5
          break
        case 'LOW':
          score -= 2
          break
      }
    })

    // Deduct points for failed compliance checks
    const failedChecks = complianceChecks.filter(c => c.status === 'FAIL').length
    score -= failedChecks * 5

    return Math.max(0, score)
  }

  /**
   * Generate container recommendations
   */
  private static generateContainerRecommendations(
    vulnerabilities: ContainerVulnerability[],
    configIssues: ConfigurationIssue[]
  ): string[] {
    const recommendations: string[] = []

    if (vulnerabilities.length > 0) {
      recommendations.push('Update base image to latest secure version')
      recommendations.push('Remove unnecessary packages and dependencies')
    }

    if (configIssues.some(i => i.category === 'Security')) {
      recommendations.push('Run container as non-root user')
      recommendations.push('Use read-only root filesystem where possible')
      recommendations.push('Drop unnecessary Linux capabilities')
    }

    recommendations.push('Implement container image scanning in CI/CD pipeline')
    recommendations.push('Use distroless or minimal base images')

    return recommendations
  }

  /**
   * Generate infrastructure recommendations
   */
  private static generateInfraRecommendations(
    issues: InfrastructureIssue[],
    complianceChecks: ComplianceCheck[]
  ): string[] {
    const recommendations: string[] = []

    if (issues.some(i => i.category === 'Security')) {
      recommendations.push('Enable encryption for all data stores')
      recommendations.push('Implement least privilege access policies')
      recommendations.push('Enable comprehensive logging and monitoring')
    }

    const failedChecks = complianceChecks.filter(c => c.status === 'FAIL')
    if (failedChecks.length > 0) {
      recommendations.push('Address failed compliance checks')
      recommendations.push('Implement automated compliance monitoring')
    }

    recommendations.push('Use infrastructure as code security scanning')
    recommendations.push('Regular security assessments and penetration testing')

    return recommendations
  }

  /**
   * Store container scan results
   */
  private static async storeContainerScanResults(result: ContainerScanResult): Promise<void> {
    try {
      // In a real implementation, store in database
      logger.info(`Stored container scan results: ${result.scanId}`)
    } catch (error) {
      logger.error('Failed to store container scan results:', error)
    }
  }

  /**
   * Store infrastructure scan results
   */
  private static async storeInfraScanResults(result: InfraScanResult): Promise<void> {
    try {
      // In a real implementation, store in database
      logger.info(`Stored infrastructure scan results: ${result.scanId}`)
    } catch (error) {
      logger.error('Failed to store infrastructure scan results:', error)
    }
  }

  /**
   * Assess security groups (placeholder)
   */
  private static async assessSecurityGroups(resourceId: string): Promise<SecurityGroupAssessment[]> {
    // Mock implementation
    return []
  }

  /**
   * Assess IAM policies (placeholder)
   */
  private static async assessIAMPolicies(resourceId: string): Promise<IAMPolicyAssessment[]> {
    // Mock implementation
    return []
  }

  /**
   * Assess encryption (placeholder)
   */
  private static async assessEncryption(resourceId: string): Promise<EncryptionAssessment> {
    // Mock implementation
    return {
      atRest: true,
      inTransit: true,
      keyManagement: 'AWS_MANAGED',
      issues: [],
      recommendations: []
    }
  }

  /**
   * Assess logging (placeholder)
   */
  private static async assessLogging(resourceId: string): Promise<LoggingAssessment> {
    // Mock implementation
    return {
      enabled: true,
      logTypes: ['access', 'error'],
      retention: 30,
      issues: [],
      recommendations: []
    }
  }

  /**
   * Assess networking (placeholder)
   */
  private static async assessNetworking(resourceId: string): Promise<NetworkingAssessment> {
    // Mock implementation
    return {
      publicAccess: false,
      vpcConfiguration: true,
      subnetConfiguration: true,
      issues: [],
      recommendations: []
    }
  }
}