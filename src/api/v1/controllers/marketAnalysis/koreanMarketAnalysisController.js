// Korean Market Analysis Controller for SokogateOS
// Exposes Korean market intelligence through API endpoints

const koreanMarketAnalysisService = require('../../../../services/marketAnalysis/koreanMarketAnalysisService');
const logger = require('../../../../utils/logger');
const auth = require('../../../../middleware/auth');

/**
 * Get top import categories in Korea
 * @route GET /api/v1/market-analysis/korean/top-imports
 * @access Private
 */
async function getTopImportCategories(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const categories = await koreanMarketAnalysisService.getTopImportCategories(limit);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error in getTopImportCategories controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get African products with growing demand in Korea
 * @route GET /api/v1/market-analysis/korean/african-opportunities
 * @access Private
 */
async function getAfricanGrowthOpportunities(req, res) {
  try {
    const opportunities = await koreanMarketAnalysisService.getAfricanGrowthOpportunities();

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    logger.error('Error in getAfricanGrowthOpportunities controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Analyze product-market fit for Korean market
 * @route POST /api/v1/market-analysis/korean/analyze
 * @access Private
 */
async function analyzeProductMarketFit(req, res) {
  try {
    const { product } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product data is required'
      });
    }

    // Validate product has minimum required fields
    if (!product.name && !product.productName) {
      return res.status(400).json({
        success: false,
        error: 'Product must have a name or productName field'
      });
    }

    const analysis = await koreanMarketAnalysisService.analyzeProductMarketFit(product);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error in analyzeProductMarketFit controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Analyze product portfolio for Korean market readiness
 * @route POST /api/v1/market-analysis/korean/portfolio
 * @access Private
 */
async function analyzeProductPortfolio(req, res) {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: 'Products array is required'
      });
    }

    const analysis = await koreanMarketAnalysisService.analyzeProductPortfolio(products);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error in analyzeProductPortfolio controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get Korean market trends and preferences
 * @route GET /api/v1/market-analysis/korean/trends
 * @access Private
 */
async function getMarketTrends(req, res) {
  try {
    // In a real implementation, this would come from the service's internal data
    // For now, return a structured response based on known data
    res.json({
      success: true,
      data: {
        marketTrends: [
          {
            trend: 'Health and Wellness',
            impact: 'High',
            description: 'Growing demand for natural, organic, and functional foods',
            relevantProducts: ['Shea butter', 'Sesame seeds', 'Honey', 'Herbal teas', 'Nuts']
          },
          {
            trend: 'Premiumization',
            impact: 'High',
            description: 'Consumers willing to pay more for quality, origin story, and sustainability',
            relevantProducts: ['Specialty coffee', 'Fine cocoa', 'Premium textiles', 'Handicrafts']
          },
          {
            trend: 'Sustainability and Ethical Sourcing',
            impact: 'Very High',
            description: 'Increasing focus on Fair Trade, organic certifications, and supply chain transparency',
            relevantProducts: ['All agricultural products', 'Textiles', 'Handicrafts']
          },
          {
            trend: 'K-Beauty Influence',
            impact: 'High',
            description: 'Korean beauty standards driving demand for natural ingredients in cosmetics',
            relevantProducts: ['Shea butter', 'Cocoa butter', 'Various oils', 'Herbal extracts']
          },
          {
            trend: 'Convenience and Ready-to-Eat',
            impact: 'Medium',
            description: 'Growing market for processed and convenient food products',
            relevantProducts: ['Processed snacks', 'Ready meals', 'Food ingredients', 'Sauces']
          }
        ],
        businessCulture: {
          communication: 'Formal, respectful, relationship-oriented',
          decisionMaking: 'Consensus-based, takes time, values long-term relationships',
          negotiation: 'Indirect, avoids confrontation, focuses on mutual benefit',
          meetingEtiquette: 'Punctuality important, exchange business cards with both hands',
          giftGiving: 'Common practice, should be thoughtful but not extravagant',
          language: 'Korean preferred, English increasingly common in business',
          paymentTerms: 'Typically 30-90 days, LC preferred for new relationships',
          qualityExpectations: 'Very high, zero tolerance for defects or inconsistencies'
        }
      }
    });
  } catch (error) {
    logger.error('Error in getMarketTrends controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get Korean business culture and buyer preferences
 * @route GET /api/v1/market-analysis/korean/business-culture
 * @access Private
 */
async function getBusinessCulture(req, res) {
  try {
    res.json({
      success: true,
      data: {
        businessCulture: {
          communication: 'Formal, respectful, relationship-oriented',
          decisionMaking: 'Consensus-based, takes time, values long-term relationships',
          negotiation: 'Indirect, avoids confrontation, focuses on mutual benefit',
          meetingEtiquette: 'Punctuality important, exchange business cards with both hands',
          giftGiving: 'Common practice, should be thoughtful but not extravagant',
          language: 'Korean preferred, English increasingly common in business',
          paymentTerms: 'Typically 30-90 days, LC preferred for new relationships',
          qualityExpectations: 'Very high, zero tolerance for defects or inconsistencies'
        },
        buyerPreferences: {
          quality: 'Extremely high - zero tolerance for defects',
          documentation: 'Requires complete and accurate documentation',
          communication: 'Prefers detailed, transparent communication',
          relationship: 'Values long-term partnerships over transactional relationships',
          innovation: 'Appreciates innovation but requires proven reliability',
          sustainability: 'Increasingly important - Fair Trade, organic, eco-friendly preferred'
        }
      }
    });
  } catch (error) {
    logger.error('Error in getBusinessCulture controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  getTopImportCategories,
  getAfricanGrowthOpportunities,
  analyzeProductMarketFit,
  analyzeProductPortfolio,
  getMarketTrends,
  getBusinessCulture
};
