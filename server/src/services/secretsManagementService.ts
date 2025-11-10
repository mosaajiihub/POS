import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface Secret {
  id: string;
  name: string;
  value: string;
  type: 'api_key' | 'password' | 'certificate' | 'token' | 'connection_string';
  encrypted: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rotationPolicy?: RotationPolicy;
  metadata: Record<string, any>;
}

interface RotationPolicy {
  enabled: boolean;
  intervalDays: number;
  lastRotated?: Date;
  nextRotation?: Date;
}

interface SecretAccessLog {
  id: string;
  secretId: string;
  userId: string;
  action: 'read' | 'write' | 'delete' | 'rotate';
  timestamp: Date;
  ipAddress: string;
  success: boolean;
}

interface SecretScanResult {
  scannedAt: Date;
  totalFiles: number;
  leaksFound: number;
  leaks: SecretLeak[];
}

interface SecretLeak {
  file: string;
  line: number;
  type: string;
  pattern: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

class SecretsManagementService {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor() {
    // In production, this should come from a secure key management service
    this.encryptionKey = crypto.scryptSync(
      process.env.SECRETS_MASTER_KEY || 'default-master-key-change-in-production',
      'salt',
      32
    );
  }

  // Secret Storage
  async storeSecret(
    name: string,
    value: string,
    type: Secret['type'],
    options?: {
      expiresAt?: Date;
      rotationPolicy?: RotationPolicy;
      metadata?: Record<string, any>;
    }
  ): Promise<Secret> {
    try {
      logger.info(`Storing secret: ${name}`);

      // Encrypt the secret value
      const encryptedValue = this.encryptSecret(value);

      const secret: Secret = {
        id: this.generateId(),
        name,
        value: encryptedValue,
        type,
        encrypted: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: options?.expiresAt,
        rotationPolicy: options?.rotationPolicy,
        metadata: options?.metadata || {}
      };

      // Store in secure storage
      await this.persistSecret(secret);

      // Log access
      await this.logSecretAccess(secret.id, 'write', true);

      return secret;
    } catch (error) {
      logger.error('Error storing secret:', error);
      throw error;
    }
  }

  async retrieveSecret(secretId: string, userId: string): Promise<string> {
    try {
      logger.info(`Retrieving secret: ${secretId}`);

      // Check access permissions
      const hasAccess = await this.checkSecretAccess(secretId, userId);
      if (!hasAccess) {
        await this.logSecretAccess(secretId, 'read', false);
        throw new Error('Access denied');
      }

      // Retrieve secret
      const secret = await this.getSecretById(secretId);
      if (!secret) {
        throw new Error('Secret not found');
      }

      // Check expiration
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        throw new Error('Secret has expired');
      }

      // Decrypt value
      const decryptedValue = this.decryptSecret(secret.value);

      // Log access
      await this.logSecretAccess(secretId, 'read', true);

      return decryptedValue;
    } catch (error) {
      logger.error('Error retrieving secret:', error);
      throw error;
    }
  }

