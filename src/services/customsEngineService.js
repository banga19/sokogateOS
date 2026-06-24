// Cross-Border Customs Engine Service for SokogateOS
// AI-powered tariff classification, duty calculation, document generation,
// compliance checking, and trade agreement optimization for African trade routes

const logger = require('../utils/logger');
const {
  CustomHSCode,
  TariffSchedule,
  CustomsRoute,
  CustomsShipment,
  ComplianceRule,
  TradeAgreement,
  DocumentTemplate
} = require('../models/customsEngine');
const apifyService = require('./apifyService');

// Seed data extracted to dedicated data files
const SEED_HS_CODES = require('../data/customs-engine/hs-codes');
const SEED_TARIFFS = require('../data/customs-engine/tariffs');
const SEED_ROUTES = require('../data/customs-engine/routes');
const SEED_COMPLIANCE_RULES = require('../data/customs-engine/compliance-rules');
const SEED_TRADE_AGREEMENTS = require('../data/customs-engine/trade-agreements');
const SEED_DOCUMENT_TEMPLATES = require('../data/customs-engine/document-templates');

// ===== SERVICE STATE =====

let initialized = false;
let hsCodeCache = new Map();          // description -> { code, confidence, category }
let tariffCache = new Map();          // hsCode:country:origin -> duty rates
let routeCache = new Map();           // origin:destination -> route details
let agreementCache = new Map();       // country -> trade agreements
let complianceCache = new Map();      // country:hsCode -> compliance rules
let documentCache = new Map();        // type:country -> document template

// ===== INITIALIZATION =====

async function startCustomsEngineService() {
  try {
    logger.info('Initializing Cross-Border Customs Engine Service...');

    // Seed data if collections are empty
    await seedData();

    initialized = true;
    logger.info('Cross-Border Customs Engine Service started successfully');
    return true;
  } catch (error) {
    logger.error('Customs Engine: Failed to initialize:', error.message);
    initialized = false;
    return false;
  }
}

async function seedData() {
  try {
    const hsCount = await CustomHSCode.countDocuments();
    if (hsCount === 0) {
      await CustomHSCode.insertMany(SEED_HS_CODES);
      logger.info(`Customs Engine: Seeded ${SEED_HS_CODES.length} HS codes`);
    }

    const tariffCount = await TariffSchedule.countDocuments();
    if (tariffCount === 0) {
      await TariffSchedule.insertMany(SEED_TARIFFS);
      logger.info(`Customs Engine: Seeded ${SEED_TARIFFS.length} tariff schedules`);
    }

    const routeCount = await CustomsRoute.countDocuments();
    if (routeCount === 0) {
      await CustomsRoute.insertMany(SEED_ROUTES);
      logger.info(`Customs Engine: Seeded ${SEED_ROUTES.length} customs routes`);
    }

    const complianceCount = await ComplianceRule.countDocuments();
    if (complianceCount === 0) {
      await ComplianceRule.insertMany(SEED_COMPLIANCE_RULES);
      logger.info(`Customs Engine: Seeded ${SEED_COMPLIANCE_RULES.length} compliance rules`);
    }

    const agreementCount = await TradeAgreement.countDocuments();
    if (agreementCount === 0) {
      await TradeAgreement.insertMany(SEED_TRADE_AGREEMENTS);
      logger.info(`Customs Engine: Seeded ${SEED_TRADE_AGREEMENTS.length} trade agreements`);
    }

    const templateCount = await DocumentTemplate.countDocuments();
    if (templateCount === 0) {
      await DocumentTemplate.insertMany(SEED_DOCUMENT_TEMPLATES);
      logger.info(`Customs Engine: Seeded ${SEED_DOCUMENT_TEMPLATES.length} document templates`);
    }
  } catch (error) {
    logger.error('Customs Engine: Error seeding data:', error.message);
  }
}

// ===== HS CODE CLASSIFIER =====

/**
 * Classify product by description — returns best HS code match with confidence
 */
