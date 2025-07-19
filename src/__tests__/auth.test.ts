import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Mock the app import
jest.mock('../index', () => ({
  prisma: new PrismaClient(),
  default: {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn()
  }
}));

// Import the mocked app
import app from '../index';

describe('Authentication Endpoints', () => {
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Create test admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create admin role
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        name: 'Admin',
        description: 'Administrator role'
      }
    });

    // Create admin user
    adminUser = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roleId: adminRole.id,
        isActive: true
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    // Generate admin token
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, roleId: adminUser.roleId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
    });

    it('should return 200 for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 200 with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 401 without admin token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          username: 'newuser',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          roleId: adminUser.roleId
        });

      expect(response.status).toBe(401);
    });

    it('should return 201 with admin token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          username: 'newuser',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          roleId: adminUser.roleId
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });
  });
}); 