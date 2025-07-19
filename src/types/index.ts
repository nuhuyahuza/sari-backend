import { Request } from 'express';
import { Prisma } from "@prisma/client";

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
  user?: Prisma.UserGetPayload<{
    include: {
      role: {
        include: {
          permissions: true;
        };
      };
    };
  }>;
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
  status?:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "PUBLISHED";
}

export interface UpdateResearchDto {
  title?: string;
  description?: string;
  abstract?: string;
  keywords?: string[];
  status?:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "PUBLISHED";
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
export type UserWithRole = Prisma.UserGetPayload<{
  include: {
    role: true;
  };
}>;

export type UserWithRoleAndPermissions = Prisma.UserGetPayload<{
  include: {
    role: {
      include: {
        permissions: true;
      };
    };
  };
}>;

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: true;
  };
}>;

export type ResearchWithAuthorAndFiles = Prisma.ResearchGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        email: true;
        username: true;
        firstName: true;
        lastName: true;
        isActive: true;
        roleId: true;
        createdAt: true;
        updatedAt: true;
      };
    };
    files: {
      include: {
        uploader: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;

export type ResearchFileWithUploader = Prisma.ResearchFileGetPayload<{
  include: {
    uploader: true;
  };
}>;

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: {
    user: true;
  };
}>;

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

// Query filters
export interface UserFilters {
  search?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface ResearchFilters {
  search?: string;
  status?: string;
  authorId?: string;
}

export interface AuditLogFilters {
  action?: string;
  module?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Service response types
export interface AuthResponse {
  token: string;
  user: UserWithRoleAndPermissions;
}

export interface UserListResponse {
  users: UserWithRole[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ResearchListResponse {
  researches: ResearchWithAuthorAndFiles[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogListResponse {
  auditLogs: AuditLogWithUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 