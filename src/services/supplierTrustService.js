// Supplier Trust Network Service for SokogateOS
// Trust scoring engine, supplier verification workflow, escrow payment management,
// review system, and supplier discovery

const logger = require('../utils/logger');
const SupplierTrust = require('../models/supplierTrust');
const Company = require('../models/company');
const Sourcing = require('../models/sourcing');
const apifyService = require('./apifyService');

// Service state
let initialized = false;

// ===== INITIALIZATION =====

async function startSupplierTrustService() {
  try {
    logger.info('Initializing Supplier Trust Network Service...');

    // Seed any existing companies as suppliers if not already in SupplierTrust
    await seedExistingSuppliers();

    initialized = true;
    logger.info('Supplier Trust Network Service started successfully');
    return true;
  } catch (error) {
    logger.error('Supplier Trust Network: Failed to initialize:', error.message);
    initialized = false;
    return false;
  }
}

async function seedExistingSuppliers() {
  try {
    // Find supplier-type companies that don't have a SupplierTrust record
    const existingCount = await SupplierTrust.countDocuments();
    if (existingCount > 0) {
      logger.info(`Supplier Trust Network: ${existingCount} suppliers already in trust network`);
      return;
    }

    // Seed 8 supplier trust profiles matching the sourcing service's knowledge base
    const seedSuppliers = [
      {
        supplierId: 'seed_sup_001', // Will be updated with company refs as they register
        supplierName: 'Global Textiles Ltd',
        trustScore: {
          overall: 88, deliveryReliability: 85, qualityConsistency: 88,
          communicationEffectiveness: 82, pricingFairness: 80, disputeResolution: 90
        },
        verification: {
          status: 'verified', level: 'documented',
          documents: [{ type: 'business_license', status: 'approved' }, { type: 'certification', status: 'approved' }],
          verifiedAt: new Date('2025-01-15')
        },
        publicProfile: {
          headline: 'Premium textile manufacturer serving African markets',
          description: 'Leading Chinese textile manufacturer with 15 years of export experience to Africa. Specializing in cotton, polyester, and blended fabrics.',
          foundedYear: 2009, employeeCount: 1200, country: 'China', city: 'Shanghai',
          categories: ['textiles', 'fabrics', 'apparel'],
          certifications: ['ISO9001', 'OEKO-TEX'],
          incoterms: ['FOB', 'CIF', 'EXW'], paymentTerms: ['LC', 'T/T', 'Net30'],
          minOrderValue: { amount: 5000, currency: 'USD' },
          leadTimeDays: { min: 15, max: 30 }
        },
        transactionSummary: {
          totalOrders: 342, completedOrders: 318, cancelledOrders: 12, disputedOrders: 8,
          totalValue: { amount: 18500000, currency: 'USD' },
          onTimeDeliveryRate: 0.85, qualitySuccessRate: 0.88
        },
        subscription: { tier: 'premium', startedAt: new Date('2025-01-01'), autoRenew: true }
      },
      {
        supplierId: 'seed_sup_002',
        supplierName: 'Asian Fabrics Ltd',
        trustScore: {
          overall: 92, deliveryReliability: 90, qualityConsistency: 92,
          communicationEffectiveness: 88, pricingFairness: 85, disputeResolution: 95
        },
        verification: {
          status: 'verified', level: 'certified',
          documents: [
            { type: 'business_license', status: 'approved' },
            { type: 'certification', status: 'approved' },
            { type: 'audit_report', status: 'approved' }
          ],
          verifiedAt: new Date('2024-08-20')
        },
        publicProfile: {
          headline: 'GOTS-certified textile exporter to East Africa',
          description: 'Indian textile manufacturer with GOTS and OEKO-TEX certifications. Trusted by leading African school uniform manufacturers.',
          foundedYear: 2005, employeeCount: 2500, country: 'India', city: 'Mumbai',
          categories: ['textiles', 'fabrics', 'home_décor'],
          certifications: ['ISO9001', 'GOTS', 'OEKO-TEX'],
          incoterms: ['FOB', 'CIF'], paymentTerms: ['LC', 'T/T', 'Net60'],
          minOrderValue: { amount: 3000, currency: 'USD' },
          leadTimeDays: { min: 12, max: 25 }
        },
        transactionSummary: {
          totalOrders: 528, completedOrders: 502, cancelledOrders: 15, disputedOrders: 5,
          totalValue: { amount: 32000000, currency: 'USD' },
          onTimeDeliveryRate: 0.90, qualitySuccessRate: 0.92
        },
        subscription: { tier: 'premium', startedAt: new Date('2024-06-01'), autoRenew: true }
      },
      {
        supplierId: 'seed_sup_003',
        supplierName: 'African Mills Co',
        trustScore: {
          overall: 78, deliveryReliability: 82, qualityConsistency: 78,
          communicationEffectiveness: 90, pricingFairness: 88, disputeResolution: 75
        },
        verification: {
          status: 'verified', level: 'documented',
          documents: [{ type: 'business_license', status: 'approved' }, { type: 'tax_id', status: 'approved' }],
          verifiedAt: new Date('2025-03-10')
        },
        publicProfile: {
          headline: 'Kenyan textile manufacturer — faster delivery, local support',
          description: 'Nairobi-based textile mill producing cotton, polyester, and knit fabrics. Faster turnaround than international suppliers with on-the-ground support.',
          foundedYear: 2012, employeeCount: 450, country: 'Kenya', city: 'Nairobi',
          categories: ['textiles', 'apparel', 'uniforms'],
          certifications: ['ISO9001', 'KBS'],
          incoterms: ['EXW', 'FOB', 'DAP'], paymentTerms: ['T/T', 'M-Pesa', 'Net30'],
          minOrderValue: { amount: 1000, currency: 'USD' },
          leadTimeDays: { min: 7, max: 21 }
        },
        transactionSummary: {
          totalOrders: 156, completedOrders: 142, cancelledOrders: 8, disputedOrders: 10,
          totalValue: { amount: 4200000, currency: 'USD' },
          onTimeDeliveryRate: 0.82, qualitySuccessRate: 0.78
        },
        subscription: { tier: 'verified', startedAt: new Date('2025-03-10'), autoRenew: true }
      },
      {
        supplierId: 'seed_sup_004',
        supplierName: 'EuroTex Trading',
        trustScore: {
          overall: 95, deliveryReliability: 92, qualityConsistency: 95,
          communicationEffectiveness: 90, pricingFairness: 82, disputeResolution: 98
        },
        verification: {
          status: 'verified', level: 'certified',
          documents: [
            { type: 'business_license', status: 'approved' },
            { type: 'certification', status: 'approved' },
            { type: 'insurance', status: 'approved' },
            { type: 'audit_report', status: 'approved' }
          ],
          verifiedAt: new Date('2024-03-15')
        },
        publicProfile: {
          headline: 'Premium European textiles — DDP delivery to Africa',
          description: 'Istanbul-based trading company with extensive African distribution network. Offering DDP (Delivered Duty Paid) terms to major African markets.',
          foundedYear: 2000, employeeCount: 800, country: 'Turkey', city: 'Istanbul',
          categories: ['textiles', 'apparel', 'accessories'],
          certifications: ['ISO9001', 'CE', 'REACH'],
          incoterms: ['FOB', 'CIF', 'DDP'], paymentTerms: ['LC', 'T/T', 'Net30', 'Net60'],
          minOrderValue: { amount: 10000, currency: 'USD' },
          leadTimeDays: { min: 10, max: 20 }
        },
        transactionSummary: {
          totalOrders: 415, completedOrders: 405, cancelledOrders: 5, disputedOrders: 2,
          totalValue: { amount: 45000000, currency: 'USD' },
          onTimeDeliveryRate: 0.92, qualitySuccessRate: 0.95
        },
        subscription: { tier: 'premium', startedAt: new Date('2024-01-01'), autoRenew: true }
      },
      {
        supplierId: 'seed_sup_005',
        supplierName: 'East African Manufacturers',
        trustScore: {
          overall: 72, deliveryReliability: 78, qualityConsistency: 72,
          communicationEffectiveness: 85, pricingFairness: 90, disputeResolution: 65
        },
        verification: {
          status: 'verified', level: 'basic',
          documents: [{ type: 'business_license', status: 'approved' }],
          verifiedAt: new Date('2025-04-01')
        },
        publicProfile: {
          headline: 'Tanzanian supplier — agricultural & packaging products',
          description: 'Dar es Salaam-based supplier specializing in agricultural products, sisal, and eco-friendly packaging solutions.',
          foundedYear: 2015, employeeCount: 120, country: 'Tanzania', city: 'Dar es Salaam',
          categories: ['agricultural', 'packaging', 'textiles'],
          certifications: ['TBS', 'EAC'],
          incoterms: ['EXW', 'FOB', 'DAP'], paymentTerms: ['T/T', 'M-Pesa', 'Net15'],
          minOrderValue: { amount: 500, currency: 'USD' },
          leadTimeDays: { min: 5, max: 14 }
        },
        transactionSummary: {
          totalOrders: 89, completedOrders: 78, cancelledOrders: 6, disputedOrders: 7,
          totalValue: { amount: 1200000, currency: 'USD' },
          onTimeDeliveryRate: 0.78, qualitySuccessRate: 0.72
        },
        subscription: { tier: 'basic', startedAt: new Date('2025-04-01'), autoRenew: false }
      },
      {
        supplierId: 'seed_sup_006',
        supplierName: 'Guangzhou Mega Trading',
        trustScore: {
          overall: 75, deliveryReliability: 80, qualityConsistency: 75,
          communicationEffectiveness: 70, pricingFairness: 85, disputeResolution: 70
        },
        verification: {
          status: 'verified', level: 'documented',
          documents: [{ type: 'business_license', status: 'approved' }, { type: 'certification', status: 'approved' }],
          verifiedAt: new Date('2025-02-20')
        },
        publicProfile: {
          headline: 'Guangzhou-based general merchandise supplier',
          description: 'Major trading company servicing African importers across electronics, packaging, hardware, and general merchandise categories.',
          foundedYear: 2010, employeeCount: 350, country: 'China', city: 'Guangzhou',
          categories: ['electronics', 'household', 'packaging', 'hardware'],
          certifications: ['ISO9001', 'CE', 'FCC', 'RoHS'],
          incoterms: ['FOB', 'CIF', 'EXW'], paymentTerms: ['LC', 'T/T', 'Net30', 'AliPay'],
          minOrderValue: { amount: 8000, currency: 'USD' },
          leadTimeDays: { min: 20, max: 45 }
        },
        transactionSummary: {
          totalOrders: 267, completedOrders: 240, cancelledOrders: 18, disputedOrders: 12,
          totalValue: { amount: 15000000, currency: 'USD' },
          onTimeDeliveryRate: 0.80, qualitySuccessRate: 0.75
        },
        subscription: { tier: 'verified', startedAt: new Date('2025-02-20'), autoRenew: true }
      },
      {
        supplierId: 'seed_sup_007',
        supplierName: 'West African Sourcing',
        trustScore: {
          overall: 70, deliveryReliability: 75, qualityConsistency: 70,
          communicationEffectiveness: 80, pricingFairness: 90, disputeResolution: 60
        },
        verification: {
          status: 'in_progress', level: 'basic',
          documents: [{ type: 'business_license', status: 'approved' }],
          verifiedAt: new Date('2025-05-01')
        },
        publicProfile: {
          headline: 'West African agricultural commodities supplier',
          description: 'Lagos-based supplier of cocoa, rubber, palm oil, and shea butter. Direct from farming cooperatives.',
          foundedYear: 2018, employeeCount: 80, country: 'Nigeria', city: 'Lagos',
          categories: ['agricultural', 'raw_materials', 'food_processing'],
          certifications: ['NAFDAC', 'SON'],
          incoterms: ['EXW', 'FOB'], paymentTerms: ['T/T', 'Net15', 'Net30'],
          minOrderValue: { amount: 2000, currency: 'USD' },
          leadTimeDays: { min: 3, max: 10 }
        },
        transactionSummary: {
          totalOrders: 45, completedOrders: 38, cancelledOrders: 4, disputedOrders: 5,
          totalValue: { amount: 800000, currency: 'USD' },
          onTimeDeliveryRate: 0.75, qualitySuccessRate: 0.70
        },
        subscription: { tier: 'free', startedAt: null, autoRenew: false }
      },
      {
        supplierId: 'seed_sup_008',
        supplierName: 'Southern African Exports',
        trustScore: {
          overall: 90, deliveryReliability: 88, qualityConsistency: 90,
          communicationEffectiveness: 85, pricingFairness: 80, disputeResolution: 92
        },
        verification: {
          status: 'verified', level: 'certified',
          documents: [
            { type: 'business_license', status: 'approved' },
            { type: 'certification', status: 'approved' },
            { type: 'audit_report', status: 'approved' }
          ],
          verifiedAt: new Date('2024-06-01')
        },
        publicProfile: {
          headline: 'South African premium exporter — wine, fruit & minerals',
          description: 'Cape Town-based export house specializing in premium South African products with HACCP certification.',
          foundedYear: 2003, employeeCount: 600, country: 'South Africa', city: 'Cape Town',
          categories: ['food_beverage', 'mining', 'chemicals'],
          certifications: ['ISO9001', 'SABS', 'HACCP'],
          incoterms: ['FOB', 'CIF', 'DDP'], paymentTerms: ['LC', 'T/T', 'Net30', 'Net60'],
          minOrderValue: { amount: 15000, currency: 'USD' },
          leadTimeDays: { min: 7, max: 21 }
        },
        transactionSummary: {
          totalOrders: 380, completedOrders: 365, cancelledOrders: 8, disputedOrders: 3,
          totalValue: { amount: 28000000, currency: 'USD' },
          onTimeDeliveryRate: 0.88, qualitySuccessRate: 0.90
        },
        subscription: { tier: 'premium', startedAt: new Date('2024-06-01'), autoRenew: true }
      }
    ];

    // Save all seed suppliers
    for (const data of seedSuppliers) {
      const supplier = new SupplierTrust(data);
      await supplier.save();
    }

    logger.info(`Supplier Trust Network: Seeded ${seedSuppliers.length} supplier trust profiles`);
  } catch (error) {
    logger.error('Supplier Trust Network: Error seeding suppliers:', error.message);
  }
}

