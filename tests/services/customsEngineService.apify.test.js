// Integration tests for Apify-powered methods in Customs Engine Service
// Tests tariff lookup, trade agreement crawl, and document verification flows

jest.mock('../../src/services/apifyService');
jest.mock('../../src/utils/logger');

const apifyService = require('../../src/services/apifyService');
const logger = require('../../src/utils/logger');
const customsEngine = require('../../src/services/customsEngineService');

describe('CustomsEngineService — Apify Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== apifyLookupTariffData =====

  describe('apifyLookupTariffData', () => {
    test('should return a tariff entry when Apify returns data', async () => {
      apifyService.lookupTariffData.mockResolvedValue({
        source: 'https://www.trade.gov/tariff?hs=6109.10&country=Kenya',
        data: [
          {
            dutyRate: 15,
            vatRate: 16,
            tradeAgreement: 'AfCFTA',
            tradeAgreementCode: 'AfCFTA',
          },
        ],
        hsCode: '6109.10',
        country: 'Kenya',
        retrievedAt: '2026-06-23T12:00:00.000Z',
      });

      const result = await customsEngine.apifyLookupTariffData('6109.10', 'Kenya');

      expect(apifyService.lookupTariffData).toHaveBeenCalledWith('6109.10', 'Kenya');
      expect(result).toMatchObject({
        hsCode: '6109.10',
        country: 'Kenya',
        baseDutyRate: 15,
        vatRate: 16,
        preferentialRate: null,
        tradeAgreement: { name: 'AfCFTA', shortName: 'AfCFTA' },
        source: 'apify',
        isActive: true,
      });
      expect(result.lastCrawled).toBeInstanceOf(Date);
    });

    test('should return null when Apify returns no data', async () => {
      apifyService.lookupTariffData.mockResolvedValue(null);

      const result = await customsEngine.apifyLookupTariffData('6109.10', 'Kenya');

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No Apify tariff data found')
      );
    });

    test('should handle empty data array', async () => {
      apifyService.lookupTariffData.mockResolvedValue({
        source: 'https://trade.gov',
        data: [],
        hsCode: '6109.10',
        country: 'Kenya',
      });

      const result = await customsEngine.apifyLookupTariffData('6109.10', 'Kenya');

      expect(result).toBeNull();
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.lookupTariffData.mockRejectedValue(new Error('Crawl failed'));

      const result = await customsEngine.apifyLookupTariffData('6109.10', 'Kenya');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify tariff lookup error'),
        expect.any(String)
      );
    });
  });

  // ===== apifyCrawlTradeAgreements =====

  describe('apifyCrawlTradeAgreements', () => {
    test('should map crawled trade agreements', async () => {
      apifyService.crawlTradeAgreements.mockResolvedValue([
        {
          name: 'African Continental Free Trade Area',
          shortName: 'AfCFTA',
          type: 'FTA',
          agreementType: 'FTA',
          memberCountries: ['Kenya', 'Ghana', 'Rwanda'],
          keyBenefits: ['Duty-free access', 'Reduced NTBs'],
          rulesOfOrigin: { localContent: 35 },
        },
        {
          name: 'EAC Customs Union',
          memberCountries: ['Kenya', 'Tanzania', 'Uganda'],
        },
      ]);

      const result = await customsEngine.apifyCrawlTradeAgreements('Kenya');

      expect(apifyService.crawlTradeAgreements).toHaveBeenCalledWith('Kenya');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'African Continental Free Trade Area',
        shortName: 'AfCFTA',
        type: 'FTA',
        memberCountries: ['Kenya', 'Ghana', 'Rwanda'],
        source: 'apify',
      });
      expect(result[0].rulesOfOrigin).toEqual({ localContentRequirement: 35 });
      expect(result[0].retrievedAt).toBeDefined();
      expect(result[1].name).toBe('EAC Customs Union');
    });

    test('should return empty array when no agreements found', async () => {
      apifyService.crawlTradeAgreements.mockResolvedValue([]);

      const result = await customsEngine.apifyCrawlTradeAgreements('Kenya');

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No Apify trade agreement data found')
      );
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.crawlTradeAgreements.mockRejectedValue(new Error('Crawl timeout'));

      const result = await customsEngine.apifyCrawlTradeAgreements('Kenya');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify trade agreement crawl error'),
        expect.any(String)
      );
    });
  });

  // ===== apifyVerifyDocumentRequirements =====

  describe('apifyVerifyDocumentRequirements', () => {
    test('should return document requirements from scraped news', async () => {
      apifyService.scrapeMarketNews.mockResolvedValue([
        {
          title: 'Kenya customs document requirements for importers',
          url: 'https://example.com/kenya-customs',
          snippet: 'Importers must provide commercial invoice, bill of lading...',
        },
      ]);

      const result = await customsEngine.apifyVerifyDocumentRequirements(
        'commercial_invoice',
        'Kenya'
      );

      expect(apifyService.scrapeMarketNews).toHaveBeenCalledWith(
        'Kenya commercial invoice requirements customs',
        3
      );
      expect(result).toMatchObject({
        documentType: 'commercial_invoice',
        country: 'Kenya',
        sources: [
          {
            title: 'Kenya customs document requirements for importers',
            url: 'https://example.com/kenya-customs',
            snippet: 'Importers must provide commercial invoice, bill of lading...',
          },
        ],
      });
      expect(result.retrievedAt).toBeDefined();
    });

    test('should return null when no results found', async () => {
      apifyService.scrapeMarketNews.mockResolvedValue([]);

      const result = await customsEngine.apifyVerifyDocumentRequirements('bill_of_lading', 'Kenya');

      expect(result).toBeNull();
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.scrapeMarketNews.mockRejectedValue(new Error('Search failed'));

      const result = await customsEngine.apifyVerifyDocumentRequirements('certificate_of_origin', 'Kenya');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify document verification error'),
        expect.any(String)
      );
    });
  });
});
