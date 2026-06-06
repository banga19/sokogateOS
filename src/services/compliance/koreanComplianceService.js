// Korean Compliance Checker Service for SokogateOS
// Validates products and documents for Korean market entry requirements

const logger = require('../../utils/logger');
const DocumentProcessingPipeline = require('../../ingestion/processors/documentProcessingPipeline');

/**
 * Korean Compliance Checker - validates products for Korean market entry
 * Checks HACCP, Halal, phytosanitary, and other Korean import requirements
 */
class KoreanComplianceService {
  constructor() {


    this.koreanRequirements = {

      'cocoa': {
        mandatory: ['HACCP', 'phyto-sanitary certificate', 'origin certificate'],
        recommended: ['Halal', 'ISO 22000', 'Fair Trade'],
        restrictions: ['max cadmium levels', 'pesticide residue limits'],
        testing: ['heavy metals', 'mycotoxins', 'pesticides']
      },
      'coffee': {
        mandatory: ['HACCP', 'phyto-sanitary certificate', 'origin certificate'],
        recommended: ['Halal', 'ISO 22000', 'Rainforest Alliance', 'Organic'],
        restrictions: ['ochratoxin A limits', 'pesticide residue limits'],
        testing: ['ochratoxin A', 'pesticides', 'moisture content']
      },
      'tea': {
        mandatory: ['HACCP', 'phyto-sanitary certificate'],
        recommended: ['Halal', 'ISO 22000', 'Organic', 'Fair Trade'],
        restrictions: ['pesticide residue limits', 'heavy metal limits'],
        testing: ['pesticides', 'heavy metals', 'moisture content']
      },
      'shea butter': {
        mandatory: ['HACCP', 'phyto-sanitary certificate'],
        recommended: ['Halal', 'ISO 22000', 'Organic', 'Fair Trade'],
        restrictions: ['peroxide value', 'free fatty acids', 'moisture content'],
        testing: ['peroxide value', 'free fatty acids', 'moisture', 'impurities']
      },
      'cashew': {
        mandatory: ['HACCP', 'phyto-sanitary certificate', 'origin certificate'],
        recommended: ['Halal', 'ISO 22000', 'Organic', 'Fair Trade'],
        restrictions: ['aflatoxin limits', 'moisture content'],
        testing: ['aflatoxin', 'moisture', 'defect rate', 'size uniformity']
      },
      'sesame': {
        mandatory: ['HACCP', 'phyto-sanitary certificate'],
        recommended: ['Halal', 'ISO 22000', 'Organic'],
        restrictions: ['salmonella', 'aflatoxin', 'foreign matter'],
        testing: ['salmonella', 'aflatoxin', 'foreign matter', 'oil content']
      },
      'processed foods': {
        mandatory: ['HACCP', 'ingredient list', 'nutrition facts'],
        recommended: ['Halal', 'ISO 22000', 'ISO 9001', 'GMP'],
        restrictions: ['preservative limits', 'allergen labeling', 'language requirements'],
        testing: ['microbiological', 'chemical', 'sensory']
      },

      'textiles': {
        mandatory: ['OEKO-TEX Standard 100', 'product safety certificate'],
        recommended: ['ISO 9001', 'ISO 14001', 'Fair Trade', 'Organic Cotton'],
        restrictions: ['formaldehyde limits', 'azo dyes', 'heavy metals', 'flammability'],
        testing: ['formaldehyde', 'azo dyes', 'heavy metals', 'flammability', 'colorfastness']
      },
      'garments': {
        mandatory: ['product safety certificate', 'care labeling'],
        recommended: ['OEKO-TEX', 'ISO 9001', 'Fair Trade', 'Organic Cotton'],
        restrictions: ['flammability', 'small parts (children)', 'drawstrings (children)', 'chemical residues'],
        testing: ['flammability', 'small parts', 'drawstrings', 'chemical residues', 'seam strength']
      },

      'handicrafts': {
        mandatory: ['product safety certificate'],
        recommended: ['ISO 9001', 'Fair Trade', 'FSC (wood products)'],
        restrictions: ['lead content (paints)', 'phthalates', 'flammability', 'small parts'],
        testing: ['lead content', 'phthalates', 'flammability', 'small parts', 'stability']
      },
      'furniture': {
        mandatory: ['product safety certificate'],
        recommended: ['ISO 9001', 'FSC', 'low VOC emissions'],
        restrictions: ['formaldehyde emissions', 'lead content', 'flammability', 'stability'],
        testing: ['formaldehyde', 'lead', 'flammability', 'stability', 'durability']
      },

      'default': {
        mandatory: ['product safety certificate'],
        recommended: ['ISO 9001'],
        restrictions: ['varies by product type'],
        testing: ['basic safety testing']
      }
    };

  }

