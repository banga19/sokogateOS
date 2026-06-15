// RBAC Middleware Test for SokogateOS
// Tests the RBAC authorization middleware

jest.mock('../src/models/role');
jest.mock('../src/models/user');
jest.mock('../src/utils/logger');

const Role = require('../src/models/role');
const User = require('../src/models/user');
const logger = require('../src/utils/logger');
const { rbacAuthorize } = require('../src/middleware/rbac');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-id-123', role: 'test-role', email: 'test@example.com' },
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('when user is not authenticated', () => {
    test('should return 401 error', async () => {
      req.user = undefined; // No user

      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required.' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('when user is super_admin', () => {
    test('should allow access regardless of domain/action', async () => {
      req.user.role = 'super_admin';

      const middleware = rbacAuthorize('users', 'delete');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(Role.findOne).not.toHaveBeenCalled(); // Should not check role permissions
    });
  });

  describe('when user has regular role', () => {
    const mockRoleDoc = {
      slug: 'test-role',
      isActive: true,
      permissions: [
        { domain: 'users', actions: ['read', 'create'] },
        { domain: 'teams', actions: ['read'] },
      ],
    };

    beforeEach(() => {
      Role.findOne.mockResolvedValue(mockRoleDoc);
    });

    test('should allow access when permission exists', async () => {
      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(Role.findOne).toHaveBeenCalledWith({ slug: 'test-role', isActive: true });
      expect(next).toHaveBeenCalled();
    });

    test('should allow access when permission exists for different domain', async () => {
      const middleware = rbacAuthorize('teams', 'read');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should deny access when permission does not exist', async () => {
      const middleware = rbacAuthorize('users', 'delete'); // delete not in permissions
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing permission: users.delete',
      });
      expect(logger.warn).toHaveBeenCalledWith('RBAC: denied test@example.com users:delete');
      expect(next).not.toHaveBeenCalled();
    });

    test('should deny access when role not found', async () => {
      Role.findOne.mockResolvedValue(null);

      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing permission: users.read',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should fall back to user permissions when role not found in Role collection', async () => {
      Role.findOne.mockResolvedValue(null); // Role not found in Role collection

      const mockFullUser = {
        id: 'user-id-123',
        hasPermission: jest.fn().mockReturnValue(true), // User has permission
      };
      User.findById.mockResolvedValue(mockFullUser);

      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(Role.findOne).toHaveBeenCalledWith({ slug: 'test-role', isActive: true });
      expect(User.findById).toHaveBeenCalledWith('user-id-123');
      expect(mockFullUser.hasPermission).toHaveBeenCalledWith('users', 'read');
      expect(next).toHaveBeenCalled();
    });

    test('should deny access when user has no permission in fallback', async () => {
      Role.findOne.mockResolvedValue(null); // Role not found

      const mockFullUser = {
        id: 'user-id-123',
        hasPermission: jest.fn().mockReturnValue(false), // User lacks permission
      };
      User.findById.mockResolvedValue(mockFullUser);

      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing permission: users.read',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership option', () => {
    const mockRoleDoc = {
      slug: 'test-role',
      isActive: true,
      permissions: [{ domain: 'users', actions: ['read', 'update'] }],
    };

    beforeEach(() => {
      Role.findOne.mockResolvedValue(mockRoleDoc);
    });

    test('should allow access for super_admin even with requireOwnership', async () => {
      req.user.role = 'super_admin';
      req.params.id = 'different-user-id';

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should allow access for company_admin even with requireOwnership', async () => {
      req.user.role = 'company_admin';
      req.params.id = 'different-user-id';

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should allow access when user owns the resource (userId match)', async () => {
      req.user.role = 'member';
      req.params.id = 'user-id-123'; // Same as req.user.id

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should allow access when user owns the resource (body.userId match)', async () => {
      req.user.role = 'member';
      req.body.userId = 'user-id-123'; // Same as req.user.id

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should allow access when user owns the resource (body.ownerId match)', async () => {
      req.user.role = 'member';
      req.body.ownerId = 'user-id-123'; // Same as req.user.id

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should deny ownership when user does not own the resource', async () => {
      req.user.role = 'member';
      req.params.id = 'different-user-id';
      req.body = {}; // No matching ids

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: true });
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ownership required.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should not check ownership when requireOwnership is false', async () => {
      req.user.role = 'member';
      req.params.id = 'different-user-id';

      const middleware = rbacAuthorize('users', 'update', { requireOwnership: false });
      await middleware(req, res, next);

      // Should fail on permissions, not ownership
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing permission: users.update',
      });
    });
  });

  describe('error handling', () => {
    test('should handle errors in Role.findOne', async () => {
      Role.findOne.mockRejectedValue(new Error('Database error'));

      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization failed.',
      });
      expect(logger.error).toHaveBeenCalledWith('RBAC middleware error:', expect.any(Error));
    });

    test('should handle errors in User.findById', async () => {
      Role.findOne.mockResolvedValue(null); // Force fallback to user permissions
      User.findById.mockRejectedValue(new Error('Database error'));

      const middleware = rbacAuthorize('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization failed.',
      });
    });
  });
});
