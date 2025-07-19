import { PrismaClient, Prisma } from '@prisma/client';
import { 
  CreateResearchDto, 
  UpdateResearchDto, 
  ResearchFilters, 
  PaginationOptions,
  ResearchWithAuthorAndFiles,
  ResearchListResponse
} from '../types';
import { CustomError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class ResearchService {
  /**
   * Create a new research
   */
  static async createResearch(
    researchData: CreateResearchDto, 
    authorId: string
  ): Promise<ResearchWithAuthorAndFiles> {
    const { title, description, abstract, keywords, status = 'DRAFT' } = researchData;

    // Validate required fields
    if (!title) {
      throw new CustomError('Research title is required', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!user) {
      throw new CustomError('Author not found', 404);
    }

    // Create research
    const research = await prisma.research.create({
      data: {
        title,
        description,
        abstract,
        keywords: keywords || [],
        status,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
            roleId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        files: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return research;
  }

  /**
   * Get research by ID
   */
  static async getResearchById(id: string): Promise<ResearchWithAuthorAndFiles> {
    const research = await prisma.research.findUnique({
      where: { id },
      include: {
        author: true,
        files: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!research) {
      throw new CustomError('Research not found', 404);
    }

    return research;
  }

  /**
   * Get researches with pagination and filters
   */
  static async getResearches(
    filters: ResearchFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ResearchListResponse> {
    const { search, status, authorId } = filters;
    const { page, limit } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ResearchWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { abstract: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as any;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    // Get researches and count
    const [researches, total] = await Promise.all([
      prisma.research.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              isActive: true,
              roleId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          files: {
            include: {
              uploader: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.research.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      researches,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Update research
   */
  static async updateResearch(
    id: string, 
    updateData: UpdateResearchDto, 
    userId: string
  ): Promise<ResearchWithAuthorAndFiles> {
    // Check if research exists
    const existingResearch = await prisma.research.findUnique({
      where: { id },
    });

    if (!existingResearch) {
      throw new CustomError('Research not found', 404);
    }

    // Check if user can update this research (author or admin)
    if (existingResearch.authorId !== userId) {
      // Check if user has admin permissions
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      const hasAdminPermission = user.role.permissions.some(
        permission => permission.module === 'researches' && permission.action === 'update'
      );
      
      if (!hasAdminPermission) {
        throw new CustomError('You can only update your own researches', 403);
      }
    }

    // Update research
    const research = await prisma.research.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
            roleId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        files: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return research;
  }

  /**
   * Delete research
   */
  static async deleteResearch(id: string, userId: string): Promise<void> {
    const research = await prisma.research.findUnique({
      where: { id },
    });

    if (!research) {
      throw new CustomError('Research not found', 404);
    }

    // Check if user can delete this research (author or admin)
    if (research.authorId !== userId) {
      // Check if user has admin permissions
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      const hasAdminPermission = user.role.permissions.some(
        permission => permission.module === 'researches' && permission.action === 'delete'
      );
      
      if (!hasAdminPermission) {
        throw new CustomError('You can only delete your own researches', 403);
      }
    }

    // Delete research (files will be deleted due to cascade)
    await prisma.research.delete({
      where: { id },
    });
  }

  /**
   * Get researches by author
   */
  static async getResearchesByAuthor(
    authorId: string,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ResearchListResponse> {
    return await this.getResearches({ authorId }, pagination);
  }

  /**
   * Get researches by status
   */
  static async getResearchesByStatus(
    status: string,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ResearchListResponse> {
    return await this.getResearches({ status }, pagination);
  }

  /**
   * Get research statistics
   */
  static async getResearchStatistics() {
    const [
      totalResearches,
      researchesByStatus,
      researchesByAuthor,
      recentResearches,
      topAuthors
    ] = await Promise.all([
      // Total researches
      prisma.research.count(),
      
      // Researches by status
      prisma.research.groupBy({
        by: ['status'],
        _count: { status: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      
      // Researches by author
      prisma.research.groupBy({
        by: ['authorId'],
        _count: { authorId: true },
        orderBy: { _count: { authorId: 'desc' } },
        take: 10,
      }),
      
      // Recent researches (last 30 days)
      prisma.research.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      }),
      
      // Top authors
      prisma.user.findMany({
        include: {
          _count: {
            select: {
              researches: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      })
    ]);

    return {
      totalResearches,
      researchesByStatus,
      researchesByAuthor,
      recentResearches,
      topAuthors
    };
  }
} 