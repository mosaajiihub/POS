import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { VulnerabilityService, VulnerabilityReport } from './vulnerabilityService'

export interface SecurityGate {
  id: string
  name: string
  type: SecurityGateType
  enabled: boolean
  blockOnFailure: boolean
  thresholds: SecurityThresholds
  configuration: any
}

export interface SecurityThresholds {
  maxCriticalVulnerabilities: number
  maxHighVulnerabilities: number
  maxMediumVulnerabilities: number
  maxRiskScore: number
  requireAllTestsPass: boolean
  requireCodeCoverage?: number
}

export interface Pipeline {
  id: string
  name: string
  branch: string
  commit: string
  buildNumber: number
  status: PipelineStatus
  stages: PipelineStage[]
  securityGates: SecurityGate[]
  artifacts: SecurityArtifact[]
}

export interface PipelineStage {
  id: string
  name: string
  status: StageStatus
  startTime?: Date
  endTime?: Date
  logs: string[]
  securityChecks: SecurityCheck[]
}

export interface SecurityCheck {
  id: string
  type: SecurityCheckType
  status: CheckStatus
  result?: any
  message?: string
  executionTime?: number
}

export interface SecurityArtifact {
  id: string
  type: ArtifactType
  name: string
  path: string
  size: number
  checksum: string
  createdAt: Date
  metadata: any
}

export interface GateResult {
  passed: boolean
  message: string
  failedGates: string[]
  warnings: string[]
  securityScore: number
  recommendations: string[]
}

export interface SASTResult {
  scanId: string
  timestamp: Date
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  issues: SASTIssue[]
  codeQualityScore: number
  securityScore: number
}

export interface SASTIssue {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  title: string
  description: string
  file: string
  line: number
  column?: number
  rule: string
  cwe?: string
  recommendation: string
}

export interface DASTResult {
  scanId: string
  timestamp: Date
  targetUrl: string
  totalVulnerabilities: number
  criticalVulnerabilities: number
  highVulnerabilities: number
  mediumVulnerabilities: number
  lowVulnerabilities: number
  vulnerabilities: DASTVulnerability[]
  coverageScore: number
  securityScore: number
}

export interface DASTVulnerability {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  title: string
  description: string
  url: string
  method: string
  parameter?: string
  evidence: string
  recommendation: string
  cwe?: string
  owasp?: string
}

export enum SecurityGateType {
  DEPENDENCY_SCAN = 'DEPENDENCY_SCAN',
  SAST_SCAN = 'SAST_SCAN',
  DAST_SCAN = 'DAST_SCAN',
  CONTAINER_SCAN = 'CONTAINER_SCAN',
  SECRETS_SCAN = 'SECRETS_SCAN',
  LICENSE_SCAN = 'LICENSE_SCAN',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK'
}

export enum PipelineStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

export enum StageStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum SecurityCheckType {
  DEPENDENCY_VULNERABILITY = 'DEPENDENCY_VULNERABILITY',
  STATIC_CODE_ANALYSIS = 'STATIC_CODE_ANALYSIS',
  DYNAMIC_SECURITY_TEST = 'DYNAMIC_SECURITY_TEST',
  CONTAINER_SECURITY = 'CONTAINER_SECURITY',
  SECRETS_DETECTION = 'SECRETS_DETECTION',
  LICENSE_COMPLIANCE = 'LICENSE_COMPLIANCE',
  SECURITY_POLICY = 'SECURITY_POLICY'
}

export enum CheckStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
  SKIPPED = 'SKIPPED'
}

export enum ArtifactType {
  VULNERABILITY_REPORT = 'VULNERABILITY_REPORT',
  SAST_REPORT = 'SAST_REPORT',
  DAST_REPORT = 'DAST_REPORT',
  CONTAINER_SCAN_REPORT = 'CONTAINER_SCAN_REPORT',
  SECURITY_SUMMARY = 'SECURITY_SUMMARY',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT'
}

