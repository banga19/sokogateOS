// Apify Service Tests for SokogateOS
// Tests the Apify integration wrapper with mocked apify-client
//
// apifyService.js now reads APIFY_API_KEY at runtime (not module load time),
// so tests can freely set/clear process.env without module reloads.

jest.mock('apify-client', () => ({
  ApifyClient: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { ApifyClient } = require('apify-client');
const logger = require('../../src/utils/logger');
const apifyService = require('../../src/services/apifyService');

describe('ApifyService', () => {
  let mockClient;
  let mockActor;
  let mockDataset;

  beforeAll(() => {
    delete process.env.APIFY_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.APIFY_API_KEY;
    // Reset the client singleton so getClient() re-reads the env var next time
    apifyService._resetClient();

    // Build the mock Apify client chain:
    //   client.actor(id).call(input) → run
    //   client.dataset(run.defaultDatasetId).listItems() → { items }
    mockDataset = {
      listItems: jest.fn().mockResolvedValue({ items: [] }),
    };

    mockActor = {
      call: jest.fn().mockResolvedValue({ defaultDatasetId: 'ds-123' }),
    };

    mockClient = {
      actor: jest.fn().mockReturnValue(mockActor),
      dataset: jest.fn().mockReturnValue(mockDataset),
    };

    ApifyClient.mockReturnValue(mockClient);
  });

  // ===== STATIC HELPERS =====

  describe('isConfigured', () => {
    test('should return false when APIFY_API_KEY is not set', () => {
      expect(apifyService.isConfigured()).toBe(false);
    });

    test('should return true when APIFY_API_KEY is set', () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      expect(apifyService.isConfigured()).toBe(true);
    });
  });

  describe('getServiceStatus', () => {
    test('should return configured: false when key is missing', () => {
      const status = apifyService.getServiceStatus();
      expect(status.configured).toBe(false);
      expect(status.actorCount).toBeGreaterThan(0);
    });

    test('should return configured: true and correct actor count when key is present', () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      const status = apifyService.getServiceStatus();
      expect(status.configured).toBe(true);
      expect(status.actorCount).toBe(7);
    });
  });

  // ===== GENERIC =====

  describe('runActor', () => {
    test('should return null when APIFY_API_KEY is not set', async () => {
      const result = await apifyService.runActor('some-actor', { input: 'test' });
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('APIFY_API_KEY not set')
      );
    });

    test('should call the actor and return dataset items', async () => {
      const mockItems = [{ name: 'Item 1' }, { name: 'Item 2' }];
      mockDataset.listItems.mockResolvedValue({ items: mockItems });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.runActor('apify/test-scraper', { query: 'test' });

      expect(mockClient.actor).toHaveBeenCalledWith('apify/test-scraper');
      expect(mockActor.call).toHaveBeenCalledWith(
        { query: 'test' },
        { timeout: 60 }
      );
      expect(mockClient.dataset).toHaveBeenCalledWith('ds-123');
      expect(result).toEqual(mockItems);
    });

    test('should return null when actor call fails and log error', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      mockActor.call.mockRejectedValue(new Error('Actor timeout'));

      const result = await apifyService.runActor('apify/test-scraper', { query: 'test' });

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Actor "apify/test-scraper" failed')
      );
    });

    test('should not log error when silent option is true', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      mockActor.call.mockRejectedValue(new Error('Actor timeout'));

      const result = await apifyService.runActor(
        'apify/test-scraper',
        { query: 'test' },
        { silent: true }
      );

      expect(result).toBeNull();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  // ===== SUPPLIER TRUST =====

  describe('enrichCompanyData', () => {
    test('should return the first item from the company intelligence actor', async () => {
      const mockData = { companyName: 'Test Corp', industry: 'Textiles', employeeCount: 500 };
      mockDataset.listItems.mockResolvedValue({ items: [mockData] });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.enrichCompanyData('Test Corp', 'testcorp.com');

      expect(mockClient.actor).toHaveBeenCalledWith('fortunate_favorite/company-intelligence');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          companyName: 'Test Corp',
          domain: 'testcorp.com',
          enrichContacts: true,
          enrichFinancials: true,
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockData);
    });

    test('should return null when no items returned', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.enrichCompanyData('Unknown Co');
      expect(result).toBeNull();
    });
  });

  describe('searchSuppliers', () => {
    test('should search for suppliers using the leads finder actor', async () => {
      const mockLeads = [
        { companyName: 'Supplier A', domain: 'supplier-a.com' },
        { companyName: 'Supplier B', domain: 'supplier-b.com' },
      ];
      mockDataset.listItems.mockResolvedValue({ items: mockLeads });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.searchSuppliers({
        productCategory: 'textiles',
        country: 'China',
        maxResults: 10,
      });

      expect(mockClient.actor).toHaveBeenCalledWith('code_crafter/leads-finder');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          searchPhrase: 'textiles supplier China',
          maxLeads: 10,
          enrichCompanyData: true,
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockLeads);
    });

    test('should handle empty country gracefully', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.searchSuppliers({ productCategory: 'electronics' });

      expect(mockActor.call).toHaveBeenCalledWith(
        expect.objectContaining({ searchPhrase: 'electronics supplier' }),
        expect.any(Object)
      );
      expect(result).toEqual([]);
    });
  });

  // ===== MARKET INTELLIGENCE =====

  describe('scrapePricingData', () => {
    test('should scrape pricing data using the e-commerce scraper', async () => {
      const mockPrices = [{ title: 'Product A', price: 29.99 }];
      mockDataset.listItems.mockResolvedValue({ items: mockPrices });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.scrapePricingData({ product: 'cotton fabric', maxResults: 5 });

      expect(mockClient.actor).toHaveBeenCalledWith('apify/e-commerce-scraping-tool');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          SearchEngineSearchKeyword: 'cotton fabric',
          countryCode: 'us',
          scrapeProductsFromSearchEngine: true,
          maxSearchEngineProducts: 5,
          maxSearchEngineResults: 5,
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockPrices);
    });

    test('should use default marketplace when not specified', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      await apifyService.scrapePricingData({ product: 'test' });

      expect(mockActor.call).toHaveBeenCalledWith(
        expect.objectContaining({ SearchEngineSearchKeyword: 'test', countryCode: 'us' }),
        expect.any(Object)
      );
    });
  });

  describe('scrapeMarketNews', () => {
    test('should scrape news via Google Search actor', async () => {
      const mockNews = [{ title: 'Korea Import News', snippet: '...' }];
      mockDataset.listItems.mockResolvedValue({ items: mockNews });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.scrapeMarketNews('Korea import market 2025', 3);

      expect(mockClient.actor).toHaveBeenCalledWith('apify/google-search-scraper');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          queries: 'Korea import market 2025',
          maxPagesPerQuery: 1,
          resultsPerPage: 3,
          near: '',
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockNews);
    });

    test('should default to 5 results when count not provided', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      await apifyService.scrapeMarketNews('test topic');

      expect(mockActor.call).toHaveBeenCalledWith(
        expect.objectContaining({ resultsPerPage: 5 }),
        expect.any(Object)
      );
    });
  });

  describe('crawlWebsite', () => {
    test('should crawl a website using the website crawler actor', async () => {
      const mockPages = [{ url: 'https://example.com', text: 'content' }];
      mockDataset.listItems.mockResolvedValue({ items: mockPages });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.crawlWebsite('https://example.com', { maxPages: 5, maxDepth: 1 });

      expect(mockClient.actor).toHaveBeenCalledWith('apify/website-content-crawler');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          startUrls: [{ url: 'https://example.com' }],
          maxCrawlPages: 5,
          maxCrawlDepth: 1,
          extractFullPage: true,
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockPages);
    });

    test('should use default crawl options when not specified', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      await apifyService.crawlWebsite('https://example.com');

      expect(mockActor.call).toHaveBeenCalledWith(
        expect.objectContaining({ maxCrawlPages: 10, maxCrawlDepth: 2 }),
        expect.any(Object)
      );
    });
  });

  // ===== CUSTOMS ENGINE =====

  describe('lookupTariffData', () => {
    test('should return tariff data when crawl succeeds', async () => {
      const mockTariffItems = [{ dutyRate: 15, vatRate: 16 }];
      mockDataset.listItems.mockResolvedValue({ items: mockTariffItems });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.lookupTariffData('6109.10', 'Kenya');

      expect(mockClient.actor).toHaveBeenCalledWith('apify/website-content-crawler');
      expect(result).toMatchObject({
        hsCode: '6109.10',
        country: 'Kenya',
        data: mockTariffItems,
        source: expect.stringContaining('trade.gov'),
      });
    });

    test('should try next URL when first crawl returns empty', async () => {
      // First call returns empty, second returns data
      mockDataset.listItems
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [{ dutyRate: 10 }] });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.lookupTariffData('6109.10', 'Kenya');

      expect(mockClient.actor).toHaveBeenCalledTimes(2);
      expect(result.source).toContain('macmap.org');
    });

    test('should return null when all URLs return empty', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.lookupTariffData('6109.10', 'Kenya');
      expect(result).toBeNull();
    });
  });

  describe('crawlTradeAgreements', () => {
    test('should crawl trade agreements for a country', async () => {
      const mockAgreements = [{ name: 'AfCFTA', memberCountries: ['Kenya'] }];
      mockDataset.listItems.mockResolvedValue({ items: mockAgreements });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.crawlTradeAgreements('Kenya');

      expect(mockClient.actor).toHaveBeenCalledWith('apify/website-content-crawler');
      expect(mockActor.call).toHaveBeenCalledWith(
        expect.objectContaining({
          startUrls: [{ url: expect.stringContaining('macmap.org') }],
          maxCrawlPages: 3,
          maxCrawlDepth: 2,
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockAgreements);
    });
  });

  // ===== KOREAN COMPLIANCE =====

  describe('validateKoreanBRN', () => {
    test('should validate a Korean BRN and return company data', async () => {
      const mockData = { companyName: 'Korean Corp', isValid: true, taxStatus: 'active' };
      mockDataset.listItems.mockResolvedValue({ items: [mockData] });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.validateKoreanBRN('123-45-67890');

      expect(mockClient.actor).toHaveBeenCalledWith('lazymac/korean-business-data');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          businessNumbers: ['1234567890'],
          includeCompanyInfo: true,
          includeTaxInfo: true,
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockData);
    });

    test('should strip non-numeric characters from BRN', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      await apifyService.validateKoreanBRN('123-45-67890');

      expect(mockActor.call).toHaveBeenCalledWith(
        expect.objectContaining({ businessNumbers: ['1234567890'] }),
        expect.any(Object)
      );
    });

    test('should return null when no data returned', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.validateKoreanBRN('123-45-67890');
      expect(result).toBeNull();
    });
  });

  describe('searchKoreanCompany', () => {
    test('should search for a Korean company', async () => {
      const mockCompanies = [{ companyName: 'Samsung Electronics', brn: '1234567890' }];
      mockDataset.listItems.mockResolvedValue({ items: mockCompanies });

      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.searchKoreanCompany('Samsung');

      expect(mockClient.actor).toHaveBeenCalledWith('lazymac/korean-company-scraper');
      expect(mockActor.call).toHaveBeenCalledWith(
        {
          searchTerm: 'Samsung',
          maxResults: 10,
        },
        { timeout: 60 }
      );
      expect(result).toEqual(mockCompanies);
    });

    test('should return empty array when no results', async () => {
      process.env.APIFY_API_KEY = 'test-key-123';
      const result = await apifyService.searchKoreanCompany('Unknown Company');
      expect(result).toEqual([]);
    });
  });

  // ===== GRACEFUL DEGRADATION (no API key) =====

  describe('graceful degradation without API key', () => {
    test('enrichCompanyData should return null', async () => {
      const result = await apifyService.enrichCompanyData('Test Corp');
      expect(result).toBeNull();
    });

    test('searchSuppliers should return empty array', async () => {
      const result = await apifyService.searchSuppliers({ productCategory: 'textiles' });
      expect(result).toEqual([]);
    });

    test('scrapePricingData should return empty array', async () => {
      const result = await apifyService.scrapePricingData({ product: 'test' });
      expect(result).toEqual([]);
    });

    test('scrapeMarketNews should return empty array', async () => {
      const result = await apifyService.scrapeMarketNews('test topic');
      expect(result).toEqual([]);
    });

    test('crawlWebsite should return empty array', async () => {
      const result = await apifyService.crawlWebsite('https://example.com');
      expect(result).toEqual([]);
    });

    test('lookupTariffData should return null', async () => {
      const result = await apifyService.lookupTariffData('6109.10', 'Kenya');
      expect(result).toBeNull();
    });

    test('crawlTradeAgreements should return empty array', async () => {
      const result = await apifyService.crawlTradeAgreements('Kenya');
      expect(result).toEqual([]);
    });

    test('validateKoreanBRN should return null', async () => {
      const result = await apifyService.validateKoreanBRN('123-45-67890');
      expect(result).toBeNull();
    });

    test('searchKoreanCompany should return empty array', async () => {
      const result = await apifyService.searchKoreanCompany('Test Co');
      expect(result).toEqual([]);
    });
  });
});