async function classifyHS(productDescription, productCategory) {
  try {
    const query = { isActive: true };

    // If category provided, filter by it
    if (productCategory) {
      query.category = productCategory;
    }

    const allCodes = await CustomHSCode.find(query);

    // Score each HS code based on keyword matching
    const scored = allCodes.map(hs => {
      let score = 0;
      const desc = productDescription.toLowerCase();
      const keywords = hs.keywords || [];

      // Match keywords
      for (const kw of keywords) {
        if (desc.includes(kw.toLowerCase())) {
          score += 10;
        }
      }

      // Match partial keywords
      for (const kw of keywords) {
        const parts = kw.toLowerCase().split(/\s+/);
        for (const part of parts) {
          if (part.length > 3 && desc.includes(part)) {
            score += 3;
          }
        }
      }

      // Boost for matching description
      if (desc.includes(hs.description.toLowerCase().slice(0, 20))) {
        score += 15;
      }

      // Boost for matching category
      if (productCategory && hs.category === productCategory) {
        score += 5;
      }

      return { hs, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Filter to meaningful matches
    const matches = scored.filter(s => s.score > 0).slice(0, 5);

    if (matches.length === 0) {
      // Return top codes in the most likely category based on description
      return {
        success: true,
        matches: [],
        message: 'No confident match found. Try providing more detail or a product category.',
        suggestion: suggestCategory(productDescription)
      };
    }

    const topScore = matches[0].score;
    const maxPossibleScore = 50; // Heuristic maximum

    return {
      success: true,
      matches: matches.map(m => ({
        code: m.hs.code,
        chapter: m.hs.chapter,
        heading: m.hs.heading,
        description: m.hs.description,
        category: m.hs.category,
        confidence: Math.min(100, Math.round((m.score / maxPossibleScore) * 100)),
        score: m.score,
        restrictions: m.hs.restrictions
      })),
      topMatch: {
        code: matches[0].hs.code,
        description: matches[0].hs.description,
        category: matches[0].hs.category,
        confidence: Math.min(100, Math.round((topScore / maxPossibleScore) * 100))
      },
      totalCandidatesChecked: allCodes.length
    };
  } catch (error) {
    logger.error('Customs Engine: HS classification error:', error.message);
    return { success: false, error: error.message };
  }
}

function suggestCategory(description) {
  const desc = description.toLowerCase();
  if (desc.match(/textile|fabric|cloth|yarn|cotton|silk|wool|garment|apparel|shirt|dress|uniform/)) return 'textiles';
  if (desc.match(/phone|smartphone|electronic|computer|laptop|tv|television|camera|speaker|headphone/)) return 'electronics';
  if (desc.match(/machine|engine|pump|compressor|valve|generator|motor|turbine/)) return 'machinery';
  if (desc.match(/food|rice|flour|oil|sugar|coffee|tea|spice|cocoa|beverage|drink|fruit|vegetable|grain/)) return 'food_beverage';
  if (desc.match(/chemical|acid|base|solvent|fertilizer|pesticide|soap|detergent|plastic|polymer/)) return 'chemicals';
  if (desc.match(/cement|steel|iron|brick|tile|pipe|rebar|concrete|timber|wood|plywood/)) return 'construction';
  if (desc.match(/car|vehicle|truck|motorcycle|auto|bus|tire|tyre|battery|tractor/)) return 'vehicles';
  if (desc.match(/pharma|medicine|drug|tablet|capsule|vaccine|medical/)) return 'pharmaceuticals';
  if (desc.match(/agriculture|crop|seed|fertilizer|pesticide|livestock|feed|grain/)) return 'agricultural';
  return 'other';
}

/**
 * Search HS codes by query string
 */
async function searchHSCodes(query, category, limit = 20) {
  try {
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { keywords: { $regex: escaped, $options: 'i' } }
      ];
    }

    const codes = await CustomHSCode.find(filter)
      .sort({ code: 1 })
      .limit(limit);

    const total = await CustomHSCode.countDocuments(filter);

    return {
      success: true,
      data: codes,
      total,
      limit
    };
  } catch (error) {
    logger.error('Customs Engine: HS code search error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get HS code detail by code
 */
async function getHSCodeDetail(code) {
  try {
    const hsCode = await CustomHSCode.findOne({ code, isActive: true });
    if (!hsCode) {
      return { success: false, error: 'HS Code not found' };
    }
    return { success: true, data: hsCode };
  } catch (error) {
    logger.error('Customs Engine: HS code detail error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== DUTY CALCULATOR =====

/**
 * Calculate duties and taxes for a shipment
 */
async function calculateDuty(data) {
  try {
    const {
      hsCode,
      originCountry,
      destinationCountry,
      invoiceAmount,
      invoiceCurrency = 'USD',
      freightCost = 0,
      insuranceCost = 0,
      quantity = 1,
      unit = 'pieces',
      weightKg,
      incoterm = 'CIF'
    } = data;

    if (!hsCode) return { success: false, error: 'HS Code is required' };
    if (!originCountry) return { success: false, error: 'Origin country is required' };
    if (!destinationCountry) return { success: false, error: 'Destination country is required' };
    if (!invoiceAmount) return { success: false, error: 'Invoice amount is required' };

    // Look up tariff schedule
    let tariff = await TariffSchedule.findOne({
      hsCode,
      country: destinationCountry,
      originCountry,
      isActive: true
    });

    if (!tariff) {
      // Try to find a base duty rate for this HS code and destination
      tariff = await TariffSchedule.findOne({
        hsCode,
        country: destinationCountry,
        isActive: true
      });

      if (!tariff) {
        // Estimate based on category average
        const hsCodeDoc = await CustomHSCode.findOne({ code: hsCode });
        const estimatedRate = estimateDutyRate(hsCodeDoc?.category, destinationCountry);

        return {
          success: true,
          estimated: true,
          message: 'Exact tariff not found. Used estimated rate based on product category.',
          calculation: buildDutyCalculation({
            hsCode, originCountry, destinationCountry, invoiceAmount,
            freightCost, insuranceCost, incoterm,
            dutyRate: estimatedRate.rate,
            vatRate: estimatedRate.vat,
            estimated: true
          })
        };
      }
    }

    // Determine applicable rate (preferential if available and qualifying)
    const applicableRate = (tariff.preferentialRate !== null && tariff.preferentialRate !== undefined)
      ? tariff.preferentialRate
      : tariff.baseDutyRate;

    const tradeAgreementApplied = tariff.preferentialRate !== null && tariff.preferentialRate !== undefined
      ? tariff.tradeAgreement?.name || null
      : null;

    const savings = tradeAgreementApplied
      ? ((tariff.baseDutyRate - tariff.preferentialRate) / 100) * invoiceAmount
      : 0;

    // Calculate CIF value
    let cifValue = invoiceAmount;
    if (incoterm === 'FOB') {
      cifValue = invoiceAmount + (freightCost || 0) + (insuranceCost || 0);
    } else if (incoterm === 'EXW') {
      cifValue = invoiceAmount + (freightCost || 0) + (insuranceCost || 0);
    }
    // CIF already includes freight + insurance

    const dutyAmount = (applicableRate / 100) * cifValue;
    const vatAmount = (tariff.vatRate / 100) * (cifValue + dutyAmount);
    const exciseAmount = (tariff.exciseDuty || 0) / 100 * cifValue;

    // Other taxes
    let otherTaxesTotal = 0;
    const otherTaxes = (tariff.otherTaxes || []).map(tax => {
      const amount = (tax.rate / 100) * cifValue;
      otherTaxesTotal += amount;
      return { name: tax.name, rate: tax.rate, amount: Math.round(amount * 100) / 100 };
    });

    // Processing fee (standard 1% or minimum $50)
    const processingFee = Math.max(50, cifValue * 0.01);

    const totalTaxesAndDuties = dutyAmount + vatAmount + exciseAmount + otherTaxesTotal + processingFee;

    const calculation = {
      hsCode,
      originCountry,
      destinationCountry,
      incoterm,
      invoiceAmount,
      invoiceCurrency,
      freightCost: freightCost || 0,
      insuranceCost: insuranceCost || 0,
      cifValue: Math.round(cifValue * 100) / 100,
      dutyRate: applicableRate,
      dutyAmount: Math.round(dutyAmount * 100) / 100,
      vatRate: tariff.vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      exciseDuty: tariff.exciseDuty || 0,
      exciseAmount: Math.round(exciseAmount * 100) / 100,
      otherTaxes,
      processingFee: Math.round(processingFee * 100) / 100,
      totalTaxesAndDuties: Math.round(totalTaxesAndDuties * 100) / 100,
      totalLandedCost: Math.round((cifValue + totalTaxesAndDuties) * 100) / 100,
      effectiveTaxRate: Math.round((totalTaxesAndDuties / cifValue) * 100 * 10) / 10,
      currency: invoiceCurrency,
      tradeAgreement: tariff.tradeAgreement?.name || null,
      preferentialRate: tariff.preferentialRate,
      savingsUnderAgreement: Math.round(savings * 100) / 100,
      estimated: false,
      calculatedAt: new Date().toISOString()
    };

    // Calculate breakdown by country for easy reference
    calculation.breakdown = [
      { label: 'Invoice Value', amount: invoiceAmount, percentage: (invoiceAmount / calculation.totalLandedCost * 100).toFixed(1) },
      { label: 'Freight & Insurance', amount: freightCost + insuranceCost, percentage: ((freightCost + insuranceCost) / calculation.totalLandedCost * 100).toFixed(1) },
      { label: 'Customs Duty', amount: calculation.dutyAmount, percentage: (calculation.dutyAmount / calculation.totalLandedCost * 100).toFixed(1) },
      { label: 'VAT/GST', amount: calculation.vatAmount, percentage: (calculation.vatAmount / calculation.totalLandedCost * 100).toFixed(1) }
    ];

    if (calculation.exciseAmount > 0) {
      calculation.breakdown.push({ label: 'Excise Duty', amount: calculation.exciseAmount, percentage: (calculation.exciseAmount / calculation.totalLandedCost * 100).toFixed(1) });
    }

    if (otherTaxes.length > 0) {
      calculation.breakdown.push({ label: 'Other Taxes', amount: otherTaxesTotal, percentage: (otherTaxesTotal / calculation.totalLandedCost * 100).toFixed(1) });
    }

    calculation.breakdown.push({ label: 'Processing Fee', amount: calculation.processingFee, percentage: (calculation.processingFee / calculation.totalLandedCost * 100).toFixed(1) });

    return { success: true, calculation };
  } catch (error) {
    logger.error('Customs Engine: Duty calculation error:', error.message);
    return { success: false, error: error.message };
  }
}

function estimateDutyRate(category, country) {
  const baseRates = {
    textiles: { rate: 25, vat: 16 },
    electronics: { rate: 5, vat: 16 },
    machinery: { rate: 10, vat: 16 },
    food_beverage: { rate: 20, vat: 16 },
    chemicals: { rate: 10, vat: 16 },
    construction: { rate: 25, vat: 16 },
    vehicles: { rate: 25, vat: 16 },
    plastics: { rate: 15, vat: 16 },
    metals: { rate: 10, vat: 16 },
    agricultural: { rate: 15, vat: 16 },
    pharmaceuticals: { rate: 0, vat: 16 },
    footwear: { rate: 25, vat: 16 },
    furniture: { rate: 20, vat: 16 },
    paper: { rate: 10, vat: 16 },
    wood: { rate: 10, vat: 16 }
  };

  const countryVat = {
    'Kenya': 16, 'Nigeria': 7.5, 'Tanzania': 18, 'Uganda': 18,
    'Rwanda': 18, 'South Africa': 15, 'Ethiopia': 15, 'Egypt': 14,
    'Ghana': 12.5, "Côte d'Ivoire": 18, 'Senegal': 18, 'Zambia': 16,
    'Zimbabwe': 14.5, 'Botswana': 12, 'Namibia': 15, 'Morocco': 20,
    'Tunisia': 19, 'Mauritius': 15, 'Cameroon': 19.25, 'DR Congo': 16
  };

  const rate = baseRates[category] || { rate: 15, vat: 16 };
  rate.vat = countryVat[country] || 16;
  return rate;
}

function buildDutyCalculation(data) {
  const { hsCode, originCountry, destinationCountry, invoiceAmount, freightCost, insuranceCost, incoterm, dutyRate, vatRate, estimated } = data;

  let cifValue = invoiceAmount;
  if (incoterm === 'FOB' || incoterm === 'EXW') {
    cifValue = invoiceAmount + freightCost + insuranceCost;
  }

  const dutyAmount = (dutyRate / 100) * cifValue;
  const vatAmount = (vatRate / 100) * (cifValue + dutyAmount);
  const processingFee = Math.max(50, cifValue * 0.01);
  const total = dutyAmount + vatAmount + processingFee;

  return {
    hsCode, originCountry, destinationCountry, incoterm,
    invoiceAmount, freightCost, insuranceCost,
    cifValue: Math.round(cifValue * 100) / 100,
    dutyRate, dutyAmount: Math.round(dutyAmount * 100) / 100,
    vatRate, vatAmount: Math.round(vatAmount * 100) / 100,
    processingFee: Math.round(processingFee * 100) / 100,
    totalTaxesAndDuties: Math.round(total * 100) / 100,
    totalLandedCost: Math.round((cifValue + total) * 100) / 100,
    effectiveTaxRate: Math.round((total / cifValue) * 100 * 10) / 10,
    estimated
  };
}

// ===== DOCUMENT GENERATOR =====

/**
 * Generate a customs document for a shipment
 */
async function generateDocument(shipmentId, documentType) {
  try {
    const shipment = await CustomsShipment.findOne({ shipmentId });
    if (!shipment) return { success: false, error: 'Shipment not found' };

    // Find the template
    const template = await DocumentTemplate.findOne({
      type: documentType,
      $or: [
        { country: shipment.destinationCountry },
        { country: 'general' }
      ],
      isActive: true
    }).sort({ country: -1 }); // Prefer country-specific over general

    if (!template) {
      return { success: false, error: `No document template found for type: ${documentType}` };
    }

    // Generate document content from shipment data
    const content = {};
    for (const field of template.fields) {
      if (field.autoFill && field.autoFillField) {
        // Map from shipment data
        const path = field.autoFillField;
        content[field.fieldName] = getNestedValue(shipment, path) || '';
      } else {
        content[field.fieldName] = '';
      }
    }

    // Fill in known values
    content.originCountry = shipment.originCountry;
    content.destinationCountry = shipment.destinationCountry;
    content.hsCode = shipment.hsCode;
    content.productDescription = shipment.productDescription;
    content.quantity = shipment.quantity;
    content.unit = shipment.unit;
    content.incoterm = shipment.incoterm;
    content.invoiceAmount = shipment.invoiceValue?.amount;
    content.currency = shipment.invoiceValue?.currency;

    if (documentType === 'commercial_invoice') {
      content.invoiceNumber = `INV-${shipmentId}`;
      content.date = new Date().toISOString().split('T')[0];
    }

    if (documentType === 'bill_of_lading') {
      content.blNumber = `BL-${shipmentId}`;
      content.dateOfIssue = new Date().toISOString().split('T')[0];
    }

    if (documentType === 'packing_list') {
      content.documentNumber = `PL-${shipmentId}`;
      content.date = new Date().toISOString().split('T')[0];
    }

    // Add to shipment documents
    const docEntry = {
      type: documentType,
      documentNumber: content.invoiceNumber || content.blNumber || content.documentNumber || `${documentType.toUpperCase()}-${shipmentId}`,
      status: 'generated',
      content,
      generatedAt: new Date()
    };

    shipment.documents.push(docEntry);
    shipment.status = 'documents_generated';
    await shipment.save();

    return {
      success: true,
      data: {
        documentType,
        documentNumber: docEntry.documentNumber,
        status: 'generated',
        content,
        template: {
          name: template.name,
          version: template.version
        },
        sections: template.sections
      }
    };
  } catch (error) {
    logger.error('Customs Engine: Document generation error:', error.message);
    return { success: false, error: error.message };
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * List available document templates
 */
async function getDocumentTemplates(country) {
  try {
    const filter = { isActive: true };
    if (country) {
      filter.$or = [
        { country },
        { country: 'general' }
      ];
    }

    const templates = await DocumentTemplate.find(filter)
      .select('type country name description fields sections format version')
      .sort({ type: 1, country: 1 });

    // Group by type
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.type]) acc[t.type] = [];
      acc[t.type].push(t);
      return acc;
    }, {});

    return {
      success: true,
      data: templates,
      grouped,
      total: templates.length
    };
  } catch (error) {
    logger.error('Customs Engine: Document templates error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== COMPLIANCE CHECKER =====

/**
 * Check compliance for a product in a destination country
 */
async function checkCompliance(hsCode, destinationCountry) {
  try {
    if (!hsCode || !destinationCountry) {
      return { success: false, error: 'HS Code and destination country are required' };
    }

    const rules = await ComplianceRule.find({
      hsCode,
      country: destinationCountry,
      isActive: true
    });

    // Also check broader chapter-level rules
    const chapter = hsCode.split('.')[0];
    const chapterRules = await ComplianceRule.find({
      hsCode: { $regex: `^${chapter}` },
      country: destinationCountry,
      isActive: true
    });

    const allRules = [...rules, ...chapterRules.filter(r => !rules.some(er => er._id.equals(r._id)))];

    const result = {
      hsCode,
      country: destinationCountry,
      status: 'compliant',
      checks: allRules.map(rule => ({
        ruleType: rule.ruleType,
        description: rule.description,
        authority: rule.authority,
        referenceRegulation: rule.referenceRegulation,
        compliant: true,
        requiredDocuments: rule.allowedWithDocuments || [],
        penalty: rule.penalty
      })),
      requiredLicenses: [],
      warnings: [],
      restrictions: []
    };

    // Determine overall status
    for (const check of result.checks) {
      if (check.ruleType === 'prohibited') {
        result.status = 'prohibited';
        check.compliant = false;
        result.restrictions.push(`${check.description} (${check.authority})`);
      } else if (check.ruleType === 'restricted') {
        result.status = result.status === 'prohibited' ? result.status : 'restricted';
        result.restrictions.push(`${check.description}`);
        result.requiredLicenses.push(...check.requiredDocuments);
      } else if (check.ruleType === 'requires_license') {
        result.status = result.status === 'prohibited' || result.status === 'restricted' ? result.status : 'requires_license';
        result.requiredLicenses.push(...check.requiredDocuments);
      } else if (check.ruleType === 'sanctioned') {
        result.status = 'restricted';
        result.warnings.push(`${check.description}`);
      }
    }

    // Deduplicate licenses
    result.requiredLicenses = [...new Set(result.requiredLicenses)];

    // Check if there are any trade agreements that could help
    const agreements = await TradeAgreement.find({
      memberCountries: destinationCountry,
      isActive: true
    });

    result.tradeAgreements = agreements.map(a => ({
      name: a.name,
      shortName: a.shortName,
      beneficial: true
    }));

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Customs Engine: Compliance check error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== TRADE AGREEMENT OPTIMIZER =====

/**
 * Find optimal trade routes and agreements
 */
async function optimizeTradeAgreement(hsCode, originCountry, destinationCountry) {
  try {
    if (!hsCode || !originCountry || !destinationCountry) {
      return { success: false, error: 'HS Code, origin and destination countries are required' };
    }

    // Find applicable trade agreements
    const agreements = await TradeAgreement.find({
      memberCountries: { $all: [originCountry, destinationCountry] },
      isActive: true
    });

    // Find tariff schedules with preferential rates
    const tariffs = await TariffSchedule.find({
      hsCode,
      country: destinationCountry,
      originCountry,
      isActive: true,
      preferentialRate: { $ne: null }
    });

    // Find the customs route
    const route = await CustomsRoute.findOne({
      originCountry,
      destinationCountry,
      isActive: true
    }).sort({ popularityScore: -1 });

    const standardTariff = await TariffSchedule.findOne({
      hsCode,
      country: destinationCountry,
      originCountry,
      isActive: true,
      preferentialRate: null
    });

    const savings = standardTariff && tariffs.length > 0
      ? standardTariff.baseDutyRate - tariffs[0].preferentialRate
      : 0;

    const result = {
      hsCode,
      originCountry,
      destinationCountry,
      eligibleAgreements: agreements.map(a => ({
        name: a.name,
        shortName: a.shortName,
        type: a.type,
        keyBenefits: a.keyBenefits,
        rulesOfOrigin: a.rulesOfOrigin,
        documentation: a.documentation
      })),
      currentBestRate: tariffs.length > 0 ? tariffs[0].preferentialRate : standardTariff?.baseDutyRate || null,
      standardRate: standardTariff?.baseDutyRate || null,
      savingsPercentage: savings,
      hasPreferentialRate: tariffs.length > 0,
      recommendedAgreement: agreements.length > 0 ? agreements[0].shortName : null,
      route: route ? {
        name: route.name,
        avgTransitDays: route.avgTransitDays,
        requiredDocuments: route.requiredDocuments,
        tradeBloc: route.tradeBloc
      } : null,
      // Calculate what certification is needed
      requirements: {
        certificateOfOrigin: agreements.some(a => a.documentation?.requiresCertificateOfOrigin),
        certificateFormat: agreements.filter(a => a.documentation?.requiresCertificateOfOrigin)
          .map(a => a.documentation.certificateOfOriginFormat).filter(Boolean),
        localContentRequirement: agreements.map(a => a.rulesOfOrigin?.localContentRequirement).filter(Boolean)
      }
    };

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Customs Engine: Trade agreement optimization error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== CUSTOMS ROUTES =====

/**
 * Get available customs routes
 */
async function getCustomsRoutes(origin, destination) {
  try {
    const filter = { isActive: true };
    if (origin) filter.originCountry = origin;
    if (destination) filter.destinationCountry = destination;

    const routes = await CustomsRoute.find(filter)
      .sort({ popularityScore: -1 });

    return {
      success: true,
      data: routes,
      total: routes.length
    };
  } catch (error) {
    logger.error('Customs Engine: Routes query error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== CUSTOMS SHIPMENTS =====

/**
 * Create a new customs shipment record
 */
async function createCustomsShipment(data) {
  try {
    const shipmentData = {
      ...data,
      shipmentId: data.shipmentId || `CUS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      statusHistory: [{
        status: 'draft',
        timestamp: new Date(),
        notes: 'Customs shipment record created',
        updatedBy: 'system'
      }],
      estimatedClearanceDays: await estimateClearanceDays(data.destinationCountry, data.hsCode)
    };

    const shipment = new CustomsShipment(shipmentData);
    await shipment.save();

    return {
      success: true,
      data: shipment
    };
  } catch (error) {
    logger.error('Customs Engine: Create shipment error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get customs shipment detail
 */
async function getCustomsShipment(shipmentId) {
  try {
    const shipment = await CustomsShipment.findOne({ shipmentId });
    if (!shipment) return { success: false, error: 'Shipment not found' };
    return { success: true, data: shipment };
  } catch (error) {
    logger.error('Customs Engine: Get shipment error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * List customs shipments for a company
 */
async function getCompanyShipments(companyId, status, page = 1, limit = 20) {
  try {
    const filter = { companyId };
    if (status) filter.status = status;

    const shipments = await CustomsShipment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CustomsShipment.countDocuments(filter);

    return {
      success: true,
      data: shipments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  } catch (error) {
    logger.error('Customs Engine: Company shipments error:', error.message);
    return { success: false, error: error.message };
  }
}

async function estimateClearanceDays(country, hsCode) {
  const estimates = {
    'Kenya': 5, 'Nigeria': 14, 'Tanzania': 7, 'Uganda': 6,
    'Rwanda': 4, 'South Africa': 4, 'Ethiopia': 10, 'Egypt': 8,
    'Ghana': 8, 'Zambia': 6, 'Zimbabwe': 7
  };

  // EAC countries typically faster
  const eacCountries = ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Burundi', 'South Sudan'];
  if (eacCountries.includes(country)) return estimates[country] || 5;

  return estimates[country] || 7;
}

// ===== APIFY-POWERED TARIFF & TRADE DATA =====

/**
 * Look up live tariff data for an HS code using Apify web crawling.
 * Falls back to the local cache if the crawl fails.
 * @param {string} hsCode - Harmonized System code
 * @param {string} country - Destination/origin country
 * @returns {Promise<Object|null>} Tariff data if found
 */
async function apifyLookupTariffData(hsCode, country) {
  try {
    logger.info(`Customs Engine: Apify tariff lookup for HS ${hsCode} in ${country}`);

    const tariffData = await apifyService.lookupTariffData(hsCode, country);

    if (!tariffData) {
      logger.info('Customs Engine: No Apify tariff data found — using local cache');
      return null;
    }

    // If we got data back, cache it locally for future use
    if (tariffData.data && tariffData.data.length > 0) {
      const extracted = tariffData.data[0];

      // Build a tariff schedule entry from scraped data
      const tariffEntry = {
        hsCode,
        country,
        originCountry: null, // Will be filled by the caller
        baseDutyRate: extracted.dutyRate || extracted.tariffRate || null,
        vatRate: extracted.vatRate || extracted.vat || extracted.taxRate || null,
        preferentialRate: extracted.preferentialRate || null,
        tradeAgreement: extracted.tradeAgreement
          ? { name: extracted.tradeAgreement, shortName: extracted.tradeAgreementCode }
          : null,
        otherTaxes: extracted.otherTaxes || [],
        exciseDuty: extracted.exciseDuty || null,
        source: 'apify',
        lastCrawled: new Date(),
        isActive: true,
      };

      return tariffEntry;
    }

    return null;
  } catch (error) {
    logger.error('Customs Engine: Apify tariff lookup error:', error.message);
    return null;
  }
}

/**
 * Crawl for trade agreement data using Apify and cache locally.
 * @param {string} country - Country to look up agreements for
 * @returns {Promise<Array>}
 */
async function apifyCrawlTradeAgreements(country) {
  try {
    logger.info(`Customs Engine: Apify crawling trade agreements for ${country}`);

    const agreements = await apifyService.crawlTradeAgreements(country);

    if (!agreements || agreements.length === 0) {
      logger.info('Customs Engine: No Apify trade agreement data found');
      return [];
    }

    return agreements.map((item) => ({
      name: item.name || item.agreementName || 'Unknown',
      shortName: item.shortName || item.code || '',
      type: item.type || item.agreementType || 'FTA',
      memberCountries: item.memberCountries || [country],
      keyBenefits: item.keyBenefits || [],
      rulesOfOrigin: item.rulesOfOrigin
        ? { localContentRequirement: item.rulesOfOrigin.localContent }
        : null,
      documentation: item.documentation
        ? { requiresCertificateOfOrigin: true }
        : null,
      source: 'apify',
      retrievedAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error('Customs Engine: Apify trade agreement crawl error:', error.message);
    return [];
  }
}

/**
 * Verify a customs document by crawling the relevant government portal for requirements.
 * @param {string} documentType - Type of document (e.g. 'commercial_invoice', 'certificate_of_origin')
 * @param {string} country - Destination country
 * @returns {Promise<Object|null>}
 */
async function apifyVerifyDocumentRequirements(documentType, country) {
  try {
    const searchQuery = `${country} ${documentType.replace(/_/g, ' ')} requirements customs`;
    const results = await apifyService.scrapeMarketNews(searchQuery, 3);

    if (!results || results.length === 0) return null;

    return {
      documentType,
      country,
      sources: results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
      })),
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Customs Engine: Apify document verification error:', error.message);
    return null;
  }
}

// ===== CATEGORIES / METADATA =====

/**
 * Get product categories with HS code counts
 */
async function getCategories() {
  try {
    const categories = await CustomHSCode.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return {
      success: true,
      data: categories.map(c => ({
        category: c._id,
        count: c.count
      }))
    };
  } catch (error) {
    logger.error('Customs Engine: Categories error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== STATUS =====

function getServiceStatus() {
  return { initialized };
}

async function shutdownCustomsEngineService() {
  logger.info('Customs Engine: Shutting down...');
  initialized = false;
}

module.exports = {
  startCustomsEngineService,
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
  getServiceStatus,
  shutdownCustomsEngineService,
  // Apify-powered
  apifyLookupTariffData,
  apifyCrawlTradeAgreements,
  apifyVerifyDocumentRequirements,
};
