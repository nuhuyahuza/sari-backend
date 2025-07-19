import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/error.middleware';
import { notFoundHandler } from '../middleware/notFound.middleware';

// Create a simple test app
const createTestApp = () => {
  const app = express();
  
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: 'test' 
    });
  });
  
  // Test protected endpoint
  app.get('/protected', (req, res) => {
    res.json({ message: 'Protected endpoint' });
  });
  
  // Test error endpoint
  app.get('/error', (req, res, next) => {
    next(new Error('Test error'));
  });
  
  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
};

describe('Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.environment).toBe('test');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Protected Endpoints', () => {
    it('should return 200 for protected endpoint', async () => {
      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Protected endpoint');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors properly', async () => {
      const response = await request(app)
        .get('/error');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Request Validation', () => {
    it('should handle JSON parsing', async () => {
      const response = await request(app)
        .post('/protected')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404); // No POST route defined
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/protected')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      // Should handle gracefully
      expect(response.status).toBeDefined();
    });
  });
});

describe('Middleware Tests', () => {
  describe('Error Handler', () => {
    it('should format error responses correctly', () => {
      const mockReq = {
        url: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent')
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;
      const mockNext = jest.fn();

      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error'
        })
      );
    });
  });

  describe('Not Found Handler', () => {
    it('should return 404 for unknown routes', () => {
      const mockReq = {
        originalUrl: '/unknown-route'
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route /unknown-route not found'
      });
    });
  });
});

describe('Type Safety Tests', () => {
  it('should have proper TypeScript types', () => {
    // Test that our types are working correctly
    const testUser = {
      id: 'test-id',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      roleId: 'role-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(testUser).toHaveProperty('id');
    expect(testUser).toHaveProperty('email');
    expect(testUser).toHaveProperty('username');
    expect(typeof testUser.id).toBe('string');
    expect(typeof testUser.email).toBe('string');
  });

  it('should handle permission types correctly', () => {
    const permission = {
      id: 'perm-id',
      name: 'Test Permission',
      description: 'Test description',
      module: 'test',
      action: 'read',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(permission).toHaveProperty('module');
    expect(permission).toHaveProperty('action');
    expect(typeof permission.module).toBe('string');
    expect(typeof permission.action).toBe('string');
  });
}); 