import { Request } from 'express';
import { User, Role, Permission, Research, ResearchFile, AuditLog } from '@prisma/client';

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
  user?: User & {
    role: Role & {
      permissions: Permission[];
    };
  };
}

// User types
export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

// Role types
export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// Permission types
export interface CreatePermissionDto {
  name: string;
  description?: string;
  module: string;
  action: string;
}

// Research types
export interface CreateResearchDto {
  title: string;
  description?: string;
  abstract?: string;
  keywords?: string[];
  status?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
}

export interface UpdateResearchDto {
  title?: string;
  description?: string;
  abstract?: string;
  keywords?: string[];
  status?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
}

// File types
export interface FileUploadDto {
  researchId: string;
}

// Audit log types
export interface CreateAuditLogDto {
  action: string;
  module: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  iat?: number;
  exp?: number;
}

// Extended Prisma types with relations
export type UserWithRole = User & {
  role: Role;
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
  users: User[];
};

export type ResearchWithAuthorAndFiles = Research & {
  author: User;
  files: ResearchFile[];
};

export type ResearchFileWithUploader = ResearchFile & {
  uploader: User;
};

export type AuditLogWithUser = AuditLog & {
  user: User;
};

// Permission check types
export interface PermissionCheck {
  module: string;
  action: string;
}

// File upload configuration
export interface FileUploadConfig {
  maxSize: number;
  allowedMimeTypes: string[];
  uploadPath: string;
} 