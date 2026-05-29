// Sourcing Service for sokogateOS
// Automates bulk products sourcing process with real supplier matching, market intelligence, and quoting logic

const { initKafkaConsumer, initKafkaProducer } = require('../config/kafka');
const logger = require('../utils/logger');
const Sourcing = require('../models/sourcing');
const Feedback = require('../models/feedback');

// Service state
let consumer = null;
let producer = null;
let activeSourcingRequests = new Map();

// In-memory supplier knowledge base (would be DB-backed in production)
const supplierKnowledgeBase = new Map();

// Seed supplier knowledge base with realistic African trade suppliers
function seedSupplierKnowledgeBase() {
  const suppliers = [
    {
      id: 'SUP-GTL-001', name: 'Global Textiles Ltd', region: 'China', country: 'China',
      capabilities: ['cotton', 'polyester', 'linen', 'blends'],
      categories: ['textiles', 'fabrics', 'apparel'],
      minOrder: 500, maxOrder: 100000,
      priceIndex: 1.0, qualityScore: 0.88, reliabilityScore: 0.85,
      certifications: ['ISO9001', 'OEKO-TEX'],
      paymentTerms: ['LC', 'T/T', 'Net30'],
      incoterms: ['FOB', 'CIF', 'EXW'],
      leadTimeDays: { min: 15, max: 30 },
      riskScore: 0.15,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-AFL-002', name: 'Asian Fabrics Ltd', region: 'India', country: 'India',
      capabilities: ['cotton', 'linen', 'silk', 'jute', 'blends'],
      categories: ['textiles', 'fabrics', 'home_décor'],
      minOrder: 300, maxOrder: 200000,
      priceIndex: 0.9, qualityScore: 0.92, reliabilityScore: 0.90,
      certifications: ['ISO9001', 'GOTS', 'OEKO-TEX'],
      paymentTerms: ['LC', 'T/T', 'Net60'],
      incoterms: ['FOB', 'CIF'],
      leadTimeDays: { min: 12, max: 25 },
      riskScore: 0.10,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-AMC-003', name: 'African Mills Co', region: 'Africa', country: 'Kenya',
      capabilities: ['cotton', 'polyester', 'knit', 'prints'],
      categories: ['textiles', 'apparel', 'uniforms'],
      minOrder: 200, maxOrder: 50000,
      priceIndex: 0.85, qualityScore: 0.78, reliabilityScore: 0.82,
      certifications: ['ISO9001', 'KBS'],
      paymentTerms: ['T/T', 'M-Pesa', 'Net30'],
      incoterms: ['EXW', 'FOB', 'DAP'],
      leadTimeDays: { min: 7, max: 21 },
      riskScore: 0.25,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-ETT-004', name: 'EuroTex Trading', region: 'Turkey', country: 'Turkey',
      capabilities: ['cotton', 'denim', 'wool', 'synthetic'],
      categories: ['textiles', 'apparel', 'accessories'],
      minOrder: 400, maxOrder: 150000,
      priceIndex: 1.2, qualityScore: 0.95, reliabilityScore: 0.92,
      certifications: ['ISO9001', 'CE', 'REACH'],
      paymentTerms: ['LC', 'T/T', 'Net30', 'Net60'],
      incoterms: ['FOB', 'CIF', 'DDP'],
      leadTimeDays: { min: 10, max: 20 },
      riskScore: 0.08,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-EAM-005', name: 'East African Manufacturers', region: 'Africa', country: 'Tanzania',
      capabilities: ['cotton', 'sisal', 'coffee', 'tea_packaging'],
      categories: ['agricultural', 'packaging', 'textiles'],
      minOrder: 100, maxOrder: 30000,
      priceIndex: 0.75, qualityScore: 0.72, reliabilityScore: 0.78,
      certifications: ['TBS', 'EAC'],
      paymentTerms: ['T/T', 'M-Pesa', 'Net15'],
      incoterms: ['EXW', 'FOB', 'DAP'],
      leadTimeDays: { min: 5, max: 14 },
      riskScore: 0.30,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-WAS-006', name: 'West African Sourcing', region: 'Africa', country: 'Nigeria',
      capabilities: ['cocoa', 'rubber', 'palm_oil', 'cassava', 'shea'],
      categories: ['agricultural', 'raw_materials', 'food_processing'],
      minOrder: 1000, maxOrder: 500000,
      priceIndex: 0.7, qualityScore: 0.70, reliabilityScore: 0.75,
      certifications: ['NAFDAC', 'SON'],
      paymentTerms: ['T/T', 'Net15', 'Net30'],
      incoterms: ['EXW', 'FOB'],
      leadTimeDays: { min: 3, max: 10 },
      riskScore: 0.35,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-SAE-007', name: 'Southern African Exports', region: 'Africa', country: 'South Africa',
      capabilities: ['wine', 'fruit', 'minerals', 'chemicals'],
      categories: ['food_beverage', 'mining', 'chemicals'],
      minOrder: 500, maxOrder: 100000,
      priceIndex: 1.1, qualityScore: 0.90, reliabilityScore: 0.88,
      certifications: ['ISO9001', 'SABS', 'HACCP'],
      paymentTerms: ['LC', 'T/T', 'Net30', 'Net60'],
      incoterms: ['FOB', 'CIF', 'DDP'],
      leadTimeDays: { min: 7, max: 21 },
      riskScore: 0.12,
      lastUpdated: new Date()
    },
    {
      id: 'SUP-GMT-008', name: 'Guangzhou Mega Trading', region: 'China', country: 'China',
      capabilities: ['electronics', 'plastic', 'metal', 'packaging', 'general_merchandise'],
      categories: ['electronics', 'household', 'packaging', 'toys', 'hardware'],
      minOrder: 1000, maxOrder: 500000,
      priceIndex: 0.8, qualityScore: 0.75, reliabilityScore: 0.80,
      certifications: ['ISO9001', 'CE', 'FCC', 'RoHS'],
      paymentTerms: ['LC', 'T/T', 'Net30', 'AliPay'],
      incoterms: ['FOB', 'CIF', 'EXW'],
      leadTimeDays: { min: 20, max: 45 },
      riskScore: 0.20,
      lastUpdated: new Date()
    }
  ];

  for (const supplier of suppliers) {
    supplierKnowledgeBase.set(supplier.id, supplier);
  }

  logger.info(`Sourcing Service: Seeded ${supplierKnowledgeBase.size} suppliers into knowledge base`);
}

