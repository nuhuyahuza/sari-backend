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

describe('User Management Endpoints', () => {
  let adminUser: any;
  let adminToken: string;
  let testUser: any;

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

    // Create test user
    testUser = await prisma.user.upsert({
      where: { email: 'test@test.com' },
      update: {},
      create: {
        email: 'test@test.com',
        username: 'testuser',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        roleId: adminRole.id,
        isActive: true
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

  describe('GET /api/users', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
    });

    it('should return 200 with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 200 with valid token', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser.id);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/users')
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

    it('should return 201 with valid data', async () => {
      const response = await request(app)
        .post('/api/users')
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
      expect(response.body.data.email).toBe('newuser@test.com');
    });

    it('should return 400 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@test.com', // Already exists
          username: 'duplicate',
          password: 'password123',
          firstName: 'Duplicate',
          lastName: 'User',
          roleId: adminUser.roleId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .send({
          firstName: 'Updated'
        });

      expect(response.status).toBe(401);
    });

    it('should return 200 with valid data', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/users/:id/deactivate', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUser.id}/deactivate`)
        .send({
          isActive: false
        });

      expect(response.status).toBe(401);
    });

    it('should return 200 for deactivation', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 200 for reactivation', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUser.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });
}); 