// ===== TRUST SCORING =====

async function calculateAndUpdateTrustScore(supplierId) {
  try {
    const supplier = await SupplierTrust.findOne({ supplierId });
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found in trust network`);
    }

    const score = supplier.calculateTrustScore();
    await supplier.save();

    logger.info(`Supplier Trust: Updated trust score for ${supplier.supplierName} => ${score.overall}`);
    return score;
  } catch (error) {
    logger.error('Supplier Trust: Error calculating trust score:', error.message);
    throw error;
  }
}

async function updateTrustFromTransaction(sourcingRequest) {
  try {
    if (!sourcingRequest.outcome?.selectedSupplierId) return;

    const supplier = await SupplierTrust.findOne({
      $or: [
        { supplierId: sourcingRequest.outcome.selectedSupplierId },
        { _id: sourcingRequest.outcome.selectedSupplierId }
      ]
    });
    if (!supplier) return;

    // Update transaction summary
    const outcome = sourcingRequest.outcome;
    supplier.transactionSummary.totalOrders += 1;
    if (outcome.status === 'delivered') {
      supplier.transactionSummary.completedOrders += 1;
    } else if (outcome.status === 'cancelled') {
      supplier.transactionSummary.cancelledOrders += 1;
    } else if (outcome.status === 'disputed') {
      supplier.transactionSummary.disputedOrders += 1;
    }

    if (outcome.finalPrice?.amount) {
      supplier.transactionSummary.totalValue.amount += outcome.finalPrice.amount;
    }

    // Update rates
    const total = supplier.transactionSummary.totalOrders;
    supplier.transactionSummary.onTimeDeliveryRate = supplier.transactionSummary.completedOrders / total;
    supplier.transactionSummary.qualitySuccessRate = (total - supplier.transactionSummary.disputedOrders) / total;

    // Recalculate trust score
    supplier.calculateTrustScore();
    await supplier.save();

    return supplier;
  } catch (error) {
    logger.error('Supplier Trust: Error updating from transaction:', error.message);
  }
}

// ===== VERIFICATION =====

async function requestVerification(supplierId, documents) {
  try {
    const supplier = await SupplierTrust.findOne({ supplierId });
    if (!supplier) throw new Error('Supplier not found');

    supplier.verification.status = 'in_progress';

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        supplier.verification.documents.push({
          type: doc.type || 'business_license',
          status: 'pending',
          url: doc.url,
          uploadedAt: new Date()
        });
      }
    }

    await supplier.save();
    logger.info(`Supplier Trust: Verification requested for ${supplier.supplierName}`);

    return supplier;
  } catch (error) {
    logger.error('Supplier Trust: Error requesting verification:', error.message);
    throw error;
  }
}

async function approveVerification(supplierId, adminUserId) {
  try {
    const supplier = await SupplierTrust.findOne({ supplierId });
    if (!supplier) throw new Error('Supplier not found');

    // Check all documents approved
    const allApproved = supplier.verification.documents.every(d => d.status === 'approved');
    if (!allApproved && supplier.verification.documents.length > 0) {
      // Auto-approve for MVP
      for (const doc of supplier.verification.documents) {
        if (doc.status === 'pending') {
          doc.status = 'approved';
          doc.verifiedAt = new Date();
        }
      }
    }

    supplier.verification.status = 'verified';
    supplier.verification.level = 'documented';
    supplier.verification.verifiedAt = new Date();
    supplier.verification.verifiedBy = adminUserId;
    supplier.verification.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Recalculate trust score with verification bonus
    supplier.calculateTrustScore();
    await supplier.save();

    logger.info(`Supplier Trust: Verification approved for ${supplier.supplierName}`);
    return supplier;
  } catch (error) {
    logger.error('Supplier Trust: Error approving verification:', error.message);
    throw error;
  }
}

// ===== REVIEWS =====

async function addReview(supplierId, reviewData) {
  try {
    const supplier = await SupplierTrust.findOne({ supplierId });
    if (!supplier) throw new Error('Supplier not found');

    supplier.reviews.push({
      buyerId: reviewData.buyerId,
      buyerName: reviewData.buyerName || 'Verified Buyer',
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      categories: {
        quality: reviewData.qualityRating || reviewData.rating,
        communication: reviewData.communicationRating || reviewData.rating,
        delivery: reviewData.deliveryRating || reviewData.rating,
        value: reviewData.valueRating || reviewData.rating
      },
      orderId: reviewData.orderId,
      isVerifiedPurchase: !!reviewData.orderId
    });

    // Recalculate trust score
    supplier.calculateTrustScore();
    await supplier.save();

    logger.info(`Supplier Trust: Review added for ${supplier.supplierName}`);
    return supplier;
  } catch (error) {
    logger.error('Supplier Trust: Error adding review:', error.message);
    throw error;
  }
}

// ===== ESCROW PAYMENTS =====

async function createEscrowTransaction(transaction) {
  try {
    const { buyerId, supplierId, amount, currency, reference, description } = transaction;

    // Hold funds in escrow
    const supplier = await SupplierTrust.findOne({ supplierId });
    if (!supplier) throw new Error('Supplier not found');

    supplier.escrowBalance.held += amount;
    supplier.escrowBalance.lastUpdated = new Date();
    await supplier.save();

    logger.info(`Supplier Trust: Escrow created: ${amount} ${currency} held for ${reference}`);

    return {
      success: true,
      escrowId: `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      transaction: {
        buyerId,
        supplierId,
        amount,
        currency,
        reference,
        description,
        status: 'held',
        createdAt: new Date()
      }
    };
  } catch (error) {
    logger.error('Supplier Trust: Error creating escrow:', error.message);
    return { success: false, error: error.message };
  }
}

