// API Routes for sokogateOS v1
// Defines all REST API endpoints with authentication and RBAC

const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate, scopeToCompany } = require('../../../middleware/auth');
const { abacAuthorize } = require('../../../middleware/abac');
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
  abacAuthorize({ action: 'read', domain: 'sourcing' }),
  sourcingController.getSourcingRequest
);

// Create new sourcing request
router.post(
  '/sourcing/request',
  authenticate,
  abacAuthorize({ action: 'create', domain: 'sourcing' }),
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
  abacAuthorize({ action: 'read', domain: 'sourcing' }),
  sourcingController.getCompanySourcingRequests
);

// Update sourcing request status
router.put(
  '/sourcing/request/:requestId/status',
  authenticate,
  abacAuthorize({ action: 'update', domain: 'sourcing' }),
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
  abacAuthorize({ action: 'read', domain: 'customization' }),
  customizationController.getCustomizationRequest
);

router.post(
  '/customization/request',
  authenticate,
  abacAuthorize({ action: 'create', domain: 'customization' }),
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
  abacAuthorize({ action: 'read', domain: 'customization' }),
  customizationController.getCompanyCustomizationRequests
);

router.put(
  '/customization/request/:requestId/status',
  authenticate,
  abacAuthorize({ action: 'update', domain: 'customization' }),
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
  abacAuthorize({ action: 'read', domain: 'logistics' }),
  logisticsController.getShipment
);

router.post(
  '/logistics/shipment',
  authenticate,
  abacAuthorize({ action: 'create', domain: 'logistics' }),
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
  abacAuthorize({ action: 'read', domain: 'logistics' }),
  logisticsController.getCompanyShipments
);

router.put(
  '/logistics/shipment/:shipmentId/status',
  authenticate,
  abacAuthorize({ action: 'update', domain: 'logistics' }),
  sanitize(['status', 'notes', 'estimatedDelivery']),
  validate({
    status: { rules: [validators.isString, validators.isIn(['pending', 'processing', 'shipped', 'in_transit', 'customs', 'delivered', 'cancelled'])], message: 'status must be valid' }
  }),
  logisticsController.updateShipmentStatus
);

router.get(
  '/logistics/track/:shipmentId',
  authenticate,
  abacAuthorize({ action: 'read', domain: 'logistics' }),
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

// ============ LANGCHAIN ORCHESTRATOR ROUTES ============
const langchainOrchestrator = require('../../../services/langchainOrchestrator');

// Get workflow status
router.get('/qme/workflow/status', authenticate, async (req, res) => {
  try {
    const status = langchainOrchestrator.getWorkflowStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get workflow state for a specific task
router.get('/qme/workflow/:taskId', authenticate, async (req, res) => {
  try {
    const workflow = langchainOrchestrator.getWorkflow(req.params.taskId);
    res.json({ success: true, data: workflow });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get next suggested action based on RAG context
router.get('/qme/workflow/:taskId/suggestions', authenticate, async (req, res) => {
  try {
    const suggestions = await langchainOrchestrator.getNextSuggestedAction(req.params.taskId);
    res.json({ success: true, data: { suggestions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run task with LangChain orchestration
router.post('/qme/orchestrate/:taskName', authenticate, async (req, res) => {
  try {
    const result = await langchainOrchestrator.runTaskWithRAG(req.params.taskName, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get task context from RAG
router.get('/qme/context/:query', authenticate, async (req, res) => {
  try {
    const context = await langchainOrchestrator.getTaskContext(req.params.query);
    res.json({ success: true, data: context });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ FEEDBACK ROUTES (Self-Improving Loop) ============
// Record feedback for AI model improvement

router.post('/feedback', authenticate, abacAuthorize({ action: 'create', domain: 'analytics' }), async (req, res) => {
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

// ============ ERS (EXPORT READINESS SCORE) ROUTES ============
// New feature for Korea-Africa corridor initiative

const ersController = require('../controllers/ers/ersController');

// Get ERS for authenticated user's company
router.get(
  '/ers/me',
  authenticate,
  ersController.getMyERS
);

// Get ERS breakdown and recommendations
router.get(
  '/ers/me/breakdown',
  authenticate,
  ersController.getMyERSBreakdown
);

// Get ERS for specific company (admin/super_admin only)
router.get(
  '/ers/:companyId',
  authenticate,
  ersController.getCompanyERS
);

// Get ERS rankings (leaderboard)
router.get(
  '/ers/rankings',
  authenticate,
  ersController.getERSRankings
);

// ============ KOREAN COMPLIANCE ROUTES ============
// New feature for Korea-Africa corridor initiative

const koreanComplianceController = require('../controllers/compliance/koreanComplianceController');

// Check Korean compliance for a specific product
router.post(
  '/compliance/korean/check',
  authenticate,
  koreanComplianceController.checkProductCompliance
);

// Batch check Korean compliance for multiple products
router.post(
  '/compliance/korean/batch',
  authenticate,
  koreanComplianceController.batchCheckCompliance
);

// Get Korean requirements for a specific product category
router.get(
  '/compliance/korean/requirements/:category',
  authenticate,
  koreanComplianceController.getKoreanRequirements
);

// Get all supported product categories for Korean compliance
router.get(
  '/compliance/korean/categories',
  authenticate,
  koreanComplianceController.getSupportedCategories
);

// Validate documents for Korean compliance (pre-check)
router.post(
  '/compliance/korean/validate-documents',
  authenticate,
  koreanComplianceController.validateDocuments
);

// ============ KOREAN MARKET ANALYSIS ROUTES ============
// New feature for Korea-Africa corridor initiative

const koreanMarketAnalysisController = require('../controllers/marketAnalysis/koreanMarketAnalysisController');

// Get top import categories in Korea
router.get(
  '/market-analysis/korean/top-imports',
  authenticate,
  koreanMarketAnalysisController.getTopImportCategories
);

// Get African products with growing demand in Korea
router.get(
  '/market-analysis/korean/african-opportunities',
  authenticate,
  koreanMarketAnalysisController.getAfricanGrowthOpportunities
);

// Analyze product-market fit for Korean market
router.post(
  '/market-analysis/korean/analyze',
  authenticate,
  koreanMarketAnalysisController.analyzeProductMarketFit
);

// Analyze product portfolio for Korean market readiness
router.post(
  '/market-analysis/korean/portfolio',
  authenticate,
  koreanMarketAnalysisController.analyzeProductPortfolio
);

// Get Korean market trends and preferences
router.get(
  '/market-analysis/korean/trends',
  authenticate,
  koreanMarketAnalysisController.getMarketTrends
);

// Get Korean business culture and buyer preferences
router.get(
  '/market-analysis/korean/business-culture',
  authenticate,
  koreanMarketAnalysisController.getBusinessCulture
);

// ============ ANALYTICS ROUTES ============
// Track user sign-ups, activations, and retention metrics
const analyticsRoutes = require('../../../routes/analytics/index');
router.use('/analytics', analyticsRoutes);

module.exports = router;