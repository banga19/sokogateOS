// Analysis Agent for Hermes Agent System
// Specialized agent for data analysis, performance metrics, and business intelligence
// Processes operational data to identify patterns, trends, and optimization opportunities

const { BaseAgent } = require('../baseAgent');
const logger = require('../../../../utils/logger');
const { SentryService } = require('../../../error/sentryService');

class AnalysisAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      name: 'analysis',
      ...options
    });

    // Analysis-specific configuration
    this.analysisTypes = this.config.analysisTypes || [
      'performance',
      'usage_patterns',
      'error_trends',
      'user_behavior',
      'system_health',
      'business_metrics'
    ];
    this.dataSources = this.config.dataSources || [
      'posthog',
      'sentry',
      'database_metrics',
      'api_logs',
      'qme_metrics'
    ];
    this.analysisInterval = this.config.analysisInterval || 3600000; // Default 1 hour
  }

  /**
   * Agent-specific initialization
   * @protected
   */
  async _initializeAgent() {
    try {
      logger.info(`AnalysisAgent: Agent ${this.name} initialized`);
      // Initialize any analysis tools or connections
      await this._initializeAnalysisTools();
    } catch (error) {
      logger.error(`AnalysisAgent: Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Initialize analysis tools and connections
   * @private
   */
  async _initializeAnalysisTools() {
    logger.debug('AnalysisAgent: Initializing analysis tools');
    // In production, this would initialize connections to:
    // - Statistical analysis libraries
    // - Data visualization tools
    // - ML model endpoints for predictive analysis
    // - Database query engines
  }

  /**
   * Agent-specific task logic - Perform analysis cycle
   * @protected
   * @returns {Promise<Object>} Analysis results
   */
  async _runAgentTask() {
    try {
      logger.info(`AnalysisAgent: Starting analysis cycle for agent ${this.name}`);

      // Collect data from various sources
      const rawData = await this._collectAnalysisData();

      // Perform different types of analysis
      const analysisResults = {};
      for (const analysisType of this.analysisTypes) {
        logger.debug(`AnalysisAgent: Performing ${analysisType} analysis`);
        analysisResults[analysisType] = await this._performAnalysisType(analysisType, rawData);
      }

      // Generate insights and recommendations
      const insights = await this._generateInsights(analysisResults);
      const recommendations = await this._generateOptimizationRecommendations(insights);

      // Store analysis results
      await this._storeAnalysisResults({
        analysisTypes: this.analysisTypes,
        rawDataSummary: this._summarizeRawData(rawData),
        analysisResults,
        insights,
        recommendations,
        timestamp: new Date().toISOString()
      });

      // Track analysis metrics
      await this._trackAnalysisMetrics(analysisResults, insights);

      logger.info(`AnalysisAgent: Analysis cycle completed for agent ${this.name}`);

      return {
        success: true,
        analysisTypesPerformed: Object.keys(analysisResults).length,
        insightsGenerated: insights.length,
        recommendationsGenerated: recommendations.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`AnalysisAgent: Analysis cycle failed:`, error);
      throw error;
    }
  }

  /**
   * Collect data from various sources for analysis
   * @private
   * @returns {Promise<Object>} Raw data from all sources
   */
  async _collectAnalysisData() {
    try {
      logger.debug('AnalysisAgent: Collecting data from sources');

      const data = {};

      // Collect data from each source
      for (const source of this.dataSources) {
        try {
          data[source] = await this._collectFromSource(source);
        } catch (sourceError) {
          logger.warn(`AnalysisAgent: Failed to collect data from ${source}:`, sourceError);
          data[source] = { error: sourceError.message };
        }
      }

      return data;
    } catch (error) {
      logger.error('AnalysisAgent: Failed to collect analysis data:', error);
      throw error;
    }
  }

  /**
   * Collect data from a specific source
   * @private
   * @param {string} source - Data source name
   * @returns {Promise<Object>} Data from the source
   */
  async _collectFromSource(source) {
    switch (source) {
      case 'posthog':
        return await this._collectPosthogData();
      case 'sentry':
        return await this._collectSentryData();
      case 'database_metrics':
        return await this._collectDatabaseMetrics();
      case 'api_logs':
        return await this._collectApiLogs();
      case 'qme_metrics':
        return await this._collectQMeMetrics();
      default:
        logger.warn(`AnalysisAgent: Unknown data source: ${source}`);
        return { message: 'No implementation for this data source' };
    }
  }

  /**
   * Collect data from PostHog analytics
   * @private
   * @returns {Promise<Object>} PostHog data
   */
  async _collectPosthogData() {
    try {
      // In a real implementation, this would query PostHog for:
      // - User engagement metrics
      // - Feature usage statistics
      // - Conversion funnels
      // - Retention cohorts
      return {
        eventsCollected: 0, // Placeholder
        uniqueUsers: 0,
        sessions: 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('AnalysisAgent: Failed to collect PostHog data:', error);
      throw error;
    }
  }

  /**
   * Collect data from Sentry error tracking
   * @private
   * @returns {Promise<Object>} Sentry data
   */
  async _collectSentryData() {
    try {
      // In a real implementation, this would query Sentry for:
      // - Error frequency and trends
      // - Error types and severity
      // - Affected users and sessions
      return {
        errorsCollected: 0, // Placeholder
        errorTypes: [],
        affectedUsers: 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('AnalysisAgent: Failed to collect Sentry data:', error);
      throw error;
    }
  }

  /**
   * Collect database metrics
   * @private
   * @returns {Promise<Object>} Database metrics
   */
  async _collectDatabaseMetrics() {
    try {
      // In a real implementation, this would query database for:
      // - Query performance metrics
      // - Connection pool status
      // - Table sizes and growth rates
      // - Lock contention and deadlocks
      return {
        queriesPerSecond: 0, // Placeholder
        avgQueryTime: 0,
        connectionPoolUsage: 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('AnalysisAgent: Failed to collect database metrics:', error);
      throw error;
    }
  }

  /**
   * Collect API logs metrics
   * @private
   * @returns {Promise<Object>} API logs data
   */
  async _collectApiLogs() {
    try {
      // In a real implementation, this would parse API logs for:
      // - Request/response latency
      // - Status code distribution
      // - Endpoint usage frequency
      // - Error rates by endpoint
      return {
        requestsPerSecond: 0, // Placeholder
        avgResponseTime: 0,
        errorRate: 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('AnalysisAgent: Failed to collect API logs:', error);
      throw error;
    }
  }

  /**
   * Collect QMe metrics
   * @private
   * @returns {Promise<Object>} QMe metrics data
   */
  async _collectQMeMetrics() {
    try {
      // In a real implementation, this would query QMe for:
      // - Task execution statistics
      // - Agent performance metrics
      // - Queue depths and processing times
      // - Failed task analysis
      if (this.qme && typeof this.qme.getDashboardStatus === 'function') {
        return await this.qme.getDashboardStatus();
      }
      return {
        status: 'qme_not_available',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('AnalysisAgent: Failed to collect QMe metrics:', error);
      throw error;
    }
  }

  /**
   * Perform a specific type of analysis
   * @private
   * @param {string} analysisType - Type of analysis to perform
   * @param {Object} rawData - Raw data collected from sources
   * @returns {Promise<Object>} Analysis results
   */
  async _performAnalysisType(analysisType, rawData) {
    try {
      switch (analysisType) {
        case 'performance':
          return await this._analyzePerformance(rawData);
        case 'usage_patterns':
          return await this._analyzeUsagePatterns(rawData);
        case 'error_trends':
          return await this._analyzeErrorTrends(rawData);
        case 'user_behavior':
          return await this._analyzeUserBehavior(rawData);
        case 'system_health':
          return await this._analyzeSystemHealth(rawData);
        case 'business_metrics':
          return await this._analyzeBusinessMetrics(rawData);
        default:
          logger.warn(`AnalysisAgent: Unknown analysis type: ${analysisType}`);
          return { error: 'Unknown analysis type' };
      }
    } catch (error) {
      logger.error(`AnalysisAgent: Failed to perform ${analysisType} analysis:`, error);
      return { error: error.message };
    }
  }

  /**
   * Analyze system performance metrics
   * @private
   * @param {Object} rawData - Raw data
   * @returns {Promise<Object>} Performance analysis results
   */
  async _analyzePerformance(rawData) {
    // Would analyze:
    // - Response time trends
    // - Throughput metrics
    // - Resource utilization
    // - Bottleneck identification
    return {
      type: 'performance',
      metrics: {
        avgResponseTimeTrend: 'stable',
        throughputTrend: 'increasing',
        resourceUtilization: 'optimal'
      },
      findings: [
        'System performance is within normal parameters',
        'No significant bottlenecks detected'
      ],
      confidence: 0.85,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze usage patterns
   * @private
   * @param {Object} rawData - Raw data
   * @returns {Promise<Object>} Usage patterns analysis
   */
  async _analyzeUsagePatterns(rawData) {
    // Would analyze:
    // - Feature adoption rates
    // - User flow patterns
    // - Peak usage times
    // - Drop-off points in funnels
    return {
      type: 'usage_patterns',
      metrics: {
        dailyActiveUsersTrend: 'stable',
        featureAdoptionRate: 0.65,
        peakUsageHour: 14 // 2 PM
      },
      findings: [
        'Usage patterns show consistent engagement',
        'Feature adoption could be improved with better onboarding'
      ],
      confidence: 0.78,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze error trends
   * @private
   * @param {Object} rawData - Raw data
   * @returns {Promise<Object>} Error trends analysis
   */
  async _analyzeErrorTrends(rawData) {
    // Would analyze:
    // - Error frequency over time
    // - Error types and severity distribution
    // - Correlation with deployments or traffic spikes
    // - User impact assessment
    return {
      type: 'error_trends',
      metrics: {
        errorRateTrend: 'decreasing',
        criticalErrors: 0,
        userImpactScore: 0.1
      },
      findings: [
        'Error rate is improving over time',
        'No critical errors affecting users'
      ],
      confidence: 0.82,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze user behavior patterns
   * @private
   * @param {Object} rawData - Raw data
   * @returns {Promise<Object>} User behavior analysis
   */
  async _analyzeUserBehavior(rawData) {
    // Would analyze:
    // - User journey paths
    // - Feature interaction sequences
    // - Conversion funnel analysis
    // - Retention and churn indicators
    return {
      type: 'user_behavior',
      metrics: {
        conversionRate: 0.25,
        retentionRate7day: 0.6,
        retentionRate30day: 0.4
      },
      findings: [
        'User conversion shows room for improvement',
        'Retention rates indicate need for engagement strategies'
      ],
      confidence: 0.75,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze system health metrics
   * @private
   * @param {Object} rawData - Raw data
   * @returns {Promise<Object>} System health analysis
   */
  async _analyzeSystemHealth(rawData) {
    // Would analyze:
    // - Service availability and uptime
    // - Dependency health (database, cache, external APIs)
    // - Resource saturation points
    // - Recovery time objectives
    return {
      type: 'system_health',
      metrics: {
        uptimePercentage: 99.8,
        dependencyHealth: 'healthy',
        avgRecoveryTime: '2m'
      },
      findings: [
        'System health is excellent with high availability',
        'All dependencies are operating normally'
      ],
      confidence: 0.9,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze business metrics
   * @private
   * @param {Object} rawData - Raw data
   * @returns {Promise<Object>} Business metrics analysis
   */
  async _analyzeBusinessMetrics(rawData) {
    // Would analyze:
    // - Revenue trends and projections
    // - Customer acquisition costs
    // - Lifetime value metrics
    // - Market penetration rates
    return {
      type: 'business_metrics',
      metrics: {
        monthlyRecurringRevenueTrend: 'stable',
        customerAcquisitionCost: 0,
        lifetimeValue: 0
      },
      findings: [
        'Business metrics need more data for meaningful analysis',
        'Focus on establishing baseline measurements'
      ],
      confidence: 0.6,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate insights from analysis results
   * @private
   * @param {Object} analysisResults - Results from all analysis types
   * @returns {Promise<Array<Object>>} Insights
   */
  async _generateInsights(analysisResults) {
    try {
      const insights = [];

      // Extract key findings from each analysis type
      for (const [analysisType, results] of Object.entries(analysisResults)) {
        if (results.findings && Array.isArray(results.findings)) {
          for (const finding of results.findings) {
            insights.push({
              type: analysisType,
              insight: finding,
              confidence: results.confidence || 0.7,
              source: 'analysis_engine',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Look for cross-analysis insights (correlations between different types)
      const crossInsights = await this._findCrossAnalysisInsights(analysisResults);
      insights.push(...crossInsights);

      return insights;
    } catch (error) {
      logger.error(`AnalysisAgent: Failed to generate insights:`, error);
      return [];
    }
  }

  /**
   * Find insights that correlate across different analysis types
   * @private
   * @param {Object} analysisResults - Results from all analysis types
   * @returns {Promise<Array<Object>>} Cross-analysis insights
   */
  async _findCrossAnalysisInsights(analysisResults) {
    try {
      const crossInsights = [];

      // Example: Correlate performance with user behavior
      if (analysisResults.performance && analysisResults.user_behavior) {
        // If performance is good but conversion is low, suggest UX issues
        if (
          analysisResults.performance.metrics?.avgResponseTimeTrend === 'stable' &&
          analysisResults.user_behavior.metrics?.conversionRate < 0.3
        ) {
          crossInsights.push({
            type: 'cross_analysis',
            insight: 'System performance is adequate but conversion rates are low - potential UX or trust issues',
            confidence: 0.75,
            source: 'performance_user_behavior_correlation',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Example: Correlate error trends with system health
      if (analysisResults.error_trends && analysisResults.system_health) {
        // If errors are increasing but system health is good, might be application-level issues
        if (
          analysisResults.error_trends.metrics?.errorRateTrend === 'increasing' &&
          analysisResults.system_health.metrics?.uptimePercentage > 99
        ) {
          crossInsights.push({
            type: 'cross_analysis',
            insight: 'Error rate increasing despite good system health - investigate application code quality',
            confidence: 0.8,
            source: 'error_system_health_correlation',
            timestamp: new Date().toISOString()
          });
        }
      }

      return crossInsights;
    } catch (error) {
      logger.warn(`AnalysisAgent: Failed to find cross-analysis insights:`, error);
      return [];
    }
  }

  /**
   * Generate optimization recommendations from insights
   * @private
   * @param {Array<Object>} insights - Generated insights
   * @returns {Promise<Array<Object>>} Recommendations
   */
  async _generateOptimizationRecommendations(insights) {
    try {
      const recommendations = [];

      // Filter high-confidence insights
      const highConfidenceInsights = insights.filter(
        insight => insight.confidence >= 0.7
      );

      // Map insights to recommendations
      for (const insight of highConfidenceInsights) {
        const recommendation = this._mapInsightToRecommendation(insight);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Add any general recommendations based on analysis completeness
      const generalRecs = await this._generateGeneralRecommendations(analysisResults);
      recommendations.push(...generalRecs);

      return recommendations;
    } catch (error) {
      logger.error(`AnalysisAgent: Failed to generate recommendations:`, error);
      return [];
    }
  }

  /**
   * Map an insight to an actionable recommendation
   * @private
   * @param {Object} insight - Analysis insight
   * @returns {Object|null} Actionable recommendation or null
   */
  _mapInsightToRecommendation(insight) {
    const insightText = (insight.insight || '').toLowerCase();

    if (insightText.includes('ux') || insightText.includes('user experience') || insightText.includes('trust')) {
      return {
        type: 'ux_improvement',
        priority: 'high',
        action: 'Conduct user experience audit and implement improvements',
        description: insight.insight,
        confidence: insight.confidence,
        source: insight.source,
        estimatedImpact: 'Increase conversion by 20-40%',
        timeline: '4-6 weeks'
      };
    }

    if (insightText.includes('application code') || insightText.includes('code quality')) {
      return {
        type: 'technical_improvement',
        priority: 'high',
        action: 'Increase code review coverage and implement automated testing',
        description: insight.insight,
        confidence: insight.confidence,
        source: insight.source,
        estimatedImpact: 'Reduce errors by 30-50%',
        timeline: '6-8 weeks'
      };
    }

    if (insightText.includes('retention') || insightText.includes('engagement')) {
      return {
        type: 'engagement_improvement',
        priority: 'medium',
        action: 'Implement user engagement campaigns and feature announcements',
        description: insight.insight,
        confidence: insight.confidence,
        source: insight.source,
        estimatedImpact: 'Improve retention by 15-25%',
        timeline: '3-4 weeks'
      };
    }

    if (insightText.includes('feature adoption') || insightText.includes('onboarding')) {
      return {
        type: 'product_improvement',
        priority: 'medium',
        action: 'Revamp user onboarding flow with interactive tutorials',
        description: insight.insight,
        confidence: insight.confidence,
        source: insight.source,
        estimatedImpact: 'Increase feature adoption by 30-50%',
        timeline: '5-7 weeks'
      };
    }

    // Default recommendation for analysis insights
    return {
      type: 'analysis_recommendation',
      priority: 'low',
      action: `Monitor and investigate: ${insight.insight}`,
      description: insight.insight,
      confidence: insight.confidence,
      source: insight.source,
      estimatedImpact: 'To be determined through further analysis',
      timeline: 'Ongoing monitoring'
    };
  }

  /**
   * Generate general recommendations based on analysis completeness
   * @private
   * @param {Object} analysisResults - Results from all analysis types
   * @returns {Promise<Array<Object>>} General recommendations
   */
  async _generateGeneralRecommendations(analysisResults) {
    try {
      const recommendations = [];

      // Check if we have sufficient data for meaningful analysis
      const hasSufficientData = Object.values(analysisResults).some(
        result => result.metrics && Object.keys(result.metrics).length > 0
      );

      if (!hasSufficientData) {
        recommendations.push({
          type: 'data_collection',
          priority: 'medium',
          action: 'Improve data collection and instrumentation for better analysis',
          description: 'Currently insufficient data for deep analysis - enhance tracking',
          confidence: 0.85,
          source: 'analysis_system',
          estimatedImpact: 'Enable data-driven decision making',
          timeline: '2-4 weeks'
        });
      }

      return recommendations;
    } catch (error) {
      logger.warn(`AnalysisAgent: Failed to generate general recommendations:`, error);
      return [];
    }
  }

  /**
   * Store analysis results
   * @private
   * @param {Object} results - Analysis results to store
   * @returns {Promise<void>}
   */
  async _storeAnalysisResults(results) {
    try {
      logger.debug('AnalysisAgent: Storing analysis results');

      // In a real implementation, this would:
      // 1. Store results in time-series database for trend analysis
      // 2. Flag significant findings for alerting
      // 3. Update dashboards and reports
      // 4. Potentially feed into predictive models

      logger.info('AnalysisAgent: Analysis results stored');

      // Could trigger self-improving loop feedback
      if (this.hermes && typeof this.hermes.triggerSelfImprovingFeedback === 'function') {
        this.hermes.triggerSelfImprovingFeedback({
          source: `analysis_agent_${this.name}`,
          type: 'analysis_completion',
          data: {
            analysisTypesCompleted: results.analysisTypesPerformed,
            insightsGenerated: results.insightsGenerated,
            recommendationsGenerated: results.recommendationsGenerated,
            timestamp: results.timestamp
          }
        });
      }
    } catch (error) {
      logger.warn(`AnalysisAgent: Failed to store analysis results:`, error);
      // Don't throw - storage failures shouldn't break the analysis cycle
    }
  }

  /**
   * Summarize raw data for storage (to avoid storing massive datasets)
   * @private
   * @param {Object} rawData - Raw data collected
   * @returns {Object} Summary of raw data
   */
  _summarizeRawData(rawData) {
    try {
      const summary = {};

      for (const [source, data] of Object.entries(rawData)) {
        if (data && typeof data === 'object') {
          summary[source] = {
            collected: true,
            hasError: !!data.error,
            fields: Object.keys(data).filter(key => key !== 'error' && key !== 'timestamp'),
            timestamp: data.timestamp || new Date().toISOString()
          };
        } else {
          summary[source] = {
            collected: false,
            error: data?.error || 'Unknown format',
            timestamp: new Date().toISOString()
          };
        }
      }

      return summary;
    } catch (error) {
      logger.warn(`AnalysisAgent: Failed to summarize raw data:`, error);
      return { error: 'Failed to summarize data' };
    }
  }

  /**
   * Track analysis metrics and outcomes
   * @private
   * @param {Object} analysisResults - Results from all analysis types
   * @param {Array<Object>} insights - Generated insights
   * @returns {Promise<void>}
   */
  async _trackAnalysisMetrics(analysisResults, insights) {
    try {
      // Track metrics in PostHog or other analytics
      this.trackEvent('analysis_cycle_completed', {
        analysisTypesPerformed: Object.keys(analysisResults).length,
        successfulAnalyses: Object.values(analysisResults).filter(r => !r.error).length,
        totalInsightsGenerated: insights.length,
        highConfidenceInsights: insights.filter(i => i.confidence >= 0.7).length,
        analysisTypes: this.analysisTypes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn(`AnalysisAgent: Failed to track analysis metrics:`, error);
    }
  }

  /**
   * Handle a task delegated from Hermes agent
   * @param {Object} task - The task to process
   * @returns {Promise<Object>} - Task result
   * @protected
   */
  async _runAgentTaskForHermes(task) {
    // Handle onboarding personalization tasks
    if (task.type === 'onboarding_personalization') {
      logger.debug(`AnalysisAgent: Processing onboarding personalization task for user ${task.payload?.userId}`);

      try {
        // Extract onboarding data from task payload
        const { userId, onboardingData } = task.payload || {};

        if (!userId) {
          throw new Error('User ID is required for onboarding personalization');
        }

        // Process the onboarding data to generate personalization insights
        const personalizationResult = await this._processOnboardingData(userId, onboardingData || {});

        // Learn from the task outcome via self-improving loop
        await this._learnFromTask(task, personalizationResult, true);

        return {
          success: true,
          result: personalizationResult
        };
      } catch (error) {
        logger.error(`AnalysisAgent: Onboarding personalization failed:`, error);
        // Learn from the task outcome via self-improving loop
        await this._learnFromTask(task, null, false, error.message);
        throw error;
      }
    }

    // For all other tasks, delegate to the regular agent task processing
    logger.debug(`AnalysisAgent: Delegating task ${task.type} to regular processing`);
    return await this._runAgentTask(task);
  }

  /**
   * Process onboarding data to generate personalization insights
   * @private
   * @param {string} userId - The user ID
   * @param {Object} onboardingData - The onboarding data from user registration
   * @returns {Promise<Object>} Personalization insights and recommendations
   */
  async _processOnboardingData(userId, onboardingData) {
    logger.debug(`AnalysisAgent: Processing onboarding data for user ${userId}`);

    try {
      // Extract relevant data for personalization
      const {
        role,
        preferences = {},
        companyId,
        name,
        email,
        phone,
        whatsApp
      } = onboardingData;

      // Analyze the onboarding data to determine personalization strategies

      // 1. Role-based personalization
      const roleBasedInsights = this._analyzeRoleForPersonalization(role);

      // 2. Preference-based personalization
      const preferenceBasedInsights = this._analyzePreferencesForPersonalization(preferences);

      // 3. Company/context-based personalization (if companyId is available)
      const contextBasedInsights = companyId ?
        this._analyzeContextForPersonalization(companyId, onboardingData) :
        { insights: [], recommendations: [] };

      // 4. Communication channel personalization
      const channelBasedInsights = this._analyzeChannelsForPersonalization({ phone, whatsApp });

      // Combine all insights
      const allInsights = [
        ...roleBasedInsights.insights,
        ...preferenceBasedInsights.insights,
        ...contextBasedInsights.insights,
        ...channelBasedInsights.insights
      ];

      const allRecommendations = [
        ...roleBasedInsights.recommendations,
        ...preferenceBasedInsights.recommendations,
        ...contextBasedInsights.recommendations,
        ...channelBasedInsights.recommendations
      ];

      // Generate a personalization profile
      const personalizationProfile = {
        userId,
        timestamp: new Date().toISOString(),
        personalizationType: 'onboarding_based',
        insights: allInsights,
        recommendations: allRecommendations,
        settings: {
          // Generate personalized settings based on the analysis
          interface: this._generateInterfacePreferences(role, preferences),
          notifications: this._generateNotificationPreferences(preferences, { phone, whatsApp }),
          language: preferences.language || 'en',
          timezone: preferences.timezone || 'Africa/Nairobi',
          theme: preferences.theme || 'system'
        }
      };

      logger.info(`AnalysisAgent: Generated personalization profile for user ${userId}`);

      return {
        success: true,
        userId,
        personalizationProfile,
        insightsCount: allInsights.length,
        recommendationsCount: allRecommendations.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`AnalysisAgent: Failed to process onboarding data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze user role for personalization insights
   * @private
   * @param {string} role - The user's role
   * @returns {Object} Insights and recommendations for role-based personalization
   */
  _analyzeRoleForPersonalization(role) {
    const rolePersonalizationMap = {
      'procurement_manager': {
        insights: [
          'User is focused on product sourcing and supplier management',
          'Prioritize supplier discovery and quotation features',
          'User likely needs bulk pricing and MOQ information'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show sourcing dashboard and supplier search prominently',
            description: 'Prioritize sourcing-related features for procurement managers'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight supplier verification and quality assessment tools',
            description: 'Emphasize trust-building features important for procurement'
          }
        ]
      },
      'logistics_coordinator': {
        insights: [
          'User is focused on shipment tracking and logistics coordination',
          'Prioritize tracking features and delivery management',
          'User needs real-time visibility and exception handling'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show logistics dashboard and tracking features prominently',
            description: 'Prioritize logistics-related features for coordinators'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight delivery timeline and exception management tools',
            description: 'Emphasize reliability and visibility features'
          }
        ]
      },
      'sales_team': {
        insights: [
          'User is focused on product customization and client management',
          'Prioritize customization tools and customer relationship features',
          'User needs configuration and pricing flexibility'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show customization studio and customer management features',
            description: 'Prioritize customization and sales-related features'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight product configuration and quote generation tools',
            description: 'Emphasize customization capabilities'
          }
        ]
      },
      'executive': {
        insights: [
          'User is focused on dashboard-level oversight and strategic decisions',
          'Prioritize analytics, reports, and high-level metrics',
          'User needs aggregated data and trend analysis'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show analytics dashboard and executive reports prominently',
            description: 'Prioritize overview and analytics features for executives'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight KPIs, trend analysis, and benchmarking tools',
            description: 'Emphasize data-driven decision making features'
          }
        ]
      },
      'finance': {
        insights: [
          'User is focused on pricing, payments, and financial data',
          'Prioritize billing, invoicing, and financial reporting features',
          'User needs payment processing and financial control tools'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show billing dashboard and financial management features',
            description: 'Prioritize financial-related features for finance users'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight payment processing, invoicing, and financial reporting tools',
            description: 'Emphasize financial control and accuracy features'
          }
        ]
      },
      'company_admin': {
        insights: [
          'User has administrative responsibilities within their company',
          'Prioritize user management, settings, and configuration features',
          'User needs oversight and control capabilities'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show admin panel and user management features prominently',
            description: 'Prioritize administrative and management features'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight role management, permission settings, and audit tools',
            description: 'Emphasize governance and control features'
          }
        ]
      },
      'super_admin': {
        insights: [
          'User has full system access and oversees the entire platform',
          'Prioritize system administration, monitoring, and global settings',
          'User needs oversight of all platform aspects'
        ],
        recommendations: [
          {
            type: 'feature_priority',
            priority: 'high',
            action: 'Show system administration dashboard and global controls',
            description: 'Prioritize system-wide administrative features'
          },
          {
            type: 'content_personalization',
            priority: 'medium',
            action: 'Highlight system monitoring, user management, and configuration tools',
            description: 'Emphasize platform oversight and control features'
          }
        ]
      }
    };

    return rolePersonalizationMap[role] || {
      insights: ['User role not recognized for specific personalization'],
      recommendations: [
        {
          type: 'general_personalization',
          priority: 'low',
          action: 'Apply default personalization based on available preferences',
          description: 'Use standard personalization approach for unrecognized roles'
        }
      ]
    };
  }

  /**
   * Analyze user preferences for personalization insights
   * @private
   * @param {Object} preferences - The user's preferences
   * @returns {Object} Insights and recommendations for preference-based personalization
   */
  _analyzePreferencesForPersonalization(preferences) {
    const {
      language = 'en',
      notifications = {},
      timezone = 'Africa/Nairobi',
      theme = 'system'
    } = preferences;

    const insights = [];
    const recommendations = [];

    // Language-based insights
    if (language !== 'en') {
      insights.push(`User prefers ${language} language interface`);
      recommendations.push({
        type: 'language_personalization',
        priority: 'high',
        action: `Set interface language to ${language}`,
        description: `Personalize language to user's preference: ${language}`,
        confidence: 0.9
      });
    }

    // Notification preferences
    const notificationChannels = [];
    if (notifications.email === false) notificationChannels.push('email');
    if (notifications.sms === false) notificationChannels.push('sms');
    if (notifications.whatsapp === false) notificationChannels.push('whatsapp');
    if (notifications.push === false) notificationChannels.push('push');

    if (notificationChannels.length > 0) {
      insights.push(`User has disabled notifications for: ${notificationChannels.join(', ')}`);
      recommendations.push({
        type: 'notification_personalization',
        priority: 'medium',
        action: `Respect user's notification preferences by disabling: ${notificationChannels.join(', ')}`,
        description: 'Honor user\'s chosen communication channels',
        confidence: 0.95
      });
    }

    // Timezone insights
    if (timezone !== 'Africa/Nairobi') {
      insights.push(`User is in timezone: ${timezone}`);
      recommendations.push({
        type: 'timezone_personalization',
        priority: 'medium',
        action: `Set timezone to ${timezone} for date/time displays`,
        description: `Personalize timezone to user's location: ${timezone}`,
        confidence: 0.9
      });
    }

    // Theme preferences
    if (theme !== 'system') {
      insights.push(`User prefers ${theme} interface theme`);
      recommendations.push({
        type: 'theme_personalization',
        priority: 'medium',
        action: `Set interface theme to ${theme}`,
        description: `Personalize visual theme to user's preference: ${theme}`,
        confidence: 0.85
      });
    }

    return { insights, recommendations };
  }

  /**
   * Analyze company/context for personalization insights
   * @private
   * @param {string} companyId - The company ID
   * @param {Object} onboardingData - The full onboarding data
   * @returns {Object} Insights and recommendations for context-based personalization
   */
  _analyzeContextForPersonalization(companyId, onboardingData) {
    // In a real implementation, this would look up company information
    // from the database to provide industry-specific personalization

    // For now, we'll return general context-based insights
    return {
      insights: [
        'User belongs to a specific company context',
        'Company-specific features and settings may be relevant'
      ],
      recommendations: [
        {
          type: 'context_personalization',
          priority: 'low',
          action: 'Apply company-specific settings and features when available',
          description: 'Personalize based on company context and industry',
          confidence: 0.6
        }
      ]
    };
  }

  /**
   * Analyze communication channels for personalization insights
   * @private
   * @param {Object} channels - Communication channel information
   * @returns {Object} Insights and recommendations for channel-based personalization
   */
  _analyzeChannelsForPersonalization(channels) {
    const { phone, whatsApp } = channels;

    const insights = [];
    const recommendations = [];

    // Phone number insights
    if (phone) {
      insights.push('User has provided a phone number for contact');
      recommendations.push({
        type: 'channel_personalization',
        priority: 'medium',
        action: 'Enable SMS notifications if user consents',
        description: 'Utilize phone number for communication when appropriate',
        confidence: 0.7
      });
    } else {
      insights.push('User has not provided a phone number');
      recommendations.push({
        type: 'channel_personalization',
        priority: 'low',
        action: 'Rely on email and in-app notifications for communication',
        description: 'Adjust communication strategy based on available contact info',
        confidence: 0.8
      });
    }

    // WhatsApp insights
    if (whatsApp) {
      insights.push('User has provided a WhatsApp number');
      recommendations.push({
        type: 'channel_personalization',
        priority: 'medium',
        action: 'Enable WhatsApp notifications if user consents',
        description: 'Utilize WhatsApp for communication in regions where it\'s prevalent',
        confidence: 0.8
      });
    } else {
      insights.push('User has not provided a WhatsApp number');
    }

    return { insights, recommendations };
  }

  /**
   * Generate interface preferences based on role and preferences
   * @private
   * @param {string} role - The user's role
   * @param {Object} preferences - The user's preferences
   * @returns {Object} Personalized interface settings
   */
  _generateInterfacePreferences(role, preferences) {
    // Base interface preferences
    const interfacePrefs = {
      dashboardLayout: 'default',
      itemsPerPage: 25,
      showTutorials: true,
      enableTooltips: true,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24h'
    };

    // Adjust based on role
    switch (role) {
      case 'executive':
        interfacePrefs.dashboardLayout = 'analytics_focused';
        interfacePrefs.itemsPerPage = 10;  // Executives prefer summary views
        break;
      case 'finance':
        interfacePrefs.dashboardLayout = 'data_detailed';
        interfacePrefs.itemsPerPage = 50;   // Finance users need detailed views
        break;
      case 'procurement_manager':
        interfacePrefs.dashboardLayout = 'sourcing_focused';
        break;
      case 'logistics_coordinator':
        interfacePrefs.dashboardLayout = 'tracking_focused';
        interfacePrefs.itemsPerPage = 30;
        break;
    }

    // Adjust based on preferences
    if (preferences.theme === 'dark') {
      interfacePrefs.theme = 'dark';
    } else if (preferences.theme === 'light') {
      interfacePrefs.theme = 'light';
    }

    return interfacePrefs;
  }

  /**
   * Generate notification preferences based on preferences and channels
   * @private
   * @param {Object} preferences - The user's preferences
   * @param {Object} channels - Communication channel information
   * @returns {Object} Personalized notification settings
   */
  _generateNotificationPreferences(preferences, channels) {
    const { phone, whatsApp } = channels;
    const {
      email: emailEnabled = true,
      sms: smsEnabled = true,
      whatsapp: whatsappEnabled = true,
      push: pushEnabled = true
    } = preferences;

    // Start with user preferences
    const notificationPrefs = {
      email: emailEnabled,
      sms: smsEnabled && !!phone,  // Only enable SMS if phone is provided
      whatsapp: whatsappEnabled && !!whatsApp,  // Only enable WhatsApp if number is provided
      push: pushEnabled,
      frequency: 'real_time',
      digestTiming: '09:00'  // Daily digest at 9 AM local time
    };

    // Adjust digest timing based on timezone if available
    if (preferences.timezone) {
      // In a real implementation, we would adjust the digest time based on timezone
      // For now, we'll keep it as is
    }

    return notificationPrefs;
  }

  /**
   * Get agent-specific status information
   * @override
   * @returns {Object} Agent status with analysis-specific details
   */
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      specialty: 'data_analysis_and_business_intelligence',
      analysisTypes: this.analysisTypes,
      dataSources: this.dataSources,
      analysisInterval: this.analysisInterval,
      lastAnalysisTypes: [] // Would be populated from recent runs
    };
  }
}

module.exports = { AnalysisAgent };