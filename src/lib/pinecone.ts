// Pinecone wrapper
import { PineconeClient } from '@pinecone-database/pinecone';
import { env } from '../env';

if (!env.PINECONE_API_KEY || !env.PINECONE_ENVIRONMENT) {
  throw new Error('Missing Pinecone env vars (PINECONE_API_KEY or PINECONE_ENVIRONMENT)');
}

export const pineconeClient = new PineconeClient();

// Initialize pinecone client - this should be called in your application startup
export async function initPinecone() {
  await pineconeClient.init({
    apiKey: env.PINECONE_API_KEY,
    environment: env.PINECONE_ENVIRONMENT,
  });
}

// Example: query an index
export async function queryIndex(indexName: string, vector: number[], topK = 5) {
  const index = pineconeClient.Index(indexName);
  const result = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });
  return result;
}

// Usage:
// await initPinecone();
// const results = await queryIndex('my-index', [0.1, 0.2, 0.3]);