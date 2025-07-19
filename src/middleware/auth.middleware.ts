import { Request, Response, NextFunction } from 'express';
import { AuthService } from "../services/auth.service";
import { AuthenticatedRequest } from "../types";
import { CustomError } from './error.middleware';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      throw new CustomError("Access token required", 401);
    }

    const user = await AuthService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(new CustomError("Invalid token", 401));
    }
  }
};

export const requirePermission = (module: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new CustomError('Authentication required', 401);
      }

      const hasPermission = AuthService.hasPermission(req.user, module, action);

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

      const hasRole = AuthService.hasRole(req.user, roleName);

      if (!hasRole) {
        throw new CustomError("Insufficient role permissions", 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 