import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User, UserRole, UserStatus } from '@prisma/client'
import { logger } from './logger'

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  status: UserStatus
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Password hashing utilities
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS)
      return await bcrypt.hash(password, salt)
    } catch (error) {
      logger.error('Password hashing failed:', error)
      throw new Error('Password hashing failed')
    }
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      logger.error('Password verification failed:', error)
      return false
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' }
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }

    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' }
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' }
    }

    return { valid: true, message: 'Password is strong' }
  }
}

/**
 * JWT token utilities
 */
export class TokenUtils {
  /**
   * Generate JWT access token
   */
  static generateAccessToken(user: Pick<User, 'id' | 'email' | 'role' | 'status'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    }

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'mosaajii-pos',
      audience: 'mosaajii-pos-client'
    })
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      JWT_REFRESH_SECRET,
      {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'mosaajii-pos',
        audience: 'mosaajii-pos-client'
      }
    )
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(user: Pick<User, 'id' | 'email' | 'role' | 'status'>): TokenPair {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user.id)
    }
  }

  /**
   * Verify and decode JWT access token
   */
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'mosaajii-pos',
        audience: 'mosaajii-pos-client'
      }) as JWTPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token')
      } else {
        logger.error('Token verification failed:', error)
      }
      return null
    }
  }

  /**
   * Verify and decode JWT refresh token
   */
  static verifyRefreshToken(token: string): { userId: string; type: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'mosaajii-pos',
        audience: 'mosaajii-pos-client'
      }) as { userId: string; type: string }

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token')
      } else {
        logger.error('Refresh token verification failed:', error)
      }
      return null
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }

    return parts[1]
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any
      if (!decoded || !decoded.exp) {
        return null
      }
      return new Date(decoded.exp * 1000)
    } catch (error) {
      logger.error('Failed to decode token expiration:', error)
      return null
    }
  }
}

/**
 * Permission checking utilities
 */
export class PermissionUtils {
  /**
   * Check if user has required role (legacy support)
   */
  static hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.CASHIER]: 1,
      [UserRole.MANAGER]: 2,
      [UserRole.ADMIN]: 3
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  /**
   * Check if user can access resource (legacy support)
   */
  static canAccessResource(userRole: UserRole, resource: string, action: string): boolean {
    const permissions = {
      [UserRole.ADMIN]: ['*'],
      [UserRole.MANAGER]: [
        'users:read', 'users:create', 'users:update',
        'products:*', 'sales:*', 'reports:*', 'customers:*', 'suppliers:*'
      ],
      [UserRole.CASHIER]: [
        'products:read', 'sales:create', 'sales:read', 'customers:read', 'customers:create'
      ],
      [UserRole.VIEWER]: [
        'products:read', 'sales:read', 'reports:read', 'customers:read'
      ]
    }

    const userPermissions = permissions[userRole] || []
    const requiredPermission = `${resource}:${action}`

    return userPermissions.includes('*') || 
           userPermissions.includes(`${resource}:*`) || 
           userPermissions.includes(requiredPermission)
  }

  /**
   * Check if user status allows access
   */
  static isUserActive(status: UserStatus): boolean {
    return status === UserStatus.ACTIVE
  }

  /**
   * Check if user has specific permission based on role assignments
   * This is the new role-based permission system
   */
  static async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const { RoleService } = await import('../services/roleService')
      return await RoleService.userHasPermission(userId, resource, action)
    } catch (error) {
      logger.error('Permission check error:', error)
      return false
    }
  }

  /**
   * Get user permissions based on role assignments
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const { RoleService } = await import('../services/roleService')
      const result = await RoleService.getUserRolesAndPermissions(userId)
      
      if (result.success && result.permissions) {
        return result.permissions.map(p => `${p.resource}:${p.action}`)
      }
      
      return []
    } catch (error) {
      logger.error('Get user permissions error:', error)
      return []
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const [resource, action] = permission.split(':')
        if (await this.hasPermission(userId, resource, action)) {
          return true
        }
      }
      return false
    } catch (error) {
      logger.error('Has any permission check error:', error)
      return false
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const [resource, action] = permission.split(':')
        if (!(await this.hasPermission(userId, resource, action))) {
          return false
        }
      }
      return true
    } catch (error) {
      logger.error('Has all permissions check error:', error)
      return false
    }
  }
}