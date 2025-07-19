import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  UserFilters, 
  PaginationOptions,
  UserWithRole,
  UserListResponse
} from '../types';
import { CustomError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserDto): Promise<UserWithRole> {
    const { email, username, password, firstName, lastName, roleId } = userData;

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName || !roleId) {
      throw new CustomError('All fields are required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new CustomError('User with this email or username already exists', 400);
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new CustomError('Invalid role ID', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        roleId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    return user;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<UserWithRole> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return user;
  }

  /**
   * Get users with pagination and filters
   */
  static async getUsers(
    filters: UserFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<UserListResponse> {
    const { search, roleId, isActive } = filters;
    const { page, limit } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get users and count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Update user
   */
  static async updateUser(id: string, updateData: UpdateUserDto): Promise<UserWithRole> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new CustomError('User not found', 404);
    }

    // Check for unique constraints if email or username is being updated
    if (updateData.email || updateData.username) {
      const whereClause: Prisma.UserWhereInput = {
        id: { not: id },
      };

      if (updateData.email) {
        whereClause.email = updateData.email;
      }

      if (updateData.username) {
        whereClause.username = updateData.username;
      }

      const existingUserWithSameCredentials = await prisma.user.findFirst({
        where: whereClause,
      });

      if (existingUserWithSameCredentials) {
        throw new CustomError('Email or username already exists', 400);
      }
    }

    // Verify role exists if roleId is being updated
    if (updateData.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: updateData.roleId },
      });

      if (!role) {
        throw new CustomError('Invalid role ID', 400);
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    return user;
  }

  /**
   * Toggle user active status
   */
  static async toggleUserStatus(id: string): Promise<UserWithRole> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
      include: {
        role: true,
      },
    });

    return updatedUser;
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users
      prisma.user.count({
        where: { isActive: true }
      }),
      
      // Inactive users
      prisma.user.count({
        where: { isActive: false }
      }),
      
      // Users by role
      prisma.user.groupBy({
        by: ['roleId'],
        _count: { roleId: true },
        orderBy: { _count: { roleId: 'desc' } },
        take: 10,
      }),
      
      // Recent users (last 30 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      recentUsers
    };
  }
} 