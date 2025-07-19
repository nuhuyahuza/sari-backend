import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { CustomError } from '../middleware/error.middleware';
import { CreateResearchDto, UpdateResearchDto, AuthenticatedRequest } from '../types';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('Invalid file type', 400));
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Research:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         abstract:
 *           type: string
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED]
 *         authorId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         author:
 *           type: object
 *         files:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * /api/researches:
 *   get:
 *     summary: List all researches
 *     tags: [Research]
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of researches
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
 *                     $ref: '#/components/schemas/Research'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/',
  authenticateToken,
  requirePermission('researches', 'read'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { abstract: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (status) {
        where.status = status;
      }

      const [researches, total] = await Promise.all([
        prisma.research.findMany({
          where,
          skip,
          take: limit,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            files: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.research.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        message: 'Researches retrieved successfully',
        data: researches,
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

/**
 * @swagger
 * /api/researches/{id}:
 *   get:
 *     summary: Get research by ID
 *     tags: [Research]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Research ID
 *     responses:
 *       200:
 *         description: Research details
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
 *                   $ref: '#/components/schemas/Research'
 *       404:
 *         description: Research not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/:id',
  authenticateToken,
  requirePermission('researches', 'read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const research = await prisma.research.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          files: {
            include: {
              uploader: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!research) {
        throw new CustomError('Research not found', 404);
      }

      res.json({
        success: true,
        message: 'Research retrieved successfully',
        data: research
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/researches:
 *   post:
 *     summary: Create new research
 *     tags: [Research]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               abstract:
 *                 type: string
 *               keywords:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED]
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Research created successfully
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
 *                   $ref: '#/components/schemas/Research'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/',
  authenticateToken,
  requirePermission('researches', 'create'),
  upload.array('files', 10),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const researchData: CreateResearchDto = req.body;
      const files = req.files as Express.Multer.File[];

      // Parse keywords if provided as string
      if (researchData.keywords && typeof researchData.keywords === 'string') {
        researchData.keywords = JSON.parse(researchData.keywords);
      }

      const research = await prisma.research.create({
        data: {
          title: researchData.title,
          description: researchData.description,
          abstract: researchData.abstract,
          keywords: researchData.keywords || [],
          status: researchData.status || 'DRAFT',
          authorId: req.user!.id
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Handle file uploads
      if (files && files.length > 0) {
        const fileRecords = await Promise.all(
          files.map(async (file) => {
            return prisma.researchFile.create({
              data: {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                path: file.path,
                researchId: research.id,
                uploadedBy: req.user!.id
              }
            });
          })
        );

        research.files = fileRecords;
      }

      res.status(201).json({
        success: true,
        message: 'Research created successfully',
        data: research
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/researches/{id}:
 *   put:
 *     summary: Update research
 *     tags: [Research]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Research ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               abstract:
 *                 type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PUBLISHED]
 *     responses:
 *       200:
 *         description: Research updated successfully
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
 *                   $ref: '#/components/schemas/Research'
 *       404:
 *         description: Research not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.put('/:id',
  authenticateToken,
  requirePermission('researches', 'update'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updateData: UpdateResearchDto = req.body;

      // Check if research exists
      const existingResearch = await prisma.research.findUnique({
        where: { id }
      });

      if (!existingResearch) {
        throw new CustomError('Research not found', 404);
      }

      // Check if user can update this research (author or admin)
      if (existingResearch.authorId !== req.user!.id) {
        // Check if user has admin permissions
        const hasAdminPermission = req.user!.role.permissions.some(
          permission => permission.module === 'researches' && permission.action === 'update'
        );
        
        if (!hasAdminPermission) {
          throw new CustomError('You can only update your own researches', 403);
        }
      }

      const research = await prisma.research.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          files: {
            include: {
              uploader: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Research updated successfully',
        data: research
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/researches/{id}:
 *   delete:
 *     summary: Delete research
 *     tags: [Research]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Research ID
 *     responses:
 *       200:
 *         description: Research deleted successfully
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
 *         description: Research not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('researches', 'delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const research = await prisma.research.findUnique({
        where: { id },
        include: {
          files: true
        }
      });

      if (!research) {
        throw new CustomError('Research not found', 404);
      }

      // Check if user can delete this research (author or admin)
      if (research.authorId !== req.user!.id) {
        // Check if user has admin permissions
        const hasAdminPermission = req.user!.role.permissions.some(
          permission => permission.module === 'researches' && permission.action === 'delete'
        );
        
        if (!hasAdminPermission) {
          throw new CustomError('You can only delete your own researches', 403);
        }
      }

      // Delete associated files from filesystem
      for (const file of research.files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      // Delete research (files will be deleted due to cascade)
      await prisma.research.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Research deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router; 