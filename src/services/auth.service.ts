import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { CreateUserDto, LoginDto, JwtPayload } from '../types';
import { CustomError } from '../middleware/error.middleware';

export class AuthService {
  static async register(userData: CreateUserDto) {
    const { email, username, password, firstName, lastName, roleId } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      throw new CustomError('User with this email or username already exists', 400);
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      throw new CustomError('Role not found', 404);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        roleId
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    };
  }

  static async login(loginData: LoginDto) {
    const { email, password } = loginData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user) {
      throw new CustomError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new CustomError('Account is deactivated', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    };
  }

  static generateToken(user: any): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  }
} 