import { Category } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export interface CreateCategoryData {
  name: string
  description?: string
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  isActive?: boolean
}

export interface CategoryFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface CategoryResult {
  success: boolean
  message: string
  category?: Category & { _count?: { products: number } }
}

export interface CategoryListResult {
  success: boolean
  message: string
  categories?: (Category & { _count?: { products: number } })[]
  total?: number
  page?: number
  limit?: number
}

/**
 * Category Management Service
 * Handles category CRUD operations with validation and business logic
 */
export class CategoryService {
  /**
   * Create a new category
   */
  static async createCategory(categoryData: CreateCategoryData): Promise<CategoryResult> {
    try {
      const { name, description } = categoryData

      // Check if category name already exists
      const existingCategory = await prisma.category.findUnique({
        where: { name: name.trim() }
      })

      if (existingCategory) {
        return {
          success: false,
          message: 'Category with this name already exists'
        }
      }

      // Create category
      const newCategory = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description?.trim()
        },
        include: {
          _count: {
            select: { products: true }
          }
        }
      })

      logger.info(`New category created: ${newCategory.id} - ${newCategory.name}`)

      return {
        success: true,
        message: 'Category created successfully',
        category: newCategory
      }
    } catch (error) {
      logger.error('Create category error:', error)
      return {
        success: false,
        message: 'An error occurred while creating category'
      }
    }
  }

  /**
   * Update category
   */
  static async updateCategory(categoryId: string, updateData: UpdateCategoryData): Promise<CategoryResult> {
    try {
      // Find existing category
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      })

      if (!existingCategory) {
        return {
          success: false,
          message: 'Category not found'
        }
      }

      // Check name uniqueness if being updated
      if (updateData.name && updateData.name.trim() !== existingCategory.name) {
        const nameExists = await prisma.category.findUnique({
          where: { name: updateData.name.trim() }
        })

        if (nameExists) {
          return {
            success: false,
            message: 'Category with this name already exists'
          }
        }
      }

      // Prepare update data
      const updatePayload: any = {}

      if (updateData.name) {
        updatePayload.name = updateData.name.trim()
      }

      if (updateData.description !== undefined) {
        updatePayload.description = updateData.description?.trim()
      }

      if (updateData.isActive !== undefined) {
        updatePayload.isActive = updateData.isActive
      }

      // Update category
      const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: updatePayload,
        include: {
          _count: {
            select: { products: true }
          }
        }
      })

      logger.info(`Category updated: ${categoryId} - ${updatedCategory.name}`)

      return {
        success: true,
        message: 'Category updated successfully',
        category: updatedCategory
      }
    } catch (error) {
      logger.error('Update category error:', error)
      return {
        success: false,
        message: 'An error occurred while updating category'
      }
    }
  }

  /**
   * Get category by ID
   */
  static async getCategory(categoryId: string): Promise<CategoryResult> {
    try {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          _count: {
            select: { products: true }
          }
        }
      })

      if (!category) {
        return {
          success: false,
          message: 'Category not found'
        }
      }

      return {
        success: true,
        message: 'Category retrieved successfully',
        category
      }
    } catch (error) {
      logger.error('Get category error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving category'
      }
    }
  }

  /**
   * Get categories with filtering and pagination
   */
  static async getCategories(filters: CategoryFilters = {}): Promise<CategoryListResult> {
    try {
      const {
        search,
        isActive,
        page = 1,
        limit = 20
      } = filters

      const skip = (page - 1) * limit

      // Build where clause
      const where: any = {}

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Get categories and total count
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where,
          include: {
            _count: {
              select: { products: true }
            }
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit
        }),
        prisma.category.count({ where })
      ])

      return {
        success: true,
        message: 'Categories retrieved successfully',
        categories,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('Get categories error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving categories'
      }
    }
  }

  /**
   * Delete category
   */
  static async deleteCategory(categoryId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      })

      if (!category) {
        return {
          success: false,
          message: 'Category not found'
        }
      }

      // Check if category has any products
      const productCount = await prisma.product.count({
        where: { categoryId }
      })

      if (productCount > 0) {
        return {
          success: false,
          message: 'Cannot delete category with existing products. Consider deactivating instead.'
        }
      }

      // Delete category
      await prisma.category.delete({
        where: { id: categoryId }
      })

      logger.info(`Category deleted: ${categoryId}`)

      return {
        success: true,
        message: 'Category deleted successfully'
      }
    } catch (error) {
      logger.error('Delete category error:', error)
      return {
        success: false,
        message: 'An error occurred while deleting category'
      }
    }
  }

  /**
   * Get all active categories (for dropdowns)
   */
  static async getActiveCategories(): Promise<CategoryListResult> {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { name: 'asc' }
      })

      return {
        success: true,
        message: 'Active categories retrieved successfully',
        categories,
        total: categories.length
      }
    } catch (error) {
      logger.error('Get active categories error:', error)
      return {
        success: false,
        message: 'An error occurred while retrieving active categories'
      }
    }
  }
}