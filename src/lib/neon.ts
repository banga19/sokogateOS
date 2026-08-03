// Neon wrapper – exports a configured connection pool
import { createPool } from '@neondatabase/serverless';
import { env } from '../env';

if (!env.NEON_DATABASE_URL) {
  throw new Error('Missing NEON_DATABASE_URL env var');
}

export const neonPool = createPool(env.NEON_DATABASE_URL);

// Usage example:
// const client = await neonPool.connect();
// const result = await client.query('SELECT 1');