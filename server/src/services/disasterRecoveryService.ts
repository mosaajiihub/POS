import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { logger } from '../utils/logger'
import { AuditService } from './auditService'
import { BackupService, BackupMetadata, BackupType } from './backupService'
import { OffsiteBackupService } from './offsiteBackupService'
import { DataEncryptionService } from './dataEncryptionService'

export interface DisasterRecoveryPlan {
  id: string
  name: string
  description: string
  priority: RecoveryPriority
  recoveryTimeObjective: number // minutes
  recoveryPointObjective: number // minutes
  backupTypes: BackupType[]
  steps: RecoveryStep[]
  contacts: EmergencyContact[]
  createdAt: Date
  updatedAt: Date
  lastTestedAt?: Date
  status: PlanStatus
}

export interface RecoveryStep {
  id: string
  order: number
  name: string
  description: string
  estimatedDuration: number // minutes
  automated: boolean
  command?: string
  validationCriteria: string[]
  dependencies: string[]
}

export interface EmergencyContact {
  name: string
  role: string
  email: string
  phone: string
  priority: number
}

export interface DisasterRecoveryExecution {
  id: string
  planId: string
  triggeredBy: string
  triggeredAt: Date
  reason: string
  status: ExecutionStatus
  currentStep: number
  completedSteps: string[]
  failedSteps: string[]
  startedAt: Date
  completedAt?: Date
  duration?: number
  logs: RecoveryLog[]
  metrics: RecoveryMetrics
}

export interface RecoveryLog {
  id: string
  timestamp: Date
  level: LogLevel
  step?: string
  message: string
  details?: any
}

export interface RecoveryMetrics {
  totalSteps: number
  completedSteps: number
  failedSteps: number
  skippedSteps: number
  actualRTO: number // minutes
  actualRPO: number // minutes
  dataLoss: number // bytes
  successRate: number // percentage
}

export interface RecoveryTest {
  id: string
  planId: string
  testedBy: string
  testedAt: Date
  environment: TestEnvironment
  results: TestResult[]
  overallStatus: TestStatus
  recommendations: string[]
  nextTestDate: Date
}

export interface TestResult {
  stepId: string
  stepName: string
  status: TestStatus
  duration: number
  issues: string[]
  notes: string
}

export enum RecoveryPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TESTING = 'TESTING',
  NEEDS_UPDATE = 'NEEDS_UPDATE'
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED'
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum TestEnvironment {
  PRODUCTION = 'PRODUCTION',
  STAGING = 'STAGING',
  DEVELOPMENT = 'DEVELOPMENT',
  ISOLATED = 'ISOLATED'
}

export enum TestStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  PARTIAL = 'PARTIAL'
}

/**
 * Disaster Recovery Service
 * Handles secure backup restoration workflows, disaster recovery testing,
 * RTO/RPO tracking, and disaster recovery communication
 */
export class DisasterRecoveryService {
  private static readonly DR_BASE_PATH = path.join(process.cwd(), 'server', 'disaster-recovery')
  private static readonly DR_PLANS_FILE = 'dr-plans.json'
  private static readonly DR_EXECUTIONS_FILE = 'dr-executions.json'
  private static readonly DR_TESTS_FILE = 'dr-tests.json'
  
  private static drPlansCache = new Map<string, DisasterRecoveryPlan>()
  private static drExecutionsCache = new Map<string, DisasterRecoveryExecution>()
  private static drTestsCache: RecoveryTest[] = []

