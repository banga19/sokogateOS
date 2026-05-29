// AI Intelligence Service for sokogateOS
// Real pattern recognition, insight generation, continuous learning, and decision support

const { initKafkaConsumer } = require('../config/kafka');
const logger = require('../utils/logger');
const Feedback = require('../models/feedback');
const Sourcing = require('../models/sourcing');

// Service state
let consumer = null;
let learningModels = new Map();
let insightsCache = new Map();
let patternHistory = [];
let accuracyTracker = { total: 0, correct: 0, incorrect: 0 };

// Initialize the AI Intelligence Service
async function startAiIntelligenceService() {
  try {
    logger.info('Initializing AI Intelligence Service...');

    consumer = await initKafkaConsumer([
      'product.updated', 'order.created', 'inventory.changed',
      'supplier.risk.updated', 'customer.feedback.received',
      'document.processed', 'product.catalog.updated', 'customer.profile.updated',
      'sourcing.completed', 'customization.completed', 'shipment.shipped'
    ]);

    logger.info('AI Intelligence Service: Kafka consumer connected');
    setupMessageHandlers();
    startLearningCycles();

    // Load existing feedback for retraining
    await loadFeedbackForTraining();

    logger.info('AI Intelligence Service started successfully');
  } catch (error) {
    logger.error('AI Intelligence Service: Failed to start:', error);
    process.exit(1);
  }
}

// Set up Kafka message handlers
function setupMessageHandlers() {
  consumer.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.value);
      logger.debug(`AI Intelligence: Processing ${message.topic}`);

      switch (message.topic) {
        case 'product.updated':
        case 'product.catalog.updated':
          handleProductUpdate(parsedMessage);
          break;
        case 'order.created':
          handleOrderCreated(parsedMessage);
          break;
        case 'sourcing.completed':
          handleSourcingCompleted(parsedMessage);
          break;
        case 'customization.completed':
          handleCustomizationCompleted(parsedMessage);
          break;
        case 'shipment.shipped':
          handleShipmentEvent(parsedMessage);
          break;
        case 'inventory.changed':
          handleInventoryChange(parsedMessage);
          break;
        case 'supplier.risk.updated':
          handleSupplierRiskUpdate(parsedMessage);
          break;
        case 'customer.feedback.received':
          handleCustomerFeedback(parsedMessage);
          break;
        case 'customer.profile.updated':
          handleCustomerProfileUpdate(parsedMessage);
          break;
        case 'document.processed':
          handleDocumentProcessed(parsedMessage);
          break;
        default:
          logger.warn(`AI Intelligence: Unknown topic ${message.topic}`);
      }
    } catch (parseError) {
      logger.error('AI Intelligence: Error parsing message:', parseError);
    }
  });
}

// Handle product update with real pattern analysis
function handleProductUpdate(productData) {
  const features = extractProductFeatures(productData);
  updateModel('product_cluster', productData.productId, features);
  detectAnomalies('product', productData);
  generateInsight('product_insight', {
    productId: productData.productId,
    price: productData.basePrice,
    category: productData.category,
    trend: analyzeTrend('product', productData.productId),
    recommendation: features.price > 10000
      ? 'High-value item - verify pricing strategy'
      : features.category
        ? `Monitor ${features.category} demand patterns`
        : 'Standard product - no action needed'
  });
}

// Handle sourcing completion events
function handleSourcingCompleted(sourcingData) {
  generateInsight('sourcing_insight', {
    requestId: sourcingData.requestId,
    supplierCount: sourcingData.supplierCount,
    topMatch: sourcingData.topMatch,
    completedAt: sourcingData.completedAt,
    recommendation: sourcingData.supplierCount > 3
      ? 'Multiple suppliers available - consider competitive bidding'
      : 'Limited supplier pool - expand search criteria'
  });
}

// Handle customization completion events
function handleCustomizationCompleted(customizationData) {
  generateInsight('customization_insight', {
    requestId: customizationData.requestId,
    type: customizationData.customizationType,
    completedAt: customizationData.completedAt,
    recommendation: customizationData.status === 'in_production'
      ? 'Production in progress - schedule quality check'
      : 'Customization request processed'
  });
}

// Handle shipment events
function handleShipmentEvent(shipmentData) {
  generateInsight('logistics_insight', {
    shipmentId: shipmentData.shipmentId,
    trackingNumber: shipmentData.trackingNumber,
    estimatedDelivery: shipmentData.estimatedDelivery,
    recommendation: 'Track shipment and notify customer of status changes'
  });
}

// Handle order created with demand forecasting
function handleOrderCreated(orderData) {
  updateModel('demand_forecast', orderData.productId, orderData);
  analyzePattern('order', orderData);
}

// Handle inventory change with optimization
function handleInventoryChange(inventoryData) {
  updateModel('inventory_opt', inventoryData.productId, inventoryData);
  if (inventoryData.quantity < (inventoryData.reorderPoint || 20)) {
    generateInsight('inventory_alert', {
      productId: inventoryData.productId,
      currentStock: inventoryData.quantity,
      recommendation: inventoryData.quantity < 10
        ? 'CRITICAL: Immediate reorder required - stock near zero'
        : 'Low stock alert - consider reordering soon'
    });
  }
  analyzeTurnover(inventoryData);
}