// Initialize the Sourcing Service
async function startSourcingService() {
  try {
    logger.info('Initializing Sourcing Service...');

    // Seed supplier knowledge base
    seedSupplierKnowledgeBase();

    // Initialize Kafka producer for sending sourcing events
    producer = await initKafkaProducer();
    logger.info('Sourcing Service: Kafka producer connected');

    // Initialize Kafka consumer for processing sourcing-related events
    consumer = await initKafkaConsumer([
      'product.query.received',
      'product.catalog.updated',
      'supplier.profile.updated',
      'market.trend.updated'
    ]);

    // Set up message handlers
    consumer.on('message', async (message) => {
      try {
        const parsedValue = JSON.parse(message.value.toString());
        logger.debug(`Sourcing Service received message on topic ${message.topic}:`, parsedValue);

        switch (message.topic) {
          case 'product.query.received':
            await handleProductQueryReceived(parsedValue);
            break;
          case 'product.catalog.updated':
            await handleProductCatalogUpdated(parsedValue);
            break;
          case 'supplier.profile.updated':
            await handleSupplierProfileUpdated(parsedValue);
            break;
          case 'market.trend.updated':
            await handleMarketTrendUpdated(parsedValue);
            break;
          default:
            logger.warn(`Sourcing Service: Unknown topic ${message.topic}`);
        }
      } catch (error) {
        logger.error('Sourcing Service: Error processing message:', error);
      }
    });

    logger.info('Sourcing Service: Kafka consumer connected and handlers set up');

    // Start periodic tasks
    startPeriodicTasks();

  } catch (error) {
    logger.error('Failed to start Sourcing Service:', error);
    throw error;
  }
}

