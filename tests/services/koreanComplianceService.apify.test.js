// Integration tests for Apify-powered methods in Korean Compliance Service
// Tests BRN validation and Korean company info lookup flows

jest.mock('../../src/services/apifyService');
jest.mock('../../src/utils/logger');

const apifyService = require('../../src/services/apifyService');
const logger = require('../../src/utils/logger');
const koreanCompliance = require('../../src/services/compliance/koreanComplianceService');

describe('KoreanComplianceService — Apify Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== apifyValidateKoreanBRN =====

  describe('apifyValidateKoreanBRN', () => {
    test('should return validated BRN data with proper mapping', async () => {
      apifyService.validateKoreanBRN.mockResolvedValue({
        isValid: true,
        companyName: 'Samsung Electronics Co., Ltd.',
        company_name: 'Samsung Electronics Co., Ltd.',
        representative: 'Kim Hyun-suk',
        ceoName: 'Kim Hyun-suk',
        businessType: 'Manufacturing',
        business_type: 'Manufacturing',
        businessCategory: 'Electronics',
        business_category: 'Electronics',
        address: '129 Samsung-ro, Suwon',
        companyAddress: '129 Samsung-ro, Suwon',
        taxStatus: 'active',
        tax_status: 'active',
        registrationDate: '2010-03-15',
        registration_date: '2010-03-15',
        status: 'valid',
      });

      const result = await koreanCompliance.apifyValidateKoreanBRN('123-45-67890');

      expect(apifyService.validateKoreanBRN).toHaveBeenCalledWith('123-45-67890');
      expect(result).toMatchObject({
        brn: '123-45-67890',
        isValid: true,
        companyName: 'Samsung Electronics Co., Ltd.',
        representativeName: 'Kim Hyun-suk',
        businessType: 'Manufacturing',
        businessCategory: 'Electronics',
        address: '129 Samsung-ro, Suwon',
        taxStatus: 'active',
        registrationDate: '2010-03-15',
        source: 'apify',
      });
      expect(result.lastVerified).toBeDefined();
    });

    test('should use fallback fields when primary fields are missing', async () => {
      apifyService.validateKoreanBRN.mockResolvedValue({
        company_name: 'LG Electronics',
        ceoName: 'Kwon Bong-seok',
        business_type: 'Manufacturing',
        business_category: 'Electronics',
        companyAddress: 'LG Twin Towers, Seoul',
        status: 'valid',
      });

      const result = await koreanCompliance.apifyValidateKoreanBRN('123-45-67890');

      expect(result.companyName).toBe('LG Electronics');
      expect(result.representativeName).toBe('Kwon Bong-seok');
      expect(result.address).toBe('LG Twin Towers, Seoul');
      // isValid should be true because status is 'valid'
      expect(result.isValid).toBe(true);
    });

    test('should return isValid false for invalid BRN', async () => {
      apifyService.validateKoreanBRN.mockResolvedValue({
        isValid: false,
        status: 'invalid',
        companyName: '',
      });

      const result = await koreanCompliance.apifyValidateKoreanBRN('000-00-00000');

      expect(result.isValid).toBe(false);
      expect(result.companyName).toBe('');
    });

    test('should return null when Apify returns no data', async () => {
      apifyService.validateKoreanBRN.mockResolvedValue(null);

      const result = await koreanCompliance.apifyValidateKoreanBRN('123-45-67890');

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No BRN validation result from Apify')
      );
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.validateKoreanBRN.mockRejectedValue(new Error('API unavailable'));

      const result = await koreanCompliance.apifyValidateKoreanBRN('123-45-67890');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify BRN validation error'),
        expect.any(Error)
      );
    });
  });

  // ===== apifyGetKoreanCompanyInfo =====

  describe('apifyGetKoreanCompanyInfo', () => {
    test('should return enriched Korean company info', async () => {
      apifyService.searchKoreanCompany.mockResolvedValue([
        {
          companyName: 'Hyundai Heavy Industries',
          name: 'Hyundai Heavy Industries',
          brn: '1234567890',
          businessNumber: '1234567890',
          address: '75, Jukdong-ro, Ulsan',
          phone: '+82-52-202-2114',
          industry: 'Shipbuilding',
          businessType: 'Shipbuilding',
          employeeCount: 25000,
          revenue: 20000000000,
          website: 'https://www.hyundaiheavy.com',
          representative: 'Kwon Oh-gap',
          ceo: 'Kwon Oh-gap',
          registrationDate: '1972-12-28',
          status: 'active',
          companyStatus: 'active',
        },
      ]);

      const result = await koreanCompliance.apifyGetKoreanCompanyInfo('Hyundai Heavy Industries');

      expect(apifyService.searchKoreanCompany).toHaveBeenCalledWith('Hyundai Heavy Industries');
      expect(result).toMatchObject({
        companyName: 'Hyundai Heavy Industries',
        brn: '1234567890',
        address: '75, Jukdong-ro, Ulsan',
        phone: '+82-52-202-2114',
        industry: 'Shipbuilding',
        employeeCount: 25000,
        revenue: 20000000000,
        website: 'https://www.hyundaiheavy.com',
        representative: 'Kwon Oh-gap',
        status: 'active',
        source: 'apify',
      });
      expect(result.retrievedAt).toBeDefined();
    });

    test('should return the first result when multiple companies found', async () => {
      apifyService.searchKoreanCompany.mockResolvedValue([
        { companyName: 'Samsung Electronics', brn: '111-11-11111' },
        { companyName: 'Samsung Display', brn: '222-22-22222' },
      ]);

      const result = await koreanCompliance.apifyGetKoreanCompanyInfo('Samsung');

      expect(result.companyName).toBe('Samsung Electronics');
      expect(result.brn).toBe('111-11-11111');
    });

    test('should return null when no companies found', async () => {
      apifyService.searchKoreanCompany.mockResolvedValue([]);

      const result = await koreanCompliance.apifyGetKoreanCompanyInfo('Unknown Company');

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No company data from Apify')
      );
    });

    test('should handle Apify errors gracefully', async () => {
      apifyService.searchKoreanCompany.mockRejectedValue(new Error('Search service down'));

      const result = await koreanCompliance.apifyGetKoreanCompanyInfo('Samsung');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Apify Korean company lookup error'),
        expect.any(Error)
      );
    });
  });
});
