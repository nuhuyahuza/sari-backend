import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { CustomError } from './error.middleware';

// Permission type definition
interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new CustomError('Access token required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new CustomError('User not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(new CustomError('Invalid token', 401));
    }
  }
};

export const requirePermission = (module: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new CustomError('Authentication required', 401);
      }

      const hasPermission = req.user.role.permissions.some(
        (permission: Permission) => permission.module === module && permission.action === action
      );

      if (!hasPermission) {
        throw new CustomError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireRole = (roleName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new CustomError('Authentication required', 401);
      }

      if (req.user.role.name !== roleName) {
        throw new CustomError('Insufficient role permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 