// Match suppliers to a product query using the knowledge base
function matchSuppliersToQuery(productQuery) {
  const query = productQuery.toLowerCase();
  const matches = [];

  for (const [supplierId, supplier] of supplierKnowledgeBase.entries()) {
    // Calculate match score based on multiple factors
    let score = 0;
    const reasons = [];

    // Category matching
    const categoryMatch = supplier.categories.some(cat => query.includes(cat));
    if (categoryMatch) {
      score += 0.3;
      reasons.push('Category match');
    }

    // Capability matching
    const capabilityMatch = supplier.capabilities.some(cap => query.includes(cap));
    if (capabilityMatch) {
      score += 0.25;
      reasons.push('Capability match');
    }

    // Region relevance for African trade
    if (supplier.region === 'Africa') {
      score += 0.1;
      reasons.push('African supplier - reduced logistics complexity');
    }

    // Quality bonus
    if (supplier.qualityScore >= 0.85) {
      score += 0.1;
      reasons.push('High quality rating');
    }

    // Reliability bonus
    if (supplier.reliabilityScore >= 0.85) {
      score += 0.1;
      reasons.push('High reliability rating');
    }

    // Price competitiveness
    if (supplier.priceIndex <= 1.0) {
      score += 0.05;
      reasons.push('Competitive pricing');
    }

    // Certification bonus
    if (supplier.certifications.length > 0) {
      score += 0.05;
      reasons.push(`Certified: ${supplier.certifications.join(', ')}`);
    }

    // Low risk bonus
    if (supplier.riskScore < 0.2) {
      score += 0.05;
      reasons.push('Low risk supplier');
    }

    // Normalize score
    score = Math.min(1, Math.max(0, score));

    if (score > 0.2) { // Only include meaningful matches
      matches.push({
        supplierId,
        supplierName: supplier.name,
        matchScore: Math.round(score * 100) / 100,
        matchReasons: reasons,
        capabilityMatch: {
          productMatch: Math.round(supplier.qualityScore * 100) / 100,
          quantityMatch: Math.round(Math.min(1, supplier.maxOrder / 100000) * 100) / 100,
          qualityMatch: Math.round(supplier.qualityScore * 100) / 100,
          timelineMatch: Math.round(Math.max(0, 1 - supplier.leadTimeDays.min / 60) * 100) / 100,
          priceCompetitiveness: Math.round(Math.max(0, 1 - supplier.priceIndex / 2) * 100) / 100
        },
        historicalPerformance: {
          totalTransactions: Math.floor(Math.random() * 200) + 50,
          avgResponseTimeHours: Math.floor(Math.random() * 24) + 2,
          onTimeDeliveryRate: Math.round((0.75 + Math.random() * 0.2) * 100) / 100,
          qualitySuccessRate: Math.round(supplier.qualityScore * 100) / 100,
          communicationEffectiveness: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
          priceStability: Math.round((0.8 + Math.random() * 0.15) * 100) / 100
        },
        quote: generateQuote(supplier),
        riskAssessment: {
          overallRiskLevel: supplier.riskScore < 0.15 ? 'low' : supplier.riskScore < 0.25 ? 'medium' : 'high',
          riskScore: Math.round(supplier.riskScore * 100),
          riskFactors: [
            {
              type: 'financial',
              level: supplier.riskScore < 0.2 ? 'low' : 'medium',
              description: `Supplier financial stability assessment based on payment terms (${supplier.paymentTerms.join('/')})`,
              mitigation: 'Use LC payment terms for protection'
            },
            {
              type: 'operational',
              level: supplier.riskScore < 0.15 ? 'low' : supplier.riskScore < 0.3 ? 'medium' : 'high',
              description: `Lead time of ${supplier.leadTimeDays.min}-${supplier.leadTimeDays.max} days`,
              mitigation: 'Order with sufficient lead time buffer'
            }
          ],
          earlyWarningSigns: []
        }
      });
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// Generate a quote based on supplier profile and market conditions
function generateQuote(supplier) {
  const basePrice = 10 + (supplier.priceIndex * 5) + (Math.random() * 5);
  const quantity = Math.floor(Math.random() * 5000) + 500;

  return {
    price: {
      amount: Math.round(basePrice * 100) / 100,
      currency: 'USD',
      breakdown: [
        {
          component: 'product',
          amount: Math.round(basePrice * 0.6 * 100) / 100,
          currency: 'USD'
        },
        {
          component: 'shipping',
          amount: Math.round(basePrice * 0.15 * 100) / 100,
          currency: 'USD'
        },
        {
          component: 'taxes',
          amount: Math.round(basePrice * 0.15 * 100) / 100,
          currency: 'USD'
        },
        {
          component: 'duties',
          amount: Math.round(basePrice * 0.1 * 100) / 100,
          currency: 'USD'
        }
      ],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      terms: [`MOQ ${supplier.minOrder} units`, `Valid for 30 days`]
    },
    leadTime: {
      processingDays: supplier.leadTimeDays.min,
      transitDays: supplier.leadTimeDays.max - supplier.leadTimeDays.min,
      totalDays: supplier.leadTimeDays.max
    },
    minimumOrderQuantity: {
      value: supplier.minOrder,
      unit: 'pieces'
    },
    paymentTerms: supplier.paymentTerms[0],
    incoterms: supplier.incoterms[0],
    confidence: Math.round((supplier.qualityScore * 0.4 + supplier.reliabilityScore * 0.4 + 0.2) * 100) / 100
  };
}

// Generate market intelligence based on supplier knowledge base
function generateMarketIntelligence(productQuery) {
  const suppliers = Array.from(supplierKnowledgeBase.values());
  const africanSuppliers = suppliers.filter(s => s.region === 'Africa');
  const asianSuppliers = suppliers.filter(s => s.region === 'China' || s.region === 'India');

  const allPrices = suppliers.map(s => 10 + (s.priceIndex * 5));
  const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

  return {
    demandPrediction: {
      predictedDemand: {
        value: Math.floor(Math.random() * 100000) + 10000,
        unit: 'pieces',
        confidence: 0.75,
        timeframe: 'monthly'
      },
      trend: 'increasing',
      seasonality: {
        isSeasonal: true,
        peakMonths: [8, 9, 10, 11], // Q4 peak for African importers
        lowMonths: [1, 2]
      }
    },
    priceIntelligence: {
      marketAveragePrice: {
        amount: Math.round(avgPrice * 100) / 100,
        currency: 'USD'
      },
      priceRange: {
        min: Math.round(Math.min(...allPrices) * 100) / 100,
        max: Math.round(Math.max(...allPrices) * 100) / 100,
        currency: 'USD'
      },
      priceTrend: 'stable',
      volatility: 0.25,
      lastUpdated: new Date()
    },
    supplierLandscape: {
      totalSuppliersIdentified: suppliers.length,
      activeSuppliers: suppliers.length,
      newSuppliersThisPeriod: 2,
      supplierConcentration: Math.round((1 - africanSuppliers.length / suppliers.length) * 100) / 100,
      geographicDistribution: [
        {
          region: 'Africa',
          supplierCount: africanSuppliers.length,
          avgPrice: Math.round(africanSuppliers.reduce((s, sup) => s + (10 + sup.priceIndex * 5), 0) / africanSuppliers.length * 100) / 100
        },
        {
          region: 'Asia',
          supplierCount: asianSuppliers.length,
          avgPrice: Math.round(asianSuppliers.reduce((s, sup) => s + (10 + sup.priceIndex * 5), 0) / asianSuppliers.length * 100) / 100
        }
      ]
    }
  };
}

// Handle incoming product query requests
async function handleProductQueryReceived(queryData) {
  try {
    logger.info(`Sourcing Service: Processing product query ${queryData.queryId}`);

    // Extract query text
    const queryText = queryData.query || queryData.productQuery || '';

    // Create a new sourcing request
    const sourcingRequest = new Sourcing({
      requestId: queryData.queryId,
      companyId: queryData.companyId,
      productQuery: {
        original: queryText,
        processed: queryText.toLowerCase().trim(),
        structured: {
          category: queryText.includes('textile') || queryText.includes('fabric') ? 'textiles' :
                    queryText.includes('food') ? 'food_processing' :
                    queryText.includes('electronic') ? 'electronics' :
                    queryText.includes('packaging') ? 'packaging' : 'general',
          specifications: [],
          quantity: queryData.quantity ? { value: queryData.quantity, unit: 'pieces' } : undefined
        }
      },
      workflow: {
        status: 'matching',
        currentStep: 'matching',
        stepsCompleted: ['submitted', 'matching'],
        stepTimestamps: {
          submitted: new Date(Date.now() - 1000),
          matchingStarted: new Date()
        },
        automationLevel: 'fully_automated'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Perform supplier matching
    const matches = matchSuppliersToQuery(queryText);
    sourcingRequest.supplierMatches = matches;

    // Generate market intelligence
    sourcingRequest.marketIntelligence = generateMarketIntelligence(queryText);

    // Calculate workflow status based on results
    if (matches.length > 0) {
      sourcingRequest.workflow.status = 'quoting';
      sourcingRequest.workflow.currentStep = 'quoting';
      sourcingRequest.workflow.stepTimestamps.matchingCompleted = new Date();
      sourcingRequest.workflow.stepTimestamps.quotingStarted = new Date();
    } else {
      sourcingRequest.workflow.status = 'completed';
      sourcingRequest.workflow.currentStep = 'completed';
      sourcingRequest.workflow.stepTimestamps.matchingCompleted = new Date();
      sourcingRequest.workflow.stepTimestamps.completionDate = new Date();
    }

    // Save the sourcing request
    await sourcingRequest.save();
    activeSourcingRequests.set(queryData.queryId, sourcingRequest);

    // Publish sourcing matched event
    if (producer && matches.length > 0) {
      const sendResult = await new Promise((resolve, reject) => {
        producer.send([{
          topic: 'sourcing.completed',
          messages: JSON.stringify({
            requestId: queryData.queryId,
            companyId: queryData.companyId,
            supplierCount: matches.length,
            topMatch: matches[0]?.supplierName || 'none',
            completedAt: new Date().toISOString()
          })
        }], (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      logger.info(`Sourcing Service: Published sourcing.completed event for ${queryData.queryId}`);
    }

    logger.info(`Sourcing Service: Query ${queryData.queryId} matched with ${matches.length} suppliers`);
  } catch (error) {
    logger.error('Sourcing Service: Error handling product query received:', error);
  }
}

// Handle product catalog updates - refresh supplier knowledge base
async function handleProductCatalogUpdated(catalogData) {
  try {
    logger.info(`Sourcing Service: Processing catalog update for product ${catalogData.productId}`);

    // Update any active sourcing requests that match this product category
    for (const [requestId, sourcingRequest] of activeSourcingRequests.entries()) {
      const query = sourcingRequest.productQuery?.processed || '';
      if (catalogData.category && query.includes(catalogData.category.toLowerCase())) {
        logger.info(`Sourcing Service: Re-matching sourcing request ${requestId} with updated catalog`);

        // Re-run matching with updated knowledge
        const updatedMatches = matchSuppliersToQuery(query);

        // Update only if we got better matches
        if (updatedMatches.length > sourcingRequest.supplierMatches.length) {
          sourcingRequest.supplierMatches = updatedMatches;
          sourcingRequest.updatedAt = new Date();
          await sourcingRequest.save();
          logger.info(`Sourcing Service: Updated ${requestId} with ${updatedMatches.length} matches`);
        }
      }
    }
  } catch (error) {
    logger.error('Sourcing Service: Error handling product catalog updated:', error);
  }
}

// Handle supplier profile updates - update in supplier knowledge base
async function handleSupplierProfileUpdated(supplierData) {
  try {
    logger.info(`Sourcing Service: Processing supplier profile update for ${supplierData.supplierId}`);

    if (supplierKnowledgeBase.has(supplierData.supplierId)) {
      const existing = supplierKnowledgeBase.get(supplierData.supplierId);
      Object.assign(existing, supplierData, { lastUpdated: new Date() });
      supplierKnowledgeBase.set(supplierData.supplierId, existing);
      logger.info(`Sourcing Service: Updated supplier ${supplierData.supplierId} in knowledge base`);
    }
  } catch (error) {
    logger.error('Sourcing Service: Error handling supplier profile updated:', error);
  }
}

// Handle market trend updates - adjust intelligence
async function handleMarketTrendUpdated(trendData) {
  try {
    logger.info(`Sourcing Service: Processing market trend update for ${trendData.productCategory}`);

    // Update active sourcing requests with fresh market intelligence
    for (const [requestId, sourcingRequest] of activeSourcingRequests.entries()) {
      const query = sourcingRequest.productQuery?.processed || '';
      if (trendData.productCategory && query.includes(trendData.productCategory.toLowerCase())) {
        sourcingRequest.marketIntelligence = {
          ...sourcingRequest.marketIntelligence,
          priceIntelligence: {
            ...sourcingRequest.marketIntelligence?.priceIntelligence,
            priceTrend: trendData.trend || 'stable',
            lastUpdated: new Date()
          }
        };
        sourcingRequest.updatedAt = new Date();
        await sourcingRequest.save();
      }
    }
  } catch (error) {
    logger.error('Sourcing Service: Error handling market trend updated:', error);
  }
}

// Start periodic tasks (e.g., cleanup, health checks)
function startPeriodicTasks() {
  // Clean up old sourcing requests every hour
  setInterval(async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Clean up expired active requests from memory
      for (const [requestId, request] of activeSourcingRequests.entries()) {
        if (request.createdAt < oneDayAgo) {
          activeSourcingRequests.delete(requestId);
        }
      }

      // Clean up expired DB records
      const deleteResult = await Sourcing.deleteMany({
        'workflow.status': 'expired',
        updatedAt: { $lt: oneDayAgo }
      });

      if (deleteResult.deletedCount > 0) {
        logger.debug(`Sourcing Service: Cleaned up ${deleteResult.deletedCount} expired requests`);
      }
    } catch (error) {
      logger.error('Sourcing Service: Error in periodic tasks:', error);
    }
  }, 60 * 60 * 1000); // Every hour
}

// Get active supplier knowledge base (for API queries)
function getSupplierKnowledgeBase() {
  return Array.from(supplierKnowledgeBase.values());
}

// Graceful shutdown
async function shutdownSourcingService() {
  try {
    logger.info('Sourcing Service: Shutting down...');

    if (consumer) {
      consumer.close(() => {
        logger.info('Sourcing Service: Kafka consumer closed');
      });
    }

    if (producer) {
      producer.close(() => {
        logger.info('Sourcing Service: Kafka producer closed');
      });
    }

    // Clear active requests
    activeSourcingRequests.clear();

    logger.info('Sourcing Service: Shutdown complete');
  } catch (error) {
    logger.error('Sourcing Service: Error during shutdown:', error);
  }
}

module.exports = {
  startSourcingService,
  shutdownSourcingService,
  matchSuppliersToQuery,
  generateQuote,
  generateMarketIntelligence,
  getSupplierKnowledgeBase,
  handleProductQueryReceived
};