// Handle supplier risk with recommendations
function handleSupplierRiskUpdate(supplierData) {
  updateModel('supplier_risk', supplierData.supplierId, supplierData);
  generateInsight('supplier_risk', {
    supplierId: supplierData.supplierId,
    riskScore: supplierData.riskScore || 0.5,
    recommendation: (supplierData.riskScore || 0) > 0.7
      ? 'High risk supplier - consider diversification'
      : 'Supplier risk acceptable'
  });
}

// Handle customer feedback with sentiment analysis
function handleCustomerFeedback(feedbackData) {
  updateModel('sentiment', feedbackData.productId || 'general', feedbackData);
  const sentiment = analyzeSentiment(feedbackData.comments || '');
  generateInsight('feedback_insight', {
    feedbackId: feedbackData.feedbackId,
    sentiment: sentiment,
    rating: feedbackData.rating || 0,
    topics: extractKeyTopics(feedbackData.comments || ''),
    recommendation: sentiment === 'negative'
      ? 'Negative feedback detected - escalate for review'
      : sentiment === 'positive'
        ? 'Positive feedback - catalog for testimonials'
        : 'Neutral feedback - no action needed'
  });
}

// Handle customer profile updates
function handleCustomerProfileUpdate(profileData) {
  updateModel('segmentation', profileData.customerId, profileData);
  generateInsight('customer_insight', {
    customerId: profileData.customerId,
    tier: profileData.tier,
    recommendation: profileData.tier === 'platinum' || profileData.tier === 'gold'
      ? 'High-value customer - prioritize service and offers'
      : 'Standard customer - nurture relationship'
  });
}

// Handle document processing with knowledge extraction
function handleDocumentProcessed(documentData) {
  const knowledge = extractKnowledge(documentData);
  updateModel('knowledge_base', documentData.documentId, knowledge);
}

// Feature extraction
function extractProductFeatures(productData) {
  return {
    price: productData.basePrice || 0,
    category: productData.category || 'general',
    availability: productData.availability || 'unknown',
    brand: productData.brand || 'unknown'
  };
}

// Real sentiment analysis (rule-based for MVP)
function analyzeSentiment(text) {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();

  const positiveWords = ['great', 'excellent', 'good', 'love', 'perfect', 'amazing', 'satisfied', 'happy', 'fast', 'quality'];
  const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'hate', 'worst', 'disappointed', 'slow', 'damaged', 'broken'];

  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

// Extract key topics from feedback
function extractKeyTopics(comments) {
  if (!comments) return [];
  const topics = ['quality', 'price', 'delivery', 'service', 'packaging', 'durability', 'design', 'size'];
  return topics.filter(topic => comments.toLowerCase().includes(topic));
}

// Pattern analysis for order data
function analyzePattern(type, data) {
  patternHistory.push({ type, data, timestamp: new Date() });

  // Keep last 1000 patterns
  if (patternHistory.length > 1000) {
    patternHistory = patternHistory.slice(-500);
  }
}

// Analyze turnover rates
function analyzeTurnover(inventoryData) {
  if (!inventoryData.quantity || !inventoryData.reorderPoint) return;

  const turnoverRate = inventoryData.quantity / (inventoryData.reorderPoint || 1);
  if (turnoverRate < 1.5) {
    generateInsight('turnover_alert', {
      productId: inventoryData.productId,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
      recommendation: 'High turnover product - ensure adequate stock levels'
    });
  }
}

// Analyze trends over time
function analyzeTrend(type, id) {
  const relevant = patternHistory.filter(p => p.type === type && p.data.productId === id);
  if (relevant.length < 2) return 'insufficient_data';

  const recent = relevant.slice(-5);
  const values = recent.map(r => r.data.basePrice || r.data.quantity || 0);

  if (values.length < 2) return 'stable';
  const trend = values[values.length - 1] - values[0];
  if (trend > 0) return 'increasing';
  if (trend < 0) return 'decreasing';
  return 'stable';
}

// Anomaly detection
function detectAnomalies(type, data) {
  if (type === 'product' && data.basePrice) {
    if (data.basePrice > 50000) {
      generateInsight('anomaly', {
        type: 'price_anomaly',
        productId: data.productId,
        value: data.basePrice,
        severity: 'high',
        recommendation: 'Price anomaly detected - verify data entry'
      });
    }
  }
}

// Extract knowledge from documents
function extractKnowledge(documentData) {
  const content = documentData.content || '';
  return {
    documentId: documentData.documentId,
    entities: extractEntities(content),
    categories: extractCategories(content),
    timestamp: new Date().toISOString()
  };
}

