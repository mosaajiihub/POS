import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'

export interface SASTConfiguration {
  enabled: boolean
  scanPaths: string[]
  excludePaths: string[]
  rules: SASTRule[]
  severity: {
    minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    failOnCritical: boolean
    failOnHigh: boolean
  }
  reporting: {
    generateReport: boolean
    reportFormat: 'json' | 'html' | 'sarif'
    includeCodeSnippets: boolean
  }
}

export interface SASTRule {
  id: string
  name: string
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: SASTCategory
  pattern: string | RegExp
  cwe?: string
  owasp?: string
  enabled: boolean
  customRule: boolean
}

export interface SASTScanResult {
  scanId: string
  timestamp: Date
  duration: number
  configuration: SASTConfiguration
  summary: SASTSummary
  issues: SASTIssue[]
  metrics: SASTMetrics
  recommendations: string[]
}

export interface SASTSummary {
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  filesScanned: number
  linesScanned: number
  securityScore: number
  codeQualityScore: number
}

export interface SASTIssue {
  id: string
  ruleId: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: SASTCategory
  title: string
  description: string
  file: string
  line: number
  column?: number
  endLine?: number
  endColumn?: number
  codeSnippet?: string
  cwe?: string
  owasp?: string
  recommendation: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  falsePositive: boolean
  suppressedBy?: string
  suppressedAt?: Date
}

export interface SASTMetrics {
  scanDuration: number
  filesScanned: number
  linesScanned: number
  issuesPerFile: number
  issuesPerLine: number
  criticalDensity: number
  highDensity: number
  coveragePercentage: number
}

export enum SASTCategory {
  INJECTION = 'INJECTION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  CRYPTOGRAPHY = 'CRYPTOGRAPHY',
  DATA_EXPOSURE = 'DATA_EXPOSURE',
  XSS = 'XSS',
  CSRF = 'CSRF',
  INSECURE_DESERIALIZATION = 'INSECURE_DESERIALIZATION',
  LOGGING_MONITORING = 'LOGGING_MONITORING',
  CONFIGURATION = 'CONFIGURATION',
  CODE_QUALITY = 'CODE_QUALITY',
  DEPENDENCY = 'DEPENDENCY'
}

/**
 * Static Application Security Testing (SAST) Service
 * Performs static code analysis to identify security vulnerabilities
 */
