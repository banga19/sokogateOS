// Korean Market Analysis Service for SokogateOS
// Provides AI-powered market intelligence for Korean market entry

const logger = require('../../utils/logger');
const { DocumentProcessingPipeline } = require('../../ingestion/processors/documentProcessingPipeline');

// Mock Korean market data (in reality, this would come from APIs, databases, or ML models)
const koreanMarketData = {

  'topImports': [
    { category: 'Electronics', value: 145000000000, growth: 8.2 }, // $145B
    { category: 'Machinery', value: 98000000000, growth: 5.1 },   // $98B
    { category: 'Mineral Fuels', value: 87000000000, growth: -3.2}, // $87B
    { category: 'Plastics', value: 38000000000, growth: 6.7 },   // $38B
    { category: 'Organic Chemicals', value: 32000000000, growth: 4.3 }, // $32B
    { category: 'Iron and Steel', value: 28000000000, growth: 2.1 },  // $28B
    { category: 'Optical/Medical Instruments', value: 22000000000, growth: 9.8 }, // $22B
    { category: 'Textiles', value: 15000000000, growth: 7.4 },    // $15B
    { category: 'Wearables/Apparel', value: 12000000000, growth: 11.3 }, // $12B
    { category: 'Footwear', value: 8000000000, growth: 6.9 },     // $8B
    { category: 'Food Products', value: 18000000000, growth: 4.8 }, // $18B
    { category: 'Beverages', value: 5000000000, growth: 3.2 },    // $5B
    { category: 'Cosmetics', value: 4000000000, growth: 14.5 },   // $4B
    { category: 'Agricultural Products', value: 6500000000, growth: 9.1 } // $6.5B
  ],


  'africanGrowthOpportunities': [
    {
      product: 'Cocoa beans',
      currentImports: 120000000, // $120M
      growthRate: 28.5,
      keyRequirements: ['Fermentation quality', 'Moisture content <8%', 'Free from off-flavors'],
      priceRange: '2.5-3.5 USD/kg',
      peakSeason: 'October-February',
      koreanBuyers: ['Chocolate manufacturers', 'Confectionery companies', 'Cosmetic companies']
    },
    {
      product: 'Coffee beans',
      currentImports: 85000000, // $85M
      growthRate: 22.3,
      keyRequirements: ['Altitude >1200m', 'Wet processing', 'Moisture 10-12%', 'Defect-free'],
      priceRange: '3.0-5.0 USD/kg',
      peakSeason: 'November-March',
      koreanBuyers: ['Specialty coffee roasters', 'Coffee chains', 'Retail brands']
    },
    {
      product: 'Shea butter',
      currentImports: 45000000, // $45M
      growthRate: 35.7,
      keyRequirements: ['Unrefined/refined options', 'IV <55', 'Peroxide value <5.0'],
      priceRange: '8.0-15.0 USD/kg',
      peakSeason: 'Year-round',
      koreanBuyers: ['Cosmetic companies', 'Pharmaceutical companies', 'Natural product brands']
    },
    {
      product: 'Sesame seeds',
      currentImports: 38000000, // $38M
      growthRate: 18.9,
      keyRequirements: ['Admixture <2%', 'Oil content 48-55%', 'Moisture <8%'],
      priceRange: '1.2-1.8 USD/kg',
      peakSeason: 'August-October',
      koreanBuyers: ['Food processing companies', 'Oil manufacturers', 'Bakery industry']
    },
    {
      product: 'Cashew nuts',
      currentImports: 52000000, // $52M
      growthRate: 24.6,
      keyRequirements: ['Whole kernels', 'Moisture <5%', 'Free from insects/mold'],
      priceRange: '8.0-12.0 USD/kg',
      peakSeason: 'January-April',
      koreanBuyers: ['Snack food companies', 'Confectionery', 'Retail chains']
    },
    {
      product: 'Textiles (cotton)',
      currentImports: 220000000, // $220M
      growthRate: 15.2,
      keyRequirements: ['Staple length', 'Strength', 'Color consistency', 'OEKO-TEX certified'],
      priceRange: '1.8-3.5 USD/kg',
      peakSeason: 'Year-round',
      koreanBuyers: ['Apparel manufacturers', 'Home textile companies', 'Export-oriented factories']
    },
    {
      product: 'Natural rubber',
      currentImports: 95000000, // $95M
      growthRate: 12.8,
      keyRequirements: ['DRC content', 'Volatile matter', 'Ash content', 'Cleanliness'],
      priceRange: '1.5-2.2 USD/kg',
      peakSeason: 'Year-round',
      koreanBuyers: ['Tire manufacturers', 'Automotive parts', 'Industrial goods manufacturers']
    }
  ],


  'marketTrends': [
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


  'businessCulture': {
    communication: 'Formal, respectful, relationship-oriented',
    decisionMaking: 'Consensus-based, takes time, values long-term relationships',
    negotiation: 'Indirect, avoids confrontation, focuses on mutual benefit',
    meetingEtiquette: 'Punctuality important, exchange business cards with both hands',
    giftGiving: 'Common practice, should be thoughtful but not extravagant',
    language: 'Korean preferred, English increasingly common in business',
    paymentTerms: 'Typically 30-90 days, LC preferred for new relationships',
    qualityExpectations: 'Very high, zero tolerance for defects or inconsistencies'
  }
};

/**
 * Korean Market Analysis Service
 * Provides insights and recommendations for entering the Korean market
 */
class KoreanMarketAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Get top import categories in Korea
   * @param {number} limit - Number of categories to return (default 10)
   * @returns {Promise<Array>} Top import categories with value and growth data
   */
  async getTopImportCategories(limit = 10) {
    try {
      const sorted = [...koreanMarketData.topImports]
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);

      return sorted.map(item => ({
        ...item,
        valueUSD: item.value,
        growthRatePercent: item.growth
      }));
    } catch (error) {
      logger.error('Error getting top import categories:', error);
      throw error;
    }
  }

  /**
   * Get African products with growing demand in Korea
   * @returns {Promise<Array>} African products with market opportunity data
   */
  async getAfricanGrowthOpportunities() {
    try {
      return koreanMarketData.africanGrowthOpportunities.map(opportunity => ({
        ...opportunity,
        currentImportsUSD: opportunity.currentImports,
        growthRatePercent: opportunity.growthRate
      }));
    } catch (error) {
      logger.error('Error getting African growth opportunities:', error);
      throw error;
    }
  }

  /**
   * Analyze product-market fit for Korean market
   * @param {Object} productData - Product information to analyze
   * @returns {Promise<Object>} Market fit analysis with score and recommendations
   */
  async analyzeProductMarketFit(productData) {
    try {
      logger.info(`Analyzing product-market fit for: ${productData.name || 'Unknown Product'}`);

      const productName = (productData.name || productData.productName || '').toLowerCase();
      const productCategory = productData.category || productData.productType || '';


      let matchingOpportunity = null;
      let relevanceScore = 0;

      for (const opp of koreanMarketData.africanGrowthOpportunities) {
        const productMatch = opp.product.toLowerCase().split(' ').some(word =>
          productName.includes(word) ||
          (productCategory && productCategory.toLowerCase().includes(word))
        );

        if (productMatch) {
          matchingOpportunity = opp;
          break;
        }
      }


      let marketFitScore = 50; // Start with neutral

      if (matchingOpportunity) {

        marketFitScore = 70;


        if (productData.specifications) {
          const specsMatch = this.checkSpecificationMatch(
            productData.specifications,
            matchingOpportunity.keyRequirements
          );
          marketFitScore += Math.round((specsMatch - 0.5) * 30); // -15 to +15 adjustment
        }


        if (productData.price && matchingOpportunity.priceRange) {
          const priceScore = this.calculatePriceCompetitiveness(
            productData.price,
            matchingOpportunity.priceRange
          );
          marketFitScore += Math.round((priceScore - 0.5) * 20); // -10 to +10 adjustment
        }


        if (productData.harvestSeason && matchingOpportunity.peakSeason) {
          const seasonMatch = this.checkSeasonMatch(
            productData.harvestSeason,
            matchingOpportunity.peakSeason
          );
          marketFitScore += Math.round((seasonMatch - 0.5) * 10); // -5 to +5 adjustment
        }
      } else {

        marketFitScore = this.calculateGeneralMarketFit(productData);
      }


      marketFitScore = Math.max(0, Math.min(100, marketFitScore));


      const recommendations = this.generateMarketFitRecommendations(
        productData,
        matchingOpportunity,
        marketFitScore
      );


      let readinessLevel = 'Not Ready';
      if (marketFitScore >= 80) readinessLevel = 'Highly Ready';
      else if (marketFitScore >= 60) readinessLevel = 'Moderately Ready';
      else if (marketFitScore >= 40) readinessLevel = 'Somewhat Ready';

      return {
        productName: productData.name || productData.productName || 'Unknown Product',
        productCategory: productCategory,
        marketFitScore: marketFitScore,
        marketFitLevel: this.getMarketFitLevel(marketFitScore),
        readinessLevel: readinessLevel,
        matchingOpportunity: matchingOpportunity ? {
          product: matchingOpportunity.product,
          currentImportsUSD: matchingOpportunity.currentImports,
          growthRatePercent: matchingOpportunity.growthRate,
          keyRequirements: matchingOpportunity.keyRequirements,
          priceRange: matchingOpportunity.priceRange,
          koreanBuyers: matchingOpportunity.koreanBuyers
        } : null,
        marketTrends: this.getRelevantTrends(productData),
        recommendations: recommendations,
        nextSteps: this.generateNextSteps(marketFitScore),
        lastAnalyzed: new Date()
      };
    } catch (error) {
      logger.error('Error analyzing product-market fit:', error);
      throw error;
    }
  }

  /**
   * Check how well product specifications match Korean requirements
   * @param {Array} productSpecs - Product specifications
   * @param {Array} koreanReqs - Korean market requirements
   * @returns {number} Match score between 0 and 1
   */
  checkSpecificationMatch(productSpecs, koreanReqs) {
    if (!productSpecs || !koreanReqs || koreanReqs.length === 0) return 0.5;

    let matches = 0;
    const totalChecks = Math.min(productSpecs.length, koreanReqs.length);

    for (let i = 0; i < totalChecks; i++) {
      const spec = productSpecs[i].toLowerCase();
      const req = koreanReqs[i].toLowerCase();


      if (spec.includes(req) || req.includes(spec) ||
          req.split(' ').some(keyword => spec.includes(keyword)) ||
          spec.split(' ').some(keyword => req.includes(keyword))) {
        matches++;
      }
    }

    return matches / Math.max(koreanReqs.length, 1);
  }

  /**
   * Calculate price competitiveness compared to market range
   * @param {number} productPrice - Product price per unit
   * @param {string} priceRange - Market price range (e.g., "2.5-3.5 USD/kg")
   * @returns {number} Competitiveness score between 0 and 1
   */
  calculatePriceCompetitiveness(productPrice, priceRange) {
    try {

      const rangeMatch = priceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
      if (!rangeMatch) return 0.5;

      const minPrice = parseFloat(rangeMatch[1]);
      const maxPrice = parseFloat(rangeMatch[2]);

      if (productPrice < minPrice) {

        return 0.7;
      } else if (productPrice > maxPrice) {

        return 0.3;
      } else {


        const position = (productPrice - minPrice) / (maxPrice - minPrice);

        if (position >= 0.3 && position <= 0.7) {
          return 0.9; // Optimal range
        } else if (position >= 0.2 && position <= 0.8) {
          return 0.7; // Good range
        } else {
          return 0.5; // Acceptable but not optimal
        }
      }
    } catch (error) {
      logger.warn('Error calculating price competitiveness:', error);
      return 0.5;
    }
  }

  /**
   * Check if harvest season matches Korean peak demand season
   * @param {string} harvestSeason - Product harvest season
   * @param {string} peakSeason - Korean market peak season
   * @returns {number} Match score between 0 and 1
   */
  checkSeasonMatch(harvestSeason, peakSeason) {

    const seasons = {
      spring: ['march', 'april', 'may'],
      summer: ['june', 'july', 'august'],
      autumn: ['september', 'october', 'november'],
      winter: ['december', 'january', 'february'],
      'year-round': ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    };

    const harvestLower = harvestSeason.toLowerCase();
    const peakLower = peakSeason.toLowerCase();


    for (const [seasonName, months] of Object.entries(seasons)) {
      if (peakLower.includes(seasonName) ||
          months.some(month => peakLower.includes(month))) {

        if (harvestLower.includes(seasonName) ||
            months.some(month => harvestLower.includes(month))) {
          return 1.0; // Perfect match
        } else if (harvestLower === 'year-round') {
          return 0.9; // Year-round harvest is good for any peak season
        } else {
          return 0.6; // Some seasonal alignment
        }
      }
    }

    return 0.5; // No clear match
  }

  /**
   * Calculate general market fit for products without specific opportunity match
   * @param {Object} productData - Product information
   * @returns {number} Market fit score between 0 and 100
   */
  calculateGeneralMarketFit(productData) {
    let score = 40; // Base score for unknown products


    const productName = (productData.name || '').toLowerCase();
    const productCategory = (productData.category || '').toLowerCase();


    const favorableIndicators = [
      'natural', 'organic', 'premium', 'specialty', 'single origin',
      'fair trade', 'sustainable', 'ethical', 'handmade', 'artisanal'
    ];

    const favorableCount = favorableIndicators.filter(indicator =>
      productName.includes(indicator) ||
      productCategory.includes(indicator)
    ).length;

    score += Math.min(20, favorableCount * 5); // Up to 20 points for favorable indicators


    const problematicIndicators = [
      'processed', 'artificial', 'synthetic', 'gmo', 'hormone',
      'antibiotic', 'preservative', 'additive'
    ];

    const problematicCount = problematicIndicators.filter(indicator =>
      productName.includes(indicator) ||
      productCategory.includes(indicator)
    ).length;

    score -= Math.min(15, problematicCount * 3); // Down to -15 points for problematic indicators


    if (productData.valueAdded || productData.processed) {

      score += 10;
    }


    if (productData.uniqueFeature || productData.originStory) {
      score += 10; // Uniqueness is valued in Korean market
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get market fit level description based on score
   * @param {number} score - Market fit score (0-100)
   * @returns {string} Market fit level description
   */
  getMarketFitLevel(score) {
    if (score >= 85) return 'Excellent Fit';
    if (score >= 70) return 'Good Fit';
    if (score >= 55) return 'Moderate Fit';
    if (score >= 40) return 'Fair Fit';
    return 'Poor Fit';
  }

  /**
   * Get relevant Korean market trends for a product
   * @param {Object} productData - Product information
   * @returns {Array} Relevant market trends
   */
  getRelevantTrends(productData) {
    const relevantTrends = [];
    const productName = (productData.name || '').toLowerCase();
    const productCategory = (productData.category || '').toLowerCase();

    for (const trend of koreanMarketData.marketTrends) {
      let isRelevant = false;


      for (const relevantProduct of trend.relevantProducts) {
        if (productName.includes(relevantProduct.toLowerCase()) ||
            productCategory.includes(relevantProduct.toLowerCase())) {
          isRelevant = true;
          break;
        }
      }

      if (isRelevant) {
        relevantTrends.push({
          trend: trend.trend,
          impact: trend.impact,
          description: trend.description
        });
      }
    }

    return relevantTrends;
  }

  /**
   * Generate market fit improvement recommendations
   * @param {Object} productData - Product information
   * @param {Object|null} matchingOpportunity - Matching African opportunity (if any)
   * @param {number} score - Market fit score
   * @returns {Array} Recommendations for improving market fit
   */
  generateMarketFitRecommendations(productData, matchingOpportunity, score) {
    const recommendations = [];

    if (score >= 80) {
      recommendations.push('Your product shows strong potential for the Korean market');
      recommendations.push('Consider preparing export documentation and compliance certifications');
      recommendations.push('Research specific Korean buyers in your product category');
    } else if (score >= 60) {
      recommendations.push('Your product has moderate potential - consider the following improvements:');

      if (matchingOpportunity) {
        recommendations.push(`Focus on meeting these key requirements: ${matchingOpportunity.keyRequirements.join(', ')}`);
        recommendations.push(`Ensure your pricing is competitive within ${matchingOpportunity.priceRange}`);
      } else {
        recommendations.push('Consider obtaining relevant certifications (organic, fair trade, etc.)');
        recommendations.push('Highlight any unique origin story or special production methods');
      }
    } else {
      recommendations.push('Significant improvements needed for Korean market readiness:');
      recommendations.push('Consider starting with products that have established African demand in Korea');
      recommendations.push('Invest in quality improvement and certification programs');
      recommendations.push('Develop a clear value proposition and origin story for your product');
    }


    if (!productData.certifications || productData.certifications.length === 0) {
      recommendations.push('Obtain relevant international certifications to build trust with Korean buyers');
    }

    if (!productData.originStory && !(productData.uniqueFeature)) {
      recommendations.push('Develop a compelling origin story highlighting your product\'s African heritage');
    }

    if (!productData.qualityControlProcess) {
      recommendations.push('Implement and document quality control processes to ensure consistency');
    }

    return recommendations;
  }

  /**
   * Generate recommended next steps based on market fit score
   * @param {number} score - Market fit score
   * @returns {Array} Recommended next steps
   */
  generateNextSteps(score) {
    const steps = [];

    if (score >= 80) {
      steps.push('Prepare export documentation and compliance certificates');
      steps.push('Contact Korean trade associations for buyer introductions');
      steps.push('Consider applying for the Sokogate Korea-Africa corridor initiative');
      steps.push('Develop a market entry plan with timelines and budget');
    } else if (score >= 60) {
      steps.push('Address key gaps identified in the analysis');
      steps.push('Obtain missing certifications or improve product specifications');
      steps.push('Test market interest with small sample shipments');
      steps.push('Build relationships with potential Korean importers through trade platforms');
    } else {
      steps.push('Consider starting with products that have proven demand in Korea');
      steps.push('Invest in product development and quality improvement');
      steps.push('Research successful African exporters in Korea for best practices');
      steps.push('Build domestic market presence before attempting export');
    }

    return steps;
  }

  /**
   * Get market intelligence summary for a company\\'s product portfolio
   * @param {Array} products - Array of product data
   * @returns {Promise<Object>} Portfolio market intelligence summary
   */
  async analyzeProductPortfolio(products) {
    try {
      logger.info(`Analyzing product portfolio with ${products.length} products`);

      const analyses = [];
      let totalScore = 0;
      let highFitCount = 0;
      let mediumFitCount = 0;
      let lowFitCount = 0;

      for (const product of products) {
        const analysis = await this.analyzeProductMarketFit(product);
        analyses.push(analysis);
        totalScore += analysis.marketFitScore;

        if (analysis.marketFitScore >= 70) highFitCount++;
        else if (analysis.marketFitScore >= 40) mediumFitCount++;
        else lowFitCount++;
      }

      const averageScore = Math.round(totalScore / products.length);

      return {
        portfolioSummary: {
          totalProducts: products.length,
          averageMarketFitScore: averageScore,
          highFitProducts: highFitCount,
          mediumFitProducts: mediumFitCount,
          lowFitProducts: lowFitCount,
          portfolioReadiness: this.getMarketFitLevel(averageScore)
        },
        productAnalyses: analyses,
        topOpportunities: this.getTopPortfolioOpportunities(analyses),
        recommendations: this.generatePortfolioRecommendations(analyses),
        lastAnalyzed: new Date()
      };
    } catch (error) {
      logger.error('Error analyzing product portfolio:', error);
      throw error;
    }
  }

  /**
   * Get top market opportunities from portfolio analysis
   * @param {Array} analyses - Product market fit analyses
   * @returns {Array} Top opportunities
   */
  getTopPortfolioOpportunities(analyses) {
    return analyses
      .filter(analysis => analysis.marketFitScore >= 60)
      .sort((a, b) => b.marketFitScore - a.marketFitScore)
      .slice(0, 5)
      .map(analysis => ({
        productName: analysis.productName,
        marketFitScore: analysis.marketFitScore,
        marketFitLevel: analysis.marketFitLevel,
        matchingOpportunity: analysis.matchingOpportunity ? {
          product: analysis.matchingOpportunity.product,
          growthRatePercent: analysis.matchingOpportunity.growthRatePercent
        } : null
      }));
  }

  /**
   * Generate portfolio-level recommendations
   * @param {Array} analyses - Product market fit analyses
   * @returns {Array} Portfolio recommendations
   */
  generatePortfolioRecommendations(analyses) {
    const recommendations = [];
    const lowScoreProducts = analyses.filter(a => a.marketFitScore < 40);
    const mediumScoreProducts = analyses.filter(a => a.marketFitScore >= 40 && a.marketFitScore < 70);
    const highScoreProducts = analyses.filter(a => a.marketFitScore >= 70);

    if (lowScoreProducts.length > 0) {
      recommendations.push(`Consider phasing out or redesigning ${lowScoreProducts.length} products with low market fit scores`);
    }

    if (mediumScoreProducts.length > 0) {
      recommendations.push(`Focus improvement efforts on ${mediumScoreProducts.length} products with moderate market fit`);
    }

    if (highScoreProducts.length > 0) {
      recommendations.push(`Prioritize market entry for ${highScoreProducts.length} products with strong market fit`);
      recommendations.push('Consider creating a product line specifically for the Korean export market');
    }


    const avgScore = Math.round(analyses.reduce((sum, a) => sum + a.marketFitScore, 0) / analyses.length);

    if (avgScore < 40) {
      recommendations.push('Consider conducting market research to identify better product-market fits');
      recommendations.push('Explore value-added processing or product differentiation strategies');
    } else if (avgScore >= 70) {
      recommendations.push('Your portfolio shows strong export potential - consider developing a Korea-focused export strategy');
      recommendations.push('Explore trade finance options and export readiness programs');
    }

    return recommendations;
  }
}

module.exports = new KoreanMarketAnalysisService();
