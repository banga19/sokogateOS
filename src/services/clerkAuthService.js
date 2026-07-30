// Clerk Auth Service for sokogateOS (Development)
// Handles Clerk session token verification and local user mapping

const { createClerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../models/user');
const { generateTokens, sanitizeUser } = require('./authService');
const logger = require('../utils/logger');

let clerkClient = null;

function getClerkClient() {
  if (!clerkClient) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('FATAL: CLERK_SECRET_KEY is required for development auth');
    }
    clerkClient = createClerkClient({ secretKey });
  }
  return clerkClient;
}

// Verify Clerk session token and return decoded session
async function verifyClerkToken(sessionToken) {
  try {
    const client = getClerkClient();
    const session = await client.sessions.verifySessionToken(sessionToken);
    return session;
  } catch (error) {
    logger.error('Clerk Auth: Session token verification failed:', error.message);
    throw new Error('Invalid Clerk session token', { cause: error });
  }
}

// Verify Clerk API key token and return user
async function verifyClerkApiToken(token) {
  try {
    const client = getClerkClient();
    const result = await client.verifyToken(token);
    return result;
  } catch (error) {
    logger.error('Clerk Auth: API token verification failed:', error.message);
    throw new Error('Invalid Clerk API token', { cause: error });
  }
}

// Sign in with Clerk token — find or create local user
async function signInWithClerk(token) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Clerk auth is not available in production. Use Firebase.');
  }

  try {
    const verified = await verifyClerkApiToken(token);
    const { sub, email_addresses, first_name, last_name, primary_email_address_id, phone_numbers } =
      verified;

    const email = email_addresses?.find((e) => e.id === primary_email_address_id)?.email_address;
    if (!email) {
      throw new Error('No email address found in Clerk profile');
    }

    const name = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0];
    const phone = phone_numbers?.[0]?.phone_number || null;

    // Find existing user by Clerk user ID or email
    let user = await User.findOne({ $or: [{ clerkUserId: sub }, { email: email.toLowerCase() }] });

    if (!user) {
      // Create new user from Clerk identity
      user = new User({
        name,
        email: email.toLowerCase(),
        password: null,
        phone,
        isActive: true,
        isEmailVerified: true,
        role: 'procurement_manager',
        termsAccepted: false,
        clerkUserId: sub,
        authProvider: 'clerk',
      });

      await user.save();
      logger.info(`Clerk Auth: Created new user ${user.email} (${user._id})`);
    } else {
      // Update Clerk user ID if not set
      if (!user.clerkUserId) {
        user.clerkUserId = sub;
        user.isEmailVerified = true;
        await user.save({ validateBeforeSave: false });
      }

      // Update last login
      user.lastLoginAt = new Date();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save({ validateBeforeSave: false });
      logger.info(`Clerk Auth: User logged in ${user.email}`);
    }

    const tokens = generateTokens(user);
    return {
      user: sanitizeUser(user),
      tokens,
      provider: 'clerk',
    };
  } catch (error) {
    logger.error('Clerk Auth: Sign in failed:', error);
    throw error;
  }
}

// Link existing local user to Clerk account
async function linkClerkUser(userId, clerkToken) {
  try {
    const verified = await verifyClerkApiToken(clerkToken);
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.clerkUserId = verified.sub;
    await user.save({ validateBeforeSave: false });
    logger.info(`Clerk Auth: Linked Clerk account to user ${user.email}`);
    return sanitizeUser(user);
  } catch (error) {
    logger.error('Clerk Auth: Link user failed:', error);
    throw error;
  }
}

module.exports = {
  getClerkClient,
  verifyClerkToken,
  verifyClerkApiToken,
  signInWithClerk,
  linkClerkUser,
};
