import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../index';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { CustomError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Permission type definition matching Prisma schema
interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         filename:
 *           type: string
 *         originalName:
 *           type: string
 *         mimeType:
 *           type: string
 *         size:
 *           type: integer
 *         path:
 *           type: string
 *         researchId:
 *           type: string
 *         uploadedBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/files/{id}/view:
 *   get:
 *     summary: Preview file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/:id/view',
  authenticateToken,
  requirePermission('files', 'read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const file = await prisma.researchFile.findUnique({
        where: { id },
        include: {
          research: {
            include: {
              author: true
            }
          },
          uploader: true
        }
      });

      if (!file) {
        throw new CustomError('File not found', 404);
      }

      // Check if file exists on filesystem
      if (!fs.existsSync(file.path)) {
        throw new CustomError('File not found on server', 404);
      }

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      res.setHeader('Content-Length', file.size.toString());

      // Stream the file
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/files/{id}/download:
 *   get:
 *     summary: Download file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/:id/download',
  authenticateToken,
  requirePermission('files', 'read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const file = await prisma.researchFile.findUnique({
        where: { id },
        include: {
          research: {
            include: {
              author: true
            }
          },
          uploader: true
        }
      });

      if (!file) {
        throw new CustomError('File not found', 404);
      }

      // Check if file exists on filesystem
      if (!fs.existsSync(file.path)) {
        throw new CustomError('File not found on server', 404);
      }

      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Length', file.size.toString());

      // Stream the file
      const fileStream = fs.createReadStream(file.path);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
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
 *         description: File not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('files', 'delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const file = await prisma.researchFile.findUnique({
        where: { id },
        include: {
          research: {
            include: {
              author: true
            }
          },
          uploader: true
        }
      });

      if (!file) {
        throw new CustomError('File not found', 404);
      }

      // Check if user can delete this file (uploader, research author, or admin)
      const canDelete = 
        file.uploadedBy === req.user!.id ||
        file.research.authorId === req.user!.id ||
        req.user!.role.permissions.some(
          (permission: Permission) => permission.module === 'files' && permission.action === 'delete'
        );

      if (!canDelete) {
        throw new CustomError('You do not have permission to delete this file', 403);
      }

      // Delete file from filesystem
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Delete file record from database
      await prisma.researchFile.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 