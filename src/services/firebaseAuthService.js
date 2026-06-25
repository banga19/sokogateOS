// Firebase Auth Service for sokogateOS (Production)
// Handles Firebase ID token verification and local user mapping

const admin = require('firebase-admin');
const User = require('../models/user');
const { generateTokens, sanitizeUser } = require('./authService');
const logger = require('../utils/logger');

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FATAL: Firebase credentials are required in production');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n')
    })
  });

  firebaseInitialized = true;
  logger.info('Firebase Admin: Initialized successfully');
}

// Verify Firebase ID token and return decoded token
async function verifyFirebaseToken(idToken) {
  initializeFirebase();
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('Firebase Auth: Token verification failed:', error.message);
    throw new Error('Invalid Firebase token', { cause: error });
  }
}

// Sign in with Firebase token — find or create local user
async function signInWithFirebase(idToken) {
  try {
    const decodedToken = await verifyFirebaseToken(idToken);
    const { uid, email, name, phone_number } = decodedToken;

    // Find existing user by Firebase UID
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create new user from Firebase identity
      user = new User({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: null,
        phone: phone_number || null,
        isActive: true,
        isEmailVerified: true,
        role: 'procurement_manager',
        termsAccepted: false,
        firebaseUid: uid,
        authProvider: 'firebase'
      });

      await user.save();
      logger.info(`Firebase Auth: Created new user ${user.email} (${user._id})`);
    } else {
      // Update Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        user.isEmailVerified = true;
        await user.save({ validateBeforeSave: false });
      }

      // Update last login
      user.lastLoginAt = new Date();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save({ validateBeforeSave: false });
      logger.info(`Firebase Auth: User logged in ${user.email}`);
    }

    const tokens = generateTokens(user);
    return {
      user: sanitizeUser(user),
      tokens,
      provider: 'firebase'
    };
  } catch (error) {
    logger.error('Firebase Auth: Sign in failed:', error);
    throw error;
  }
}

// Create custom Firebase token for existing local user
async function createCustomToken(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.firebaseUid) {
      throw new Error('User is not linked to Firebase');
    }

    initializeFirebase();
    const customToken = await admin.auth().createCustomToken(user.firebaseUid);
    return { customToken, user: sanitizeUser(user) };
  } catch (error) {
    logger.error('Firebase Auth: Custom token creation failed:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  verifyFirebaseToken,
  signInWithFirebase,
  createCustomToken
};