  /**
   * Check product compliance for Korean market
   * @param {Object} productData - Product information
   * @param {Array} documents - List of available documents/certificates
   * @returns {Object} Compliance result with score, missing items, and recommendations
   */
  async checkProductCompliance(productData, documents = []) {
    try {
      logger.info(`Checking Korean compliance for product: ${productData.name || 'Unknown'}`);


      const productName = (productData.name || productData.productName || '').toLowerCase();
      const productCategory = this.determineProductCategory(productName, productData.category || '');
      const requirements = this.koreanRequirements[productCategory] || this.koreanRequirements.default;




      const missingMandatory = [];
      const hasMandatory = {};

      for (const req of requirements.mandatory) {
        const found = documents.some(doc =>
          this.documentMatchesRequirement(doc, req)
        );
        hasMandatory[req] = found;
        if (!found) missingMandatory.push(req);
      }




      const missingRecommended = [];
      const hasRecommended = {};

      for (const req of requirements.recommended) {
        const found = documents.some(doc =>
          this.documentMatchesRequirement(doc, req)
        );
        hasRecommended[req] = found;
        if (!found) missingRecommended.push(req);
      }




      const mandatoryWeight = 0.7; // 70% weight for mandatory
      const recommendedWeight = 0.3; // 30% weight for recommended

      const mandatoryScore = missingMandatory.length === 0 ? 100 : 0;
      const recommendedScore = (requirements.recommended.length - missingRecommended.length) /
                            Math.max(requirements.recommended.length, 1) * 100;

      const complianceScore = Math.round(
        (mandatoryScore * mandatoryWeight) + (recommendedScore * recommendedWeight)
      );




      let complianceLevel = 'Non-Compliant';
      if (complianceScore >= 90) complianceLevel = 'Fully Compliant';
      else if (complianceScore >= 70) complianceLevel = 'Mostly Compliant';
      else if (complianceScore >= 40) complianceLevel = 'Partially Compliant';




      const recommendations = [];

      if (missingMandatory.length > 0) {
        recommendations.push(`Obtain mandatory certifications: ${missingMandatory.join(', ')}`);
      }

      if (missingRecommended.length > 0 && missingRecommended.length <= 3) {
        recommendations.push(`Consider obtaining recommended certifications: ${missingRecommended.join(', ')}`);
      } else if (missingRecommended.length > 3) {
        recommendations.push(`Consider obtaining additional certifications to improve market readiness`);
      }


      if (missingMandatory.includes('HACCP')) {
        recommendations.push('Implement HACCP (Hazard Analysis Critical Control Points) food safety system');
      }
      if (missingMandatory.includes('Halal')) {
        recommendations.push('Obtain Halal certification from recognized Islamic authority');
      }
      if (missingMandatory.includes('phyto-sanitary certificate')) {
        recommendations.push('Apply for phytosanitary certificate from national plant protection organization');
      }
      if (missingMandatory.includes('origin certificate')) {
        recommendations.push('Obtain certificate of origin from chamber of commerce or authorized body');
      }
      if (missingMandatory.includes('OEKO-TEX Standard 100')) {
        recommendations.push('Get OEKO-TEX Standard 100 certification for textile safety');
      }




      if (requirements.testing && requirements.testing.length > 0) {
        recommendations.push(`Consider laboratory testing for: ${requirements.testing.join(', ')}`);
      }


      return {
        productName: productData.name || productData.productName || 'Unknown Product',
        productCategory: productCategory,
        complianceScore: complianceScore,
        complianceLevel: complianceLevel,
        mandatoryRequirements: {
          required: requirements.mandatory,
          satisfied: Object.keys(hasMandatory).filter(req => hasMandatory[req]),
          missing: missingMandatory
        },
        recommendedRequirements: {
          recommended: requirements.recommended,
          satisfied: Object.keys(hasRecommended).filter(req => hasRecommended[req]),
          missing: missingRecommended
        },
        restrictions: requirements.restrictions,
        recommendedTesting: requirements.testing,
        lastChecked: new Date(),
        recommendations: recommendations,
        marketAccess: complianceScore >= 70 ? 'Likely Approved' : 'Requires Improvement'
      };
    } catch (error) {
      logger.error('Error checking Korean compliance:', error);
      throw error;
    }
  }

