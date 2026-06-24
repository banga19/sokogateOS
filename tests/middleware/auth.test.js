// Auth Middleware Test for SokogateOS
// Tests JWT verification, role-based authorization, company scoping, and permission checking

jest.mock('../../src/models/user');
jest.mock('../../src/utils/logger');

const User = require('../../src/models/user');
const logger = require('../../src/utils/logger');
const {
  authenticate,
  optionalAuth,
  authorize,
  scopeToCompany,
  requirePermission,
} = require('../../src/middleware/auth');

// Generate a valid test token using the auth service
const jwt = require('jsonwebtoken');

function generateTestToken(userId = 'user-1', role = 'procurement_manager') {
  const secret = process.env.JWT_SECRET || 'dev-only-JWT_SECRET-fallback-do-not-use-in-production';
  return jwt.sign(
    { id: userId, email: 'test@example.com', role, companyId: 'company-1', tokenVersion: 0 },
    secret,
    { expiresIn: '15m' }
  );
}

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      params: {},
      originalUrl: '/api/some-resource',
      url: '/api/some-resource',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
    };
    next = jest.fn();
  });

  describe('authenticate', () => {
    test('should pass authentication with valid token', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue({
        _id: 'user-1',
        email: 'test@example.com',
        role: 'procurement_manager',
        companyId: 'company-1',
        isActive: true,
        tokenVersion: 0,
        termsAccepted: true,
        isPasswordChangedAfter: jest.fn().mockReturnValue(false),
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user-1');
      expect(req.user.email).toBe('test@example.com');
    });

    test('should return 401 when no auth header provided', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required. Please provide a valid access token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when auth header is malformed', async () => {
      req.headers.authorization = 'Basic token123';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when user no longer exists', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User no longer exists.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when account is deactivated', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue({
        _id: 'user-1',
        isActive: false,
        isPasswordChangedAfter: jest.fn(),
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account is deactivated. Contact your administrator.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when password was changed after token issued', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue({
        _id: 'user-1',
        isActive: true,
        tokenVersion: 0,
        termsAccepted: true,
        isPasswordChangedAfter: jest.fn().mockReturnValue(true),
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token is no longer valid. Please login again.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when token version is outdated (logout)', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue({
        _id: 'user-1',
        isActive: true,
        tokenVersion: 2, // Newer than token's version 0
        termsAccepted: true,
        isPasswordChangedAfter: jest.fn().mockReturnValue(false),
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has been revoked. Please login again.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should require terms acceptance for API routes', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockResolvedValue({
        _id: 'user-1',
        isActive: true,
        tokenVersion: 0,
        termsAccepted: false, // Terms not accepted
        isPasswordChangedAfter: jest.fn().mockReturnValue(false),
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Terms & Conditions acceptance required. Please accept the terms to continue.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should skip terms check for auth routes', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;
      req.originalUrl = '/api/auth/login';

      User.findById.mockResolvedValue({
        _id: 'user-1',
        isActive: true,
        tokenVersion: 0,
        termsAccepted: false, // Terms not accepted but on auth route
        isPasswordChangedAfter: jest.fn().mockReturnValue(false),
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should handle internal errors gracefully', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      User.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed. Please try again.',
      });
    });
  });

  describe('optionalAuth', () => {
    test('should decode token if present', async () => {
      const token = generateTestToken();
      req.headers.authorization = `Bearer ${token}`;

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe('test@example.com');
    });

    test('should continue without user when no token provided', async () => {
      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    test('should continue without user when token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });

  describe('authorize', () => {
    test('should allow access for super_admin', () => {
      req.user = { role: 'super_admin' };
      const middleware = authorize('procurement_manager');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should allow access when role is in allowed list', () => {
      req.user = { role: 'procurement_manager' };
      const middleware = authorize('procurement_manager', 'company_admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should deny access when role is not in allowed list', () => {
      req.user = { email: 'test@example.com', role: 'member' };
      const middleware = authorize('admin', 'super_admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions. You do not have access to this resource.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when user is not authenticated', () => {
      req.user = undefined;
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required.',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('scopeToCompany', () => {
    test('should allow super_admin through without scoping', () => {
      req.user = { role: 'super_admin', companyId: 'company-1' };

      scopeToCompany(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.companyId).toBeUndefined(); // Not set for super_admin
    });

    test('should set companyId filter for regular users', () => {
      req.user = { role: 'procurement_manager', companyId: 'company-1' };

      scopeToCompany(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.companyId).toBe('company-1');
    });

    test('should deny access when user requests different company data', () => {
      req.user = { role: 'procurement_manager', companyId: 'company-1' };
      req.params.companyId = 'company-2';

      scopeToCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'You can only access data belonging to your company.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow super_admin to access any company data', () => {
      req.user = { role: 'super_admin', companyId: 'company-1' };
      req.params.companyId = 'company-2';

      scopeToCompany(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should return 401 when user is not authenticated', () => {
      req.user = undefined;

      scopeToCompany(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    test('should allow access when user has required permission', async () => {
      req.user = { id: 'user-1' };

      User.findById.mockResolvedValue({
        hasPermission: jest.fn().mockReturnValue(true),
      });

      const middleware = requirePermission('sourcing', 'create');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(User.findById).toHaveBeenCalledWith('user-1');
    });

    test('should deny access when user lacks permission', async () => {
      req.user = { id: 'user-1' };

      User.findById.mockResolvedValue({
        hasPermission: jest.fn().mockReturnValue(false),
      });

      const middleware = requirePermission('sourcing', 'create');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Insufficient permissions. You need 'create' access to 'sourcing'.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when user is not authenticated', async () => {
      req.user = undefined;

      const middleware = requirePermission('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required.',
      });
    });

    test('should return 401 when user not found in DB', async () => {
      req.user = { id: 'nonexistent' };

      User.findById.mockResolvedValue(null);

      const middleware = requirePermission('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found.',
      });
    });

    test('should handle database errors gracefully', async () => {
      req.user = { id: 'user-1' };

      User.findById.mockRejectedValue(new Error('Database error'));

      const middleware = requirePermission('users', 'read');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization check failed.',
      });
    });
  });
});