export class SASTService {
  private static readonly DEFAULT_RULES: SASTRule[] = [
    {
      id: 'sql-injection',
      name: 'SQL Injection',
      description: 'Detects potential SQL injection vulnerabilities',
      severity: 'CRITICAL',
      category: SASTCategory.INJECTION,
      pattern: /\$\{.*\}.*query|query.*\+.*req\.|query.*\+.*params\./gi,
      cwe: 'CWE-89',
      owasp: 'A03:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'xss-vulnerability',
      name: 'Cross-Site Scripting (XSS)',
      description: 'Detects potential XSS vulnerabilities',
      severity: 'HIGH',
      category: SASTCategory.XSS,
      pattern: /innerHTML|dangerouslySetInnerHTML|document\.write/gi,
      cwe: 'CWE-79',
      owasp: 'A03:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'hardcoded-secret',
      name: 'Hardcoded Secret',
      description: 'Detects hardcoded secrets and credentials',
      severity: 'CRITICAL',
      category: SASTCategory.CRYPTOGRAPHY,
      pattern: /(password|secret|api[_-]?key|token)\s*=\s*['"][^'"]{8,}['"]/gi,
      cwe: 'CWE-798',
      owasp: 'A07:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'weak-crypto',
      name: 'Weak Cryptography',
      description: 'Detects use of weak cryptographic algorithms',
      severity: 'HIGH',
      category: SASTCategory.CRYPTOGRAPHY,
      pattern: /md5|sha1|des|rc4/gi,
      cwe: 'CWE-327',
      owasp: 'A02:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'insecure-random',
      name: 'Insecure Random',
      description: 'Detects use of insecure random number generation',
      severity: 'MEDIUM',
      category: SASTCategory.CRYPTOGRAPHY,
      pattern: /Math\.random\(\)/gi,
      cwe: 'CWE-338',
      owasp: 'A02:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'path-traversal',
      name: 'Path Traversal',
      description: 'Detects potential path traversal vulnerabilities',
      severity: 'HIGH',
      category: SASTCategory.INJECTION,
      pattern: /readFile.*req\.|readFile.*params\.|\.\.\/|\.\.\\\/gi,
      cwe: 'CWE-22',
      owasp: 'A01:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'command-injection',
      name: 'Command Injection',
      description: 'Detects potential command injection vulnerabilities',
      severity: 'CRITICAL',
      category: SASTCategory.INJECTION,
      pattern: /exec\(|spawn\(|system\(/gi,
      cwe: 'CWE-78',
      owasp: 'A03:2021',
      enabled: true,
      customRule: false
    },
    {
      id: 'insecure-jwt',
      name: 'Insecure JWT',
      description: 'Detects insecure JWT configuration',
      severity: 'HIGH',
      category: SASTCategory.AUTHENTICATION,
      pattern: /algorithm:\s*['"]none['"]|expiresIn:\s*['"]999/gi,
      cwe: 'CWE-347',
      owasp: 'A02:2021',
      enabled: true,
      customRule: false
    }
  ]

  private static readonly DEFAULT_CONFIG: SASTConfiguration = {
    enabled: true,
    scanPaths: ['server/src', 'client/src'],
    excludePaths: ['node_modules', 'dist', 'build', 'test', '.git'],
    rules: SASTService.DEFAULT_RULES,
    severity: {
      minSeverity: 'LOW',
      failOnCritical: true,
      failOnHigh: false
    },
    reporting: {
      generateReport: true,
      reportFormat: 'json',
      includeCodeSnippets: true
    }
  }

  /**
   * Run SAST scan on codebase
   */
  static async runScan(config?: Partial<SASTConfiguration>): Promise<SASTScanResult> {
    const scanId = `sast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    try {
      logger.info(`Starting SAST scan: ${scanId}`)

      const scanConfig = { ...this.DEFAULT_CONFIG, ...config }
      const issues: SASTIssue[] = []
      let filesScanned = 0
      let linesScanned = 0

      // Scan each configured path
      for (const scanPath of scanConfig.scanPaths) {
        const pathIssues = await this.scanPath(scanPath, scanConfig)
        issues.push(...pathIssues.issues)
        filesScanned += pathIssues.filesScanned
        linesScanned += pathIssues.linesScanned
      }

      const duration = Date.now() - startTime

      // Calculate summary
      const summary = this.calculateSummary(issues, filesScanned, linesScanned)

      // Calculate metrics
      const metrics = this.calculateMetrics(issues, filesScanned, linesScanned, duration)

      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, issues)

      const result: SASTScanResult = {
        scanId,
        timestamp: new Date(),
        duration,
        configuration: scanConfig,
        summary,
        issues,
        metrics,
        recommendations
      }

      // Log scan completion
      await AuditService.createAuditLog({
        userId: 'system',
        action: 'SAST_SCAN_COMPLETED',
        tableName: 'security_scans',
        recordId: scanId,
        newValues: {
          totalIssues: summary.totalIssues,
          criticalIssues: summary.criticalIssues,
          highIssues: summary.highIssues,
          securityScore: summary.securityScore,
          duration
        }
      })

      logger.info(`SAST scan completed: ${scanId} - Found ${summary.totalIssues} issues`)

      return result
    } catch (error) {
      logger.error(`SAST scan failed: ${scanId}`, error)
      throw error
    }
  }

  /**
   * Scan a specific path
   */
  private static async scanPath(
    scanPath: string,
    config: SASTConfiguration
  ): Promise<{ issues: SASTIssue[]; filesScanned: number; linesScanned: number }> {
    const issues: SASTIssue[] = []
    let filesScanned = 0
    let linesScanned = 0

    try {
      if (!fs.existsSync(scanPath)) {
        logger.warn(`Scan path does not exist: ${scanPath}`)
        return { issues, filesScanned, linesScanned }
      }

      const files = this.getFilesToScan(scanPath, config.excludePaths)

      for (const file of files) {
        const fileIssues = await this.scanFile(file, config)
        issues.push(...fileIssues.issues)
        filesScanned++
        linesScanned += fileIssues.linesScanned
      }
    } catch (error) {
      logger.error(`Error scanning path ${scanPath}:`, error)
    }

    return { issues, filesScanned, linesScanned }
  }

  /**
   * Get files to scan
   */
  private static getFilesToScan(dirPath: string, excludePaths: string[]): string[] {
    const files: string[] = []

    const scanDirectory = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)

          // Check if path should be excluded
          if (excludePaths.some(exclude => fullPath.includes(exclude))) {
            continue
          }

          if (entry.isDirectory()) {
            scanDirectory(fullPath)
          } else if (entry.isFile() && this.isScannableFile(entry.name)) {
            files.push(fullPath)
          }
        }
      } catch (error) {
        logger.error(`Error reading directory ${dir}:`, error)
      }
    }

    scanDirectory(dirPath)
    return files
  }

  /**
   * Check if file should be scanned
   */
  private static isScannableFile(filename: string): boolean {
    const scannableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.sql']
    return scannableExtensions.some(ext => filename.endsWith(ext))
  }

  /**
   * Scan a single file
   */
  private static async scanFile(
    filePath: string,
    config: SASTConfiguration
  ): Promise<{ issues: SASTIssue[]; linesScanned: number }> {
    const issues: SASTIssue[] = []

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')

      // Apply each enabled rule
      for (const rule of config.rules.filter(r => r.enabled)) {
        const ruleIssues = this.applyRule(rule, filePath, content, lines)
        issues.push(...ruleIssues)
      }

      return { issues, linesScanned: lines.length }
    } catch (error) {
      logger.error(`Error scanning file ${filePath}:`, error)
      return { issues, linesScanned: 0 }
    }
  }

  /**
   * Apply a security rule to file content
   */
  private static applyRule(
    rule: SASTRule,
    filePath: string,
    content: string,
    lines: string[]
  ): SASTIssue[] {
    const issues: SASTIssue[] = []

    try {
      const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'gi') : rule.pattern
      let match

      while ((match = pattern.exec(content)) !== null) {
        const position = this.getLineAndColumn(content, match.index)
        const codeSnippet = this.getCodeSnippet(lines, position.line)

        const issue: SASTIssue = {
          id: `${rule.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          severity: rule.severity,
          category: rule.category,
          title: rule.name,
          description: rule.description,
          file: filePath,
          line: position.line,
          column: position.column,
          codeSnippet,
          cwe: rule.cwe,
          owasp: rule.owasp,
          recommendation: this.getRecommendation(rule),
          confidence: 'MEDIUM',
          falsePositive: false
        }

        issues.push(issue)
      }
    } catch (error) {
      logger.error(`Error applying rule ${rule.id}:`, error)
    }

    return issues
  }

  /**
   * Get line and column from content index
   */
  private static getLineAndColumn(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    }
  }