  /**
   * Determine product category from product name and category
   * @param {string} productName - Product name
   * @param {string} category - Product category
   * @returns {string} Matched category key
   */
  determineProductCategory(productName, category) {

    const nameLower = productName.toLowerCase();
    const catLower = category.toLowerCase();


    for (const [key, value] of Object.entries(this.koreanRequirements)) {
      if (key !== 'default' &&
          (nameLower.includes(key) || catLower.includes(key))) {
        return key;
      }
    }


    const categoryMaps = {

      'cocoa': ['cacao', 'chocolate'],
      'coffee': ['cafe'],
      'tea': ['mate'],
      'shea butter': ['karite', 'butter'],
      'cashew': ['kaju', 'nut'],
      'sesame': ['benniseed', 'beniseed', 'simsim'],
      'processed foods': ['processed food', 'packaged food', 'canned food', 'frozen food', 'snack', 'beverage', 'drink', 'flour', 'grain', 'spice', 'oil', 'fat'],

      'textiles': ['textile', 'fabric', 'cloth', 'yarn', 'thread'],
      'garments': ['clothing', 'apparel', 'fashion', 'shirt', 'dress', 'pants', 'trousers'],

      'handicrafts': ['handicraft', 'craft', 'art', 'basket', 'pottery', 'ceramic', 'wood carving'],
      'furniture': ['furniture', 'chair', 'table', 'sofa', 'bed', 'cabinet', 'woodwork']
    };

    for (const [stdCategory, variants] of Object.entries(categoryMaps)) {
      if (this.koreanRequirements[stdCategory]) {
        const allMatches = [stdCategory, ...variants];
        if (allMatches.some(variant =>
              nameLower.includes(variant) || catLower.includes(variant))) {
          return stdCategory;
        }
      }
    }

    return 'default';
  }

  /**
   * Check if a document matches a requirement
   * @param {Object} document - Document object
   * @param {string} requirement - Requirement to match against
   * @returns {boolean} True if document matches requirement
   */
  documentMatchesRequirement(document, requirement) {
    if (!document) return false;



    if (typeof document === 'string') {
      const docLower = document.toLowerCase();
      const reqLower = requirement.toLowerCase();


      if (docLower.includes(reqLower)) return true;


      const aliases = {
        'haccp': ['hazard analysis', 'critical control points', 'food safety'],
        'halal': ['islamic food', 'muslim food'],
        'phyto-sanitary certificate': ['phytosanitary', 'plant health', 'plant certificate'],
        'origin certificate': ['certificate of origin', 'coo', 'country of origin'],
        'iso 22000': ['iso22000', 'food safety management'],
        'iso 9001': ['iso9001', 'quality management'],
        'iso 14001': ['iso14001', 'environmental management'],
        'oeko-tex standard 100': ['oeko tex', 'oeko-tex', 'textile safety', 'standard 100'],
        'fsc': ['forest stewardship council', 'wood certification'],
        'product safety certificate': ['product safety', 'safety certificate', 'conformity certificate'],
        'ingredient list': ['ingredients', 'composition'],
        'nutrition facts': ['nutrition', 'nutritional information'],
        'care labeling': ['care label', 'washing instructions']
      };

      if (aliases[reqLower]) {
        return aliases[reqLower].some(alias => docLower.includes(alias));
      }

      return false;
    }


    if (typeof document === 'object') {

      if (document.type && typeof document.type === 'string') {
        if (this.documentMatchesRequirement(document.type, requirement)) return true;
      }
      if (document.name && typeof document.name === 'string') {
        if (this.documentMatchesRequirement(document.name, requirement)) return true;
      }
      if (document.certificateType && typeof document.certificateType === 'string') {
        if (this.documentMatchesRequirement(document.certificateType, requirement)) return true;
      }


      if (document.description && typeof document.description === 'string') {
        if (this.documentMatchesRequirement(document.description, requirement)) return true;
      }
      if (document.content && typeof document.content === 'string') {
        if (this.documentMatchesRequirement(document.content, requirement)) return true;
      }


      if (document.tags && Array.isArray(document.tags)) {
        return document.tags.some(tag =>
          this.documentMatchesRequirement(tag, requirement)
        );
      }
      if (document.keywords && Array.isArray(document.keywords)) {
        return document.keywords.some(keyword =>
          this.documentMatchesRequirement(keyword, requirement)
        );
      }
    }


    return false;
  }

  /**
   * Batch check multiple products for compliance
   * @param {Array} products - Array of product data objects
   * @param {Map} productDocuments - Map of productId to documents
   * @returns {Promise<Array>} Array of compliance results
   */
  async batchCheckCompliance(products, productDocuments = new Map()) {
    const results = [];

    for (const product of products) {
      const productId = product.id || product._id || product.productId;
      const documents = productDocuments.get(productId) || [];

      try {
        const result = await this.checkProductCompliance(product, documents);
        results.push(result);
      } catch (error) {
        logger.error(`Error checking compliance for product ${productId}:`, error);
        results.push({
          productName: product.name || product.productName || 'Unknown Product',
          productId: productId,
          error: 'Failed to check compliance',
          complianceScore: 0,
          complianceLevel: 'Error',
          recommendations: ['Unable to process compliance check - please try again']
        });
      }
    }

    return results;
  }

  /**
   * Get requirements for a specific product category
   * @param {string} category - Product category
   * @returns {Object} Requirements object
   */
  getRequirementsForCategory(category) {
    return this.koreanRequirements[category] || this.koreanRequirements.default;
  }

  /**
   * Get all supported product categories
   * @returns {Array} List of supported categories
   */
  getSupportedCategories() {
    return Object.keys(this.koreanRequirements).filter(cat => cat !== 'default');
  }
}

module.exports = new KoreanComplianceService();
