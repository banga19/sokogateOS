#!/usr/bin/env node
// QMe Task: Customization Pricing Estimation - REAL PRICING ENGINE
// Run by QMe: qme run node src/qme/tasks/customization-price.js <base64-data>
// Uses the real cost database and pricing algorithm from the Customization Service

const dataArg = process.argv[2];
if (!dataArg) {
  console.error('Error: No task data provided');
  process.exit(1);
}

let taskData;
try {
  const jsonStr = Buffer.from(dataArg, 'base64').toString('utf-8');
  taskData = JSON.parse(jsonStr);
} catch (error) {
  console.error('Error: Invalid task data:', error.message);
  process.exit(1);
}

console.log(`[QMe Task] Starting price estimation for customization: ${taskData.requestId || 'unknown'}`);
console.log(`[QMe Task] Type: ${taskData.customizationType || 'standard'}, Qty: ${taskData.quantity || 'not specified'}`);
console.log(`[QMe Task] Urgency: ${taskData.urgency || 'standard'}`);

const startTime = Date.now();

// Real cost database (same as customizationService)
const COST_DATABASE = {
  embroidery: { baseCost: 2.50, setupFee: 150, complexityMultiplier: { low: 1, medium: 1.5, high: 2.5 } },
  screen_print: { baseCost: 0.75, setupFee: 75, complexityMultiplier: { low: 1, medium: 1.3, high: 2.0 } },
  heat_transfer: { baseCost: 0.50, setupFee: 50, complexityMultiplier: { low: 1, medium: 1.2, high: 1.8 } },
  label: { baseCost: 0.30, setupFee: 30, complexityMultiplier: { low: 1, medium: 1.1, high: 1.5 } },
  engrave: { baseCost: 3.00, setupFee: 200, complexityMultiplier: { low: 1, medium: 1.8, high: 3.0 } },
  emboss: { baseCost: 1.50, setupFee: 120, complexityMultiplier: { low: 1, medium: 1.4, high: 2.2 } },
  default: { baseCost: 1.00, setupFee: 100, complexityMultiplier: { low: 1, medium: 1.3, high: 2.0 } }
};

const MATERIAL_COSTS = {
  cotton: { perUnit: 3.50, description: 'Premium cotton fabric', sustainabilityScore: 75 },
  polyester: { perUnit: 2.00, description: 'Standard polyester blend', sustainabilityScore: 40 },
  linen: { perUnit: 5.00, description: 'Natural linen fabric', sustainabilityScore: 85 },
  silk: { perUnit: 12.00, description: 'Pure silk fabric', sustainabilityScore: 70 },
  denim: { perUnit: 6.00, description: 'Cotton denim', sustainabilityScore: 50 },
  wool: { perUnit: 8.00, description: 'Merino wool blend', sustainabilityScore: 80 },
  plastic: { perUnit: 0.50, description: 'ABS plastic', sustainabilityScore: 25 },
  metal: { perUnit: 3.00, description: 'Stainless steel', sustainabilityScore: 60 },
  wood: { perUnit: 2.00, description: 'Bamboo wood', sustainabilityScore: 90 },
  leather: { perUnit: 15.00, description: 'Genuine leather', sustainabilityScore: 35 },
  paper: { perUnit: 0.20, description: 'Kraft paper', sustainabilityScore: 85 },
  default: { perUnit: 1.00, description: 'Standard material', sustainabilityScore: 50 }
};

// Calculate pricing (same algorithm as customizationService.calculatePricing)
const customizationType = taskData.customizationType || 'default';
const costConfig = COST_DATABASE[customizationType] || COST_DATABASE.default;
const quantity = taskData.quantity || 1000;
const urgency = taskData.urgency || 'standard';

// Determine complexity
const modificationsCount = (taskData.specifications?.modifications || []).length;
const complexity = modificationsCount > 3 ? 'high' : modificationsCount > 0 ? 'medium' : 'low';
const multiplier = costConfig.complexityMultiplier[complexity] || 1;