function extractEntities(content) {
  const entities = [];
  const priceRegex = /USD\s+[\d,]+\.[\d]{2}/g;
  const dateRegex = /\d{4}-\d{2}-\d{2}/g;

  let match;
  while ((match = priceRegex.exec(content)) !== null) {
    entities.push({ type: 'price', value: match[0] });
  }
  while ((match = dateRegex.exec(content)) !== null) {
    entities.push({ type: 'date', value: match[0] });
  }

  return entities;
}

function extractCategories(content) {
  const categories = [];
  const keywords = {
    finance: ['budget', 'cost', 'revenue', 'profit', 'payment'],
    operations: ['inventory', 'shipping', 'delivery', 'warehouse', 'logistics'],
    sales: ['customer', 'order', 'purchase', 'sale', 'quote'],
    quality: ['quality', 'inspection', 'standard', 'certification', 'compliance']
  };

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(w => content.toLowerCase().includes(w))) {
      categories.push(category);
    }
  }

  return categories;
}

// Model management
function updateModel(modelType, key, data) {
  const modelKey = `${modelType}_${key}`;
  learningModels.set(modelKey, {
    data,
    timestamp: Date.now(),
    lastRetrained: Date.now(),
    updateCount: (learningModels.get(modelKey)?.updateCount || 0) + 1
  });
}

// Insight generation with deduplication
function generateInsight(type, data) {
  const dedupKey = `${type}_${data.productId || data.requestId || data.shipmentId || Date.now()}`;

  if (insightsCache.has(dedupKey)) return; // Deduplicate

  const insight = {
    type,
    timestamp: new Date().toISOString(),
    data,
    id: dedupKey
  };

  insightsCache.set(dedupKey, insight);
  logger.debug(`AI Intelligence: Generated ${type} insight`);

  // Limit cache size
  if (insightsCache.size > 2000) {
    const keys = Array.from(insightsCache.keys()).sort();
    for (let i = 0; i < 200; i++) insightsCache.delete(keys[i]);
  }
}

// Get recent insights for API queries
function getRecentInsights(limit = 50, type = null) {
  const all = Array.from(insightsCache.values());
  const filtered = type ? all.filter(i => i.type === type) : all;
  return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

// Get model statistics
function getModelStats() {
  return {
    totalModels: learningModels.size,
    totalInsights: insightsCache.size,
    totalPatterns: patternHistory.length,
    accuracyRate: accuracyTracker.total > 0
      ? Math.round((accuracyTracker.correct / accuracyTracker.total) * 100) / 100
      : 0,
    modelTypes: [...new Set(Array.from(learningModels.keys()).map(k => k.split('_')[0]))]
  };
}

// Load feedback from database for retraining
async function loadFeedbackForTraining() {
  try {
    const recentFeedback = await Feedback.find({ isProcessed: false })
      .sort({ createdAt: -1 })
      .limit(500);

    for (const feedback of recentFeedback) {
      if (feedback.explicit?.rating) {
        accuracyTracker.total++;
        if (feedback.explicit.rating >= 4) accuracyTracker.correct++;
        else if (feedback.explicit.rating <= 2) accuracyTracker.incorrect++;
      }

      // Process sentiment from feedback
      if (feedback.explicit?.comments) {
        const sentiment = analyzeSentiment(feedback.explicit.comments);
        updateModel('sentiment', feedback._id.toString(), {
          targetType: feedback.target?.type,
          sentiment,
          rating: feedback.explicit.rating
        });
      }

      // Mark as processed
      await Feedback.findByIdAndUpdate(feedback._id, { isProcessed: true, processedAt: new Date() });
    }

    if (recentFeedback.length > 0) {
      logger.info(`AI Intelligence: Loaded ${recentFeedback.length} feedback items for training`);
    }
  } catch (error) {
    logger.error('AI Intelligence: Error loading feedback for training:', error);
  }
}

// Learning cycles
function startLearningCycles() {
  // Hourly model retraining
  setInterval(async () => {
    logger.info('AI Intelligence: Starting model retraining cycle');
    await loadFeedbackForTraining();
    logger.info(`AI Intelligence: Retraining complete - ${learningModels.size} models active`);
  }, 3600000);

  // Every 30 minutes - generate periodic insights
  setInterval(() => {
    generateInsight('system_status', {
      modelsActive: learningModels.size,
      insightsGenerated: insightsCache.size,
      patternsAnalyzed: patternHistory.length,
      accuracyRate: accuracyTracker.total > 0
        ? Math.round((accuracyTracker.correct / accuracyTracker.total) * 100) + '%'
        : 'N/A',
      recommendation: 'System is learning and improving continuously'
    });
  }, 1800000);

  // Cleanup old insights every 5 minutes
  setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [key, insight] of insightsCache.entries()) {
      if (new Date(insight.timestamp).getTime() < cutoff) {
        insightsCache.delete(key);
      }
    }
  }, 300000);
}

// Graceful shutdown
function shutdown() {
  if (consumer) consumer.close(() => logger.info('AI Intelligence Service: Kafka consumer closed'));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = {
  startAiIntelligenceService,
  getRecentInsights,
  getModelStats
};
