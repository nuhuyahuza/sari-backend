import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { CustomError } from '../middleware/error.middleware';
import { CreateRoleDto, UpdateRoleDto } from '../types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         permissions:
 *           type: array
 *           items:
 *             type: object
 *         users:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: List all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
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
 *                     $ref: '#/components/schemas/Role'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/',
  authenticateToken,
  requirePermission('roles', 'read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true,
          users: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        message: 'Roles retrieved successfully',
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role details
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
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/:id',
  authenticateToken,
  requirePermission('roles', 'read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          permissions: true,
          users: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      res.json({
        success: true,
        message: 'Role retrieved successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissionIds
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/',
  authenticateToken,
  requirePermission('roles', 'create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roleData: CreateRoleDto = req.body;

      // Check if role already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name }
      });

      if (existingRole) {
        throw new CustomError('Role with this name already exists', 400);
      }

      // Verify permissions exist
      if (roleData.permissionIds && roleData.permissionIds.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: {
            id: {
              in: roleData.permissionIds
            }
          }
        });

        if (permissions.length !== roleData.permissionIds.length) {
          throw new CustomError('Some permissions not found', 404);
        }
      }

      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          permissions: {
            connect: roleData.permissionIds.map(id => ({ id }))
          }
        },
        include: {
          permissions: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
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
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.put('/:id',
  authenticateToken,
  requirePermission('roles', 'update'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData: UpdateRoleDto = req.body;

      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id }
      });

      if (!existingRole) {
        throw new CustomError('Role not found', 404);
      }

      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name !== existingRole.name) {
        const duplicateRole = await prisma.role.findUnique({
          where: { name: updateData.name }
        });

        if (duplicateRole) {
          throw new CustomError('Role with this name already exists', 400);
        }
      }

      // Verify permissions exist if being updated
      if (updateData.permissionIds && updateData.permissionIds.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: {
            id: {
              in: updateData.permissionIds
            }
          }
        });

        if (permissions.length !== updateData.permissionIds.length) {
          throw new CustomError('Some permissions not found', 404);
        }
      }

      const role = await prisma.role.update({
        where: { id },
        data: {
          name: updateData.name,
          description: updateData.description,
          permissions: updateData.permissionIds ? {
            set: updateData.permissionIds.map(permissionId => ({ id: permissionId }))
          } : undefined
        },
        include: {
          permissions: true
        }
      });

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: role
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Role not found
 *       400:
 *         description: Cannot delete role with assigned users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('roles', 'delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          users: true
        }
      });

      if (!role) {
        throw new CustomError('Role not found', 404);
      }

      // Check if role has assigned users
      if (role.users.length > 0) {
        throw new CustomError('Cannot delete role with assigned users', 400);
      }

      await prisma.role.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 