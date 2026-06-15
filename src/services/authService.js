// Auth Service for sokogateOS
// Handles user authentication, JWT management, and role-based access

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const Feedback = require('../models/feedback');
const { HermesAgent } = require('../services/hermes/hermesAgent');
const logger = require('../utils/logger');

// Token configuration
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'sokogate-os-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sokogate-os-refresh-secret-change-in-production';

// Register a new user
async function register(userData) {
  try {
    const { name, email, password, companyId, role, phone, termsAccepted } = userData;

    // Validate required fields
    if (!name || !email || !password) {
      throw Object.assign(new Error('Name, email, and password are required'), { statusCode: 400 });
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      throw Object.assign(
        new Error('You must accept the Terms & Conditions to create an account'),
        { statusCode: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw Object.assign(new Error('User already exists with this email'), { statusCode: 409 });
    }

    // Create user
    const user = new User({
      name,
      email,
      password, // Will be hashed by pre-save hook
      companyId,
      role: role || 'procurement_manager',
      phone,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: '1.0'
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    logger.info(`Auth Service: User registered successfully: ${user.email} (${user.role})`);

    // --- TRIGGER SCENARIO: Use onboarding data for personalization ---

    // 1. Send onboarding data as feedback to self-improving loop for long-term model improvement
    try {
      const onboardingFeedback = new Feedback({
        companyId: user.companyId || null,
        userId: user._id,
        target: {
          type: 'general',  // General feedback about user onboarding/profile
          id: user._id
        },
        type: 'explicit',
        explicit: {
          category: 'other',
          comments: JSON.stringify({
            onboardingData: {
              role: user.role,
              preferences: user.preferences,
              companyId: user.companyId,
              name: user.name,
              email: user.email,
              phone: user.phone,
              whatsApp: user.whatsApp,
              termsAccepted: user.termsAccepted,
              termsAcceptedAt: user.termsAcceptedAt,
              termsVersion: user.termsVersion
            }
          })
        }
      });

      await onboardingFeedback.save();
      logger.info(`Auth Service: Sent onboarding feedback for user ${user._id} to self-improving loop`);
    } catch (feedbackError) {
      logger.warn(`Auth Service: Failed to send onboarding feedback:`, feedbackError);
      // Don't fail registration if feedback submission fails
    }

    // 2. Send task to Hermes agent for immediate onboarding personalization processing
    try {
      // Create Hermes agent instance if not already available
      // In a production environment, you might want to use dependency injection or a service locator
      const hermesAgent = new HermesAgent({
        config: {
          analysisInterval: 3600000, // 1 hour
          optimizationInterval: 7200000, // 2 hours
          complianceInterval: 86400000, // 24 hours
          intelligenceInterval: 21600000 // 6 hours
        }
      });

      await hermesAgent.initialize();

      const personalizationTask = {
        type: 'onboarding_personalization',
        payload: {
          userId: user._id.toString(),
          onboardingData: {
            role: user.role,
            preferences: user.preferences,
            companyId: user.companyId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            whatsApp: user.whatsApp
          }
        }
      };

      const result = await hermesAgent.processTask(personalizationTask);
      logger.info(`Auth Service: Sent onboarding personalization task to Hermes agent for user ${user._id}:`, result);

      // Store personalization results in user profile
      if (result.success && result.result && result.result.personalizationProfile) {
        user.personalization = {
          insights: result.result.personalizationProfile.insights || [],
          recommendations: result.result.personalizationProfile.recommendations || [],
          personalizationProfile: result.result.personalizationProfile.settings || {},
          lastUpdated: new Date(),
          version: result.result.personalizationProfile.personalizationType || '1.0'
        };
        await user.save();
        logger.info(`Auth Service: Stored personalization data for user ${user._id}`);
      }

      // Clean up Hermes agent resources
      await hermesAgent.shutdown();
    } catch (hermesError) {
      logger.warn(`Auth Service: Failed to send onboarding personalization task to Hermes:`, hermesError);
      // Don't fail registration if Hermes task fails
    }

    return {
      user: sanitizeUser(user),
      tokens
    };
  } catch (error) {
    logger.error('Auth Service: Registration failed:', error);
    throw error;
  }
}

// Login user
async function login(email, password) {
  try {
    // Find user with password field included
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      throw Object.assign(new Error('Account is deactivated. Contact your administrator.'), { statusCode: 403 });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const tokens = generateTokens(user);

    logger.info(`Auth Service: User logged in: ${user.email}`);

    return {
      user: sanitizeUser(user),
      tokens
    };
  } catch (error) {
    logger.error('Auth Service: Login failed:', error);
    throw error;
  }
}

// Refresh access token
async function refreshToken(refreshToken) {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    // Check if password was changed after token was issued
    if (user.isPasswordChangedAfter(decoded.iat)) {
      throw Object.assign(new Error('Token is no longer valid. Please login again.'), { statusCode: 401 });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    return {
      user: sanitizeUser(user),
      tokens
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
    }
    logger.error('Auth Service: Token refresh failed:', error);
    throw error;
  }
}

// Logout (invalidate tokens)
async function logout(userId) {
  try {
    // In a production system, you'd add the token to a blacklist or
    // maintain a token version number in the user document.
    // For now, we just log the action as clients should discard their tokens.
    logger.info(`Auth Service: User logged out: ${userId}`);
    return { message: 'Logout successful' };
  } catch (error) {
    logger.error('Auth Service: Logout failed:', error);
    throw error;
  }
}

// Change password
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Current password is incorrect'), { statusCode: 401 });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Auth Service: Password changed for user: ${user.email}`);

    // Generate new tokens (invalidating old ones)
    const tokens = generateTokens(user);

    return {
      user: sanitizeUser(user),
      tokens,
      message: 'Password changed successfully'
    };
  } catch (error) {
    logger.error('Auth Service: Password change failed:', error);
    throw error;
  }
}

// Request password reset
async function requestPasswordReset(email) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // In production, send email with reset URL:
    // `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    logger.info(`Auth Service: Password reset requested for: ${user.email}`);

    return {
      message: 'If the email exists, a reset link has been sent.',
      resetToken // In production, only return this in development mode
    };
  } catch (error) {
    logger.error('Auth Service: Password reset request failed:', error);
    throw error;
  }
}

