import { PrismaClient, Prisma } from '@prisma/client';
import { CreateAuditLogDto, AuditLogWithUser } from '../types';
import { CustomError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class AuditService {
  /**
   * Create audit log entry
   */
  static async createAuditLog(auditData: CreateAuditLogDto, userId: string): Promise<AuditLogWithUser> {
    const { action, module, resourceId, details, ipAddress, userAgent } = auditData;

    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        module,
        resourceId,
        details: details ? details as Prisma.InputJsonValue : undefined,
        ipAddress,
        userAgent,
        userId
      },
      include: {
        user: true
      }
    });

    return auditLog;
  }

  /**
   * Get audit logs with pagination and filters
   */
  static async getAuditLogs(filters: {
    action?: string;
    module?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }, pagination: {
    page: number;
    limit: number;
  }) {
    const { action, module, userId, startDate, endDate } = filters;
    const { page, limit } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (module) {
      where.module = module;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Get audit logs and count
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get audit log by ID
   */
  static async getAuditLogById(id: string): Promise<AuditLogWithUser> {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!auditLog) {
      throw new CustomError('Audit log not found', 404);
    }

    return auditLog;
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getAuditLogsByResource(resourceId: string, module: string) {
    return await prisma.auditLog.findMany({
      where: {
        resourceId,
        module
      },
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get audit logs for a specific user
   */
  static async getAuditLogsByUser(userId: string, pagination: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId },
        include: {
          user: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where: { userId } })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Clean old audit logs (keep only last 90 days)
   */
  static async cleanOldAuditLogs(): Promise<number> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo
        }
      }
    });

    return result.count;
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics() {
    const [
      totalLogs,
      todayLogs,
      thisWeekLogs,
      thisMonthLogs,
      topActions,
      topModules,
      topUsers
    ] = await Promise.all([
      // Total logs
      prisma.auditLog.count(),
      
      // Today's logs
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // This week's logs
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),
      
      // This month's logs
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Top actions
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),
      
      // Top modules
      prisma.auditLog.groupBy({
        by: ['module'],
        _count: { module: true },
        orderBy: { _count: { module: 'desc' } },
        take: 10
      }),
      
      // Top users
      prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      })
    ]);

    return {
      totalLogs,
      todayLogs,
      thisWeekLogs,
      thisMonthLogs,
      topActions,
      topModules,
      topUsers
    };
  }
} 