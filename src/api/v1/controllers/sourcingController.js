// Sourcing Controller for sokogateOS
// Handles API endpoints for sourcing operations with real database queries

const Sourcing = require('../../../models/sourcing');
const qme = require('../../../qme/wrapper');
const logger = require('../../../utils/logger');

// Get sourcing request by ID
async function getSourcingRequest(req, res) {
  try {
    const { requestId } = req.params;
    logger.info(`Sourcing Controller: Fetching sourcing request ${requestId}`);

    // Try to find by requestId (unique string) or by MongoDB ObjectId
    const sourcing = await Sourcing.findOne({
      $or: [
        { requestId },
        { _id: requestId.match(/^[0-9a-fA-F]{24}$/) ? requestId : null }
      ].filter(Boolean)
    }).populate('companyId', 'name businessType');

    if (!sourcing) {
      return res.status(404).json({
        success: false,
        error: 'Sourcing request not found'
      });
    }

    // Check company scoping
    if (req.user.role !== 'super_admin' && sourcing.companyId._id.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: sourcing
    });
  } catch (error) {
    logger.error('Sourcing Controller: Error fetching sourcing request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Create new sourcing request
async function createSourcingRequest(req, res) {
  try {
    const { productQuery, quantity, priority, source } = req.body;

    if (!productQuery) {
      return res.status(400).json({
        success: false,
        error: 'Product query is required'
      });
    }

    const sourcing = new Sourcing({
      companyId: req.user.companyId,
      requestId: `SRC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      productQuery: {
        original: productQuery,
        processed: productQuery.toLowerCase().trim()
      },
      priority: priority || 'medium',
      source: source || 'api',
      workflow: {
        status: 'submitted',
        currentStep: 'submitted',
        stepsCompleted: ['submitted'],
        stepTimestamps: {
          submitted: new Date()
        },
        automationLevel: 'semi_automated'
      }
    });

    await sourcing.save();
    logger.info(`Sourcing Controller: Created sourcing request ${sourcing.requestId}`);

    // Trigger QMe task for supplier matching in background
    qme.runTask('sourcing-match', {
      requestId: sourcing.requestId,
      productQuery: productQuery,
      quantity: quantity
    }).catch(err => {
      logger.warn('Sourcing Controller: QMe task trigger failed (non-blocking):', err.message);
    });

    res.status(201).json({
      success: true,
      data: sourcing
    });
  } catch (error) {
    logger.error('Sourcing Controller: Error creating sourcing request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get sourcing requests for a company
async function getCompanySourcingRequests(req, res) {
  try {
    const { companyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = { companyId };
    if (status) query['workflow.status'] = status;

    const total = await Sourcing.countDocuments(query);
    const sourcingRequests = await Sourcing.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-userInteractions');

    res.status(200).json({
      success: true,
      data: sourcingRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Sourcing Controller: Error fetching company sourcing requests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Update sourcing request status
async function updateSourcingRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { status, automationLevel } = req.body;

    const validStatuses = ['draft', 'submitted', 'matching', 'quoting', 'negotiating', 'approved', 'rejected', 'expired', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const update = {
      'workflow.status': status,
      'workflow.currentStep': status,
      updatedAt: new Date()
    };

    // Track step timestamps
    const timestampField = `workflow.stepTimestamps.${status}`;
    update[timestampField] = new Date();

    // If completed, record completion date
    if (status === 'completed') {
      update['workflow.stepTimestamps.completionDate'] = new Date();
    }

    if (automationLevel) {
      update['workflow.automationLevel'] = automationLevel;
    }

    const sourcing = await Sourcing.findOneAndUpdate(
      { requestId },
      { $set: update, $push: { 'workflow.stepsCompleted': status } },
      { new: true }
    );

    if (!sourcing) {
      return res.status(404).json({
        success: false,
        error: 'Sourcing request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: sourcing,
      message: `Sourcing request status updated to ${status}`
    });
  } catch (error) {
    logger.error('Sourcing Controller: Error updating sourcing request status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  getSourcingRequest,
  createSourcingRequest,
  getCompanySourcingRequests,
  updateSourcingRequestStatus
};