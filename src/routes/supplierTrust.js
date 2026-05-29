// Supplier Trust Network Routes for SokogateOS
// API endpoints for trust scores, supplier profiles, reviews, escrow payments,
// and verification workflow

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const {
  searchSuppliers,
  getSupplierDetail,
  requestVerification,
  approveVerification,
  addReview,
  createEscrowTransaction,
  releaseEscrow,
  calculateAndUpdateTrustScore,
  getServiceStatus
} = require('../services/supplierTrustService');

const SupplierTrust = require('../models/supplierTrust');

// ============ SUPPLIER SEARCH & DISCOVERY ============

// Search suppliers by criteria
router.get('/search', authenticate, async (req, res) => {
  try {
    const {
      category,
      country,
      minTrustScore,
      verifiedOnly,
      limit,
      query,
      page
    } = req.query;

    const criteria = {
      category,
      country,
      minTrustScore: minTrustScore ? parseInt(minTrustScore) : undefined,
      verifiedOnly: verifiedOnly === 'true',
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1
    };

    // If search query provided, do text search
    if (query) {
      const results = await SupplierTrust.find({
        $text: { $search: query },
        isActive: true,
        'verification.status': { $ne: 'suspended' }
      })
        .sort({ 'trustScore.overall': -1 })
        .limit(criteria.limit)
        .select('-reviews -escrowBalance -subscription');

      const total = await SupplierTrust.countDocuments({
        $text: { $search: query },
        isActive: true
      });

      return res.json({
        success: true,
        data: results,
        pagination: {
          page: criteria.page,
          limit: criteria.limit,
          total,
          pages: Math.ceil(total / criteria.limit)
        }
      });
    }

    const suppliers = await searchSuppliers(criteria);
    const total = await SupplierTrust.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        page: criteria.page,
        limit: criteria.limit,
        total,
        pages: Math.ceil(total / criteria.limit)
      }
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Search error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top suppliers (for homepage / recommendations)
router.get('/top', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const suppliers = await SupplierTrust.findTopSuppliers(
      req.query.category ? { 'publicProfile.categories': req.query.category } : {},
      limit
    );

    res.json({ success: true, data: suppliers });
  } catch (error) {
    logger.error('Supplier Trust Route: Top suppliers error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get supplier detail
router.get('/supplier/:supplierId', authenticate, async (req, res) => {
  try {
    const supplier = await getSupplierDetail(req.params.supplierId);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    logger.error('Supplier Trust Route: Detail error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ TRUST SCORE ============

// Recalculate trust score
router.post('/supplier/:supplierId/recalculate-score', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const score = await calculateAndUpdateTrustScore(req.params.supplierId);
    res.json({
      success: true,
      data: score,
      message: 'Trust score recalculated'
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Score recalculation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ VERIFICATION ============

// Request supplier verification with documents
router.post('/supplier/:supplierId/verify', authenticate, authorize('super_admin', 'company_admin'), async (req, res) => {
  try {
    const { documents } = req.body;
    const supplier = await requestVerification(req.params.supplierId, documents);

    res.json({
      success: true,
      data: supplier,
      message: 'Verification request submitted'
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Verification request error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve supplier verification (admin only)
router.post('/supplier/:supplierId/approve', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const supplier = await approveVerification(req.params.supplierId, req.user.id);

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier verification approved'
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Verification approval error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ REVIEWS ============

// Add review for supplier
router.post('/supplier/:supplierId/review', authenticate, async (req, res) => {
  try {
    const { rating, title, comment, qualityRating, communicationRating, deliveryRating, valueRating, orderId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating is required and must be between 1 and 5'
      });
    }

    const supplier = await addReview(req.params.supplierId, {
      buyerId: req.user.companyId || req.user.id,
      buyerName: req.user.name || 'Verified Buyer',
      rating,
      title,
      comment,
      qualityRating,
      communicationRating,
      deliveryRating,
      valueRating,
      orderId
    }).catch(err => {
      throw err;
    });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Review submitted'
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Review error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get reviews for a supplier
router.get('/supplier/:supplierId/reviews', authenticate, async (req, res) => {
  try {
    const supplier = await SupplierTrust.findOne({
      $or: [
        { supplierId: req.params.supplierId },
        { _id: req.params.supplierId.match(/^[0-9a-fA-F]{24}$/) ? req.params.supplierId : null }
      ].filter(Boolean)
    }).select('reviews supplierName trustScore');

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const reviews = supplier.reviews
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: {
        supplierName: supplier.supplierName,
        trustScore: supplier.trustScore,
        reviews,
        pagination: {
          page,
          limit,
          total: supplier.reviews.length,
          pages: Math.ceil(supplier.reviews.length / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Reviews fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ESCROW PAYMENTS ============

// Create escrow transaction
router.post('/escrow/create', authenticate, async (req, res) => {
  try {
    const { supplierId, amount, currency, reference, description } = req.body;

    if (!supplierId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'supplierId and amount are required'
      });
    }

    const result = await createEscrowTransaction({
      buyerId: req.user.companyId,
      supplierId,
      amount,
      currency: currency || 'USD',
      reference: reference || `ORD-${Date.now()}`,
      description: description || 'Trade payment'
    });

    if (result.success) {
      res.status(201).json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error('Supplier Trust Route: Escrow create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Release escrow funds
router.post('/escrow/:escrowId/release', authenticate, async (req, res) => {
  try {
    const { confirmation } = req.body;
    const result = await releaseEscrow(req.params.escrowId, confirmation);

    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error('Supplier Trust Route: Escrow release error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SUPPLIER SUBSCRIPTION ============

// Update supplier subscription tier
router.put('/supplier/:supplierId/subscription', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { tier, autoRenew } = req.body;

    const validTiers = ['free', 'basic', 'verified', 'premium'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
      });
    }

    const supplier = await SupplierTrust.findOne({
      $or: [
        { supplierId: req.params.supplierId },
        { _id: req.params.supplierId.match(/^[0-9a-fA-F]{24}$/) ? req.params.supplierId : null }
      ].filter(Boolean)
    });

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    supplier.subscription.tier = tier;
    supplier.subscription.startedAt = new Date();
    supplier.subscription.autoRenew = autoRenew !== undefined ? autoRenew : supplier.subscription.autoRenew;

    // Set pricing based on tier
    const tierPricing = { free: 0, basic: 0, verified: 200, premium: 500 };
    supplier.subscription.monthlyFee = { amount: tierPricing[tier] || 0, currency: 'USD' };
    supplier.subscription.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await supplier.save();

    res.json({ success: true, data: supplier });
  } catch (error) {
    logger.error('Supplier Trust Route: Subscription error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SERVICE STATUS ============

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = getServiceStatus();
    const count = await SupplierTrust.countDocuments();
    const verifiedCount = await SupplierTrust.countDocuments({ 'verification.status': 'verified' });

    res.json({
      success: true,
      data: {
        ...status,
        totalSuppliers: count,
        verifiedSuppliers: verifiedCount
      }
    });
  } catch (error) {
    logger.error('Supplier Trust Route: Status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
