import { PrismaClient, Prisma } from '@prisma/client';
import { 
  CreateRoleDto, 
  UpdateRoleDto, 
  RoleWithPermissions,
  PaginationOptions
} from '../types';
import { CustomError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class RoleService {
  /**
   * Create a new role
   */
  static async createRole(roleData: CreateRoleDto): Promise<RoleWithPermissions> {
    const { name, description, permissionIds } = roleData;

    // Validate required fields
    if (!name) {
      throw new CustomError('Role name is required', 400);
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      throw new CustomError('Role with this name already exists', 400);
    }

    // Verify permissions exist if provided
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
        },
      });

      if (permissions.length !== permissionIds.length) {
        throw new CustomError('Some permissions not found', 400);
      }
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissionIds && permissionIds.length > 0 ? {
          connect: permissionIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        permissions: true,
      },
    });

    return role;
  }

  /**
   * Get role by ID
   */
  static async getRoleById(id: string): Promise<RoleWithPermissions> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      throw new CustomError('Role not found', 404);
    }

    return role;
  }

  /**
   * Get all roles with pagination
   */
  static async getRoles(pagination: PaginationOptions = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        include: {
          permissions: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.role.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      roles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Update role
   */
  static async updateRole(id: string, updateData: UpdateRoleDto): Promise<RoleWithPermissions> {
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new CustomError('Role not found', 404);
    }

    // Check for name conflicts if updating
    if (updateData.name && updateData.name !== existingRole.name) {
      const roleWithSameName = await prisma.role.findUnique({
        where: { name: updateData.name },
      });

      if (roleWithSameName) {
        throw new CustomError('Role with this name already exists', 400);
      }
    }

    // Verify permissions exist if updating
    if (updateData.permissionIds) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: updateData.permissionIds },
        },
      });

      if (permissions.length !== updateData.permissionIds.length) {
        throw new CustomError('Some permissions not found', 400);
      }
    }

    // Prepare update data
    const updatePayload: Prisma.RoleUpdateInput = {
      name: updateData.name,
      description: updateData.description,
    };

    // Handle permissions update
    if (updateData.permissionIds !== undefined) {
      updatePayload.permissions = {
        set: updateData.permissionIds.map(id => ({ id })),
      };
    }

    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: updatePayload,
      include: {
        permissions: true,
      },
    });

    return role;
  }

  /**
   * Delete role
   */
  static async deleteRole(id: string): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new CustomError('Role not found', 404);
    }

    // Check if role is assigned to any users
    if (role._count.users > 0) {
      throw new CustomError('Cannot delete role that is assigned to users', 400);
    }

    await prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Get all permissions
   */
  static async getPermissions() {
    return await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Create permission
   */
  static async createPermission(permissionData: {
    name: string;
    description?: string;
    module: string;
    action: string;
  }) {
    const { name, description, module, action } = permissionData;

    // Validate required fields
    if (!name || !module || !action) {
      throw new CustomError('Name, module, and action are required', 400);
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findFirst({
      where: {
        OR: [
          { name },
          { AND: [{ module }, { action }] },
        ],
      },
    });

    if (existingPermission) {
      throw new CustomError('Permission already exists', 400);
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        name,
        description,
        module,
        action,
      },
    });

    return permission;
  }

  /**
   * Get role statistics
   */
  static async getRoleStatistics() {
    const [
      totalRoles,
      rolesWithUsers,
      permissionsByModule,
      recentRoles
    ] = await Promise.all([
      // Total roles
      prisma.role.count(),
      
      // Roles with users
      prisma.role.findMany({
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      
      // Permissions by module
      prisma.permission.groupBy({
        by: ['module'],
        _count: { module: true },
        orderBy: { _count: { module: 'desc' } },
      }),
      
      // Recent roles (last 30 days)
      prisma.role.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      })
    ]);

    return {
      totalRoles,
      rolesWithUsers,
      permissionsByModule,
      recentRoles
    };
  }
} 