  /**
   * Get code snippet around line
   */
  private static getCodeSnippet(lines: string[], lineNumber: number, context: number = 2): string {
    const start = Math.max(0, lineNumber - context - 1)
    const end = Math.min(lines.length, lineNumber + context)
    return lines.slice(start, end).join('\n')
  }

  /**
   * Get recommendation for rule
   */
  private static getRecommendation(rule: SASTRule): string {
    const recommendations: Record<string, string> = {
      'sql-injection': 'Use parameterized queries or ORM methods to prevent SQL injection',
      'xss-vulnerability': 'Sanitize user input and use safe DOM manipulation methods',
      'hardcoded-secret': 'Use environment variables or secure secret management systems',
      'weak-crypto': 'Use strong cryptographic algorithms like AES-256, SHA-256, or bcrypt',
      'insecure-random': 'Use crypto.randomBytes() for cryptographically secure random values',
      'path-traversal': 'Validate and sanitize file paths, use path.resolve() and check boundaries',
      'command-injection': 'Avoid executing shell commands with user input, use safe alternatives',
      'insecure-jwt': 'Use strong algorithms (RS256, ES256) and appropriate expiration times'
    }

    return recommendations[rule.id] || 'Review and fix this security issue'
  }

  /**
   * Calculate scan summary
   */
  private static calculateSummary(
    issues: SASTIssue[],
    filesScanned: number,
    linesScanned: number
  ): SASTSummary {
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length
    const highIssues = issues.filter(i => i.severity === 'HIGH').length
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length
    const lowIssues = issues.filter(i => i.severity === 'LOW').length

    // Calculate security score (0-100)
    const securityScore = Math.max(
      0,
      100 - (criticalIssues * 20 + highIssues * 10 + mediumIssues * 5 + lowIssues * 2)
    )

    // Calculate code quality score
    const codeQualityScore = Math.max(
      0,
      100 - (issues.length / Math.max(1, filesScanned)) * 10
    )

    return {
      totalIssues: issues.length,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      filesScanned,
      linesScanned,
      securityScore,
      codeQualityScore
    }
  }

