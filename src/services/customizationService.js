// Customization Service for sokogateOS
// Handles product customization requests with real design workflow, material selection, pricing, and production tracking

const { initKafkaConsumer, initKafkaProducer } = require('../config/kafka');
const logger = require('../utils/logger');
const Customization = require('../models/customization');

// Service state
let consumer = null;
let producer = null;
let activeCustomizations = new Map();

// Intrinsic cost database for customization types
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

// Initialize the Customization Service
async function startCustomizationService() {
  try {
    logger.info('Initializing Customization Service...');

    // Initialize Kafka producer for sending customization events
    producer = await initKafkaProducer();
    logger.info('Customization Service: Kafka producer connected');

    // Initialize Kafka consumer for processing customization-related events
    consumer = await initKafkaConsumer([
      'customization.requested',
      'design.approved',
      'specification.updated',
      'material.selected',
      'pricing.updated',
      'production.ready'
    ]);

    // Set up message handlers
    consumer.on('message', async (message) => {
      try {
        const parsedValue = JSON.parse(message.value.toString());
        logger.debug(`Customization Service received message on topic ${message.topic}:`, parsedValue);

        switch (message.topic) {
          case 'customization.requested':
            await handleCustomizationRequested(parsedValue);
            break;
          case 'design.approved':
            await handleDesignApproved(parsedValue);
            break;
          case 'specification.updated':
            await handleSpecificationUpdated(parsedValue);
            break;
          case 'material.selected':
            await handleMaterialSelected(parsedValue);
            break;
          case 'pricing.updated':
            await handlePricingUpdated(parsedValue);
            break;
          case 'production.ready':
            await handleProductionReady(parsedValue);
            break;
          default:
            logger.warn(`Customization Service: Unknown topic ${message.topic}`);
        }
      } catch (error) {
        logger.error('Customization Service: Error processing message:', error);
      }
    });

    logger.info('Customization Service: Kafka consumer connected and handlers set up');

    // Start periodic tasks
    startPeriodicTasks();

  } catch (error) {
    logger.error('Failed to start Customization Service:', error);
    throw error;
  }
}

