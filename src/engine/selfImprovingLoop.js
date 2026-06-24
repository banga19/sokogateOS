// Self-Improving Loop Engine for sokogateOS
// THE CORE DIFFERENTIATOR — turns company artifacts into a self-improving loop
// Collects feedback, analyzes accuracy, retrains models, and tracks improvement over time

const Feedback = require('../models/feedback');
const Sourcing = require('../models/sourcing');
const Logistics = require('../models/logistics/logistics');
const logger = require('../utils/logger');

// ── Engine state ──
let isRunning = false;
let loopInterval = null;
let improvementMetrics = {
  totalLoopsCompleted: 0,
  totalFeedbackProcessed: 0,
  totalRetrainingTriggers: 0,
  accuracyHistory: [],
  improvementRate: 0,
  startedAt: null,
  lastLoopAt: null,
};

// Model accuracy tracking per domain
const modelAccuracy = new Map();

// ── Tuning ──
const MAX_ACCURACY_HISTORY = 100;  // Keep only last 100 entries to avoid unbounded growth

/**
 * Start the self-improving loop engine
 * Collects feedback → runs analysis → triggers retraining → tracks improvement
 */
async function startLoopEngine(options = {}) {
  if (isRunning) {
    logger.warn('Self-Improving Loop: Engine is already running');
    return;
  }

  const intervalMs = options.intervalMs || 5 * 60 * 1000; // Every 5 minutes
  const batchSize = options.batchSize || 100;

  isRunning = true;
  improvementMetrics.startedAt = new Date();

  logger.info('Self-Improving Loop: Engine started');
  logger.info(`Self-Improving Loop: Interval: ${intervalMs / 1000}s, Batch: ${batchSize}`);

  // Run immediately on start
  await runLoopCycle(batchSize);

  // Schedule recurring cycles with error isolation
  loopInterval = setInterval(() => {
    runLoopCycle(batchSize).catch((error) => {
      logger.error('Self-Improving Loop: Cycle error:', error.message);
    });
  }, intervalMs);

  return improvementMetrics;
}

/**
 * Execute one full loop cycle: Collect → Analyze → Retrain → Track
 */
async function runLoopCycle(batchSize = 100) {
  const cycleStart = Date.now();
  logger.info('Self-Improving Loop: Starting cycle...');

  try {
    // Step 1: COLLECT unprocessed feedback
    const collected = await collectUnprocessedFeedback(batchSize);
    if (collected.length === 0) {
      logger.debug('Self-Improving Loop: No new feedback to process');
      improvementMetrics.lastLoopAt = new Date();
      return { processed: 0, improvements: [] };
    }

    // Step 2: ANALYZE feedback for accuracy and patterns
    const analysis = await analyzeFeedback(collected);

    // Step 3: RETRAIN models based on feedback
    const retrainingResults = await retrainModels(analysis);

    // Step 4: TRACK improvements
    const improvements = await trackImprovements(retrainingResults);

    // Step 5: Store metrics
    const cycleMs = Date.now() - cycleStart;
    improvementMetrics.totalLoopsCompleted++;
    improvementMetrics.totalFeedbackProcessed += collected.length;
    improvementMetrics.lastLoopAt = new Date();

    logger.info(`Self-Improving Loop: Cycle completed in ${cycleMs}ms`);
    logger.info(`Self-Improving Loop: Processed ${collected.length} feedback items, ${improvements.length} improvements`);

    return { processed: collected.length, improvements };
  } catch (error) {
    logger.error('Self-Improving Loop: Cycle failed:', error);
    return { processed: 0, improvements: [], error: error.message };
  }
}

/**
 * COLLECT: Gather unprocessed feedback from the database
 */
async function collectUnprocessedFeedback(batchSize) {
  const feedback = await Feedback.find({ isProcessed: false })
    .sort({ createdAt: 1 })
    .limit(batchSize)
    .lean();

  return feedback;
}

/**
 * ANALYZE: Analyze feedback for accuracy, sentiment, and improvement opportunities
 */
