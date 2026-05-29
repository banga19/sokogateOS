// API Routes for sokogateOS v1
// Defines all REST API endpoints with authentication and RBAC

const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate, authorize, scopeToCompany } = require('../../../middleware/auth');
const { validate, validators, sanitize } = require('../../../middleware/validation');

// Import controllers
const sourcingController = require('../controllers/sourcingController');
const customizationController = require('../controllers/customizationController');
const logisticsController = require('../controllers/logisticsController');

// Health check endpoint (unauthenticated)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============ SOURCING ROUTES ============
// Procurement managers and above can access sourcing

// Get sourcing request by ID
router.get(
  '/sourcing/request/:requestId',
  authenticate,
  authorize('procurement_manager', 'company_admin', 'super_admin', 'executive', 'finance'),
  sourcingController.getSourcingRequest
);

// Create new sourcing request
router.post(
  '/sourcing/request',
  authenticate,
  authorize('procurement_manager', 'company_admin', 'super_admin'),
  sanitize(['productId', 'quantity', 'requirements', 'budget', 'timeline', 'destination', 'supplierPreferences']),
  validate({
    productId: { rules: [validators.isString], message: 'productId is required' },
    quantity: { rules: [validators.isNumber], message: 'quantity must be a number' },
    requirements: { rules: [validators.minLength(10)], message: 'requirements must be at least 10 characters', optional: true },
    budget: { rules: [validators.isNumber], message: 'budget must be a number', optional: true }
  }),
  sourcingController.createSourcingRequest
);

// Get company sourcing requests
router.get(
  '/sourcing/company/:companyId',
  authenticate,
  scopeToCompany,
  authorize('procurement_manager', 'company_admin', 'super_admin', 'executive'),
  sourcingController.getCompanySourcingRequests
);

// Update sourcing request status
router.put(
  '/sourcing/request/:requestId/status',
  authenticate,
  authorize('procurement_manager', 'company_admin', 'super_admin'),
  sanitize(['status', 'notes']),
  validate({
    status: { rules: [validators.isString, validators.isIn(['draft', 'pending', 'quoted', 'approved', 'rejected', 'completed', 'cancelled'])], message: 'status must be valid' }
  }),
  sourcingController.updateSourcingRequestStatus
);

// ============ CUSTOMIZATION ROUTES ============
// Sales team and above can access customization

router.get(
  '/customization/request/:requestId',
  authenticate,
  authorize('sales_team', 'company_admin', 'super_admin', 'executive'),
  customizationController.getCustomizationRequest
);

router.post(
  '/customization/request',
  authenticate,
  authorize('sales_team', 'company_admin', 'super_admin'),
  sanitize(['productId', 'branding', 'specifications', 'materials', 'quantity', 'deadline', 'budget']),
  validate({
    productId: { rules: [validators.isString], message: 'productId is required' },
    quantity: { rules: [validators.isNumber], message: 'quantity must be a number' },
    deadline: { rules: [validators.isString], message: 'deadline is required' }
  }),
  customizationController.createCustomizationRequest
);

router.get(
  '/customization/company/:companyId',
  authenticate,
  scopeToCompany,
  authorize('sales_team', 'company_admin', 'super_admin', 'executive'),
  customizationController.getCompanyCustomizationRequests
);

router.put(
  '/customization/request/:requestId/status',
  authenticate,
  authorize('sales_team', 'company_admin', 'super_admin'),
  sanitize(['status', 'notes']),
  validate({
    status: { rules: [validators.isString, validators.isIn(['draft', 'pending', 'design_review', 'sampling', 'production', 'qc', 'completed', 'cancelled'])], message: 'status must be valid' }
  }),
  customizationController.updateCustomizationRequestStatus
);

// ============ LOGISTICS ROUTES ============
// Logistics coordinators and above can access logistics

router.get(
  '/logistics/shipment/:shipmentId',
  authenticate,
  authorize('logistics_coordinator', 'company_admin', 'super_admin', 'executive', 'procurement_manager'),
  logisticsController.getShipment
);

router.post(
  '/logistics/shipment',
  authenticate,
  authorize('logistics_coordinator', 'company_admin', 'super_admin'),
  sanitize(['orderId', 'origin', 'destination', 'items', 'shippingMethod', 'deliveryDeadline']),
  validate({
    orderId: { rules: [validators.isString], message: 'orderId is required' },
    origin: { rules: [validators.isString, validators.minLength(2)], message: 'origin is required' },
    destination: { rules: [validators.isString, validators.minLength(2)], message: 'destination is required' },
    items: { rules: [(v) => Array.isArray(v) && v.length > 0], message: 'at least one item is required' }
  }),
  logisticsController.createShipment
);

router.get(
  '/logistics/company/:companyId',
  authenticate,
  scopeToCompany,
  authorize('logistics_coordinator', 'company_admin', 'super_admin', 'executive'),
  logisticsController.getCompanyShipments
);

router.put(
  '/logistics/shipment/:shipmentId/status',
  authenticate,
  authorize('logistics_coordinator', 'company_admin', 'super_admin'),
  sanitize(['status', 'notes', 'estimatedDelivery']),
  validate({
    status: { rules: [validators.isString, validators.isIn(['pending', 'processing', 'shipped', 'in_transit', 'customs', 'delivered', 'cancelled'])], message: 'status must be valid' }
  }),
  logisticsController.updateShipmentStatus
);

router.get(
  '/logistics/track/:shipmentId',
  authenticate,
  authorize('logistics_coordinator', 'company_admin', 'super_admin', 'procurement_manager', 'executive'),
  logisticsController.trackShipment
);

// ============ QME TASK ROUTES ============
// Execute tasks through QMe task runner

const qme = require('../../../qme/wrapper');
const Feedback = require('../../../models/feedback');

router.post('/qme/run/:taskName', authenticate, async (req, res) => {
  try {
    const result = await qme.runTask(req.params.taskName, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/qme/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await qme.listTasks({ filter: req.query.filter, limit: parseInt(req.query.limit) || 20 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/qme/task/:taskId', authenticate, async (req, res) => {
  try {
    const task = await qme.getTask(req.params.taskId);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ FEEDBACK ROUTES (Self-Improving Loop) ============
// Record feedback for AI model improvement

router.post('/feedback', authenticate, async (req, res) => {
  try {
    const feedback = new Feedback({
      ...req.body,
      companyId: req.user.companyId,
      userId: req.user.id
    });
    await feedback.save();
    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/feedback/analytics', authenticate, async (req, res) => {
  try {
    const analytics = await Feedback.getCompanyAnalytics(req.user.companyId, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      targetType: req.query.targetType
    });
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ COMPANY LEGIBILITY ROUTES ============

const Company = require('../../../models/company');

router.get('/company/:companyId/legibility', authenticate, scopeToCompany, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const score = await company.updateLegibilityScore();
    await company.save();

    res.json({
      success: true,
      data: {
        legibilityScore: score,
        totalCommunications: company.totalCommunicationsProcessed,
        totalDocuments: company.totalDocumentsProcessed,
        aiChannels: company.communicationChannels,
        lastUpdated: company.lastLegibilityUpdate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;