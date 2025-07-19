import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         action:
 *           type: string
 *         module:
 *           type: string
 *         resourceId:
 *           type: string
 *         details:
 *           type: object
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 */

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Get audit logs (Admin only)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by module
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/',
  authenticateToken,
  requirePermission('logs', 'read'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const action = req.query.action as string;
      const module = req.query.module as string;
      const userId = req.query.userId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const skip = (page - 1) * limit;

      const where: any = {};

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
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.auditLog.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 