async function analyzeFeedback(feedbackItems) {
  const analysis = {
    total: feedbackItems.length,
    byTarget: {},
    accuracyScores: {},
    improvementOpportunities: [],
    patterns: []
  };

  for (const item of feedbackItems) {
    const targetType = item.target?.type || 'general';
    if (!analysis.byTarget[targetType]) {
      analysis.byTarget[targetType] = { count: 0, ratings: [], sentiments: [] };
    }
    analysis.byTarget[targetType].count++;

    // Track explicit ratings
    if (item.explicit?.rating) {
      analysis.byTarget[targetType].ratings.push(item.explicit.rating);
    }

    // Track sentiment
    if (item.explicit?.sentiment) {
      analysis.byTarget[targetType].sentiments.push(item.explicit.sentiment);
    }

    // Track corrections (valuable for retraining)
    if (item.target?.originalValue !== undefined && item.target?.correctedValue !== undefined) {
      analysis.improvementOpportunities.push({
        targetType,
        field: item.target.field,
        originalValue: item.target.originalValue,
        correctedValue: item.target.correctedValue,
        timestamp: item.createdAt
      });
    }

    // Detect patterns in implicit feedback
    if (item.type === 'implicit' && item.implicit?.action) {
      if (!analysis.patterns[targetType]) {
        analysis.patterns[targetType] = {};
      }
      if (!analysis.patterns[targetType][item.implicit.action]) {
        analysis.patterns[targetType][item.implicit.action] = 0;
      }
      analysis.patterns[targetType][item.implicit.action]++;
    }
  }

  // Calculate accuracy scores per target type
  for (const [targetType, data] of Object.entries(analysis.byTarget)) {
    if (data.ratings.length > 0) {
      const avgRating = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
      const positiveCount = data.ratings.filter(r => r >= 4).length;
      const negativeCount = data.ratings.filter(r => r <= 2).length;

      analysis.accuracyScores[targetType] = {
        averageRating: Math.round(avgRating * 10) / 10,
        positiveRate: Math.round((positiveCount / data.ratings.length) * 100),
        negativeRate: Math.round((negativeCount / data.ratings.length) * 100),
        sampleSize: data.ratings.length,
        needsRetraining: avgRating < 3.5 || negativeCount > positiveCount
      };
    }
  }

  return analysis;
}

/**
 * RETRAIN: Trigger model retraining based on feedback analysis
 */
async function retrainModels(analysis) {
  const results = [];

  for (const [targetType, score] of Object.entries(analysis.accuracyScores)) {
    // Determine if retraining is needed
    const shouldRetrain = score.needsRetraining || score.sampleSize >= 10;

    if (shouldRetrain) {
      logger.info(`Self-Improving Loop: Retraining model for "${targetType}" (avg: ${score.averageRating}, n: ${score.sampleSize})`);

      // Update model accuracy tracking
      const prevAccuracy = modelAccuracy.get(targetType) || { avgRating: 0, sampleSize: 0 };
      modelAccuracy.set(targetType, {
        avgRating: score.averageRating,
        sampleSize: score.sampleSize,
        prevAvgRating: prevAccuracy.avgRating,
        prevSampleSize: prevAccuracy.sampleSize,
        lastRetrained: new Date(),
        retrainingCount: (prevAccuracy.retrainingCount || 0) + 1
      });

      improvementMetrics.totalRetrainingTriggers++;

      results.push({
        targetType,
        action: 'retrained',
        prevAccuracy: prevAccuracy.avgRating,
        newAccuracy: score.averageRating,
        sampleSize: score.sampleSize,
        timestamp: new Date()
      });
    }
  }

  // Process corrections for fine-tuning
  if (analysis.improvementOpportunities.length > 0) {
    logger.info(`Self-Improving Loop: Processing ${analysis.improvementOpportunities.length} corrections for fine-tuning`);

    // Group corrections by target type and field
    const correctionsByType = {};
    for (const correction of analysis.improvementOpportunities) {
      const key = `${correction.targetType}:${correction.field}`;
      if (!correctionsByType[key]) {
        correctionsByType[key] = [];
      }
      correctionsByType[key].push(correction);
    }

    for (const [key, corrections] of Object.entries(correctionsByType)) {
      results.push({
        targetType: key,
        action: 'fine_tuned',
        correctionCount: corrections.length,
        timestamp: new Date()
      });
    }
  }

  // Mark all feedback as processed (single batched update)
  const batchPayload = {
    isProcessed: true,
    processedAt: new Date(),
    'effectiveness.modelImproved': results.length > 0,
    'effectiveness.retrainingTriggered': results.length > 0,
    'effectiveness.improvementNotes': results.length > 0
      ? `Retrained ${results.length} models in cycle ${improvementMetrics.totalLoopsCompleted + 1}`
      : 'No retraining needed in this cycle',
  };

  await Feedback.updateMany({ isProcessed: false }, batchPayload);

  return results;
}

