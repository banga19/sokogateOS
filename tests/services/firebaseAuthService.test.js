// Firebase Auth Service Test for SokogateOS
// Tests Firebase ID token verification and local user mapping

jest.mock('../../src/models/user');
jest.mock('../../src/utils/logger');

describe('FirebaseAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars!!';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-32-chars!';
    jest.resetModules();
  });

  function getFirebaseAdminMock() {
    return {
      initializeApp: jest.fn(),
      credential: { cert: jest.fn() },
      auth: jest.fn(() => ({
        verifyIdToken: jest.fn(),
        createCustomToken: jest.fn()
      }))
    };
  }

  function setupFirebase(adminMock) {
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
    jest.resetModules();
    jest.doMock('firebase-admin', () => adminMock);
    jest.doMock('../../src/services/authService', () => ({
      generateTokens: jest.fn(() => ({
        accessToken: 'mocked-access',
        refreshToken: 'mocked-refresh',
        expiresIn: '15m'
      })),
      sanitizeUser: jest.fn((u) => u ? { ...u, password: undefined } : u)
    }));
  }

  describe('verifyFirebaseToken', () => {
    test('should throw FATAL error when Firebase not configured', async () => {
      const { verifyFirebaseToken } = require('../../src/services/firebaseAuthService');
      await expect(verifyFirebaseToken('some-token'))
        .rejects.toThrow('FATAL: Firebase credentials are required in production');
    });

    test('should initialize Firebase and verify token', async () => {
      const adminMock = getFirebaseAdminMock();
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        uid: 'firebase-uid-1',
        email: 'firebase@example.com',
        name: 'Firebase User'
      });
      adminMock.auth.mockReturnValue({ verifyIdToken: mockVerifyIdToken });
      setupFirebase(adminMock);

      const { verifyFirebaseToken } = require('../../src/services/firebaseAuthService');
      const result = await verifyFirebaseToken('valid-token');
      expect(result.uid).toBe('firebase-uid-1');
    });

    test('should throw error for invalid Firebase token', async () => {
      const adminMock = getFirebaseAdminMock();
      adminMock.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockRejectedValue(new Error('Invalid token'))
      });
      setupFirebase(adminMock);

      const { verifyFirebaseToken } = require('../../src/services/firebaseAuthService');
      await expect(verifyFirebaseToken('bad-token'))
        .rejects.toThrow('Invalid Firebase token');
    });
  });

  describe('signInWithFirebase', () => {
    test('should create new user from Firebase identity', async () => {
      const adminMock = getFirebaseAdminMock();
      adminMock.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'firebase-uid-1',
          email: 'newuser@example.com',
          name: 'New Firebase User',
          phone_number: '+254700000000'
        })
      });
      setupFirebase(adminMock);

      const { signInWithFirebase } = require('../../src/services/firebaseAuthService');
      const User = require('../../src/models/user');

      User.findOne.mockResolvedValue(null);
      const mockUser = {
        _id: 'new-user-id',
        name: 'New Firebase User',
        email: 'newuser@example.com',
        phone: '+254700000000',
        isActive: true,
        isEmailVerified: true,
        role: 'procurement_manager',
        termsAccepted: false,
        firebaseUid: 'firebase-uid-1',
        authProvider: 'firebase',
        password: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'new-user-id',
          name: 'New Firebase User',
          email: 'newuser@example.com',
          role: 'procurement_manager'
        })
      };
      User.mockImplementation(() => mockUser);

      const result = await signInWithFirebase('valid-token');

      expect(result.user.name).toBe('New Firebase User');
      expect(result.tokens.accessToken).toBe('mocked-access');
      expect(result.provider).toBe('firebase');
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should update last login for returning Firebase user', async () => {
      const adminMock = getFirebaseAdminMock();
      adminMock.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'firebase-uid-1',
          email: 'existing@example.com',
          name: 'Existing User'
        })
      });
      setupFirebase(adminMock);

      const { signInWithFirebase } = require('../../src/services/firebaseAuthService');
      const User = require('../../src/models/user');

      const existingUser = {
        _id: 'existing-id',
        name: 'Existing User',
        email: 'existing@example.com',
        isActive: true,
        firebaseUid: 'firebase-uid-1',
        tokenVersion: 0,
        lastLoginAt: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'existing-id',
          name: 'Existing User',
          email: 'existing@example.com'
        })
      };

      User.findOne.mockResolvedValue(existingUser);

      const result = await signInWithFirebase('valid-token');

      expect(result.user._id).toBe('existing-id');
      expect(existingUser.lastLoginAt).not.toBeNull();
      expect(result.provider).toBe('firebase');
    });
  });

  describe('createCustomToken', () => {
    test('should create custom Firebase token for linked user', async () => {
      const adminMock = getFirebaseAdminMock();
      adminMock.auth.mockReturnValue({
        createCustomToken: jest.fn().mockResolvedValue('custom-firebase-token')
      });
      setupFirebase(adminMock);

      const { createCustomToken } = require('../../src/services/firebaseAuthService');
      const User = require('../../src/models/user');

      const existingUser = {
        _id: 'user-id',
        email: 'user@example.com',
        firebaseUid: 'firebase-uid-1',
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          email: 'user@example.com'
        })
      };

      User.findById.mockResolvedValue(existingUser);

      const result = await createCustomToken('user-id');
      expect(result.customToken).toBe('custom-firebase-token');
    });

    test('should throw error for user without Firebase UID', async () => {
      const adminMock = getFirebaseAdminMock();
      setupFirebase(adminMock);

      const { createCustomToken } = require('../../src/services/firebaseAuthService');
      const User = require('../../src/models/user');

      const localUser = {
        _id: 'user-id',
        firebaseUid: null,
        toObject: jest.fn()
      };

      User.findById.mockResolvedValue(localUser);

      await expect(createCustomToken('user-id'))
        .rejects.toThrow('User is not linked to Firebase');
    });
  });
});
