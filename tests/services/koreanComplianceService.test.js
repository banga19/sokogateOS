// Korean Compliance Service Test for SokogateOS
// Tests the KoreanComplianceService functionality

const KoreanComplianceService = require('../../src/services/compliance/koreanComplianceService');
const logger = require('../../src/utils/logger');

describe('KoreanComplianceService', () => {

  // Helper to create a fresh instance since the module exports a singleton
  function createFreshInstance() {
    const KoreanComplianceServiceClass = KoreanComplianceService.constructor;
    return new KoreanComplianceServiceClass();
  }

  describe('checkProductCompliance', () => {
    test('should return compliant result when all mandatory documents are present', async () => {
      const service = createFreshInstance();
      const product = {
        name: 'Test Cocoa Product',
        category: 'cocoa'
      };

      const documents = [
        'HACCP Certificate',
        'Phyto-sanitary Certificate',
        'Origin Certificate'
      ];

      const result = await service.checkProductCompliance(product, documents);

      expect(result).toHaveProperty('productName');
      expect(result).toHaveProperty('complianceScore');
      expect(result.complianceScore).toBeGreaterThanOrEqual(70);
      expect(result.mandatoryRequirements.missing).toHaveLength(0);
    });

    test('should return non-compliant result when mandatory documents are missing', async () => {
      const service = createFreshInstance();
      const product = {
        name: 'Test Coffee Product',
        category: 'coffee'
      };

      const documents = [
        'HACCP Certificate'
        // Missing phyto-sanitary and origin certificates
      ];

      const result = await service.checkProductCompliance(product, documents);

      expect(result).toHaveProperty('productName');
      expect(result).toHaveProperty('complianceScore');
      expect(result.complianceScore).toBeLessThan(70);
      expect(result.mandatoryRequirements.missing).toContain('phyto-sanitary certificate');
      expect(result.mandatoryRequirements.missing).toContain('origin certificate');
    });

    test('should handle unknown product category gracefully', async () => {
      const service = createFreshInstance();
      const product = {
        name: 'Unknown Product',
        category: 'unknown'
      };

      const documents = [
        'Some Document'
      ];

      const result = await service.checkProductCompliance(product, documents);

      expect(result).toHaveProperty('productName');
      expect(result).toHaveProperty('productCategory');
      // Should use default requirements
      expect(result.productCategory).toBe('default');
    });

    test('should provide recommendations for missing certifications', async () => {
      const service = createFreshInstance();
      const product = {
        name: 'Test Sesame Product',
        category: 'sesame'
      };

      const documents = []; // No documents

      const result = await service.checkProductCompliance(product, documents);

      expect(result).toHaveProperty('productName');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('determineProductCategory', () => {
    test('should correctly identify cocoa products', () => {
      const service = createFreshInstance();
      expect(service.determineProductCategory('Chocolate Bar', '')).toBe('cocoa');
      expect(service.determineProductCategory('', 'cacao')).toBe('cocoa');
    });

    test('should correctly identify coffee products', () => {
      const service = createFreshInstance();
      expect(service.determineProductCategory('Coffee Beans', '')).toBe('coffee');
      expect(service.determineProductCategory('', 'cafe')).toBe('coffee');
    });

    test('should default to unknown category for unrecognized products', () => {
      const service = createFreshInstance();
      expect(service.determineProductCategory('Unknown Product', '')).toBe('default');
    });
  });

  describe('documentMatchesRequirement', () => {
    test('should match exact requirement strings', () => {
      const service = createFreshInstance();
      expect(service.documentMatchesRequirement('HACCP Certificate', 'HACCP')).toBe(true);
      expect(service.documentMatchesRequirement('ISO 22000 Certification', 'ISO 22000')).toBe(true);
    });

    test('should match using aliases', () => {
      const service = createFreshInstance();
      expect(service.documentMatchesRequirement('Hazard Analysis System', 'HACCP')).toBe(true);
      expect(service.documentMatchesRequirement('Plant Health Certificate', 'phyto-sanitary certificate')).toBe(true);
    });

    test('should handle object documents', () => {
      const service = createFreshInstance();
      const doc = { type: 'HACCP', name: 'Food Safety Cert' };
      expect(service.documentMatchesRequirement(doc, 'HACCP')).toBe(true);
    });

    test('should return false for non-matching documents', () => {
      const service = createFreshInstance();
      expect(service.documentMatchesRequirement('Random Doc', 'HACCP')).toBe(false);
      expect(service.documentMatchesRequirement(null, 'HACCP')).toBe(false);
    });
  });

  describe('batchCheckCompliance', () => {
    test('should process multiple products correctly', async () => {
      const service = createFreshInstance();
      const products = [
        { name: 'Product 1', category: 'cocoa', id: 'product1' },
        { name: 'Product 2', category: 'coffee', id: 'product2' }
      ];

      const productDocuments = new Map([
        ['product1', ['HACCP Certificate', 'Phyto-sanitary Certificate', 'Origin Certificate']],
        ['product2', ['HACCP Certificate']] // Missing some documents
      ]);

      const results = await service.batchCheckCompliance(products, productDocuments);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('productName', 'Product 1');
      expect(results[0]).toHaveProperty('complianceScore');
      expect(results[0].complianceScore).toBeGreaterThanOrEqual(70); // Should be compliant
      expect(results[1]).toHaveProperty('productName', 'Product 2');
      expect(results[1]).toHaveProperty('complianceScore');
      expect(results[1].complianceScore).toBeLessThan(70); // Should be non-compliant due to missing docs
    });
  });
});