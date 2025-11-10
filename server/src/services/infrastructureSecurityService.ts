import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface IaCTemplate {
  id: string;
  name: string;
  type: 'terraform' | 'cloudformation' | 'kubernetes' | 'docker-compose';
  content: string;
  version: string;
}

interface IaCSecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rule: string;
  description: string;
  line?: number;
  remediation: string;
}

interface IaCScanResult {
  templateId: string;
  templateName: string;
  scannedAt: Date;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  issues: IaCSecurityIssue[];
  passed: boolean;
}

interface InfrastructurePolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  enforcement: 'advisory' | 'mandatory';
}

interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn';
  description: string;
}

interface ComplianceValidationResult {
  compliant: boolean;
  standard: string;
  checks: ComplianceCheck[];
  score: number;
  timestamp: Date;
}

interface ComplianceCheck {
  checkId: string;
  name: string;
  passed: boolean;
  severity: string;
  details: string;
}

class InfrastructureSecurityService {
  // IaC Security Scanning
  async scanIaCTemplate(template: IaCTemplate): Promise<IaCScanResult> {
    try {
      logger.info(`Scanning IaC template: ${template.name}`);
      
      const issues: IaCSecurityIssue[] = [];
      
      // Scan for common security issues based on template type
      if (template.type === 'terraform') {
        issues.push(...this.scanTerraformSecurity(template.content));
      } else if (template.type === 'kubernetes') {
        issues.push(...this.scanKubernetesSecurity(template.content));
      } else if (template.type === 'docker-compose') {
        issues.push(...this.scanDockerSecurity(template.content));
      }
      
      const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
      const highCount = issues.filter(i => i.severity === 'HIGH').length;
      const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
      const lowCount = issues.filter(i => i.severity === 'LOW').length;
      
      const result: IaCScanResult = {
        templateId: template.id,
        templateName: template.name,
        scannedAt: new Date(),
        totalIssues: issues.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        issues,
        passed: criticalCount === 0 && highCount === 0
      };
      
      // Store scan result
      await this.storeScanResult(result);
      
      return result;
    } catch (error) {
      logger.error('Error scanning IaC template:', error);
      throw error;
    }
  }

