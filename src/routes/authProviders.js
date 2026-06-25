// Provider Auth Routes for sokogateOS
// Handles Firebase (production) and Clerk (development) authentication

const express = require('express');
const router = express.Router();
const { signInWithFirebase, createCustomToken } = require('../services/firebaseAuthService');
const { signInWithClerk, linkClerkUser } = require('../services/clerkAuthService');
const { authenticate } = require('../middleware/auth');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * POST /api/auth/providers/firebase/signin
 * Exchange Firebase ID token for local JWT
 * Body: { idToken: string }
 */
router.post('/firebase/signin', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Firebase ID token is required' });
    }

    const result = await signInWithFirebase(idToken);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/providers/firebase/custom-token
 * Create a custom Firebase token for an existing local user
 * Requires JWT auth
 * Body: {}
 */
router.post('/firebase/custom-token', authenticate, async (req, res) => {
  try {
    const result = await createCustomToken(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/providers/clerk/signin
 * Exchange Clerk API token for local JWT
 * Body: { token: string }
 */
router.post('/clerk/signin', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Clerk token is required' });
    }

    if (NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: 'Clerk auth is not available in production. Use Firebase.' });
    }

    const result = await signInWithClerk(token);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/providers/clerk/link
 * Link existing local user to Clerk account
 * Requires JWT auth
 * Body: { token: string }
 */
router.post('/clerk/link', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Clerk token is required' });
    }

    const result = await linkClerkUser(req.user.id, token);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

module.exports = router;
