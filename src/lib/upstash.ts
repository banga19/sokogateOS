// Upstash Redis wrapper
import { Redis } from '@upstash/redis';
import { env } from '../env';

if (!env.UPSTASH_REDIS_URL || !env.UPSTASH_REDIS_TOKEN) {
  throw new Error('Missing Upstash Redis env vars');
}

export const upstashRedis = new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
});

// Usage example:
// await upstashRedis.set('key', 'value');