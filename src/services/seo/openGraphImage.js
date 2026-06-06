// Open Graph Image Generator for sokogateOS
// Generates dynamic Open Graph images for social media sharing

const logger = require('../../utils/logger');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Default configuration
const DEFAULT_CONFIG = {
  width: 1200,
  height: 630,
  backgroundColor: '#1a365d', // SokogateOS primary blue
  titleColor: '#ffffff',
  subtitleColor: '#e2e8f0',
  fontFamily: 'Arial',
  logoPath: '/assets/logo.png',
  siteName: 'SokogateOS',
  siteUrl: process.env.SITE_URL || 'https://sokogateos.com'
};

/**
 * Open Graph Image Generator class
 */
class OpenGraphImageGenerator {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Ensure uploads directory exists
    this.uploadsDir = path.join(process.cwd(), 'public', 'og-images');
    this.initUploadsDirectory();
  }

  /**
   * Initialize uploads directory for generated images
   */
  async initUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      logger.debug(`OG Images directory ensured: ${this.uploadsDir}`);
    } catch (error) {
      logger.error('Failed to create OG images directory:', error);
    }
  }

  /**
   * Generate Open Graph image for a product or page
   * @param {Object} data - Data for the OG image
   * @param {string} data.title - Main title
   * @param {string} data.subtitle - Subtitle or description
   * @param {string} data.imageUrl - Optional background image URL
   * @param {string} data.type - Type of content (product, company, etc.)
   * @param {string} data.id - Unique identifier for caching
   * @returns {Promise<string>} Path to generated image
   */
  async generateImage(data) {
    try {
      // Create cache key based on data
      const cacheKey = this.generateCacheKey(data);
      const cachePath = path.join(this.uploadsDir, `${cacheKey}.png`);

      // Check if image already exists in cache
      try {
        await fs.access(cachePath);
        logger.debug(`OG image found in cache: ${cachePath}`);
        return `/og-images/${cacheKey}.png`;
      } catch (cacheError) {
        // Image not in cache, generate new one
        logger.debug(`Generating new OG image for: ${data.title}`);
      }

      // Create canvas
      const canvas = createCanvas(this.config.width, this.config.height);
      const ctx = canvas.getContext('2d');

      // Draw background
      ctx.fillStyle = this.config.backgroundColor;
      ctx.fillRect(0, 0, this.config.width, this.config.height);

      // Try to load and draw background image if provided
      if (data.imageUrl) {
        try {
          const bgImage = await loadImage(data.imageUrl);
          // Draw background image with overlay for text readability
          ctx.drawImage(bgImage, 0, 0, this.config.width, this.config.height);

          // Add dark overlay for better text contrast
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(0, 0, this.config.width, this.config.height);
        } catch (bgError) {
          logger.warn('Failed to load background image, using solid color:', bgError.message);
          // Fall back to solid background (already drawn above)
        }
      }

      // Draw logo if available
      try {
        const logoPath = path.join(process.cwd(), 'public', this.config.logoPath.replace(/^\//, ''));
        const logoImage = await loadImage(logoPath);
        const logoSize = 80;
        const logoX = 40;
        const logoY = 40;
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      } catch (logoError) {
        logger.debug('Logo not found or failed to load:', logoError.message);
        // Continue without logo
      }

      // Draw title
      ctx.fillStyle = this.config.titleColor;
      ctx.font = `bold 48px ${this.config.fontFamily}`;
      ctx.textBaseline = 'top';

      const titleX = this.config.logoPath ? 160 : 40;
      const titleY = 80;
      this.wrapText(ctx, data.title, titleX, titleY, this.config.width - 40, 58);

      // Draw subtitle if provided
      if (data.subtitle) {
        ctx.fillStyle = this.config.subtitleColor;
        ctx.font = `28px ${this.config.fontFamily}`;
        ctx.textBaseline = 'top';

        const subtitleY = titleY + 100; // Position below title
        this.wrapText(ctx, data.subtitle, titleX, subtitleY, this.config.width - 40, 36);
      }

      // Draw site name/badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(40, this.config.height - 80, 200, 40);

      ctx.fillStyle = this.config.backgroundColor;
      ctx.font = `bold 24px ${this.config.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.config.siteName, 50, this.config.height - 60);

      // Save image to file
      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(cachePath, buffer);

      logger.info(`Generated OG image: ${cachePath}`);

      return `/og-images/${cacheKey}.png`;
    } catch (error) {
      logger.error('Failed to generate OG image:', error);
      // Return a default image path or throw error
      throw new Error(`OG image generation failed: ${error.message}`);
    }
  }

  /**
   * Wrap text to fit within specified width
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} text - Text to wrap
   * @param {number} x - Starting x position
   * @param {number} y - Starting y position
   * @param {number} maxWidth - Maximum line width
   * @param {number} lineHeight - Line height
   */
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }

    ctx.fillText(line, x, y);
  }

  /**
   * Generate cache key from data
   * @param {Object} data - Data to hash
   * @returns {string} Cache key
   */
  generateCacheKey(data) {
    // Create a consistent string representation
    const dataString = JSON.stringify({
      title: data.title || '',
      subtitle: data.subtitle || '',
      imageUrl: data.imageUrl || '',
      type: data.type || '',
      id: data.id || '',
      config: {
        width: this.config.width,
        height: this.config.height,
        backgroundColor: this.config.backgroundColor,
        titleColor: this.config.titleColor,
        subtitleColor: this.config.subtitleColor
      }
    });

    // Create hash for cache key
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  /**
   * Clear image cache (admin function)
   * @returns {Promise<number>} Number of files deleted
   */
  async clearCache() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      let deletedCount = 0;

      for (const file of files) {
        if (file.endsWith('.png')) {
          await fs.unlink(path.join(this.uploadsDir, file));
          deletedCount++;
        }
      }

      logger.info(`Cleared OG image cache: ${deletedCount} files deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to clear OG image cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getCacheStats() {
    try {
      const files = await fs.readdir(this.uploadsDir);