// Reset password with token
async function resetPassword(resetToken, newPassword) {
  try {
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Auth Service: Password reset completed for: ${user.email}`);

    // Generate new tokens
    const tokens = generateTokens(user);

    return {
      user: sanitizeUser(user),
      tokens,
      message: 'Password reset successful'
    };
  } catch (error) {
    logger.error('Auth Service: Password reset failed:', error);
    throw error;
  }
}

// Get current user profile
async function getProfile(userId) {
  try {
    const user = await User.findById(userId)
      .populate('companyId', 'name businessType address.country legibilityScore');
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    return sanitizeUser(user);
  } catch (error) {
    logger.error('Auth Service: Get profile failed:', error);
    throw error;
  }
}

// Update user profile
async function updateProfile(userId, updates) {
  try {
    const allowedFields = ['name', 'phone', 'whatsApp', 'preferences'];
    const sanitizedUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    const user = await User.findByIdAndUpdate(userId, sanitizedUpdates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    logger.info(`Auth Service: Profile updated for user: ${user.email}`);
    return sanitizeUser(user);
  } catch (error) {
    logger.error('Auth Service: Update profile failed:', error);
    throw error;
  }
}

// Accept Terms & Conditions (new or updated version)
async function acceptTerms(userId, mandatedVersion = '1.0') {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    user.termsAccepted = true;
    user.termsAcceptedAt = new Date();
    user.termsVersion = mandatedVersion;
    await user.save({ validateBeforeSave: false });

    logger.info(`Auth Service: User accepted terms: ${user.email} (v${mandatedVersion})`);
    return { termsAccepted: true, termsAcceptedAt: user.termsAcceptedAt, termsVersion: user.termsVersion };
  } catch (error) {
    logger.error('Auth Service: Accept terms failed:', error);
    throw error;
  }
}

// Generate JWT tokens
function generateTokens(user) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    companyId: user.companyId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });

  const refreshToken = jwt.sign(
    { id: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
}

// Verify and decode access token
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw Object.assign(new Error('Access token expired'), { statusCode: 401 });
    }
    throw Object.assign(new Error('Invalid access token'), { statusCode: 401 });
  }
}

// Sanitize user object (remove sensitive fields)
function sanitizeUser(user) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  delete userObj.__v;
  // Keep personalization data for frontend use
  return userObj;
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  acceptTerms,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  verifyAccessToken,
  generateTokens
};
