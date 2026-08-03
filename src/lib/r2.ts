// Cloudflare R2 wrapper
import { R2 } from 'cloudflare-r2-sdk';
import { env } from '../env';

if (!env.CLOUDFLARE_R2_ACCOUNT_ID || !env.CLOUDFLARE_R2_ACCESS_KEY_ID || !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing Cloudflare R2 env vars');
}

export const r2Client = new R2({
  accountId: env.CLOUDFLARE_R2_ACCOUNT_ID,
  accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
});

// Simple bucket helper example
export async function uploadToBucket(bucketName: string, key: string, body: Buffer | string) {
  const bucket = r2Client.bucket(bucketName);
  await bucket.put(key, body);
  return `https://${bucketName}.r2.cloudflarestorage.com/${key}`;
}

// Usage:
// const url = await uploadToBucket('my-bucket', 'path/file.txt', 'content');