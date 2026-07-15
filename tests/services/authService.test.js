// Auth Service Test for SokogateOS
// Tests authentication, JWT management, and user management

jest.mock('../../src/models/user');
jest.mock('../../src/models/feedback');
jest.mock('../../src/utils/logger');

const User = require('../../src/models/user');
const Feedback = require('../../src/models/feedback');
const logger = require('../../src/utils/logger');
const authService = require('../../src/services/authService');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      companyId: 'company-1',
      role: 'procurement_manager',
      phone: '+254700000000',
      termsAccepted: true,
    };

    test('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null); // No existing user

      const mockUser = {
        _id: 'user-1',
        name: validUserData.name,
        email: validUserData.email,
        role: validUserData.role,
        companyId: validUserData.companyId,
        phone: validUserData.phone,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: '1.0',
        tokenVersion: 0,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'user-1',
          name: validUserData.name,
          email: validUserData.email,
          role: validUserData.role,
          companyId: validUserData.companyId,
        }),
      };
      User.mockImplementation(() => mockUser);

      Feedback.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true),
      }));

      const result = await authService.register(validUserData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User registered successfully')
      );
    });

    test('should throw error for missing required fields', async () => {
      await expect(authService.register({})).rejects.toThrow(
        'Name, email, and password are required'
      );
    });

    test('should throw error if terms not accepted', async () => {
      await expect(
        authService.register({ name: 'Test', email: 'test@test.com', password: 'Pass123!', termsAccepted: false })
      ).rejects.toThrow('Terms & Conditions');
    });

    test('should throw error if email already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(
        authService.register(validUserData)
      ).rejects.toThrow('User already exists with this email');
    });

    test('should send onboarding feedback to self-improving loop', async () => {
      User.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(true);
      const mockUser = {
        _id: 'user-1',
        ...validUserData,
        tokenVersion: 0,
        save: mockSave,
        toObject: jest.fn().mockReturnValue({ _id: 'user-1', email: validUserData.email }),
      };
      User.mockImplementation(() => mockUser);

      const mockFeedbackSave = jest.fn().mockResolvedValue(true);
      Feedback.mockImplementation(() => ({ save: mockFeedbackSave }));

      await authService.register(validUserData);

      expect(Feedback).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sent onboarding feedback')
      );
    });

    test('should not fail registration if feedback submission fails', async () => {
      User.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user-1',
        ...validUserData,
        tokenVersion: 0,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'user-1', email: validUserData.email }),
      };
      User.mockImplementation(() => mockUser);

      Feedback.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('DB error')),
      }));

      const result = await authService.register(validUserData);

      // Registration should succeed even if feedback fails
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  describe('login', () => {
    test('should login with valid credentials', async () => {
      const mockUser = {
        _id: 'user-1',
        email: 'test@example.com',
        role: 'procurement_manager',
        companyId: 'company-1',
        isActive: true,
        tokenVersion: 0,
        lastLoginAt: null,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'user-1', email: 'test@example.com', role: 'procurement_manager' }),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.login('test@example.com', 'SecurePass123!');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(mockUser.lastLoginAt).toBeDefined();
      expect(mockUser.tokenVersion).toBe(1); // Incremented
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User logged in')
      );
    });

    test('should throw error for invalid email', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.login('wrong@email.com', 'pass')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    test('should throw error for deactivated account', async () => {
      const mockUser = {
        isActive: false,
        comparePassword: jest.fn(),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(authService.login('test@example.com', 'pass')).rejects.toThrow(
        'Account is deactivated'
      );
    });

    test('should throw error for wrong password', async () => {
      const mockUser = {
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(authService.login('test@example.com', 'wrongpass')).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('logout', () => {
    test('should increment tokenVersion to invalidate tokens', async () => {
      User.findByIdAndUpdate.mockResolvedValue({ tokenVersion: 2 });

      const result = await authService.logout('user-1');

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { $inc: { tokenVersion: 1 } });
      expect(result).toEqual({ message: 'Logout successful' });
    });
  });

  describe('generateTokens', () => {
    test('should generate access and refresh tokens', () => {
      const user = {
        _id: 'user-1',
        email: 'test@example.com',
        role: 'procurement_manager',
        companyId: 'company-1',
        tokenVersion: 0,
      };

      const tokens = authService.generateTokens(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should use default tokenVersion when not set', () => {
      const user = {
        _id: 'user-1',
        email: 'test@example.com',
        role: 'procurement_manager',
      };

      const tokens = authService.generateTokens(user);
      expect(tokens.accessToken).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify a valid token', () => {
      const user = {
        _id: 'user-1',
        email: 'test@example.com',
        role: 'procurement_manager',
        companyId: 'company-1',
        tokenVersion: 0,
      };

      const tokens = authService.generateTokens(user);
      const decoded = authService.verifyAccessToken(tokens.accessToken);

      expect(decoded).toHaveProperty('id', user._id);
      expect(decoded).toHaveProperty('email', user.email);
      expect(decoded).toHaveProperty('role', user.role);
    });

    test('should throw error for expired token', () => {
      // Create a token that's already expired by using a very short expiry
      const origExpiry = process.env.JWT_ACCESS_EXPIRY;
      process.env.JWT_ACCESS_EXPIRY = '0s'; // Immediate expiry

      // Re-require to get new instance with new config
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign({ id: 'test' }, 'test-secret', { expiresIn: '0s' });

      process.env.JWT_ACCESS_EXPIRY = origExpiry;
      process.env.JWT_SECRET = 'test-secret';

      expect(() => authService.verifyAccessToken(expiredToken)).toThrow();
    });

    test('should throw error for malformed token', () => {
      expect(() => authService.verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('changePassword', () => {
    test('should change password and generate new tokens', async () => {
      const mockUser = {
        _id: 'user-1',
        email: 'test@example.com',
        role: 'procurement_manager',
        tokenVersion: 0,
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'user-1', email: 'test@example.com' }),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.changePassword('user-1', 'OldPass1!', 'NewPass1!');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('message', 'Password changed successfully');
      expect(mockUser.tokenVersion).toBe(1); // Incremented to invalidate old tokens
    });

    test('should throw error if current password is wrong', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        authService.changePassword('user-1', 'WrongPass!', 'NewPass1!')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('sanitization through register', () => {
    test('should not return sensitive fields on registration', async () => {
      User.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'procurement_manager',
        password: 'secret',
        passwordResetToken: 'token',
        __v: 0,
        tokenVersion: 0,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'procurement_manager',
        }),
      };
      User.mockImplementation(() => mockUser);
      Feedback.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }));

      const result = await authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        termsAccepted: true,
      });

      expect(result.user.password).toBeUndefined();
      expect(result.user.passwordResetToken).toBeUndefined();
      expect(result.user.__v).toBeUndefined();
    });
  });

  describe('requestPasswordReset', () => {
    test('should generate reset token for existing user', async () => {
      const mockUser = {
        _id: 'user-1',
        email: 'test@example.com',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result).toHaveProperty('message');
      // resetToken is no longer returned in the response (security fix)
      expect(result).not.toHaveProperty('resetToken');
      expect(mockUser.passwordResetToken).toBeDefined();
      expect(mockUser.passwordResetExpires).toBeDefined();
    });

    test('should not reveal if email does not exist', async () => {
      User.findOne.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result.message).toBe('If the email exists, a reset link has been sent.');
    });
  });

  describe('resetPassword', () => {
    test('should reset password with valid token', async () => {
      const mockUser = {
        _id: 'user-1',
        email: 'test@example.com',
        tokenVersion: 0,
        password: '',
        passwordResetToken: 'hashed-token',
        passwordResetExpires: Date.now() + 3600000,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ _id: 'user-1', email: 'test@example.com' }),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.resetPassword('reset-token', 'NewPass1!');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('message', 'Password reset successful');
    });

    test('should throw error for invalid or expired token', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid-token', 'NewPass1!')
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('getProfile', () => {
    test('should return user profile', async () => {
      const mockPopulate = jest.fn().mockResolvedValue({
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'procurement_manager',
        toObject: jest.fn().mockReturnValue({
          _id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'procurement_manager',
        }),
      });

      User.findById.mockReturnValue({ populate: mockPopulate });

      const result = await authService.getProfile('user-1');

      expect(User.findById).toHaveBeenCalledWith('user-1');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    test('should throw error for non-existent user', async () => {
      User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await expect(authService.getProfile('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    test('should update allowed fields only', async () => {
      const allowedUpdates = {
        name: 'Updated Name',
        phone: '+254711000000',
        preferences: { theme: 'dark' },
      };

      const disallowedUpdates = {
        role: 'super_admin',
        email: 'new@email.com',
      };

      const mockUser = {
        _id: 'user-1',
        ...allowedUpdates,
        toObject: jest.fn().mockReturnValue({ _id: 'user-1', ...allowedUpdates }),
      };

      User.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await authService.updateProfile('user-1', {
        ...allowedUpdates,
        ...disallowedUpdates,
      });

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-1',
        { name: 'Updated Name', phone: '+254711000000', preferences: { theme: 'dark' } },
        { new: true, runValidators: true }
      );
      expect(result).toHaveProperty('name', 'Updated Name');
    });

    test('should throw error for non-existent user', async () => {
      User.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        authService.updateProfile('nonexistent', { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('acceptTerms', () => {
    test('should update terms acceptance', async () => {
      const mockUser = {
        _id: 'user-1',
        email: 'test@example.com',
        termsAccepted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const result = await authService.acceptTerms('user-1', '1.0');

      expect(mockUser.termsAccepted).toBe(true);
      expect(mockUser.termsAcceptedAt).toBeDefined();
      expect(mockUser.termsVersion).toBe('1.0');
      expect(result).toHaveProperty('termsAccepted', true);
    });

    test('should throw error for non-existent user', async () => {
      User.findById.mockResolvedValue(null);

      await expect(authService.acceptTerms('nonexistent')).rejects.toThrow('User not found');
    });
  });
});