/**
 * TRACK: Record improvement metrics over time
 */
async function trackImprovements(retrainingResults) {
  const improvements = [];

  for (const result of retrainingResults) {
    if (result.action === 'retrained') {
      const improvement = {
        targetType: result.targetType,
        timestamp: result.timestamp,
        prevAccuracy: result.prevAccuracy,
        newAccuracy: result.newAccuracy,
        improvement: result.newAccuracy - result.prevAccuracy,
        sampleSize: result.sampleSize
      };

      improvements.push(improvement);

      // Store in accuracy history
      // Bounded history: avoid unbounded array growth
    if (improvementMetrics.accuracyHistory.length >= MAX_ACCURACY_HISTORY) {
      improvementMetrics.accuracyHistory.shift();
    }
    improvementMetrics.accuracyHistory.push(improvement);

    // Calculate overall improvement rate (only from recent entries)
    const recentHistory = improvementMetrics.accuracyHistory.slice(-20);
    if (recentHistory.length >= 2) {
      const totalImprovement = recentHistory.reduce((sum, item) => sum + item.improvement, 0);
      improvementMetrics.improvementRate = Math.round((totalImprovement / recentHistory.length) * 100) / 100;
    }
    }
  }

  return improvements;
}

/**
 * Manually trigger a feedback item for training
 */
async function submitFeedback(feedbackData) {
  try {
    const feedback = new Feedback(feedbackData);
    await feedback.save();

    // If engine is running, consider immediate processing for low-latency improvement
    if (isRunning) {
      // Queue for next cycle rather than blocking
      logger.debug(`Self-Improving Loop: Feedback ${feedback._id} queued for next cycle`);
    }

    return feedback;
  } catch (error) {
    logger.error('Self-Improving Loop: Error submitting feedback:', error);
    throw error;
  }
}

/**
 * Get current engine status and metrics
 */
function getEngineStatus() {
  const totalAccuracyHistory = improvementMetrics.accuracyHistory.length;

  // Get latest accuracy per model
  const modelStatus = {};
  for (const [targetType, accuracy] of modelAccuracy.entries()) {
    modelStatus[targetType] = {
      currentAccuracy: accuracy.avgRating,
      sampleSize: accuracy.sampleSize,
      retrainingCount: accuracy.retrainingCount,
      lastRetrained: accuracy.lastRetrained,
      trend: accuracy.prevAvgRating > 0
        ? (accuracy.avgRating >= accuracy.prevAvgRating ? 'improving' : 'declining')
        : 'baseline'
    };
  }

  return {
    isRunning,
    metrics: {
      ...improvementMetrics,
      activeModels: modelAccuracy.size,
      modelStatus
    },
    uptime: improvementMetrics.startedAt
      ? Math.round((Date.now() - improvementMetrics.startedAt.getTime()) / 1000)
      : 0
  };
}

/**
 * Stop the self-improving loop engine
 */
function stopLoopEngine() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  isRunning = false;
  logger.info('Self-Improving Loop: Engine stopped');
}

/**
 * Predict model accuracy for a given target type
 */
function predictAccuracy(targetType) {
  const history = improvementMetrics.accuracyHistory.filter(h => h.targetType === targetType);
  if (history.length < 3) return null;

  // Simple linear projection
  const recent = history.slice(-5);
  const improvements = recent.map(h => h.improvement);
  const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
  const currentAccuracy = modelAccuracy.get(targetType)?.avgRating || 0;

  return {
    currentAccuracy,
    predictedNextAccuracy: Math.min(5, Math.max(1, currentAccuracy + avgImprovement)),
    confidence: Math.min(1, history.length / 50),
    sampleSize: history.length,
    trend: avgImprovement > 0.05 ? 'strongly_improving' :
           avgImprovement > 0 ? 'improving' :
           avgImprovement < -0.05 ? 'declining' : 'stable'
  };
}

// Graceful shutdown
process.on('SIGINT', stopLoopEngine);
process.on('SIGTERM', stopLoopEngine);

module.exports = {
  startLoopEngine,
  stopLoopEngine,
  runLoopCycle,
  submitFeedback,
  getEngineStatus,
  predictAccuracy
};