  private scanTerraformSecurity(content: string): IaCSecurityIssue[] {
    const issues: IaCSecurityIssue[] = [];
    
    // Check for hardcoded credentials
    if (/password\s*=\s*["'][^"']+["']/.test(content)) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'TF001',
        description: 'Hardcoded credentials detected in Terraform configuration',
        remediation: 'Use variables or secrets management for sensitive data'
      });
    }
    
    // Check for public S3 buckets
    if (/acl\s*=\s*["']public-read/.test(content)) {
      issues.push({
        severity: 'HIGH',
        rule: 'TF002',
        description: 'S3 bucket configured with public read access',
        remediation: 'Restrict bucket access and use IAM policies'
      });
    }
    
    // Check for unencrypted storage
    if (content.includes('aws_db_instance') && !content.includes('storage_encrypted')) {
      issues.push({
        severity: 'HIGH',
        rule: 'TF003',
        description: 'Database instance without encryption enabled',
        remediation: 'Enable storage_encrypted = true'
      });
    }
    
    // Check for overly permissive security groups
    if (/cidr_blocks\s*=\s*\["0\.0\.0\.0\/0"\]/.test(content) && /from_port\s*=\s*0/.test(content)) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'TF004',
        description: 'Security group allows unrestricted access from any IP',
        remediation: 'Restrict CIDR blocks to specific IP ranges'
      });
    }
    
    return issues;
  }

  private scanKubernetesSecurity(content: string): IaCSecurityIssue[] {
    const issues: IaCSecurityIssue[] = [];
    
    // Check for privileged containers
    if (/privileged:\s*true/.test(content)) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'K8S001',
        description: 'Container running in privileged mode',
        remediation: 'Remove privileged: true or use specific capabilities'
      });
    }
    
    // Check for host network mode
    if (/hostNetwork:\s*true/.test(content)) {
      issues.push({
        severity: 'HIGH',
        rule: 'K8S002',
        description: 'Pod using host network namespace',
        remediation: 'Avoid hostNetwork unless absolutely necessary'
      });
    }
    
    // Check for missing resource limits
    if (content.includes('kind: Deployment') && !content.includes('resources:')) {
      issues.push({
        severity: 'MEDIUM',
        rule: 'K8S003',
        description: 'Container without resource limits defined',
        remediation: 'Define CPU and memory limits'
      });
    }
    
    // Check for root user
    if (!content.includes('runAsNonRoot') && content.includes('kind: Pod')) {
      issues.push({
        severity: 'HIGH',
        rule: 'K8S004',
        description: 'Container may run as root user',
        remediation: 'Set runAsNonRoot: true in securityContext'
      });
    }
    
    return issues;
  }

  private scanDockerSecurity(content: string): IaCSecurityIssue[] {
    const issues: IaCSecurityIssue[] = [];
    
    // Check for privileged mode
    if (/privileged:\s*true/.test(content)) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'DOCKER001',
        description: 'Container running in privileged mode',
        remediation: 'Remove privileged flag'
      });
    }
    
    // Check for host network mode
    if (/network_mode:\s*["']?host["']?/.test(content)) {
      issues.push({
        severity: 'HIGH',
        rule: 'DOCKER002',
        description: 'Container using host network mode',
        remediation: 'Use bridge or custom network'
      });
    }
    
    // Check for exposed ports
    if (/ports:[\s\S]*?-\s*["']?\d+:\d+["']?/.test(content)) {
      issues.push({
        severity: 'MEDIUM',
        rule: 'DOCKER003',
        description: 'Ports exposed to host',
        remediation: 'Review exposed ports and restrict access'
      });
    }
    
    return issues;
  }

  private async storeScanResult(result: IaCScanResult): Promise<void> {
    try {
      // Store in audit log
      logger.info('IaC scan completed', {
        templateId: result.templateId,
        totalIssues: result.totalIssues,
        passed: result.passed
      });
    } catch (error) {
      logger.error('Error storing scan result:', error);
    }
  }

  // Secure Infrastructure Provisioning
  async provisionSecureInfrastructure(template: IaCTemplate, policies: InfrastructurePolicy[]): Promise<{ success: boolean; violations: string[] }> {
    try {
      logger.info(`Provisioning infrastructure: ${template.name}`);
      
      // Scan template first
      const scanResult = await this.scanIaCTemplate(template);
      
      if (!scanResult.passed) {
        return {
          success: false,
          violations: scanResult.issues.map(i => `${i.severity}: ${i.description}`)
        };
      }
      
      // Validate against policies
      const policyViolations = await this.validatePolicies(template, policies);
      
      if (policyViolations.length > 0) {
        return {
          success: false,
          violations: policyViolations
        };
      }
      
      // Proceed with provisioning (placeholder for actual provisioning logic)
      logger.info('Infrastructure provisioning approved');
      
      return {
        success: true,
        violations: []
      };
    } catch (error) {
      logger.error('Error provisioning infrastructure:', error);
      throw error;
    }
  }

  // Policy Enforcement
  async validatePolicies(template: IaCTemplate, policies: InfrastructurePolicy[]): Promise<string[]> {
    const violations: string[] = [];
    
    for (const policy of policies) {
      if (policy.enforcement === 'mandatory') {
        for (const rule of policy.rules) {
          const violation = this.checkPolicyRule(template, rule);
          if (violation) {
            violations.push(`Policy ${policy.name}: ${violation}`);
          }
        }
      }
    }
    
    return violations;
  }

  private checkPolicyRule(template: IaCTemplate, rule: PolicyRule): string | null {
    // Simple rule checking based on conditions
    if (rule.condition.includes('encryption') && !template.content.includes('encrypt')) {
      return `${rule.description} - Encryption not enabled`;
    }
    
    if (rule.condition.includes('public_access') && template.content.includes('public')) {
      return `${rule.description} - Public access detected`;
    }
    
    return null;
  }

  // Compliance Validation
  async validateCompliance(template: IaCTemplate, standard: string): Promise<ComplianceValidationResult> {
    try {
      logger.info(`Validating compliance for standard: ${standard}`);
      
      const checks: ComplianceCheck[] = [];
      
      if (standard === 'CIS') {
        checks.push(...this.performCISChecks(template));
      } else if (standard === 'PCI-DSS') {
        checks.push(...this.performPCIDSSChecks(template));
      } else if (standard === 'HIPAA') {
        checks.push(...this.performHIPAAChecks(template));
      }
      
      const passedChecks = checks.filter(c => c.passed).length;
      const score = (passedChecks / checks.length) * 100;
      
      return {
        compliant: score >= 80,
        standard,
        checks,
        score,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error validating compliance:', error);
      throw error;
    }
  }

  private performCISChecks(template: IaCTemplate): ComplianceCheck[] {
    return [
      {
        checkId: 'CIS-1.1',
        name: 'Encryption at rest enabled',
        passed: template.content.includes('encrypt'),
        severity: 'HIGH',
        details: 'Data encryption at rest'
      },
      {
        checkId: 'CIS-1.2',
        name: 'No public access',
        passed: !template.content.includes('public-read'),
        severity: 'CRITICAL',
        details: 'Resources should not be publicly accessible'
      },
      {
        checkId: 'CIS-1.3',
        name: 'Logging enabled',
        passed: template.content.includes('logging') || template.content.includes('log'),
        severity: 'MEDIUM',
        details: 'Audit logging should be enabled'
      }
    ];
  }

  private performPCIDSSChecks(template: IaCTemplate): ComplianceCheck[] {
    return [
      {
        checkId: 'PCI-2.1',
        name: 'Strong encryption',
        passed: template.content.includes('AES256') || template.content.includes('encrypt'),
        severity: 'CRITICAL',
        details: 'Strong encryption required for cardholder data'
      },
      {
        checkId: 'PCI-2.2',
        name: 'Network segmentation',
        passed: template.content.includes('vpc') || template.content.includes('subnet'),
        severity: 'HIGH',
        details: 'Network segmentation required'
      }
    ];
  }

  private performHIPAAChecks(template: IaCTemplate): ComplianceCheck[] {
    return [
      {
        checkId: 'HIPAA-1.1',
        name: 'Data encryption',
        passed: template.content.includes('encrypt'),
        severity: 'CRITICAL',
        details: 'PHI must be encrypted'
      },
      {
        checkId: 'HIPAA-1.2',
        name: 'Access controls',
        passed: template.content.includes('iam') || template.content.includes('rbac'),
        severity: 'HIGH',
        details: 'Access controls must be implemented'
      }
    ];
  }

  // Generate Compliance Report
  async generateComplianceReport(templateId: string, standards: string[]): Promise<any> {
    try {
      const template: IaCTemplate = {
        id: templateId,
        name: 'Infrastructure Template',
        type: 'terraform',
        content: '',
        version: '1.0'
      };
      
      const results = await Promise.all(
        standards.map(standard => this.validateCompliance(template, standard))
      );
      
      return {
        templateId,
        timestamp: new Date(),
        standards: results,
        overallCompliance: results.every(r => r.compliant)
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }
}

export default new InfrastructureSecurityService();
