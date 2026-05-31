// Export Readiness Score (ERS) Service for SokogateOS
// Calculates export readiness based on company profile, transactions, and compliance

const logger = require('../../utils/logger');
const Company = require('../models/company');
const User = require('../models/user');
const Feedback = require('../models/feedback');

/**
 * Calculate Export Readiness Score (ERS) for a company
 * @param {ObjectId} companyId - The company ID
 * @returns {Promise<Object>} ERS score and breakdown
 */
async function calculateERS(companyId) {
  try {
    logger.info(`Calculating ERS for company: ${companyId}`);

    // Get company data
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Get associated users
    const users = await User.find({ companyId: companyId, isActive: true });

    // Get feedback data
    const feedbacks = await Feedback.find({ companyId: companyId });

    // Calculate ERS components (0-100 scale each)
    const profileCompletionScore = await calculateProfileCompletion(company, users);
    const transactionHistoryScore = await calculateTransactionHistory(companyId);
    const complianceScore = await calculateComplianceScore(company, feedbacks);
    const marketReadinessScore = await calculateMarketReadiness(company, users);
    const financialHealthScore = await calculateFinancialHealth(company);

    // Weighted average (adjust weights as needed)
    const ersScore = Math.round(
      (profileCompletionScore * 0.25) +
      (transactionHistoryScore * 0.25) +
      (complianceScore * 0.20) +
      (marketReadinessScore * 0.15) +
      (financialHealthScore * 0.15)
    );

    // Update company legibilityScore with ERS (for backward compatibility)
    company.legibilityScore = ersScore;
    company.lastLegibilityUpdate = new Date();
    await company.save();

    const ersBreakdown = {
      profileCompletion: Math.round(profileCompletionScore),
      transactionHistory: Math.round(transactionHistoryScore),
      compliance: Math.round(complianceScore),
      marketReadiness: Math.round(marketReadinessScore),
      financialHealth: Math.round(financialHealthScore),
      total: ersScore,
      tier: getERTier(ersScore),
      lastUpdated: new Date(),
      recommendations: generateERSRecommendations({
        profileCompletion: profileCompletionScore,
        transactionHistory: transactionHistoryScore,
        compliance: complianceScore,
        marketReadiness: marketReadinessScore,
        financialHealth: financialHealthScore
      })
    };

    logger.info(`ERS calculated for company ${companyId}: ${ersScore}`);
    return ersBreakdown;
  } catch (error) {
    logger.error(`Error calculating ERS for company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Calculate profile completion score (0-100)
 * Based on how complete the company profile is
 */
async function calculateProfileCompletion(company, users) {
  let score = 0;
  const maxScore = 100;

  // Basic information (30 points)
  if (company.name) score += 10;
  if (company.registrationNumber) score += 10;
  if (company.taxId) score += 10;

  // Contact information (20 points)
  if (company.email) score += 5;
  if (company.phoneNumbers && company.phoneNumbers.length > 0) score += 5;
  if (company.whatsApp) score += 5;
  if (company.address && company.address.street && company.address.city) score += 5;

  // Business details (20 points)
  if (company.businessType) score += 5;
  if (company.primaryProducts && company.primaryProducts.length > 0) score += 5;
  if (company.annualRevenue && company.annualRevenue > 0) score += 5;
  if (company.employeeCount && company.employeeCount > 0) score += 5;

  // User information (15 points)
  if (users && users.length > 0) score += 5;
  const verifiedUsers = users.filter(u => u.isEmailVerified).length;
  if (verifiedUsers > 0) score += 5;
  const roleDistribution = new Set(users.map(u => u.role)).size;
  if (roleDistribution >= 2) score += 5; // Multiple roles covered

  // Preferences and settings (15 points)
  if (company.preferences && company.preferences.language) score += 5;
  if (company.preferences && company.preferences.notifications) score += 5;
  if (company.communicationChannels && company.communicationChannels.length > 0) score += 5;

  return Math.min(score, maxScore);
}

/**
 * Calculate transaction history score (0-100)
 * Based on trading volume, frequency, and diversity
 */
async function calculateTransactionHistory(companyId) {
  // In a real implementation, this would query transaction records
  // For now, we'll use a simplified heuristic based on company data

  try {
    const company = await Company.findById(companyId);

    let score = 0;

    // Annual revenue factor (40 points)
    if (company.annualRevenue) {
      // Normalize revenue: 0-1M = 0-40 points (log scale)
      const revenuePoints = Math.min(40, Math.log10(company.annualRevenue + 1) * 10);
      score += revenuePoints;
    }

    // Employee count factor (20 points)
    if (company.employeeCount) {
      // 0-50 employees = 0-20 points
      const employeePoints = Math.min(20, company.employeeCount * 0.4);
      score += employeePoints;
    }

    // Business type factor (20 points)
    const exportOrientedTypes = ['exporter', 'manufacturer'];
    if (exportOrientedTypes.includes(company.businessType)) {
      score += 20;
    } else if (company.businessType === 'wholesaler' || company.businessType === 'importer') {
      score += 10;
    }

    // Product diversity factor (20 points)
    if (company.primaryProducts && company.primaryProducts.length > 0) {
      const productPoints = Math.min(20, company.primaryProducts.length * 5);
      score += productPoints;
    }

    return Math.min(score, 100);
  } catch (error) {
    logger.warn('Error calculating transaction history score:', error);
    return 0;
  }
}

/**
 * Calculate compliance score (0-100)
 * Based on certifications, documentation, and adherence to standards
 */
async function calculateComplianceScore(company, feedbacks) {
  let score = 0;

  // Check for standard certifications in communication channels or preferences
  const hasQualityCerts = company.communicationChannels.some(channel =>
    ['document_upload'].includes(channel) // In reality, would check actual documents
  );

  if (hasQualityCerts) score += 30;

  // Feedback-based compliance (40 points)
  if (feedbacks && feedbacks.length > 0) {
    const positiveFeedback = feedbacks.filter(f =>
      f.rating && f.rating >= 4 // Assuming 1-5 scale
    ).length;
    const feedbackRatio = positiveFeedback / feedbacks.length;
    score += Math.round(feedbackRatio * 40);
  } else {
    // No feedback yet, give partial credit
    score += 20;
  }

  // Communication completeness (30 points)
  const hasMultipleChannels = company.communicationChannels.length >= 3;
  if (hasMultipleChannels) score += 30;
  else if (company.communicationChannels.length > 0) score += 15;

  return Math.min(score, 100);
}

/**
 * Calculate market readiness score (0-100)
 * Based on product suitability for international markets
 */
async function calculateMarketReadiness(company, users) {
  let score = 0;

  // Product suitability for export (40 points)
  const exportFriendlyProducts = [
    'cocoa', 'coffee', 'tea', 'cashew', 'sesame', 'shea butter',
    'cassava', 'textiles', 'garments', 'handicrafts', 'furniture',
    'processed foods', 'spices', 'oils', 'rubber', 'timber'
  ];

  if (company.primaryProducts && company.primaryProducts.length > 0) {
    const matches = company.primaryProducts.filter(product =>
      exportFriendlyProducts.some(exportProduct =>
        product.toLowerCase().includes(exportProduct.toLowerCase())
      )
    ).length;

    const productScore = Math.min(40, matches * 10);
    score += productScore;
  }

  // Market research effort (30 points)
  // In reality, would check market studies, competitor analysis, etc.
  // Using preferences as proxy for market interest
  if (company.preferences && company.preferences.aiFeatures) {
    const aiFeaturesScore = Object.values(company.preferences.aiFeatures).filter(Boolean).length;
    score += Math.min(30, aiFeaturesScore * 7.5);
  }



  // Language capabilities (15 points)
  const internationalLanguages = ['en', 'fr', 'ar'];
  if (company.preferences && company.preferences.language) {
    if (internationalLanguages.includes(company.preferences.language)) {
      score += 15;
    }
  }



  // Has international communication channels (15 points)
  const internationalChannels = ['email', 'whatsapp', 'wechat'];
  const hasInternationalChannel = company.communicationChannels.some(channel =>
    internationalChannels.includes(channel)
  );
  if (hasInternationalChannel) score += 15;

  return Math.min(score, 100);
}

/**
 * Calculate financial health score (0-100)
 * Based on financial stability and growth indicators
 */
async function calculateFinancialHealth(company) {
  let score = 50; // Start with neutral score


  if (company.annualRevenue) {

    if (company.annualRevenue >= 1000000) { // $1M+
      score += 30;
    } else if (company.annualRevenue >= 100000) { // $100K+
      score += 20;
    } else if (company.annualRevenue >= 10000) { // $10K+
      score += 10;
    }

  }



  if (company.employeeCount) {

    if (company.employeeCount >= 50) {
      score += 25;
    } else if (company.employeeCount >= 20) {
      score += 15;
    } else if (company.employeeCount >= 5) {
      score += 10;
    } else if (company.employeeCount >= 1) {
      score += 5;
    }

  }






  score += 10; // Assume moderate stability








  score += 15;




  return Math.min(Math.max(score, 0), 100); // Ensure score is between 0-100
}

/**
 * Get ERS tier based on score
 * @param {number} score - ERS score (0-100)
 * @returns {string} Tier level
 */
function getERTier(score) {
  if (score >= 90) return 'Platinum';
  if (score >= 80) return 'Gold';
  if (score >= 70) return 'Silver';
  if (score >= 60) return 'Bronze';
  return 'Aspiring';
}

/**
 * Generate ERS improvement recommendations
 * @param {Object} scores - Individual component scores
 * @returns {Array} List of recommendations
 */
function generateERSRecommendations(scores) {
  const recommendations = [];


  if (scores.profileCompletion < 70) {
    recommendations.push('Complete your company profile with registration details, tax information, and comprehensive contact details');
    recommendations.push('Add all relevant communication channels and update company address information');
  }



  if (scores.transactionHistory < 70) {
    recommendations.push('Increase your annual revenue and customer base to demonstrate market traction');
    recommendations.push('Consider expanding your product range or entering new market segments');
    recommendations.push('Highlight your export experience and international trade history');
  }



  if (scores.compliance < 70) {
    recommendations.push('Obtain relevant international certifications (ISO, HACCP, Halal, etc.) for your products');
    recommendations.push('Implement quality management systems and document your compliance procedures');
    recommendations.push('Collect and showcase customer feedback and testimonials');
  }



  if (scores.marketReadiness < 70) {
    recommendations.push('Focus on developing products with strong international demand (cocoa, coffee, textiles, etc.)');
    recommendations.push('Invest in market research and competitive analysis for target export markets');
    recommendations.push('Ensure you have English language capabilities and international communication channels');
  }



  if (scores.financialHealth < 70) {
    recommendations.push('Strengthen your financial position through revenue growth and sound financial management');
    recommendations.push('Consider expanding your team and operational capacity');
    recommendations.push('Develop clear financial projections and investment plans for export expansion');
  }



  if (Object.values(scores).every(score => score >= 70)) {
    recommendations.push('Consider applying for the Sokogate Korea-Africa corridor initiative');
    recommendations.push('Explore trade finance options through AfDB and other development banks');
    recommendations.push('Develop a comprehensive export business plan with timelines and milestones');
    recommendations.push('Explore partnerships with established exporters in your target markets');
  }


  return recommendations;
}

module.exports = {
  calculateERS
};
EOF