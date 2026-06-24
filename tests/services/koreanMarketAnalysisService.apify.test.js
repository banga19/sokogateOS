// Integration tests for Apify-powered methods in Korean Market Analysis Service
// Tests pricing data scraping and market news scraping flows

jest.mock('../../src/services/apifyService');
jest.mock('../../src/utils/logger');

const apifyService = require('../../src/services/apifyService');
const logger = require('../../src/utils/logger');
const koreanMarketAnalysis = require('../../src/services/marketAnalysis/koreanMarketAnalysisService');

describe('KoreanMarketAnalysisService — Apify Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== scrapeKoreanPricingData =====

  describe('scrapeKoreanPricingData', () => {
    test('should map Apify pricing results to structured format', async () => {
      apifyService.scrapePricingData.mockResolvedValue([
        {
          title: 'Premium Cotton Fabric',
          price: 25000,
          currency: 'KRW',
          seller: 'Coupang Marketplace',
          url: 'https://www.coupang.com/product/123',
          rating: 4.5,
          reviewsCount: 128,
          availability: 'In Stock',
        },
        {
          name: 'Organic Cotton Fabric',
          currentPrice: 32000,
          store: 'Gmarket',
          productUrl: 'https://www.gmarket.co.kr/product/456',
          averageRating: 4.0,
          reviewCount: 64,
          stockStatus: 'Limited',
        },
      ]);

      const result = await koreanMarketAnalysis.scrapeKoreanPricingData('cotton fabric', 'coupang');

      expect(apifyService.scrapePricingData).toHaveBeenCalledWith({
        product: 'cotton fabric',
        marketplace: 'coupang',
        maxResults: 10,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'Premium Cotton Fabric',
        price: 25000,
        currency: 'KRW',
        seller: 'Coupang Marketplace',
        url: 'https://www.coupang.com/product/123',
        rating: 4.5,
        reviewCount: 128,
        availability: 'In Stock',
      });
      expect(result[0].scrapedAt).toBeDefined();
      expect(result[0].source).toBe('coupang');

      // Second item uses alternative field names
      expect(result[1].title).toBe('Organic Cotton Fabric');
      expect(result[1].price).toBe(32000);
      expect(result[1].seller).toBe('Gmarket');
    });

    test('should return empty array when no pricing data found', async () => {
      apifyService.scrapePricingData.mockResolvedValue([]);

      const result = await koreanMarketAnalysis.scrapeKoreanPricingData('unknown product');

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No pricing data returned from Apify')
      );
    });

    test('should default to coupang marketplace', async () => {
      apifyService.scrapePricingData.mockResolvedValue([]);

      await koreanMarketAnalysis.scrapeKoreanPricingData('test product');

      expect(apifyService.scrapePricingData).toHaveBeenCalledWith({
        product: 'test product',
        marketplace: 'coupang',
        maxResults: 10,
      });
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.scrapePricingData.mockRejectedValue(new Error('Scraper failed'));

      const result = await koreanMarketAnalysis.scrapeKoreanPricingData('cotton fabric');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error scraping Korean pricing'),
        expect.any(Error)
      );
    });
  });

  // ===== scrapeKoreanMarketNews =====

  describe('scrapeKoreanMarketNews', () => {
    test('should map Apify news results to structured format', async () => {
      apifyService.scrapeMarketNews.mockResolvedValue([
        {
          title: 'Korea-Africa Trade Hits Record High in 2025',
          url: 'https://example.com/korea-africa-trade',
          snippet: 'Trade between Korea and African nations reached $X billion...',
          source: 'Korea Herald',
          date: '2025-06-20',
        },
        {
          title: 'Korean Import Demand for African Textiles Rising',
          link: 'https://example.com/textile-demand',
          description: 'Korean manufacturers are increasingly sourcing textiles from Africa...',
          displayLink: 'Business Korea',
          publishedDate: '2025-06-18',
        },
      ]);

      const result = await koreanMarketAnalysis.scrapeKoreanMarketNews(
        'Korea textile import Africa',
        5
      );

      expect(apifyService.scrapeMarketNews).toHaveBeenCalledWith(
        'Korea textile import Africa',
        5
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'Korea-Africa Trade Hits Record High in 2025',
        url: 'https://example.com/korea-africa-trade',
        snippet: 'Trade between Korea and African nations reached $X billion...',
        source: 'Korea Herald',
        date: '2025-06-20',
      });
      expect(result[0].scrapedAt).toBeDefined();

      // Second item uses alternative field names
      expect(result[1].title).toBe('Korean Import Demand for African Textiles Rising');
      expect(result[1].url).toBe('https://example.com/textile-demand');
      expect(result[1].snippet).toBe('Korean manufacturers are increasingly sourcing textiles from Africa...');
      expect(result[1].source).toBe('Business Korea');
    });

    test('should use default topic and count when not specified', async () => {
      apifyService.scrapeMarketNews.mockResolvedValue([]);

      await koreanMarketAnalysis.scrapeKoreanMarketNews();

      expect(apifyService.scrapeMarketNews).toHaveBeenCalledWith(
        'Korea import market trade Africa 2025',
        5
      );
    });

    test('should return empty array when no news found', async () => {
      apifyService.scrapeMarketNews.mockResolvedValue([]);

      const result = await koreanMarketAnalysis.scrapeKoreanMarketNews('test topic');

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No news results from Apify')
      );
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.scrapeMarketNews.mockRejectedValue(new Error('Search API error'));

      const result = await koreanMarketAnalysis.scrapeKoreanMarketNews('test topic');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error scraping Korean market news'),
        expect.any(Error)
      );
    });
  });
});