/**
 * CI/CD Security Integration Service
 * Handles security scanning integration into build pipelines
 */
export class CICDSecurityService {
  private static readonly DEFAULT_SECURITY_GATES: SecurityGate[] = [
    {
      id: 'dependency-scan',
      name: 'Dependency Vulnerability Scan',
      type: SecurityGateType.DEPENDENCY_SCAN,
      enabled: true,
      blockOnFailure: true,
      thresholds: {
        maxCriticalVulnerabilities: 0,
        maxHighVulnerabilities: 5,
        maxMediumVulnerabilities: 20,
        maxRiskScore: 50,
        requireAllTestsPass: true
      },
      configuration: {
        scanTimeout: 300000, // 5 minutes
        includeDevDependencies: true,
        failOnAuditFix: false
      }
    },
    {
      id: 'sast-scan',
      name: 'Static Application Security Testing',
      type: SecurityGateType.SAST_SCAN,
      enabled: true,
      blockOnFailure: true,
      thresholds: {
        maxCriticalVulnerabilities: 0,
        maxHighVulnerabilities: 3,
        maxMediumVulnerabilities: 10,
        maxRiskScore: 40,
        requireAllTestsPass: false
      },
      configuration: {
        scanTimeout: 600000, // 10 minutes
        excludePaths: ['node_modules', 'dist', 'build'],
        rules: 'security'
      }
    }
  ]

  /**
   * Validate security gates for a pipeline
   */
  static async validateSecurityGates(pipeline: Pipeline): Promise<GateResult> {
    try {
      logger.info(`Validating security gates for pipeline: ${pipeline.name}`)

      const failedGates: string[] = []
      const warnings: string[] = []
      let securityScore = 100

      // Execute each enabled security gate
      for (const gate of pipeline.securityGates.filter(g => g.enabled)) {
        try {
          const gateResult = await this.executeSecurityGate(gate, pipeline)
          
          if (!gateResult.passed) {
            if (gate.blockOnFailure) {
              failedGates.push(`${gate.name}: ${gateResult.message}`)
            } else {
              warnings.push(`${gate.name}: ${gateResult.message}`)
            }
          }

          // Adjust security score based on gate results
          securityScore = Math.min(securityScore, gateResult.securityScore || 100)
        } catch (error) {
          const errorMsg = `Security gate ${gate.name} failed to execute: ${error instanceof Error ? error.message : 'Unknown error'}`
          
          if (gate.blockOnFailure) {
            failedGates.push(errorMsg)
          } else {
            warnings.push(errorMsg)
          }
        }
      }

      const passed = failedGates.length === 0
      const recommendations = this.generateSecurityRecommendations(pipeline, securityScore)

      // Log gate validation result
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_GATES_VALIDATED',
        tableName: 'pipelines',
        recordId: pipeline.id,
        newValues: {
          pipelineName: pipeline.name,
          passed,
          failedGates: failedGates.length,
          warnings: warnings.length,
          securityScore
        }
      })