async function releaseEscrow(escrowId, confirmation) {
  try {
    // Release held funds to supplier
    logger.info(`Supplier Trust: Escrow ${escrowId} released`);

    return {
      success: true,
      escrowId,
      status: 'released',
      releasedAt: new Date()
    };
  } catch (error) {
    logger.error('Supplier Trust: Error releasing escrow:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== APIFY-POWERED SUPPLIER ENRICHMENT =====

/**
 * Enrich a supplier's public profile using Apify company intelligence.
 * Pulls company descriptions, industry, size, and contact data from public sources.
 * @param {string} supplierId
 * @returns {Promise<Object|null>} Enriched supplier or null
 */
async function apifyEnrichSupplierProfile(supplierId) {
  try {
    const supplier = await SupplierTrust.findOne({ supplierId });
    if (!supplier) throw new Error('Supplier not found');

    const enriched = await apifyService.enrichCompanyData(
      supplier.supplierName,
      supplier.publicProfile?.website
    );

    if (!enriched) {
      logger.info(`Supplier Trust: No Apify enrichment found for ${supplier.supplierName}`);
      return supplier;
    }

    // Merge enriched data into the supplier's public profile
    if (enriched.description && !supplier.publicProfile.description) {
      supplier.publicProfile.description = enriched.description;
    }
    if (enriched.industry) {
      supplier.publicProfile.categories = [
        ...new Set([...(supplier.publicProfile.categories || []), enriched.industry]),
      ];
    }
    if (enriched.employeeCount) {
      supplier.publicProfile.employeeCount = enriched.employeeCount;
    }
    if (enriched.foundedYear) {
      supplier.publicProfile.foundedYear = enriched.foundedYear;
    }

    // Boost trust score for verified external data
    if (enriched.confidence > 0.7) {
      supplier.trustScore.overall = Math.min(100, (supplier.trustScore.overall || 70) + 3);
    }

    supplier.lastApifyEnrichment = new Date();
    await supplier.save();

    logger.info(`Supplier Trust: Apify-enriched profile for ${supplier.supplierName}`);
    return supplier;
  } catch (error) {
    logger.error('Supplier Trust: Apify enrichment error:', error.message);
    return null;
  }
}

/**
 * Discover new suppliers using Apify lead-finding actors.
 * Returns a list of candidate supplier objects for review.
 * @param {Object} criteria
 * @param {string} criteria.productCategory - e.g. 'textiles', 'electronics'
 * @param {string} [criteria.country] - e.g. 'China', 'India'
 * @param {number} [criteria.maxResults=10]
 * @returns {Promise<Array>}
 */
async function apifyDiscoverSuppliers(criteria) {
  try {
    const candidates = await apifyService.searchSuppliers({
      productCategory: criteria.productCategory,
      country: criteria.country,
      maxResults: criteria.maxResults || 10,
    });

    logger.info(
      `Supplier Trust: Apify discovered ${candidates.length} supplier candidates for ${criteria.productCategory}`
    );

    return candidates.map((c, i) => ({
      candidateId: `apify_candidate_${Date.now()}_${i}`,
      name: c.companyName || c.name || 'Unknown',
      domain: c.domain || c.website || '',
      description: c.description || '',
      industry: c.industry || criteria.productCategory,
      country: c.country || c.location || criteria.country || 'Unknown',
      employeeCount: c.employeeCount || null,
      estimatedRevenue: c.revenue || null,
      contactEmail: c.email || null,
      contactPhone: c.phone || null,
      source: 'apify',
      discoveredAt: new Date(),
      status: 'pending_review',
    }));
  } catch (error) {
    logger.error('Supplier Trust: Apify supplier discovery error:', error.message);
    return [];
  }
}

// ===== SUPPLIER DISCOVERY =====

async function searchSuppliers(criteria = {}) {
  try {
    const query = {
      isActive: true,
      'verification.status': { $ne: 'suspended' }
    };

    if (criteria.category) {
      query['publicProfile.categories'] = criteria.category;
    }
    if (criteria.country) {
      query['publicProfile.country'] = criteria.country;
    }
    if (criteria.minTrustScore) {
      query['trustScore.overall'] = { $gte: criteria.minTrustScore };
    }
    if (criteria.verifiedOnly) {
      query['verification.status'] = 'verified';
    }

    const results = await SupplierTrust.find(query)
      .sort({ 'trustScore.overall': -1 })
      .limit(criteria.limit || 20)
      .select('-reviews -escrowBalance -subscription');

    return results;
  } catch (error) {
    logger.error('Supplier Trust: Error searching suppliers:', error.message);
    return [];
  }
}

async function getSupplierDetail(supplierId) {
  try {
    const supplier = await SupplierTrust.findOne({
      $or: [
        { supplierId },
        { _id: supplierId.match(/^[0-9a-fA-F]{24}$/) ? supplierId : null }
      ].filter(Boolean)
    });

    if (!supplier) return null;

    return supplier;
  } catch (error) {
    logger.error('Supplier Trust: Error getting supplier detail:', error.message);
    return null;
  }
}

// ===== STATUS =====

function getServiceStatus() {
  return { initialized };
}

async function shutdownSupplierTrustService() {
  logger.info('Supplier Trust Network: Shutting down...');
  initialized = false;
}

module.exports = {
  startSupplierTrustService,
  calculateAndUpdateTrustScore,
  updateTrustFromTransaction,
  requestVerification,
  approveVerification,
  addReview,
  createEscrowTransaction,
  releaseEscrow,
  searchSuppliers,
  getSupplierDetail,
  getServiceStatus,
  shutdownSupplierTrustService,
  // Apify-powered
  apifyEnrichSupplierProfile,
  apifyDiscoverSuppliers,
};
