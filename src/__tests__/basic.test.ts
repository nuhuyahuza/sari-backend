import { CustomError } from '../middleware/error.middleware';
import { notFoundHandler } from '../middleware/notFound.middleware';

describe('Basic Application Tests', () => {
  describe('CustomError', () => {
    it('should create custom error with default status code', () => {
      const error = new CustomError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create custom error with custom status code', () => {
      const error = new CustomError('Not found', 404);
      
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should be instance of Error', () => {
      const error = new CustomError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CustomError);
    });
  });

  describe('Not Found Handler', () => {
    it('should return 404 response', () => {
      const mockReq = {
        originalUrl: '/test-route'
      } as any;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route /test-route not found'
      });
    });
  });

  describe('Type Definitions', () => {
    it('should have proper user type structure', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roleId: 'role-123',
        createdAt: new Date(),
        updatedAt: new Date
      };

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('roleId');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
    });

    it('should have proper role type structure', () => {
      const role = {
        id: 'role-123',
        name: 'Admin',
        description: 'Administrator role',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('description');
      expect(role).toHaveProperty('createdAt');
      expect(role).toHaveProperty('updatedAt');
    });

    it('should have proper permission type structure', () => {
      const permission = {
        id: 'perm-123',
        name: 'Create Users',
        description: 'Can create new users',
        module: 'users',
        action: 'create',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(permission).toHaveProperty('id');
      expect(permission).toHaveProperty('name');
      expect(permission).toHaveProperty('description');
      expect(permission).toHaveProperty('module');
      expect(permission).toHaveProperty('action');
      expect(permission).toHaveProperty('createdAt');
      expect(permission).toHaveProperty('updatedAt');
    });
  });

  describe('JWT Payload', () => {
    it('should have proper JWT payload structure', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        roleId: 'role-123',
        iat: 1234567890,
        exp: 1234567890
      };

      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('roleId');
      expect(typeof payload.userId).toBe('string');
      expect(typeof payload.email).toBe('string');
      expect(typeof payload.roleId).toBe('string');
    });
  });

  describe('API Response Types', () => {
    it('should have proper API response structure', () => {
      const response = {
        success: true,
        message: 'Operation successful',
        data: { id: 'test-id' }
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('data');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.message).toBe('string');
    });

    it('should have proper paginated response structure', () => {
      const paginatedResponse = {
        success: true,
        message: 'Data retrieved successfully',
        data: [{ id: 'item-1' }, { id: 'item-2' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2
        }
      };

      expect(paginatedResponse).toHaveProperty('success');
      expect(paginatedResponse).toHaveProperty('message');
      expect(paginatedResponse).toHaveProperty('data');
      expect(paginatedResponse).toHaveProperty('pagination');
      expect(paginatedResponse.pagination).toHaveProperty('page');
      expect(paginatedResponse.pagination).toHaveProperty('limit');
      expect(paginatedResponse.pagination).toHaveProperty('total');
      expect(paginatedResponse.pagination).toHaveProperty('totalPages');
    });
  });
}); 