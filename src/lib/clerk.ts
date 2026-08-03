// Clerk wrapper
import { ClerkProvider } from '@clerk/clerk-react';
import { env } from '../env';

if (!env.CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
  throw new Error('Missing Clerk env vars (CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY)');
}

export function initClerk() {
  // Clerk SDK for React expects env vars at runtime; no explicit init needed here.
  return {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  };
}

export { ClerkProvider };

// Usage (React):
// import { ClerkProvider } from '../../src/lib/clerk';
// <ClerkProvider {...initClerk()}>{children}</ClerkProvider>