  async deleteSecret(secretId: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting secret: ${secretId}`);

      // Check access permissions
      const hasAccess = await this.checkSecretAccess(secretId, userId);
      if (!hasAccess) {
        await this.logSecretAccess(secretId, 'delete', false);
        throw new Error('Access denied');
      }

      // Delete secret
      await this.removeSecret(secretId);

      // Log access
      await this.logSecretAccess(secretId, 'delete', true);
    } catch (error) {
      logger.error('Error deleting secret:', error);
      throw error;
    }
  }

  // Encryption/Decryption
  private encryptSecret(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + AuthTag + Encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptSecret(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Secret Rotation
  async rotateSecret(secretId: string, newValue: string): Promise<Secret> {
    try {
      logger.info(`Rotating secret: ${secretId}`);

      const secret = await this.getSecretById(secretId);
      if (!secret) {
        throw new Error('Secret not found');
      }

      // Encrypt new value
      const encryptedValue = this.encryptSecret(newValue);

      // Update secret
      const updatedSecret: Secret = {
        ...secret,
        value: encryptedValue,
        version: secret.version + 1,
        updatedAt: new Date()
      };

      if (updatedSecret.rotationPolicy) {
        updatedSecret.rotationPolicy.lastRotated = new Date();
        updatedSecret.rotationPolicy.nextRotation = new Date(
          Date.now() + updatedSecret.rotationPolicy.intervalDays * 24 * 60 * 60 * 1000
        );
      }

      await this.persistSecret(updatedSecret);

      // Log rotation
      await this.logSecretAccess(secretId, 'rotate', true);

      return updatedSecret;
    } catch (error) {
      logger.error('Error rotating secret:', error);
      throw error;
    }
  }

  async checkRotationNeeded(): Promise<Secret[]> {
    try {
      const secrets = await this.getAllSecrets();
      const needsRotation: Secret[] = [];

      for (const secret of secrets) {
        if (secret.rotationPolicy?.enabled) {
          const nextRotation = secret.rotationPolicy.nextRotation;
          if (nextRotation && nextRotation <= new Date()) {
            needsRotation.push(secret);
          }
        }
      }

      return needsRotation;
    } catch (error) {
      logger.error('Error checking rotation:', error);
      throw error;
    }
  }

  async autoRotateSecrets(): Promise<{ rotated: number; failed: number }> {
    try {
      logger.info('Starting automatic secret rotation');

      const secretsToRotate = await this.checkRotationNeeded();
      let rotated = 0;
      let failed = 0;

      for (const secret of secretsToRotate) {
        try {
          // Generate new secret value based on type
          const newValue = this.generateSecretValue(secret.type);
          await this.rotateSecret(secret.id, newValue);
          rotated++;
        } catch (error) {
          logger.error(`Failed to rotate secret ${secret.id}:`, error);
          failed++;
        }
      }

      logger.info(`Secret rotation complete: ${rotated} rotated, ${failed} failed`);
      return { rotated, failed };
    } catch (error) {
      logger.error('Error in auto-rotation:', error);
      throw error;
    }
  }

  private generateSecretValue(type: Secret['type']): string {
    switch (type) {
      case 'api_key':
        return crypto.randomBytes(32).toString('hex');
      case 'password':
        return this.generateStrongPassword();
      case 'token':
        return crypto.randomBytes(64).toString('base64');
      default:
        return crypto.randomBytes(32).toString('hex');
    }
  }

  private generateStrongPassword(): string {
    const length = 32;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  // Access Control
  private async checkSecretAccess(secretId: string, userId: string): Promise<boolean> {
    // In production, implement proper RBAC/ABAC
    return true;
  }

  // Audit Logging
  private async logSecretAccess(
    secretId: string,
    action: SecretAccessLog['action'],
    success: boolean
  ): Promise<void> {
    const log: SecretAccessLog = {
      id: this.generateId(),
      secretId,
      userId: 'system', // Should come from authenticated user
      action,
      timestamp: new Date(),
      ipAddress: '0.0.0.0', // Should come from request
      success
    };

    logger.info('Secret access logged', {
      secretId: log.secretId,
      action: log.action,
      success: log.success
    });
  }

  async getSecretAccessLogs(secretId: string): Promise<SecretAccessLog[]> {
    // In production, retrieve from database
    return [];
  }

  // Secret Scanning
  async scanForSecretLeaks(directory: string): Promise<SecretScanResult> {
    try {
      logger.info(`Scanning for secret leaks in: ${directory}`);

      const leaks: SecretLeak[] = [];

      // Common secret patterns
      const patterns = [
        { type: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'CRITICAL' as const },
        { type: 'API Key', regex: /api[_-]?key[_-]?=\s*['"][^'"]+['"]/, severity: 'HIGH' as const },
        { type: 'Password', regex: /password[_-]?=\s*['"][^'"]+['"]/, severity: 'HIGH' as const },
        { type: 'Private Key', regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, severity: 'CRITICAL' as const },
        { type: 'JWT Token', regex: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, severity: 'HIGH' as const },
        { type: 'Database URL', regex: /(mongodb|mysql|postgresql):\/\/[^\s]+/, severity: 'CRITICAL' as const }
      ];

      // In production, scan actual files
      // This is a placeholder implementation

      const result: SecretScanResult = {
        scannedAt: new Date(),
        totalFiles: 0,
        leaksFound: leaks.length,
        leaks
      };

      if (leaks.length > 0) {
        logger.warn(`Found ${leaks.length} potential secret leaks`);
      }

      return result;
    } catch (error) {
      logger.error('Error scanning for leaks:', error);
      throw error;
    }
  }

  // Storage helpers (in production, use actual database)
  private secretsStore = new Map<string, Secret>();

  private async persistSecret(secret: Secret): Promise<void> {
    this.secretsStore.set(secret.id, secret);
  }

  private async getSecretById(secretId: string): Promise<Secret | null> {
    return this.secretsStore.get(secretId) || null;
  }

  private async getAllSecrets(): Promise<Secret[]> {
    return Array.from(this.secretsStore.values());
  }

  private async removeSecret(secretId: string): Promise<void> {
    this.secretsStore.delete(secretId);
  }

  private generateId(): string {
    return `secret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new SecretsManagementService();
