// Clerk Auth Service Test for SokogateOS
// Tests Clerk session token verification and local user mapping

jest.mock('../../src/models/user');
jest.mock('../../src/utils/logger');
jest.mock('../../src/services/authService', () => ({
  generateTokens: jest.fn(() => ({
    accessToken: 'clerk-access-token',
    refreshToken: 'clerk-refresh-token',
    expiresIn: '15m'
  })),
  sanitizeUser: jest.fn((u) => u ? { ...u, password: undefined } : u)
}));

describe('ClerkAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NODE_ENV;
    jest.resetModules();
  });

  function getClerkMock() {
    return {
      verifyToken: jest.fn(),
      sessions: {
        verifySessionToken: jest.fn()
      }
    };
  }

  function setupClerk(clerkMock) {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.CLERK_SECRET_KEY = 'sk_test_secret';
    jest.resetModules();
    jest.doMock('@clerk/clerk-sdk-node', () => ({
      createClerkClient: jest.fn(() => clerkMock)
    }));
  }

  const mockClerkUser = {
    sub: 'clerk-user-id-123',
    email_addresses: [
      { id: 'email-1', email_address: 'clerk@example.com' },
      { id: 'email-2', email_address: 'other@example.com' }
    ],
    primary_email_address_id: 'email-1',
    first_name: 'Clerk',
    last_name: 'User',
    phone_numbers: [
      { phone_number: '+254711000000' }
    ]
  };

  describe('signInWithClerk', () => {
    test('should reject in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CLERK_SECRET_KEY = 'sk_test_secret';

      const { signInWithClerk } = require('../../src/services/clerkAuthService');

      await expect(signInWithClerk('some-token'))
        .rejects.toThrow('Clerk auth is not available in production. Use Firebase.');
    });

    test('should create new user from Clerk identity', async () => {
      const clerkMock = getClerkMock();
      clerkMock.verifyToken.mockResolvedValue(mockClerkUser);
      setupClerk(clerkMock);

      const { signInWithClerk } = require('../../src/services/clerkAuthService');
      const UserMock = require('../../src/models/user');

      UserMock.findOne.mockResolvedValue(null);
      const mockUser = {
        _id: 'new-clerk-user-id',
        name: 'Clerk User',
        email: 'clerk@example.com',
        phone: '+254711000000',
        isActive: true,
        isEmailVerified: true,
        role: 'procurement_manager',
        termsAccepted: false,
        clerkUserId: 'clerk-user-id-123',
        authProvider: 'clerk',
        password: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'new-clerk-user-id',
          name: 'Clerk User',
          email: 'clerk@example.com',
          role: 'procurement_manager'
        })
      };
      UserMock.mockImplementation(() => mockUser);

      const result = await signInWithClerk('valid-clerk-token');

      expect(result.user.name).toBe('Clerk User');
      expect(result.tokens.accessToken).toBe('clerk-access-token');
      expect(result.provider).toBe('clerk');
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should return existing user if Clerk account already linked', async () => {
      const clerkMock = getClerkMock();
      clerkMock.verifyToken.mockResolvedValue(mockClerkUser);
      setupClerk(clerkMock);

      const { signInWithClerk } = require('../../src/services/clerkAuthService');
      const UserMock = require('../../src/models/user');

      const existingUser = {
        _id: 'existing-clerk-id',
        name: 'Clerk User',
        email: 'clerk@example.com',
        clerkUserId: 'clerk-user-id-123',
        isActive: true,
        tokenVersion: 0,
        lastLoginAt: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'existing-clerk-id',
          name: 'Clerk User',
          email: 'clerk@example.com'
        })
      };

      UserMock.findOne.mockResolvedValue(existingUser);

      const result = await signInWithClerk('valid-clerk-token');

      expect(result.user._id).toBe('existing-clerk-id');
      expect(existingUser.lastLoginAt).not.toBeNull();
    });

    test('should throw error for invalid Clerk token', async () => {
      const clerkMock = getClerkMock();
      clerkMock.verifyToken.mockRejectedValue(new Error('Invalid token'));
      setupClerk(clerkMock);

      const { signInWithClerk } = require('../../src/services/clerkAuthService');

      await expect(signInWithClerk('bad-token'))
        .rejects.toThrow('Invalid Clerk API token');
    });
  });

  describe('linkClerkUser', () => {
    test('should link Clerk account to existing local user', async () => {
      const clerkMock = getClerkMock();
      clerkMock.verifyToken.mockResolvedValue({ sub: 'clerk-user-id-456' });
      setupClerk(clerkMock);

      const { linkClerkUser } = require('../../src/services/clerkAuthService');
      const UserMock = require('../../src/models/user');

      const existingUser = {
        _id: 'local-user-id',
        email: 'local@example.com',
        clerkUserId: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'local-user-id',
          email: 'local@example.com'
        })
      };

      UserMock.findById.mockResolvedValue(existingUser);

      const result = await linkClerkUser('local-user-id', 'valid-clerk-token');
      expect(existingUser.clerkUserId).toBe('clerk-user-id-456');
      expect(result._id).toBe('local-user-id');
    });

    test('should throw error for non-existent user', async () => {
      const clerkMock = getClerkMock();
      setupClerk(clerkMock);

      const { linkClerkUser } = require('../../src/services/clerkAuthService');
      const UserMock = require('../../src/models/user');

      UserMock.findById.mockResolvedValue(null);

      await expect(linkClerkUser('non-existent-id', 'valid-token'))
        .rejects.toThrow('User not found');
    });
  });
});
