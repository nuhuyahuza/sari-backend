import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  LoginDto,
  CreateUserDto,
  JwtPayload,
  AuthenticatedRequest,
} from "../types";
import { CustomError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

export class AuthService {
  /**
   * Authenticate user and generate JWT token
   */
  static async login(loginData: LoginDto) {
    console.log(loginData);
    const { email, password } = loginData;

    if (!email || !password) {
      throw new CustomError("Email and password are required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new CustomError("Invalid credentials", 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError("Invalid credentials", 400);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
    };

    const secret = process.env.JWT_SECRET || "fallback-secret";
    const token = jwt.sign(
      payload,
      secret as jwt.Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Register new user (Admin only)
   */
  static async register(userData: CreateUserDto) {
    const { email, username, password, firstName, lastName, roleId } = userData;

    if (
      !email ||
      !username ||
      !password ||
      !firstName ||
      !lastName ||
      !roleId
    ) {
      throw new CustomError("All fields are required", 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new CustomError(
        "User with this email or username already exists",
        400
      );
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new CustomError("Invalid role ID", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        roleId,
        isActive: true,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
    };

    const secret = process.env.JWT_SECRET || "fallback-secret";
    const token = jwt.sign(
      payload,
      secret as jwt.Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Verify JWT token and return user
   */
  static async verifyToken(token: string) {
    try {
      const secret = process.env.JWT_SECRET || "fallback-secret";
      const decoded = jwt.verify(token, secret) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new CustomError("User not found or inactive", 401);
      }

      return user;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Invalid token", 401);
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(userId: string) {
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
      throw new CustomError("User not found", 404);
    }

    return user;
  }

  /**
   * Check if user has permission
   */
  static hasPermission(
    user: AuthenticatedRequest["user"],
    module: string,
    action: string
  ): boolean {
    if (!user || !user.role) {
      return false;
    }

    return user.role.permissions.some(
      (permission) =>
        permission.module === module && permission.action === action
    );
  }

  /**
   * Check if user has role
   */
  static hasRole(
    user: AuthenticatedRequest["user"],
    roleName: string
  ): boolean {
    if (!user || !user.role) {
      return false;
    }

    return user.role.name === roleName;
  }
}
