// Cross-Border Customs Engine Routes for SokogateOS
// API endpoints for HS code classification, duty calculation, document generation,
// compliance checking, trade agreement optimization, and customs shipment management

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const {
  classifyHS,
  searchHSCodes,
  getHSCodeDetail,
  calculateDuty,
  generateDocument,
  getDocumentTemplates,
  checkCompliance,
  optimizeTradeAgreement,
  getCustomsRoutes,
  createCustomsShipment,
  getCustomsShipment,
  getCompanyShipments,
  getCategories,
  getServiceStatus
} = require('../services/customsEngineService');

const { CustomsShipment, CustomHSCode } = require('../models/customsEngine');

// ============ HS CODE CLASSIFICATION ============

// Classify product by description → HS code prediction
router.post('/classify', authenticate, async (req, res) => {
  try {
    const { description, category } = req.body;

    if (!description || description.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Product description is required (minimum 3 characters)'
      });
    }

    const result = await classifyHS(description, category);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Customs Route: Classify error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search HS codes by query
router.get('/hs-codes', authenticate, async (req, res) => {
  try {
    const { query, category, limit } = req.query;
    const result = await searchHSCodes(query, category, limit ? parseInt(limit) : 20);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Customs Route: HS codes search error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get HS code detail
router.get('/hs-codes/:code', authenticate, async (req, res) => {
  try {
    const code = req.params.code;
    if (!/^\d{2,10}(\.\d{1,4})?$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Invalid HS code format' });
    }
    const result = await getHSCodeDetail(code);

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Customs Route: HS code detail error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await getCategories();
    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Customs Route: Categories error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ DUTY CALCULATOR ============

// Calculate duties and taxes for a shipment
router.post('/calculate-duty', authenticate, async (req, res) => {
  try {
    const { hsCode, originCountry, destinationCountry, invoiceAmount, invoiceCurrency,
      freightCost, insuranceCost, quantity, unit, weightKg, incoterm } = req.body;

    if (!hsCode || !originCountry || !destinationCountry) {
      return res.status(400).json({
        success: false,
        error: 'HS Code, origin country, and destination country are required'
      });
    }

    if (!invoiceAmount || invoiceAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid invoice amount is required'
      });
    }

    const result = await calculateDuty({
      hsCode, originCountry, destinationCountry, invoiceAmount, invoiceCurrency,
      freightCost, insuranceCost, quantity, unit, weightKg, incoterm
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Customs Route: Duty calculation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ COMPLIANCE CHECKER ============

// Check compliance for a product in destination country
router.get('/compliance', authenticate, async (req, res) => {
  try {
    const { hsCode, country } = req.query;

    if (!hsCode || !country) {
      return res.status(400).json({
        success: false,
        error: 'HS Code and country are required'
      });
    }

    const result = await checkCompliance(hsCode, country);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Customs Route: Compliance check error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ TRADE AGREEMENT OPTIMIZER ============

// Find optimal trade agreement and calculate savings
router.get('/trade-agreement', authenticate, async (req, res) => {
  try {
    const { hsCode, originCountry, destinationCountry } = req.query;

    if (!hsCode || !originCountry || !destinationCountry) {
      return res.status(400).json({
        success: false,
        error: 'HS Code, origin country, and destination country are required'
      });
    }

    const result = await optimizeTradeAgreement(hsCode, originCountry, destinationCountry);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('Customs Route: Trade agreement optimization error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all trade agreements
router.get('/trade-agreements', authenticate, async (req, res) => {
  try {
    const { TradeAgreement } = require('../models/customsEngine');
    const agreements = await TradeAgreement.find({ isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      data: agreements
    });
  } catch (error) {
    logger.error('Customs Route: Trade agreements list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CUSTOMS ROUTES ============

// Get available customs routes
router.get('/routes', authenticate, async (req, res) => {
  try {
    const { origin, destination } = req.query;
    const result = await getCustomsRoutes(origin, destination);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Customs Route: Routes error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ DOCUMENT GENERATOR ============

// Generate a customs document for a shipment
router.post('/shipments/:shipmentId/documents/generate', authenticate, async (req, res) => {
  try {
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }

    const validTypes = ['bill_of_lading', 'commercial_invoice', 'packing_list',
      'certificate_of_origin', 'import_declaration', 'export_declaration',
      'certificate_of_insurance', 'single_administrative_document',
      'customs_bond', 'preference_certificate', 'manufacturers_declaration'];

    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid document type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const shipment = await CustomsShipment.findOne({
      shipmentId: req.params.shipmentId,
      ...(req.user.role !== 'super_admin' ? { companyId: req.user.companyId } : {})
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    const result = await generateDocument(req.params.shipmentId, documentType);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Customs Route: Document generation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get document templates
router.get('/document-templates', authenticate, async (req, res) => {
  try {
    const { country } = req.query;
    const result = await getDocumentTemplates(country);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Customs Route: Document templates error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CUSTOMS SHIPMENTS ============

// Create a new customs shipment record
router.post('/shipments', authenticate, async (req, res) => {
  try {
    const {
      hsCode, productDescription, productCategory, quantity, unit,
      totalWeightKg, totalVolumeM3, invoiceValue, freightCost, insuranceCost,
      originCountry, originPort, destinationCountry, destinationPort, incoterm,
      companyId, sourcingRequestId, logisticsShipmentId
    } = req.body;

    if (!hsCode || !productDescription || !quantity || !originCountry || !destinationCountry || !invoiceValue?.amount) {
      return res.status(400).json({
        success: false,
        error: 'HS Code, product description, quantity, origin country, destination country, and invoice amount are required'
      });
    }

    const targetCompanyId = companyId || req.user.companyId;
    if (req.user.role !== 'super_admin' && targetCompanyId.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await createCustomsShipment({
      companyId: targetCompanyId,
      userId: req.user.id,
      hsCode, productDescription, productCategory, quantity, unit,
      totalWeightKg, totalVolumeM3, invoiceValue, freightCost, insuranceCost,
      originCountry, originPort, destinationCountry, destinationPort, incoterm,
      sourcingRequestId, logisticsShipmentId
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    logger.error('Customs Route: Create shipment error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get customs shipment detail
router.get('/shipments/:shipmentId', authenticate, async (req, res) => {
  try {
    const shipment = await CustomsShipment.findOne({
      shipmentId: req.params.shipmentId,
      ...(req.user.role !== 'super_admin' ? { companyId: req.user.companyId } : {})
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    const result = { success: true, data: shipment };
    res.json(result);
  } catch (error) {
    logger.error('Customs Route: Get shipment error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List company customs shipments
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const result = await getCompanyShipments(
      companyId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Customs Route: Company shipments error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update shipment status
router.put('/shipments/:shipmentId/status', authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['draft', 'documents_generated', 'submitted', 'in_processing',
      'cleared', 'held_for_inspection', 'rejected', 'released', 'exported'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const shipment = await CustomsShipment.findOne({
      shipmentId: req.params.shipmentId,
      ...(req.user.role !== 'super_admin' ? { companyId: req.user.companyId } : {})
    });
    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    shipment.status = status;
    shipment.statusHistory.push({
      status,
      timestamp: new Date(),
      notes: notes || `Status updated to ${status}`,
      updatedBy: req.user.name || req.user.id
    });

    if (status === 'cleared' || status === 'released') {
      shipment.clearanceDate = new Date();
      if (shipment.createdAt) {
        const clearMs = shipment.clearanceDate.getTime() - new Date(shipment.createdAt).getTime();
        shipment.actualClearanceDays = Math.round(clearMs / (1000 * 60 * 60 * 24));
      }
    }

    await shipment.save();

    res.json({ success: true, data: shipment });
  } catch (error) {
    logger.error('Customs Route: Update shipment status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SERVICE STATUS ============

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = getServiceStatus();
    const [hsCount, routeCount, shipmentCount, complianceCount] = await Promise.all([
      CustomHSCode.countDocuments(),
      require('../models/customsEngine').CustomsRoute.countDocuments({ isActive: true }),
      CustomsShipment.countDocuments(),
      require('../models/customsEngine').ComplianceRule.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        ...status,
        hsCodesLoaded: hsCount,
        activeRoutes: routeCount,
        shipmentsCreated: shipmentCount,
        complianceRules: complianceCount,
        capabilities: [
          'HS Code Classification',
          'Duty & Tax Calculator',
          'Document Generation (6 types)',
          'Compliance Checker',
          'Trade Agreement Optimizer',
          'Route Intelligence'
        ]
      }
    });
  } catch (error) {
    logger.error('Customs Route: Status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