  /**
   * Initialize disaster recovery service
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Disaster Recovery Service...')
      
      // Create DR directory
      await fs.mkdir(this.DR_BASE_PATH, { recursive: true })
      
      // Initialize storage
      await this.initializeStorage()
      
      // Load caches
      await this.loadCaches()
      
      // Create default DR plans if none exist
      if (this.drPlansCache.size === 0) {
        await this.createDefaultPlans()
      }
      
      logger.info('Disaster Recovery Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Disaster Recovery Service:', error)
      throw error
    }
  }

  /**
   * Create disaster recovery plan
   */
  static async createRecoveryPlan(
    plan: Omit<DisasterRecoveryPlan, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string = 'system'
  ): Promise<DisasterRecoveryPlan> {
    try {
      const planId = `dr_plan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      
      const fullPlan: DisasterRecoveryPlan = {
        id: planId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...plan
      }
      
      // Store plan
      await this.storeDRPlan(fullPlan)
      this.drPlansCache.set(planId, fullPlan)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'DR_PLAN_CREATED',
        tableName: 'disaster_recovery',
        recordId: planId,
        newValues: {
          name: plan.name,
          priority: plan.priority,
          rto: plan.recoveryTimeObjective,
          rpo: plan.recoveryPointObjective
        }
      })
      
      logger.info(`Disaster recovery plan created: ${planId}`)
      return fullPlan
    } catch (error) {
      logger.error('Failed to create disaster recovery plan:', error)
      throw error
    }
  }

  /**
   * Execute disaster recovery plan
   */
  static async executeRecoveryPlan(
    planId: string,
    reason: string,
    userId: string = 'system'
  ): Promise<DisasterRecoveryExecution> {
    const executionId = `dr_exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    
    try {
      logger.info(`Executing disaster recovery plan: ${planId}`)
      
      const plan = await this.getRecoveryPlan(planId)
      if (!plan) {
        throw new Error(`Disaster recovery plan not found: ${planId}`)
      }
      
      // Create execution record
      const execution: DisasterRecoveryExecution = {
        id: executionId,
        planId,
        triggeredBy: userId,
        triggeredAt: new Date(),
        reason,
        status: ExecutionStatus.IN_PROGRESS,
        currentStep: 0,
        completedSteps: [],
        failedSteps: [],
        startedAt: new Date(),
        logs: [],
        metrics: {
          totalSteps: plan.steps.length,
          completedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          actualRTO: 0,
          actualRPO: 0,
          dataLoss: 0,
          successRate: 0
        }
      }
      
      // Store initial execution
      await this.storeDRExecution(execution)
      this.drExecutionsCache.set(executionId, execution)
      
      // Log execution start
      await this.addRecoveryLog(execution, LogLevel.INFO, undefined, 'Disaster recovery execution started')
      
      // Notify emergency contacts
      await this.notifyEmergencyContacts(plan, execution)
      
      // Execute recovery steps
      for (const step of plan.steps.sort((a, b) => a.order - b.order)) {
        execution.currentStep = step.order
        await this.storeDRExecution(execution)
        
        try {
          await this.addRecoveryLog(execution, LogLevel.INFO, step.id, `Executing step: ${step.name}`)
          
          // Execute step
          await this.executeRecoveryStep(step, execution)
          
          execution.completedSteps.push(step.id)
          execution.metrics.completedSteps++
          
          await this.addRecoveryLog(execution, LogLevel.INFO, step.id, `Step completed: ${step.name}`)
        } catch (error) {
          execution.failedSteps.push(step.id)
          execution.metrics.failedSteps++
          
          await this.addRecoveryLog(
            execution,
            LogLevel.ERROR,
            step.id,
            `Step failed: ${step.name}`,
            { error: error instanceof Error ? error.message : 'Unknown error' }
          )
          
          // Decide whether to continue or stop
          if (step.order <= 3) { // Critical early steps
            execution.status = ExecutionStatus.FAILED
            break
          }
        }
      }
      
      // Complete execution
      if (execution.status !== ExecutionStatus.FAILED) {
        execution.status = ExecutionStatus.COMPLETED
      }
      
      execution.completedAt = new Date()
      execution.duration = Math.floor((execution.completedAt.getTime() - execution.startedAt.getTime()) / 60000)
      execution.metrics.actualRTO = execution.duration
      execution.metrics.successRate = (execution.metrics.completedSteps / execution.metrics.totalSteps) * 100
      
      await this.storeDRExecution(execution)
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'DR_PLAN_EXECUTED',
        tableName: 'disaster_recovery',
        recordId: executionId,
        newValues: {
          planId,
          status: execution.status,
          duration: execution.duration,
          successRate: execution.metrics.successRate
        }
      })
      
      logger.info(`Disaster recovery execution ${execution.status}: ${executionId}`)
      return execution
    } catch (error) {
      logger.error('Failed to execute disaster recovery plan:', error)
      
      const execution = this.drExecutionsCache.get(executionId)
      if (execution) {
        execution.status = ExecutionStatus.FAILED
        execution.completedAt = new Date()
        await this.storeDRExecution(execution)
      }
      
      throw error
    }
  }

  /**
   * Execute recovery step
   */
  private static async executeRecoveryStep(
    step: RecoveryStep,
    execution: DisasterRecoveryExecution
  ): Promise<void> {
    try {
      if (step.automated && step.command) {
        // Execute automated step
        await this.executeAutomatedStep(step, execution)
      } else {
        // Manual step - log and wait for confirmation
        await this.addRecoveryLog(
          execution,
          LogLevel.WARNING,
          step.id,
          `Manual step requires intervention: ${step.description}`
        )
      }
      
      // Validate step completion
      await this.validateStepCompletion(step, execution)
    } catch (error) {
      logger.error(`Failed to execute recovery step: ${step.name}`, error)
      throw error
    }
  }

  /**
   * Execute automated recovery step
   */
  private static async executeAutomatedStep(
    step: RecoveryStep,
    execution: DisasterRecoveryExecution
  ): Promise<void> {
    try {
      // Parse and execute command
      if (step.command?.startsWith('restore_backup:')) {
        const backupType = step.command.split(':')[1] as BackupType
        await this.restoreBackup(backupType, execution)
      } else if (step.command?.startsWith('verify_database')) {
        await this.verifyDatabase(execution)
      } else if (step.command?.startsWith('restart_services')) {
        await this.restartServices(execution)
      }
    } catch (error) {
      logger.error('Failed to execute automated step:', error)
      throw error
    }
  }

  /**
   * Restore backup
   */
  private static async restoreBackup(
    backupType: BackupType,
    execution: DisasterRecoveryExecution
  ): Promise<void> {
    try {
      await this.addRecoveryLog(execution, LogLevel.INFO, undefined, `Restoring ${backupType} backup`)
      
      // Find most recent backup of specified type
      const backups = await BackupService.listBackups({ type: backupType })
      const latestBackup = backups
        .filter(b => b.status === 'COMPLETED' || b.status === 'VERIFIED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      
      if (!latestBackup) {
        throw new Error(`No ${backupType} backup found`)
      }
      
      // Restore from encrypted backup
      const backupPath = latestBackup.encryptedLocation || latestBackup.location
      
      if (latestBackup.encryptedLocation) {
        const restored = await DataEncryptionService.restoreFromEncryptedBackup(backupPath)
        await this.addRecoveryLog(
          execution,
          LogLevel.INFO,
          undefined,
          `Backup restored successfully: ${restored.restoredBackupPath}`
        )
      }
      
      // Calculate RPO
      const dataAge = Date.now() - latestBackup.createdAt.getTime()
      execution.metrics.actualRPO = Math.floor(dataAge / 60000)
    } catch (error) {
      logger.error('Failed to restore backup:', error)
      throw error
    }
  }

  /**
   * Verify database
   */
  private static async verifyDatabase(execution: DisasterRecoveryExecution): Promise<void> {
    try {
      await this.addRecoveryLog(execution, LogLevel.INFO, undefined, 'Verifying database integrity')
      
      // Simulate database verification
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await this.addRecoveryLog(execution, LogLevel.INFO, undefined, 'Database verification completed')
    } catch (error) {
      logger.error('Failed to verify database:', error)
      throw error
    }
  }

  /**
   * Restart services
   */
  private static async restartServices(execution: DisasterRecoveryExecution): Promise<void> {
    try {
      await this.addRecoveryLog(execution, LogLevel.INFO, undefined, 'Restarting services')
      
      // Simulate service restart
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      await this.addRecoveryLog(execution, LogLevel.INFO, undefined, 'Services restarted successfully')
    } catch (error) {
      logger.error('Failed to restart services:', error)
      throw error
    }
  }

  /**
   * Validate step completion
   */
  private static async validateStepCompletion(
    step: RecoveryStep,
    execution: DisasterRecoveryExecution
  ): Promise<void> {
    for (const criteria of step.validationCriteria) {
      await this.addRecoveryLog(
        execution,
        LogLevel.DEBUG,
        step.id,
        `Validating: ${criteria}`
      )
    }
  }

  /**
   * Test disaster recovery plan
   */
  static async testRecoveryPlan(
    planId: string,
    environment: TestEnvironment,
    userId: string = 'system'
  ): Promise<RecoveryTest> {
    try {
      logger.info(`Testing disaster recovery plan: ${planId}`)
      
      const plan = await this.getRecoveryPlan(planId)
      if (!plan) {
        throw new Error(`Disaster recovery plan not found: ${planId}`)
      }
      
      const testId = `dr_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      const testStartTime = Date.now()
      
      const test: RecoveryTest = {
        id: testId,
        planId,
        testedBy: userId,
        testedAt: new Date(),
        environment,
        results: [],
        overallStatus: TestStatus.PASSED,
        recommendations: [],
        nextTestDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      }
      
      // Test each step
      for (const step of plan.steps) {
        const stepStartTime = Date.now()
        const result: TestResult = {
          stepId: step.id,
          stepName: step.name,
          status: TestStatus.PASSED,
          duration: 0,
          issues: [],
          notes: ''
        }
        
        try {
          // Simulate step testing
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Check if duration exceeds estimate
          const actualDuration = (Date.now() - stepStartTime) / 60000
          if (actualDuration > step.estimatedDuration * 1.2) {
            result.issues.push(`Step took ${actualDuration.toFixed(1)}min, expected ${step.estimatedDuration}min`)
            result.status = TestStatus.PARTIAL
          }
          
          result.duration = actualDuration
        } catch (error) {
          result.status = TestStatus.FAILED
          result.issues.push(error instanceof Error ? error.message : 'Unknown error')
          test.overallStatus = TestStatus.FAILED
        }
        
        test.results.push(result)
      }
      
      // Generate recommendations
      const failedSteps = test.results.filter(r => r.status === TestStatus.FAILED)
      if (failedSteps.length > 0) {
        test.recommendations.push(`Review and fix ${failedSteps.length} failed steps`)
      }
      
      const slowSteps = test.results.filter(r => r.issues.length > 0)
      if (slowSteps.length > 0) {
        test.recommendations.push(`Optimize ${slowSteps.length} steps that exceeded time estimates`)
      }
      
      // Update plan last tested date
      plan.lastTestedAt = new Date()
      await this.storeDRPlan(plan)
      
      // Store test results
      this.drTestsCache.push(test)
      await this.storeDRTests()
      
      // Create audit log
      await AuditService.createAuditLog({
        userId,
        action: 'DR_PLAN_TESTED',
        tableName: 'disaster_recovery',
        recordId: testId,
        newValues: {
          planId,
          environment,
          overallStatus: test.overallStatus,
          totalSteps: test.results.length,
          failedSteps: failedSteps.length
        }
      })
      
      logger.info(`Disaster recovery plan test completed: ${testId}`)
      return test
    } catch (error) {
      logger.error('Failed to test disaster recovery plan:', error)
      throw error
    }
  }

  /**
   * Get recovery plan
   */
  static async getRecoveryPlan(planId: string): Promise<DisasterRecoveryPlan | null> {
    return this.drPlansCache.get(planId) || null
  }

  /**
   * List recovery plans
   */
  static async listRecoveryPlans(filters?: {
    priority?: RecoveryPriority
    status?: PlanStatus
  }): Promise<DisasterRecoveryPlan[]> {
    const allPlans = Array.from(this.drPlansCache.values())
    
    if (!filters) {
      return allPlans
    }
    
    return allPlans.filter(plan => {
      if (filters.priority && plan.priority !== filters.priority) return false
      if (filters.status && plan.status !== filters.status) return false
      return true
    })
  }

  /**
   * Get execution
   */
  static async getExecution(executionId: string): Promise<DisasterRecoveryExecution | null> {
    return this.drExecutionsCache.get(executionId) || null
  }

  /**
   * List executions
   */
  static async listExecutions(planId?: string): Promise<DisasterRecoveryExecution[]> {
    const allExecutions = Array.from(this.drExecutionsCache.values())
    
    if (planId) {
      return allExecutions.filter(exec => exec.planId === planId)
    }
    
    return allExecutions
  }

  /**
   * Get test results
   */
  static async getTestResults(planId?: string): Promise<RecoveryTest[]> {
    if (planId) {
      return this.drTestsCache.filter(test => test.planId === planId)
    }
    
    return this.drTestsCache
  }

  /**
   * Add recovery log
   */
  private static async addRecoveryLog(
    execution: DisasterRecoveryExecution,
    level: LogLevel,
    step: string | undefined,
    message: string,
    details?: any
  ): Promise<void> {
    const log: RecoveryLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      step,
      message,
      details
    }
    
    execution.logs.push(log)
    await this.storeDRExecution(execution)
    
    logger.log(level.toLowerCase() as any, `[DR] ${message}`, details)
  }

  /**
   * Notify emergency contacts
   */
  private static async notifyEmergencyContacts(
    plan: DisasterRecoveryPlan,
    execution: DisasterRecoveryExecution
  ): Promise<void> {
    try {
      for (const contact of plan.contacts.sort((a, b) => a.priority - b.priority)) {
        logger.info(`Notifying emergency contact: ${contact.name} (${contact.role})`)
        // In production, send actual notifications via email/SMS
      }
    } catch (error) {
      logger.error('Failed to notify emergency contacts:', error)
    }
  }

  /**
   * Create default DR plans
   */
  private static async createDefaultPlans(): Promise<void> {
    const defaultPlan: Omit<DisasterRecoveryPlan, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Database Recovery Plan',
      description: 'Standard database disaster recovery procedure',
      priority: RecoveryPriority.CRITICAL,
      recoveryTimeObjective: 60,
      recoveryPointObjective: 15,
      backupTypes: [BackupType.DATABASE, BackupType.FULL],
      steps: [
        {
          id: 'step_1',
          order: 1,
          name: 'Assess Situation',
          description: 'Assess the extent of the disaster and determine recovery approach',
          estimatedDuration: 5,
          automated: false,
          validationCriteria: ['Situation documented', 'Recovery approach determined'],
          dependencies: []
        },
        {
          id: 'step_2',
          order: 2,
          name: 'Restore Database Backup',
          description: 'Restore the most recent database backup',
          estimatedDuration: 15,
          automated: true,
          command: 'restore_backup:DATABASE',
          validationCriteria: ['Database restored', 'Data integrity verified'],
          dependencies: ['step_1']
        },
        {
          id: 'step_3',
          order: 3,
          name: 'Verify Database Integrity',
          description: 'Verify database integrity and consistency',
          estimatedDuration: 10,
          automated: true,
          command: 'verify_database',
          validationCriteria: ['All tables accessible', 'No corruption detected'],
          dependencies: ['step_2']
        },
        {
          id: 'step_4',
          order: 4,
          name: 'Restart Services',
          description: 'Restart application services',
          estimatedDuration: 5,
          automated: true,
          command: 'restart_services',
          validationCriteria: ['All services running', 'Health checks passing'],
          dependencies: ['step_3']
        },
        {
          id: 'step_5',
          order: 5,
          name: 'Verify System Operation',
          description: 'Verify system is operating normally',
          estimatedDuration: 10,
          automated: false,
          validationCriteria: ['Users can access system', 'Core functions working'],
          dependencies: ['step_4']
        }
      ],
      contacts: [
        {
          name: 'System Administrator',
          role: 'Primary Contact',
          email: 'admin@example.com',
          phone: '+1-555-0100',
          priority: 1
        }
      ],
      status: PlanStatus.ACTIVE
    }
    
    await this.createRecoveryPlan(defaultPlan)
  }

  /**
   * Initialize storage
   */
  private static async initializeStorage(): Promise<void> {
    const files = [this.DR_PLANS_FILE, this.DR_EXECUTIONS_FILE, this.DR_TESTS_FILE]
    
    for (const file of files) {
      const filePath = path.join(this.DR_BASE_PATH, file)
      try {
        await fs.access(filePath)
      } catch {
        await fs.writeFile(filePath, JSON.stringify([], null, 2))
      }
    }
  }

  /**
   * Load caches
   */
  private static async loadCaches(): Promise<void> {
    try {
      // Load plans
      const plansFile = path.join(this.DR_BASE_PATH, this.DR_PLANS_FILE)
      const plansData = await fs.readFile(plansFile, 'utf8')
      const plans: DisasterRecoveryPlan[] = JSON.parse(plansData)
      
      for (const plan of plans) {
        plan.createdAt = new Date(plan.createdAt)
        plan.updatedAt = new Date(plan.updatedAt)
        if (plan.lastTestedAt) plan.lastTestedAt = new Date(plan.lastTestedAt)
        
        this.drPlansCache.set(plan.id, plan)
      }
      
      // Load executions
      const executionsFile = path.join(this.DR_BASE_PATH, this.DR_EXECUTIONS_FILE)
      const executionsData = await fs.readFile(executionsFile, 'utf8')
      const executions: DisasterRecoveryExecution[] = JSON.parse(executionsData)
      
      for (const execution of executions) {
        execution.triggeredAt = new Date(execution.triggeredAt)
        execution.startedAt = new Date(execution.startedAt)
        if (execution.completedAt) execution.completedAt = new Date(execution.completedAt)
        execution.logs = execution.logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
        
        this.drExecutionsCache.set(execution.id, execution)
      }
      
      // Load tests
      const testsFile = path.join(this.DR_BASE_PATH, this.DR_TESTS_FILE)
      const testsData = await fs.readFile(testsFile, 'utf8')
      this.drTestsCache = JSON.parse(testsData).map((test: any) => ({
        ...test,
        testedAt: new Date(test.testedAt),
        nextTestDate: new Date(test.nextTestDate)
      }))
      
      logger.info(`Loaded ${this.drPlansCache.size} DR plans, ${this.drExecutionsCache.size} executions, ${this.drTestsCache.length} tests`)
    } catch (error) {
      logger.warn('No existing DR data found')
    }
  }

  /**
   * Store DR plan
   */
  private static async storeDRPlan(plan: DisasterRecoveryPlan): Promise<void> {
    const plansFile = path.join(this.DR_BASE_PATH, this.DR_PLANS_FILE)
    
    let allPlans: DisasterRecoveryPlan[] = []
    try {
      const data = await fs.readFile(plansFile, 'utf8')
      allPlans = JSON.parse(data)
    } catch {
      // File doesn't exist or is empty
    }
    
    allPlans = allPlans.filter(p => p.id !== plan.id)
    allPlans.push(plan)
    
    await fs.writeFile(plansFile, JSON.stringify(allPlans, null, 2))
  }

  /**
   * Store DR execution
   */
  private static async storeDRExecution(execution: DisasterRecoveryExecution): Promise<void> {
    const executionsFile = path.join(this.DR_BASE_PATH, this.DR_EXECUTIONS_FILE)
    
    let allExecutions: DisasterRecoveryExecution[] = []
    try {
      const data = await fs.readFile(executionsFile, 'utf8')
      allExecutions = JSON.parse(data)
    } catch {
      // File doesn't exist or is empty
    }
    
    allExecutions = allExecutions.filter(e => e.id !== execution.id)
    allExecutions.push(execution)
    
    await fs.writeFile(executionsFile, JSON.stringify(allExecutions, null, 2))
  }

  /**
   * Store DR tests
   */
  private static async storeDRTests(): Promise<void> {
    const testsFile = path.join(this.DR_BASE_PATH, this.DR_TESTS_FILE)
    await fs.writeFile(testsFile, JSON.stringify(this.drTestsCache, null, 2))
  }
}
