// Integration tests for Apify-powered methods in Supplier Trust Service
// Tests the enrichment and discovery flows with mocked apifyService

jest.mock('../../src/services/apifyService');
jest.mock('../../src/utils/logger');
jest.mock('../../src/models/supplierTrust');

const apifyService = require('../../src/services/apifyService');
const logger = require('../../src/utils/logger');
const SupplierTrust = require('../../src/models/supplierTrust');
const supplierTrustService = require('../../src/services/supplierTrustService');

describe('SupplierTrustService — Apify Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== apifyEnrichSupplierProfile =====

  describe('apifyEnrichSupplierProfile', () => {
    // Factory function to create fresh mock supplier per test, preventing shared state mutations
    function createMockSupplier(overrides = {}) {
      return {
        supplierId: 'sup_001',
        supplierName: 'Global Textiles Ltd',
        publicProfile: {
          headline: 'Premium textile manufacturer',
          description: '',
          website: 'globaltextiles.com',
          categories: ['textiles'],
          employeeCount: 1000,
          foundedYear: 2010,
        },
        trustScore: { overall: 80, deliveryReliability: 85 },
        lastApifyEnrichment: null,
        save: jest.fn().mockResolvedValue(true),
        ...overrides,
      };
    }

    test('should enrich supplier profile with Apify data and boost trust score', async () => {
      const mockSupplier = createMockSupplier();
      SupplierTrust.findOne.mockResolvedValue(mockSupplier);
      apifyService.enrichCompanyData.mockResolvedValue({
        companyName: 'Global Textiles Ltd',
        description: 'Global textile manufacturer with 15 years of export experience',
        industry: 'textiles',
        employeeCount: 1200,
        foundedYear: 2009,
        confidence: 0.85,
      });

      const result = await supplierTrustService.apifyEnrichSupplierProfile('sup_001');

      expect(apifyService.enrichCompanyData).toHaveBeenCalledWith(
        'Global Textiles Ltd',
        'globaltextiles.com'
      );
      expect(result.publicProfile.description).toBe(
        'Global textile manufacturer with 15 years of export experience'
      );
      expect(result.publicProfile.employeeCount).toBe(1200);
      expect(result.publicProfile.foundedYear).toBe(2009);
      expect(result.trustScore.overall).toBe(83); // 80 + 3 boost
      expect(result.lastApifyEnrichment).toBeInstanceOf(Date);
      expect(mockSupplier.save).toHaveBeenCalled();
    });

    test('should not overwrite existing description', async () => {
      const supplierWithDesc = createMockSupplier({
        publicProfile: {
          headline: 'Premium textile manufacturer',
          description: 'Existing description',
          website: 'globaltextiles.com',
          categories: ['textiles'],
          employeeCount: 1000,
          foundedYear: 2010,
        },
      });
      SupplierTrust.findOne.mockResolvedValue(supplierWithDesc);
      apifyService.enrichCompanyData.mockResolvedValue({
        description: 'Apify description that should not overwrite',
        confidence: 0.85,
      });

      const result = await supplierTrustService.apifyEnrichSupplierProfile('sup_001');

      expect(result.publicProfile.description).toBe('Existing description');
    });

    test('should not boost trust score for low-confidence enrichment', async () => {
      const mockSupplier = createMockSupplier();
      SupplierTrust.findOne.mockResolvedValue(mockSupplier);
      apifyService.enrichCompanyData.mockResolvedValue({
        description: 'Some data',
        confidence: 0.5, // Below 0.7 threshold
      });

      const result = await supplierTrustService.apifyEnrichSupplierProfile('sup_001');

      expect(result.trustScore.overall).toBe(80); // No boost
    });

    test('should return supplier unchanged when no enrichment data found', async () => {
      const mockSupplier = createMockSupplier();
      SupplierTrust.findOne.mockResolvedValue(mockSupplier);
      apifyService.enrichCompanyData.mockResolvedValue(null);

      const result = await supplierTrustService.apifyEnrichSupplierProfile('sup_001');

      expect(result).toBe(mockSupplier);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No Apify enrichment found')
      );
    });

    test('should return null when supplier is not found', async () => {
      SupplierTrust.findOne.mockResolvedValue(null);

      const result = await supplierTrustService.apifyEnrichSupplierProfile('nonexistent');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify enrichment error'),
        expect.any(String)
      );
    });

    test('should handle Apify service errors gracefully', async () => {
      const mockSupplier = createMockSupplier();
      SupplierTrust.findOne.mockResolvedValue(mockSupplier);
      apifyService.enrichCompanyData.mockRejectedValue(new Error('API timeout'));

      const result = await supplierTrustService.apifyEnrichSupplierProfile('sup_001');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify enrichment error'),
        expect.any(String)
      );
    });
  });

  // ===== apifyDiscoverSuppliers =====

  describe('apifyDiscoverSuppliers', () => {
    test('should discover and map supplier candidates from Apify', async () => {
      apifyService.searchSuppliers.mockResolvedValue([
        {
          companyName: 'Textile Supplier A',
          domain: 'textile-a.com',
          description: 'Premium textile manufacturer',
          industry: 'textiles',
          country: 'China',
          employeeCount: 500,
          email: 'contact@textile-a.com',
        },
        {
          companyName: 'Textile Supplier B',
          domain: 'textile-b.com',
          employeeCount: 200,
        },
      ]);

      const result = await supplierTrustService.apifyDiscoverSuppliers({
        productCategory: 'textiles',
        country: 'China',
        maxResults: 10,
      });

      expect(apifyService.searchSuppliers).toHaveBeenCalledWith({
        productCategory: 'textiles',
        country: 'China',
        maxResults: 10,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'Textile Supplier A',
        domain: 'textile-a.com',
        industry: 'textiles',
        country: 'China',
        employeeCount: 500,
        contactEmail: 'contact@textile-a.com',
        source: 'apify',
        status: 'pending_review',
      });
      expect(result[0].candidateId).toContain('apify_candidate_');
      expect(result[1].name).toBe('Textile Supplier B');
      expect(result[1].contactEmail).toBeNull();
    });

    test('should return empty array when no candidates found', async () => {
      apifyService.searchSuppliers.mockResolvedValue([]);

      const result = await supplierTrustService.apifyDiscoverSuppliers({
        productCategory: 'textiles',
      });

      expect(result).toEqual([]);
    });

    test('should use default maxResults of 10 when not specified', async () => {
      apifyService.searchSuppliers.mockResolvedValue([]);

      await supplierTrustService.apifyDiscoverSuppliers({
        productCategory: 'electronics',
      });

      expect(apifyService.searchSuppliers).toHaveBeenCalledWith({
        productCategory: 'electronics',
        maxResults: 10,
      });
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.searchSuppliers.mockRejectedValue(new Error('API error'));

      const result = await supplierTrustService.apifyDiscoverSuppliers({
        productCategory: 'textiles',
      });

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify supplier discovery error'),
        expect.any(String)
      );
    });
  });
});