// Quantity discount
const quantityDiscounted = quantity > 10000 ? 0.6 : quantity > 5000 ? 0.7 : quantity > 1000 ? 0.8 : 1;

// Urgency multiplier
const urgencyMultiplier = urgency === 'rush' ? 1.5 : urgency === 'expedited' ? 1.25 : 1;

// Calculate costs
const materials = taskData.preferredMaterials || [];
const materialPerUnit = materials.length > 0
  ? materials.reduce((sum, m) => sum + (MATERIAL_COSTS[m.type]?.perUnit || MATERIAL_COSTS.default.perUnit) * (m.quantity?.value || 1), 0)
  : MATERIAL_COSTS.default.perUnit;

const customizationPerUnit = costConfig.baseCost * multiplier;
const laborPerUnit = customizationPerUnit * 0.6;
const packagingPerUnit = 0.30;
const toolingSetupPerUnit = costConfig.setupFee / quantity;

const subtotalPerUnit = (materialPerUnit + customizationPerUnit + laborPerUnit + packagingPerUnit) * quantityDiscounted;
const totalPerUnit = subtotalPerUnit + toolingSetupPerUnit;

// Margin based on urgency
const marginPercent = urgency === 'rush' ? 0.40 : urgency === 'expedited' ? 0.35 : 0.28;
const sellingPricePerUnit = totalPerUnit / (1 - marginPercent);
const totalPrice = sellingPricePerUnit * quantity;
const marginAmount = totalPrice - (totalPerUnit * quantity);

// Timeline
const designDays = urgency === 'rush' ? 2 : urgency === 'expedited' ? 5 : 10;
const samplingDays = urgency === 'rush' ? 3 : urgency === 'expedited' ? 7 : 14;
const productionDays = urgency === 'rush' ? 10 : urgency === 'expedited' ? 20 : 30;

const elapsed = Date.now() - startTime;

const result = {
  task: 'customization-price',
  requestId: taskData.requestId,
  status: 'completed',
  processingTimeMs: elapsed,
  customizationType,
  complexity,
  pricing: {
    quantity: {
      requested: quantity,
      minimumOrder: Math.max(100, Math.min(500, quantity / 10)),
      unit: 'pieces'
    },
    costBreakdown: {
      material: { perUnit: Math.round(materialPerUnit * 100) / 100, total: Math.round(materialPerUnit * quantity * 100) / 100 },
      labor: { perUnit: Math.round(laborPerUnit * 100) / 100, total: Math.round(laborPerUnit * quantity * 100) / 100 },
      tooling: { perUnit: Math.round(toolingSetupPerUnit * 100) / 100, total: costConfig.setupFee },
      packaging: { perUnit: Math.round(packagingPerUnit * 100) / 100, total: Math.round(packagingPerUnit * quantity * 100) / 100 }
    },
    totalPerUnit: Math.round(totalPerUnit * 100) / 100,
    sellingPricePerUnit: Math.round(sellingPricePerUnit * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    margin: {
      percentage: Math.round(marginPercent * 100),
      amount: Math.round(marginAmount * 100) / 100
    },
    currency: 'USD'
  },
  timeline: {
    designPhase: { days: designDays, startOffset: 0 },
    samplingPhase: { days: samplingDays, startOffset: designDays },
    productionPhase: { days: productionDays, startOffset: designDays + samplingDays },
    totalDays: designDays + samplingDays + productionDays
  },
  materialOptions: Object.entries(MATERIAL_COSTS).map(([type, info]) => ({
    type,
    perUnit: info.perUnit,
    description: info.description,
    sustainabilityScore: info.sustainabilityScore
  })),
  urgency,
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString()
};

console.log(JSON.stringify(result, null, 2));
console.log(`[QMe Task] Price estimation completed in ${elapsed}ms — $${result.pricing.sellingPricePerUnit}/unit`);
process.exit(0);
