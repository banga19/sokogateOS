// Customization Controller for sokogateOS
// Handles API endpoints for customization operations with real database queries

const Customization = require('../../../models/customization');
const qme = require('../../../qme/wrapper');
const logger = require('../../../utils/logger');

// Get customization request by ID
async function getCustomizationRequest(req, res) {
  try {
    const { requestId } = req.params;
    logger.info(`Customization Controller: Fetching customization request ${requestId}`);

    const customization = await Customization.findOne({
      $or: [
        { requestId },
        { _id: requestId.match(/^[0-9a-fA-F]{24}$/) ? requestId : null }
      ].filter(Boolean)
    });

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization request not found'
      });
    }

    if (req.user.role !== 'super_admin' && customization.companyId.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: customization
    });
  } catch (error) {
    logger.error('Customization Controller: Error fetching customization request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Create new customization request
async function createCustomizationRequest(req, res) {
  try {
    const {
      productId, customizationType, specifications, quantity,
      designFiles, preferredMaterials, budget, deliveryDate
    } = req.body;

    if (!productId || !customizationType) {
      return res.status(400).json({
        success: false,
        error: 'productId and customizationType are required'
      });
    }

    const customization = new Customization({
      requestId: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      companyId: req.user.companyId,
      createdBy: req.user.id,
      productId,
      customizationType,
      specifications: specifications || {},
      quantity: quantity || 1,
      designFiles: designFiles || [],
      preferredMaterials: preferredMaterials || [],
      budget: budget || {},
      deliveryDate: deliveryDate || null,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await customization.save();
    logger.info(`Customization Controller: Created customization request ${customization.requestId}`);

    // Trigger QMe pricing task in background
    qme.runTask('customization-price', {
      requestId: customization.requestId,
      productId,
      customizationType,
      specifications,
      quantity
    }).catch(err => {
      logger.warn('Customization Controller: QMe pricing task failed (non-blocking):', err.message);
    });

    res.status(201).json({
      success: true,
      data: customization
    });
  } catch (error) {
    logger.error('Customization Controller: Error creating customization request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get customization requests for a company
async function getCompanyCustomizationRequests(req, res) {
  try {
    const { companyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = { companyId };
    if (status) query.status = status;

    const total = await Customization.countDocuments(query);
    const customizations = await Customization.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: customizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Customization Controller: Error fetching company customization requests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Update customization request status
async function updateCustomizationRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { status, quotation, designApproval } = req.body;

    const validStatuses = ['draft', 'processing', 'design_pending', 'design_approved', 'quoting', 'quoted', 'approved', 'in_production', 'completed', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const update = {
      status,
      updatedAt: new Date()
    };

    if (quotation) update.quotation = quotation;
    if (designApproval !== undefined) update['designFiles'] = designApproval;

    const customization = await Customization.findOneAndUpdate(
      {
        requestId,
        ...(req.user.role !== 'super_admin' ? { companyId: req.user.companyId } : {})
      },
      { $set: update },
      { new: true }
    );

    if (!customization) {
      return res.status(404).json({
        success: false,
        error: 'Customization request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customization,
      message: `Customization request status updated to ${status}`
    });
  } catch (error) {
    logger.error('Customization Controller: Error updating customization request status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  getCustomizationRequest,
  createCustomizationRequest,
  getCompanyCustomizationRequests,
  updateCustomizationRequestStatus
};