  /**
   * Calculate scan metrics
   */
  private static calculateMetrics(
    issues: SASTIssue[],
    filesScanned: number,
    linesScanned: number,
    duration: number
  ): SASTMetrics {
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length
    const highIssues = issues.filter(i => i.severity === 'HIGH').length

    return {
      scanDuration: duration,
      filesScanned,
      linesScanned,
      issuesPerFile: filesScanned > 0 ? issues.length / filesScanned : 0,
      issuesPerLine: linesScanned > 0 ? issues.length / linesScanned : 0,
      criticalDensity: linesScanned > 0 ? (criticalIssues / linesScanned) * 1000 : 0,
      highDensity: linesScanned > 0 ? (highIssues / linesScanned) * 1000 : 0,
      coveragePercentage: 100 // Simplified - in real implementation, track actual coverage
    }
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(summary: SASTSummary, issues: SASTIssue[]): string[] {
    const recommendations: string[] = []

    if (summary.criticalIssues > 0) {
      recommendations.push(`Address ${summary.criticalIssues} critical security issues immediately`)
    }

    if (summary.highIssues > 0) {
      recommendations.push(`Fix ${summary.highIssues} high-severity security issues`)
    }

    if (summary.securityScore < 50) {
      recommendations.push('Security score is critically low - prioritize security fixes')
    } else if (summary.securityScore < 75) {
      recommendations.push('Security score needs improvement - review medium and low issues')
    }

    // Category-specific recommendations
    const categories = new Set(issues.map(i => i.category))
    if (categories.has(SASTCategory.INJECTION)) {
      recommendations.push('Implement input validation and parameterized queries')
    }
    if (categories.has(SASTCategory.CRYPTOGRAPHY)) {
      recommendations.push('Review and strengthen cryptographic implementations')
    }
    if (categories.has(SASTCategory.AUTHENTICATION)) {
      recommendations.push('Enhance authentication and session security')
    }

    recommendations.push('Integrate SAST scanning into CI/CD pipeline')
    recommendations.push('Schedule regular security code reviews')

    return recommendations
  }

  /**
   * Mark issue as false positive
   */
  static async markFalsePositive(issueId: string, userId: string, reason: string): Promise<boolean> {
    try {
      await AuditService.createAuditLog({
        userId,
        action: 'SAST_ISSUE_MARKED_FALSE_POSITIVE',
        tableName: 'sast_issues',
        recordId: issueId,
        newValues: { reason, markedAt: new Date().toISOString() }
      })

      logger.info(`SAST issue ${issueId} marked as false positive by ${userId}`)
      return true
    } catch (error) {
      logger.error(`Failed to mark issue ${issueId} as false positive:`, error)
      return false
    }
  }

  /**
   * Add custom security rule
   */
  static async addCustomRule(rule: Omit<SASTRule, 'customRule'>): Promise<SASTRule> {
    const customRule: SASTRule = {
      ...rule,
      customRule: true
    }

    await AuditService.createAuditLog({
      userId: 'system',
      action: 'SAST_CUSTOM_RULE_ADDED',
      tableName: 'sast_rules',
      recordId: rule.id,
      newValues: customRule
    })

    logger.info(`Custom SAST rule added: ${rule.id}`)
    return customRule
  }

  /**
   * Get default rules
   */
  static getDefaultRules(): SASTRule[] {
    return [...this.DEFAULT_RULES]
  }

  /**
   * Get default configuration
   */
  static getDefaultConfiguration(): SASTConfiguration {
    return { ...this.DEFAULT_CONFIG }
  }
}
