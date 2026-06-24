// Auth Routes for sokogateOS
// Public and protected endpoints for authentication and user management

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { trackEngagement } = require('../middleware/analytics/tracking');
const logger = require('../utils/logger');

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map();
const rateLimit = (maxAttempts, windowMs) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const attempts = rateLimitMap.get(ip).filter(time => now - time < windowMs);
    if (attempts.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please try again later.'
      });
    }

    attempts.push(now);
    rateLimitMap.set(ip, attempts);
    next();
  };
};

// Clean up rate limit map every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of rateLimitMap.entries()) {
    const valid = times.filter(time => now - time < 15 * 60 * 1000);
    if (valid.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, valid);
  }
}, 15 * 60 * 1000);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', rateLimit(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const result = await authService.register(req.body);
    // Track sign-up after successful user creation
    try {
      req.user = result.user;
      await trackEngagement(req, res, () => {});
    } catch { /* non-critical tracking failure */ }
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password);
    // Track activation for verified users
    if (result.user && result.user.isEmailVerified) {
      try {
        req.user = result.user;
        await trackEngagement(req, res, () => {});
      } catch { /* non-critical tracking failure */ }
    }
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const result = await authService.refreshToken(refreshToken);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate tokens)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const result = await authService.logout(req.user.id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user's profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters with at least one letter and one number'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', rateLimit(3, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await authService.requestPasswordReset(email);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/accept-terms
 * Accept Terms & Conditions (up-to-date version)
 */
router.post('/accept-terms', authenticate, async (req, res) => {
  try {
    const { version } = req.body;
    const userId = req.user.id;

    // Validate version format — must be semver-like (e.g., "1.0", "2.1.3")
    if (version !== undefined && !isValidVersion(version)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid terms version format. Expected format: "X.Y" or "X.Y.Z"'
      });
    }

    const result = await authService.acceptTerms(userId, version);
    // Track terms acceptance as an engagement event
    // This could be extended to a specific terms acceptance tracking if needed
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/reset-password/:token
 * Reset password with token
 */
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with at least one letter and one number'
      });
    }

    const result = await authService.resetPassword(token, password);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