// Calculate pricing for a customization request
function calculatePricing(customizationType, specifications, quantity, materials, urgency) {
  const costConfig = COST_DATABASE[customizationType] || COST_DATABASE.default;
  const complexity = specifications?.branding?.logo?.method === 'embroidery' ? 'high' :
                     specifications?.modifications?.length > 3 ? 'high' :
                     specifications?.modifications?.length > 0 ? 'medium' : 'low';
  const multiplier = costConfig.complexityMultiplier[complexity] || 1;
  const quantityDiscounted = quantity > 10000 ? 0.6 : quantity > 5000 ? 0.7 : quantity > 1000 ? 0.8 : 1;
  const urgencyMultiplier = urgency === 'rush' ? 1.5 : urgency === 'expedited' ? 1.25 : 1;

  const designDays = urgency === 'rush' ? 2 : urgency === 'expedited' ? 5 : 10;
  const samplingDays = urgency === 'rush' ? 3 : urgency === 'expedited' ? 7 : 14;
  const productionDays = urgency === 'rush' ? 10 : urgency === 'expedited' ? 20 : 30;

  // Calculate per-unit costs
  const materialPerUnit = (materials || []).reduce((sum, m) => {
    const matCost = MATERIAL_COSTS[m.type] || MATERIAL_COSTS.default;
    return sum + (matCost.perUnit * (m.quantity?.value || 1));
  }, 0) || MATERIAL_COSTS[specifications?.branding?.logo?.method]?.perUnit || COST_DATABASE.default.baseCost;

  const customizationPerUnit = costConfig.baseCost * multiplier;
  const laborPerUnit = customizationPerUnit * 0.6;
  const packagingPerUnit = 0.30;
  const toolingSetupPerUnit = costConfig.setupFee / quantity;

  const subtotalPerUnit = (materialPerUnit + customizationPerUnit + laborPerUnit + packagingPerUnit) * quantityDiscounted;
  const totalPerUnit = subtotalPerUnit + toolingSetupPerUnit;
  const totalSetupCost = costConfig.setupFee;

  // Selling price with margin
  const marginPercent = urgency === 'rush' ? 0.40 : urgency === 'expedited' ? 0.35 : 0.28;
  const sellingPricePerUnit = totalPerUnit / (1 - marginPercent);
  const totalPrice = sellingPricePerUnit * quantity;
  const marginAmount = totalPrice - (totalPerUnit * quantity);

  return {
    quantity: {
      requested: { value: quantity, unit: 'pieces' },
      minimumOrder: { value: Math.max(100, Math.min(500, quantity / 10)), unit: 'pieces' }
    },
    costBreakdown: [
      {
        component: 'material',
        description: 'Raw materials for production',
        perUnit: { amount: Math.round(materialPerUnit * 100) / 100, currency: 'USD' },
        total: { amount: Math.round(materialPerUnit * quantity * 100) / 100, currency: 'USD' }
      },
      {
        component: 'labor',
        description: 'Manufacturing labor cost',
        perUnit: { amount: Math.round(laborPerUnit * 100) / 100, currency: 'USD' },
        total: { amount: Math.round(laborPerUnit * quantity * 100) / 100, currency: 'USD' }
      },
      {
        component: 'tooling',
        description: 'Setup and tooling (amortized)',
        perUnit: { amount: Math.round(toolingSetupPerUnit * 100) / 100, currency: 'USD' },
        total: { amount: Math.round(totalSetupCost * 100) / 100, currency: 'USD' }
      },
      {
        component: 'packaging',
        description: 'Custom packaging',
        perUnit: { amount: Math.round(packagingPerUnit * 100) / 100, currency: 'USD' },
        total: { amount: Math.round(packagingPerUnit * quantity * 100) / 100, currency: 'USD' }
      },
      {
        component: 'profit_margin',
        description: `Margin (${Math.round(marginPercent * 100)}%)`,
        perUnit: { amount: Math.round((sellingPricePerUnit - totalPerUnit) * 100) / 100, currency: 'USD' },
        total: { amount: Math.round(marginAmount * 100) / 100, currency: 'USD' }
      }
    ],
    totalCost: {
      perUnit: { amount: Math.round(totalPerUnit * 100) / 100, currency: 'USD' },
      total: { amount: Math.round(totalPerUnit * quantity * 100) / 100, currency: 'USD' }
    },
    sellingPrice: {
      perUnit: { amount: Math.round(sellingPricePerUnit * 100) / 100, currency: 'USD' },
      total: { amount: Math.round(totalPrice * 100) / 100, currency: 'USD' }
    },
    targetPrice: {
      amount: Math.round(sellingPricePerUnit * 100) / 100,
      currency: 'USD'
    },
    margin: {
      percentage: Math.round(marginPercent * 100),
      amount: Math.round(marginAmount * 100) / 100,
      currency: 'USD'
    },
    paymentTerms: 'deposit_balance',
    depositPercentage: 50,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    currency: 'USD'
  };
}

// Generate production timeline
function generateTimeline(urgency) {
  const designDays = urgency === 'rush' ? 2 : urgency === 'expedited' ? 5 : 10;
  const samplingDays = urgency === 'rush' ? 3 : urgency === 'expedited' ? 7 : 14;
  const productionDays = urgency === 'rush' ? 10 : urgency === 'expedited' ? 20 : 30;
  const totalDays = designDays + samplingDays + productionDays;
  const now = new Date();

  return {
    designPhase: {
      startDate: now,
      endDate: new Date(now.getTime() + designDays * 86400000),
      durationDays: designDays
    },
    samplingPhase: {
      startDate: new Date(now.getTime() + designDays * 86400000),
      endDate: new Date(now.getTime() + (designDays + samplingDays) * 86400000),
      durationDays: samplingDays,
      sampleRequested: true
    },
    productionPhase: {
      startDate: new Date(now.getTime() + (designDays + samplingDays) * 86400000),
      endDate: new Date(now.getTime() + totalDays * 86400000),
      durationDays: productionDays,
      estimatedCompletion: new Date(now.getTime() + totalDays * 86400000)
    },
    totalEstimatedDays: totalDays,
    bufferDays: Math.round(totalDays * 0.15),
    urgency: urgency || 'standard'
  };
}

