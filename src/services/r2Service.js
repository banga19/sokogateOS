'use strict';

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadBucketCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

const {
  CLOUDFLARE_R2_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET_NAME,
} = process.env;

const R2_ENDPOINT = CLOUDFLARE_R2_ACCOUNT_ID
  ? `https://${CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : null;

class R2Service {
  constructor() {
    this._client = null;
    this.enabled = false;

    if (R2_ENDPOINT && CLOUDFLARE_R2_ACCESS_KEY_ID && CLOUDFLARE_R2_SECRET_ACCESS_KEY && CLOUDFLARE_R2_BUCKET_NAME) {
      try {
        this._client = new S3Client({
          endpoint: R2_ENDPOINT,
          region: 'auto',
          credentials: {
            accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
          },
        });
        this.enabled = true;
        logger.info('[R2] Service enabled - Cloudflare R2 configured');
      } catch (err) {
        logger.warn('[R2] Failed to initialise S3 client:', err.message);
        this.enabled = false;
      }
    } else {
      logger.info(
        '[R2] Service disabled - set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET_NAME to enable.',
      );
    }
  }

  // ── Storage operations ──────────────────────────────────────────

  /**
   * Upload a file to R2.
   * @param {string} key
   * @param {Buffer|Uint8Array|string} body
   * @param {string} [contentType='application/octet-stream']
   * @returns {Promise<{ key: string, bucket: string }>}
   */
  async putObject(key, body, contentType = 'application/octet-stream') {
    if (!this.enabled) throw new Error('R2 storage is not configured');
    await this._client.send(
      new PutObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    logger.info(`[R2] Uploaded ${key}`);
    return { key, bucket: CLOUDFLARE_R2_BUCKET_NAME };
  }

  /**
   * Download a file from R2 as a stream.
   * @param {string} key
   * @returns {Promise<ReadableStream>}
   */
  async getObject(key) {
    if (!this.enabled) throw new Error('R2 storage is not configured');
    const response = await this._client.send(
      new GetObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
      }),
    );
    return response.Body;
  }

  /**
   * Generate a presigned GET URL.
   * @param {string} key
   * @param {number} [expiresIn=3600]
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.enabled) throw new Error('R2 storage is not configured');
    const command = new GetObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
    });
    return getSignedUrl(this._client, command, { expiresIn });
  }

  /**
   * List objects in the bucket with optional prefix.
   * @param {string} [prefix='']
   * @returns {Promise<Array<{ Key: string, Size: number, LastModified: string }>>}
   */
  async listObjects(prefix = '') {
    if (!this.enabled) throw new Error('R2 storage is not configured');
    const response = await this._client.send(
      new ListObjectsV2Command({
        Bucket: CLOUDFLARE_R2_BUCKET_NAME,
        Prefix: prefix,
      }),
    );
    return response.Contents || [];
  }

  /**
   * Delete an object.
   * @param {string} key
   * @returns {Promise<{ deleted: boolean, key: string }>}
   */
  async deleteObject(key) {
    if (!this.enabled) throw new Error('R2 storage is not configured');
    await this._client.send(
      new DeleteObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
      }),
    );
    logger.info(`[R2] Deleted ${key}`);
    return { deleted: true, key };
  }

  /**
   * Verify the bucket is accessible.
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  async checkBucket() {
    if (!this.enabled) {
      return { ok: false, message: 'R2 not configured' };
    }
    try {
      await this._client.send(
        new HeadBucketCommand({ Bucket: CLOUDFLARE_R2_BUCKET_NAME }),
      );
      return { ok: true, bucket: CLOUDFLARE_R2_BUCKET_NAME };
    } catch (err) {
      logger.error('[R2] Bucket check failed:', err.message);
      return { ok: false, error: err.message };
    }
  }

  // ── Status ──────────────────────────────────────────────────────

  isEnabled() {
    return this.enabled;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      bucket: CLOUDFLARE_R2_BUCKET_NAME || null,
      accountId: CLOUDFLARE_R2_ACCOUNT_ID || null,
      endpoint: R2_ENDPOINT || null,
    };
  }
}

const r2Service = new R2Service();

module.exports = { r2Service, R2Service };
