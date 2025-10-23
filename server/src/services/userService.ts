import { User, UserRole, UserStatus } from '@prisma/client'
import { prisma } from '../config/database'
import { PaymentService } from './paymentService'
import { NotificationService } from './notificationService'
import { PasswordUtils } from '../utils/auth'
import { logger } from '../utils/logger'

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
  sendWelcomeEmail?: boolean
}

export interface UpdateUserData {
  email?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  status?: UserStatus
  paymentVerified?: boolean
}

export interface UserResult {
  success: boolean
  message: string
  user?: Omit<User, 'passwordHash'>
}

export interface UserListResult {
  success: boolean
  message: string
  users?: Omit<User, 'passwordHash'>[]
  total?: number
  page?: number
  limit?: number
}

export interface UserFilters {
  role?: UserRole
  status?: UserStatus
  paymentVerified?: boolean
  search?: string
  page?: number
  limit?: number
}

/**
 * User Management Service
 * Handles user CRUD operations with payment verification integration
 */
export class UserService {
  /**
   * Create a new user (admin only)
   */
  static async createUser(userData: CreateUserData, adminUserId: string): Promise<UserResult> {
    try {
      const { email, password, firstName, lastName, role = UserRole.CASHIER, sendWelcomeEmail = true } = userData

      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== UserRole.ADMIN) {
        return {
          success: false,
          message: 'Insufficient permissions to create user'
        }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        }
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(password)
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message
        }
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(password)

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          role,
          status: UserStatus.PENDING, // User starts as pending until payment verification
          paymentVerified: false
        }
      })

      // Send welcome email if requested
      if (sendWelcomeEmail) {
        const userName = `${firstName} ${lastName}`
        await NotificationService.sendWelcomeEmail(email, userName)
      }

      // Remove sensitive data
      const { passwordHash: _, ...userWithoutPassword } = newUser

      logger.info(`New user created: ${newUser.id} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'User created successfully. Payment verification required for activation.',
        user: userWithoutPassword
      }
    } catch (error) {
      logger.error('Create user error:', error)
      return {
        success: false,
        message: 'An error occurred while creating user'
      }
    }
  }

  /**
   * Update user information (admin only)
   */
  static async updateUser(userId: string, updateData: UpdateUserData, adminUserId: string): Promise<UserResult> {
    try {
      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== UserRole.ADMIN) {
        return {
          success: false,
          message: 'Insufficient permissions to update user'
        }
      }

      // Find user to update
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check if email is being changed and if it's already taken
      if (updateData.email && updateData.email.toLowerCase() !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email.toLowerCase() }
        })

        if (emailExists) {
          return {
            success: false,
            message: 'Email is already taken by another user'
          }
        }
      }

      // Prepare update data
      const updatePayload: any = {}

      if (updateData.email) {
        updatePayload.email = updateData.email.toLowerCase()
      }

      if (updateData.firstName) {
        updatePayload.firstName = updateData.firstName
      }

      if (updateData.lastName) {
        updatePayload.lastName = updateData.lastName
      }

      if (updateData.role) {
        updatePayload.role = updateData.role
      }

      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status
      }

      if (updateData.paymentVerified !== undefined) {
        updatePayload.paymentVerified = updateData.paymentVerified
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatePayload
      })

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser

      logger.info(`User updated: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'User updated successfully',
        user: userWithoutPassword
      }
    } catch (error) {
      logger.error('Update user error:', error)
      return {
        success: false,
        message: 'An error occurred while updating user'
      }
    }
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<UserResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = user

      return {
        success: true,
        message: 'User retrieved successfully',
        user: userWithoutPassword
      }
    } catch (error) {
      logger.error('Get user error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving user'
      }
    }
  }

  /**
   * Get users with filtering and pagination
   */
  static async getUsers(filters: UserFilters = {}): Promise<UserListResult> {
    try {
      const {
        role,
        status,
        paymentVerified,
        search,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (role) {
        where.role = role
      }

      if (status) {
        where.status = status
      }

      if (paymentVerified !== undefined) {
        where.paymentVerified = paymentVerified
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get users and total count
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            paymentVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ])

      return {
        success: true,
        message: 'Users retrieved successfully',
        users,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get users error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving users'
      }
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(userId: string, adminUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== UserRole.ADMIN) {
        return {
          success: false,
          message: 'Insufficient permissions to delete user'
        }
      }

      // Check if user exists
      const userToDelete = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!userToDelete) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Prevent admin from deleting themselves
      if (userId === adminUserId) {
        return {
          success: false,
          message: 'Cannot delete your own account'
        }
      }

      // Check if user has any sales or other related data
      const userSales = await prisma.sale.count({
        where: { cashierId: userId }
      })

      if (userSales > 0) {
        return {
          success: false,
          message: 'Cannot delete user with existing sales records. Consider deactivating instead.'
        }
      }

      // Delete user (this will cascade to related records based on schema)
      await prisma.user.delete({
        where: { id: userId }
      })

      logger.info(`User deleted: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'User deleted successfully'
      }
    } catch (error) {
      logger.error('Delete user error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting user'
      }
    }
  }

  /**
   * Get user with payment information
   */
  static async getUserWithPayments(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          paymentVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Get last 10 payments
          }
        }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      return {
        success: true,
        message: 'User with payments retrieved successfully',
        user
      }
    } catch (error) {
      logger.error('Get user with payments error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving user with payments'
      }
    }
  }

  /**
   * Activate user after payment verification
   */
  static async activateUserAfterPayment(userId: string, adminUserId: string): Promise<UserResult> {
    try {
      // Validate admin permissions
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      })

      if (!adminUser || adminUser.role !== UserRole.ADMIN) {
        return {
          success: false,
          message: 'Insufficient permissions to activate user'
        }
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        }
      }

      // Check if payment is verified
      if (!user.paymentVerified) {
        return {
          success: false,
          message: 'Payment verification required before activation'
        }
      }

      // Check if user is already active
      if (user.status === UserStatus.ACTIVE) {
        return {
          success: false,
          message: 'User is already active'
        }
      }

      // Activate user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE }
      })

      // Remove sensitive data
      const { passwordHash, ...userWithoutPassword } = updatedUser

      logger.info(`User activated after payment verification: ${userId} by admin: ${adminUserId}`)

      return {
        success: true,
        message: 'User activated successfully',
        user: userWithoutPassword
      }
    } catch (error) {
      logger.error('Activate user after payment error:', error)
      return {
        success: false,
        message: 'An error occurred while activating user'
      }
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        pendingUsers,
        suspendedUsers,
        verifiedPaymentUsers,
        unverifiedPaymentUsers
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.PENDING } }),
        prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
        prisma.user.count({ where: { paymentVerified: true } }),
        prisma.user.count({ where: { paymentVerified: false } })
      ])

      return {
        success: true,
        message: 'User statistics retrieved successfully',
        stats: {
          totalUsers,
          activeUsers,
          pendingUsers,
          suspendedUsers,
          verifiedPaymentUsers,
          unverifiedPaymentUsers
        }
      }
    } catch (error) {
      logger.error('Get user stats error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving user statistics'
      }
    }
  }
}