// Handle incoming customization requests
async function handleCustomizationRequested(customizationData) {
  try {
    logger.info(`Customization Service: Processing customization request ${customizationData.requestId}`);

    const quantity = customizationData.quantity || 1000;
    const urgency = customizationData.urgency || 'standard';

    // Calculate pricing
    const pricing = calculatePricing(
      customizationData.customizationType,
      customizationData.specifications,
      quantity,
      customizationData.preferredMaterials,
      urgency
    );

    // Generate timeline
    const timeline = generateTimeline(urgency);

    // Create a new customization request with real data
    const customization = new Customization({
      requestId: customizationData.requestId,
      productId: customizationData.productId,
      companyId: customizationData.companyId,
      customizationType: customizationData.customizationType,
      specifications: customizationData.specifications || {},
      quantity: quantity,
      pricing: pricing,
      productionTimeline: timeline,
      workflow: {
        status: 'design_review',
        currentStep: 'design_review',
        stepsCompleted: ['draft', 'briefing', 'design_review'],
        stepTimestamps: {
          drafted: new Date(Date.now() - 3000),
          briefed: new Date(Date.now() - 2000),
          designReviewed: new Date()
        },
        automationLevel: 'semi_automated'
      },
      design: {
        files: customizationData.designFiles || [],
        currentVersion: 0,
        status: customizationData.designFiles?.length > 0 ? 'pending_approval' : 'not_started'
      },
      materials: (customizationData.preferredMaterials || []).map(m => ({
        ...MATERIAL_COSTS[m.type] || MATERIAL_COSTS.default,
        ...m,
        isSelected: false
      })),
      sampling: {
        required: true,
        status: 'not_requested'
      },
      qualityControl: {
        status: 'pending'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await customization.save();
    activeCustomizations.set(customizationData.requestId, customization);

    // Publish customization priced event
    if (producer) {
      await new Promise((resolve, reject) => {
        producer.send([{
          topic: 'pricing.updated',
          messages: JSON.stringify({
            requestId: customizationData.requestId,
            totalCost: pricing.totalCost.total.amount,
            perUnit: pricing.totalCost.perUnit.amount,
            timeline: timeline.totalEstimatedDays,
            currency: 'USD'
          })
        }], (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      logger.info(`Customization Service: Published pricing for ${customizationData.requestId}`);
    }

    logger.info(`Customization Service: Customization ${customizationData.requestId} created with pricing $${pricing.sellingPrice.perUnit.amount}/unit`);

  } catch (error) {
    logger.error('Customization Service: Error handling customization requested:', error);
  }
}

// Handle design approved messages
async function handleDesignApproved(designData) {
  try {
    logger.info(`Customization Service: Processing design approval for ${designData.requestId}`);

    const customization = await Customization.findOne({ requestId: designData.requestId });
    if (!customization) {
      logger.warn(`Customization Service: Request ${designData.requestId} not found for design approval`);
      return;
    }

    customization.design.status = 'approved';
    customization.design.approvedBy = designData.approvedBy;
    customization.design.approvedAt = new Date();
    customization.workflow.status = 'material_selection';
    customization.workflow.currentStep = 'material_selection';
    customization.workflow.stepsCompleted.push('material_selection');
    customization.workflow.stepTimestamps.designReviewed = new Date();
    customization.updatedAt = new Date();

    await customization.save();
    logger.info(`Customization Service: Design approved for ${designData.requestId}`);
  } catch (error) {
    logger.error('Customization Service: Error handling design approved:', error);
  }
}

// Handle specification updated messages
async function handleSpecificationUpdated(specData) {
  try {
    logger.info(`Customization Service: Processing specification update for ${specData.requestId}`);

    const customization = await Customization.findOne({ requestId: specData.requestId });
    if (!customization) {
      logger.warn(`Customization Service: Request ${specData.requestId} not found for spec update`);
      return;
    }

    customization.specifications = { ...customization.specifications, ...specData.specifications };
    customization.workflow.stepsCompleted.push('specification');
    customization.updatedAt = new Date();

    await customization.save();
    logger.info(`Customization Service: Specifications updated for ${specData.requestId}`);
  } catch (error) {
    logger.error('Customization Service: Error handling specification updated:', error);
  }
}

// Handle material selected messages
async function handleMaterialSelected(materialData) {
  try {
    logger.info(`Customization Service: Processing material selection for ${materialData.requestId}`);

    const customization = await Customization.findOne({ requestId: materialData.requestId });
    if (!customization) {
      logger.warn(`Customization Service: Request ${materialData.requestId} not found for material selection`);
      return;
    }

    // Mark selected material
    if (materialData.materialId) {
      customization.materials = customization.materials.map(m => ({
        ...m,
        isSelected: m._id.toString() === materialData.materialId
      }));
    }

    customization.workflow.status = 'pricing';
    customization.workflow.currentStep = 'pricing';
    customization.workflow.stepsCompleted.push('pricing');
    customization.workflow.stepTimestamps.materialSelected = new Date();
    customization.updatedAt = new Date();

    await customization.save();
    logger.info(`Customization Service: Material selected for ${materialData.requestId}`);
  } catch (error) {
    logger.error('Customization Service: Error handling material selected:', error);
  }
}

// Handle pricing updated messages
async function handlePricingUpdated(pricingData) {
  try {
    logger.info(`Customization Service: Processing pricing update for ${pricingData.requestId}`);

    const customization = await Customization.findOne({ requestId: pricingData.requestId });
    if (!customization) {
      logger.warn(`Customization Service: Request ${pricingData.requestId} not found for pricing`);
      return;
    }

    // Recalculate pricing with any updated parameters
    const updatedPricing = calculatePricing(
      customization.customizationType,
      customization.specifications,
      customization.pricing?.quantity?.requested?.value || 1000,
      customization.materials.filter(m => m.isSelected),
      customization.productionTimeline?.urgency || 'standard'
    );

    customization.pricing = updatedPricing;
    customization.workflow.status = 'sampling';
    customization.workflow.currentStep = 'sampling';
    customization.workflow.stepsCompleted.push('sampling');
    customization.workflow.stepTimestamps.priced = new Date();
    customization.updatedAt = new Date();

    await customization.save();
    logger.info(`Customization Service: Pricing finalized for ${pricingData.requestId}`);
  } catch (error) {
    logger.error('Customization Service: Error handling pricing updated:', error);
  }
}

// Handle production ready messages
async function handleProductionReady(productionData) {
  try {
    logger.info(`Customization Service: Processing production ready for ${productionData.requestId}`);

    const customization = await Customization.findOne({ requestId: productionData.requestId });
    if (!customization) {
      logger.warn(`Customization Service: Request ${productionData.requestId} not found for production`);
      return;
    }

    customization.workflow.status = 'production';
    customization.workflow.currentStep = 'production';
    customization.workflow.stepsCompleted.push('production');
    customization.workflow.stepTimestamps.productionStarted = new Date();
    customization.productionTimeline.productionPhase.startDate = new Date();
    customization.sampling.status = 'approved';
    customization.qualityControl.status = 'in_progress';
    customization.updatedAt = new Date();

    await customization.save();

    // Publish production started event
    if (producer) {
      await new Promise((resolve, reject) => {
        producer.send([{
          topic: 'customization.completed',
          messages: JSON.stringify({
            requestId: productionData.requestId,
            status: 'in_production',
            estimatedCompletion: customization.productionTimeline.productionPhase.estimatedCompletion,
            startedAt: new Date().toISOString()
          })
        }], (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    }

    logger.info(`Customization Service: Production started for ${productionData.requestId}`);
  } catch (error) {
    logger.error('Customization Service: Error handling production ready:', error);
  }
}

// Start periodic tasks
function startPeriodicTasks() {
  setInterval(async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Clean up expired active customizations from memory
      for (const [requestId, customization] of activeCustomizations.entries()) {
        if (customization.createdAt < oneDayAgo) {
          activeCustomizations.delete(requestId);
        }
      }

      // Archive old completed customizations
      const archiveResult = await Customization.updateMany({
        'workflow.status': 'completed',
        updatedAt: { $lt: oneDayAgo }
      }, {
        isActive: false
      });

      if (archiveResult.modifiedCount > 0) {
        logger.debug(`Customization Service: Archived ${archiveResult.modifiedCount} old customizations`);
      }
    } catch (error) {
      logger.error('Customization Service: Error in periodic tasks:', error);
    }
  }, 60 * 60 * 1000);
}

// Graceful shutdown
async function shutdownCustomizationService() {
  try {
    logger.info('Customization Service: Shutting down...');

    if (consumer) {
      consumer.close(() => {
        logger.info('Customization Service: Kafka consumer closed');
      });
    }

    if (producer) {
      producer.close(() => {
        logger.info('Customization Service: Kafka producer closed');
      });
    }

    activeCustomizations.clear();
    logger.info('Customization Service: Shutdown complete');
  } catch (error) {
    logger.error('Customization Service: Error during shutdown:', error);
  }
}

module.exports = {
  startCustomizationService,
  shutdownCustomizationService,
  calculatePricing,
  generateTimeline
};