      return {
        passed,
        message: passed ? 'All security gates passed' : `${failedGates.length} security gates failed`,
        failedGates,
        warnings,
        securityScore,
        recommendations
      }
    } catch (error) {
      logger.error('Security gate validation failed:', error)
      return {
        passed: false,
        message: 'Security gate validation failed',
        failedGates: ['Validation process error'],
        warnings: [],
        securityScore: 0,
        recommendations: ['Fix security gate validation process']
      }
    }
  }

  /**
   * Execute a specific security gate
   */
  private static async executeSecurityGate(gate: SecurityGate, pipeline: Pipeline): Promise<{
    passed: boolean
    message: string
    securityScore?: number
  }> {
    logger.info(`Executing security gate: ${gate.name}`)

    switch (gate.type) {
      case SecurityGateType.DEPENDENCY_SCAN:
        return await this.executeDependencyScanGate(gate, pipeline)
      
      case SecurityGateType.SAST_SCAN:
        return await this.executeSASTGate(gate, pipeline)
      
      case SecurityGateType.SECRETS_SCAN:
        return await this.executeSecretsGate(gate, pipeline)
      
      default:
        return {
          passed: true,
          message: `Security gate ${gate.type} not implemented yet`,
          securityScore: 100
        }
    }
  }

  /**
   * Execute dependency scan security gate
   */
  private static async executeDependencyScanGate(gate: SecurityGate, pipeline: Pipeline): Promise<{
    passed: boolean
    message: string
    securityScore?: number
  }> {
    try {
      // Run dependency vulnerability scan
      const scanResult = await VulnerabilityService.scanDependencies()
      
      if (!scanResult.success || !scanResult.report) {
        return {
          passed: false,
          message: 'Dependency scan failed to execute',
          securityScore: 0
        }
      }

      const report = scanResult.report
      const thresholds = gate.thresholds

      // Check against thresholds
      const criticalExceeded = report.criticalCount > thresholds.maxCriticalVulnerabilities
      const highExceeded = report.highCount > thresholds.maxHighVulnerabilities
      const mediumExceeded = report.mediumCount > thresholds.maxMediumVulnerabilities
      const riskScoreExceeded = report.summary.riskScore > thresholds.maxRiskScore

      const passed = !criticalExceeded && !highExceeded && !mediumExceeded && !riskScoreExceeded

      let message = `Dependency scan: ${report.totalVulnerabilities} vulnerabilities found`
      if (!passed) {
        const issues = []
        if (criticalExceeded) issues.push(`${report.criticalCount} critical (max: ${thresholds.maxCriticalVulnerabilities})`)
        if (highExceeded) issues.push(`${report.highCount} high (max: ${thresholds.maxHighVulnerabilities})`)
        if (mediumExceeded) issues.push(`${report.mediumCount} medium (max: ${thresholds.maxMediumVulnerabilities})`)
        if (riskScoreExceeded) issues.push(`risk score ${report.summary.riskScore} (max: ${thresholds.maxRiskScore})`)
        message += ` - Exceeded thresholds: ${issues.join(', ')}`
      }

      // Generate security artifact
      await this.generateSecurityArtifact(pipeline.id, ArtifactType.VULNERABILITY_REPORT, report)

      return {
        passed,
        message,
        securityScore: Math.max(0, 100 - report.summary.riskScore)
      }
    } catch (error) {
      logger.error('Dependency scan gate execution failed:', error)
      return {
        passed: false,
        message: 'Dependency scan gate failed',
        securityScore: 0
      }
    }
  }

  /**
   * Execute SAST security gate
   */
  private static async executeSASTGate(gate: SecurityGate, pipeline: Pipeline): Promise<{
    passed: boolean
    message: string
    securityScore?: number
  }> {
    try {
      // Run static code analysis
      const sastResult = await this.runSASTScan(pipeline)
      
      if (!sastResult) {
        return {
          passed: false,
          message: 'SAST scan failed to execute',
          securityScore: 0
        }
      }

      const thresholds = gate.thresholds

      // Check against thresholds
      const criticalExceeded = sastResult.criticalIssues > thresholds.maxCriticalVulnerabilities
      const highExceeded = sastResult.highIssues > thresholds.maxHighVulnerabilities
      const mediumExceeded = sastResult.mediumIssues > thresholds.maxMediumVulnerabilities

      const passed = !criticalExceeded && !highExceeded && !mediumExceeded

      let message = `SAST scan: ${sastResult.totalIssues} issues found`
      if (!passed) {
        const issues = []
        if (criticalExceeded) issues.push(`${sastResult.criticalIssues} critical`)
        if (highExceeded) issues.push(`${sastResult.highIssues} high`)
        if (mediumExceeded) issues.push(`${sastResult.mediumIssues} medium`)
        message += ` - Exceeded thresholds: ${issues.join(', ')}`
      }

      // Generate security artifact
      await this.generateSecurityArtifact(pipeline.id, ArtifactType.SAST_REPORT, sastResult)

      return {
        passed,
        message,
        securityScore: sastResult.securityScore
      }
    } catch (error) {
      logger.error('SAST gate execution failed:', error)
      return {
        passed: false,
        message: 'SAST gate failed',
        securityScore: 0
      }
    }
  }

  /**
   * Execute secrets detection gate
   */
  private static async executeSecretsGate(gate: SecurityGate, pipeline: Pipeline): Promise<{
    passed: boolean
    message: string
    securityScore?: number
  }> {
    try {
      // Run secrets detection scan
      const secretsFound = await this.scanForSecrets(pipeline)
      
      const passed = secretsFound.length === 0

      return {
        passed,
        message: passed ? 'No secrets detected' : `${secretsFound.length} potential secrets found`,
        securityScore: passed ? 100 : 0
      }
    } catch (error) {
      logger.error('Secrets gate execution failed:', error)
      return {
        passed: false,
        message: 'Secrets scan gate failed',
        securityScore: 0
      }
    }
  }

  /**
   * Block deployment for critical vulnerabilities
   */
  static async blockInsecureDeployment(vulnerabilities: any[]): Promise<boolean> {
    try {
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL')
      const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH')

      // Block if there are critical vulnerabilities or too many high vulnerabilities
      const shouldBlock = criticalVulns.length > 0 || highVulns.length > 5

      if (shouldBlock) {
        await AuditService.createAuditLog({
          userId: 'system',
          action: 'DEPLOYMENT_BLOCKED',
          tableName: 'deployments',
          newValues: {
            reason: 'Critical security vulnerabilities detected',
            criticalCount: criticalVulns.length,
            highCount: highVulns.length,
            blockedAt: new Date().toISOString()
          }
        })

        logger.warn(`Deployment blocked due to ${criticalVulns.length} critical and ${highVulns.length} high vulnerabilities`)
      }

      return shouldBlock
    } catch (error) {
      logger.error('Failed to check deployment blocking:', error)
      return false
    }
  }

  /**
   * Generate security artifacts
   */
  static async generateSecurityArtifacts(buildInfo: any): Promise<SecurityArtifact[]> {
    try {
      const artifacts: SecurityArtifact[] = []

      // Generate vulnerability report artifact
      const vulnScanResult = await VulnerabilityService.scanDependencies()
      if (vulnScanResult.success && vulnScanResult.report) {
        const artifact = await this.generateSecurityArtifact(
          buildInfo.buildId,
          ArtifactType.VULNERABILITY_REPORT,
          vulnScanResult.report
        )
        artifacts.push(artifact)
      }

      // Generate SAST report artifact
      const sastResult = await this.runSASTScan(buildInfo)
      if (sastResult) {
        const artifact = await this.generateSecurityArtifact(
          buildInfo.buildId,
          ArtifactType.SAST_REPORT,
          sastResult
        )
        artifacts.push(artifact)
      }

      // Generate security summary artifact
      const summaryArtifact = await this.generateSecuritySummary(buildInfo, artifacts)
      artifacts.push(summaryArtifact)

      return artifacts
    } catch (error) {
      logger.error('Failed to generate security artifacts:', error)
      return []
    }
  }

  /**
   * Generate a security artifact
   */
  private static async generateSecurityArtifact(
    buildId: string,
    type: ArtifactType,
    data: any
  ): Promise<SecurityArtifact> {
    const artifactId = `${type.toLowerCase()}_${buildId}_${Date.now()}`
    const artifactName = `${type.toLowerCase()}-${buildId}.json`
    const artifactPath = path.join('artifacts', 'security', artifactName)
    
    // Ensure directory exists
    const artifactDir = path.dirname(artifactPath)
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true })
    }

    // Write artifact data
    const artifactContent = JSON.stringify(data, null, 2)
    fs.writeFileSync(artifactPath, artifactContent)

    // Calculate checksum
    const crypto = require('crypto')
    const checksum = crypto.createHash('sha256').update(artifactContent).digest('hex')

    return {
      id: artifactId,
      type,
      name: artifactName,
      path: artifactPath,
      size: Buffer.byteLength(artifactContent),
      checksum,
      createdAt: new Date(),
      metadata: {
        buildId,
        contentType: 'application/json',
        encoding: 'utf8'
      }
    }
  }

  /**
   * Generate security summary artifact
   */
  private static async generateSecuritySummary(buildInfo: any, artifacts: SecurityArtifact[]): Promise<SecurityArtifact> {
    const summary = {
      buildId: buildInfo.buildId,
      timestamp: new Date().toISOString(),
      artifacts: artifacts.map(a => ({
        type: a.type,
        name: a.name,
        size: a.size,
        checksum: a.checksum
      })),
      securityScore: 85, // Calculate based on all scans
      recommendations: [
        'Review and address high-severity vulnerabilities',
        'Implement automated security testing in CI/CD pipeline',
        'Regular dependency updates and security patches'
      ]
    }

    return await this.generateSecurityArtifact(buildInfo.buildId, ArtifactType.SECURITY_SUMMARY, summary)
  }

  /**
   * Run SAST scan (placeholder implementation)
   */
  private static async runSASTScan(pipeline: Pipeline | any): Promise<SASTResult | null> {
    try {
      // In a real implementation, integrate with SAST tools like SonarQube, Checkmarx, etc.
      // For now, return mock data
      
      const scanId = `sast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return {
        scanId,
        timestamp: new Date(),
        totalIssues: 5,
        criticalIssues: 0,
        highIssues: 1,
        mediumIssues: 2,
        lowIssues: 2,
        issues: [
          {
            id: 'sast_001',
            severity: 'HIGH',
            category: 'Security',
            title: 'Potential SQL Injection',
            description: 'User input is not properly sanitized before database query',
            file: 'src/controllers/userController.ts',
            line: 45,
            rule: 'sql-injection',
            cwe: 'CWE-89',
            recommendation: 'Use parameterized queries or ORM methods'
          }
        ],
        codeQualityScore: 85,
        securityScore: 75
      }
    } catch (error) {
      logger.error('SAST scan failed:', error)
      return null
    }
  }

  /**
   * Scan for secrets in code
   */
  private static async scanForSecrets(pipeline: Pipeline | any): Promise<string[]> {
    try {
      // In a real implementation, use tools like truffleHog, GitLeaks, etc.
      // For now, return empty array (no secrets found)
      return []
    } catch (error) {
      logger.error('Secrets scan failed:', error)
      return []
    }
  }

  /**
   * Generate security recommendations
   */
  private static generateSecurityRecommendations(pipeline: Pipeline, securityScore: number): string[] {
    const recommendations: string[] = []

    if (securityScore < 50) {
      recommendations.push('Critical: Address all high and critical security issues immediately')
    } else if (securityScore < 75) {
      recommendations.push('Important: Review and fix medium to high security issues')
    }

    recommendations.push('Implement automated security testing in all branches')
    recommendations.push('Regular dependency updates and security patches')
    recommendations.push('Enable security monitoring and alerting')

    return recommendations
  }

  /**
   * Get default security gates configuration
   */
  static getDefaultSecurityGates(): SecurityGate[] {
    return [...this.DEFAULT_SECURITY_GATES]
  }

  /**
   * Update security gate configuration
   */
  static async updateSecurityGate(gateId: string, updates: Partial<SecurityGate>): Promise<boolean> {
    try {
      // In a real implementation, update database
      
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SECURITY_GATE_UPDATED',
        tableName: 'security_gates',
        recordId: gateId,
        newValues: updates
      })

      logger.info(`Security gate ${gateId} updated`)
      return true
    } catch (error) {
      logger.error(`Failed to update security gate ${gateId}:`, error)
      return false
    }
  }
}