# Graph Report - .  (2026-07-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2322 nodes · 3530 edges · 223 communities (158 shown, 65 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 263 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e488bf55`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LearningService
- statusline.cjs
- intelligence.cjs
- JsonFileBackend
- swarm-hooks.sh
- hook-handler.cjs
- metrics-db.mjs
- supplierTrustService.js
- ComplianceAgent
- MarketIntelligenceAgent
- ResearchAgent
- wrapper.js
- whatsappService.js
- BaseAgent
- agents/baseAgent.js
- customsEngineService.js
- OptimizationAgent
- KoreanComplianceService
- middleware/auth.js
- index.js
- selfImprovingLoop.js
- serverlessServiceLoader.js
- workflowAutomationService.js
- ChatAgent
- sourcingService.js
- apifyService.js
- customizationService.js
- routes/index.js
- app.js
- contacts.js
- routes/customsEngine.js
- composioService.js
- AgentManager
- agentService.js
- NegotiationAgent
- initKafkaProducer
- whatsapp.js
- enrollments.js
- SourcingAgent
- AgentService
- langchainOrchestrator.js
- OpenGraphImageGenerator
- accounts.js
- health.js
- sequences.js
- CloudflareService
- toolRegistry.js
- AgentCommunication
- SentryService
- HermesAgent
- WatiService
- agentManager.js
- LogisticsAgent
- apiKeyAuth.js
- sentryService.js
- ComplianceAgent
- koreanMarketAnalysisController.js
- serviceRunner.js
- sourcing-match.js
- BaseAgent
- authService.js
- mpesaService.js
- abac.js
- CustomizationAgent
- models/customsEngine.js
- tools.js
- AgentMemory
- kafka.js
- flexportLogisticsAdapter.js
- restApiAdapter.js
- shipbobLogisticsAdapter.js
- aiIntelligenceService.js
- routes/auth.js
- logger.js
- dependencies
- ContactService
- hermesAgent.js
- BingWebmasterToolsService
- rateLimiter.js
- ServiceRunner
- AnalysisAgent
- sapProductAdapter.js
- supplierRiskAdapter.js
- api.js
- sanitize.js
- admin.js
- subscription.js
- App.jsx
- logistics-route.js
- billing.js
- logisticsService.js
- customization-price.js
- chatAgent.js
- database.js
- global-types.d.ts
- cloudflareService.js
- KoreanMarketAnalysisService
- statusline.js
- useAuth
- account.js
- artifact.js
- whatsAppMessage.js
- calculateDuty
- posthogClient.js
- compliance-rules.js
- document-templates.js
- hs-codes.js
- routes.js
- tariffs.js
- trade-agreements.js
- classifyHS
- createCustomsShipment
- agentManager.test.js
- CustomsDashboard.jsx
- learning-hooks.sh
- swarm-comms.sh
- agentWorkflows.e2e.test.js
- daemon-manager.sh
- DashboardPage.jsx
- logisticsController.js
- auto-commit.sh
- sync-v3-metrics.sh
- customizationController.js
- adr-compliance.sh
- swarm-monitor.sh
- teamService.js
- adminService.js
- checkpoint-manager.sh
- memory.js
- HealthDashboard.jsx
- koreanComplianceController.js
- documentProcessingPipeline.js
- AdminService
- Team
- perf-worker.sh
- worker-manager.sh
- LandingPage.jsx
- sourcingController.js
- agents.js
- ruflo-hook.cjs
- security-scanner.sh
- salesforceCrmAdapter.js
- admin.routes.test.js
- TestAgent
- composioService.integration.test.js
- teams.routes.test.js
- ddd-tracker.sh
- learning-optimizer.sh
- session.js
- standard-checkpoint-hooks.sh
- validate-v3-config.sh
- auth.test.js
- supplierTrustService.apify.test.js
- router.js
- SupplierTrustDashboard.jsx
- koreanMarketAnalysisService.js
- apiKeyAuth.test.js
- rbac.test.js
- validate-env.test.js
- adminService.test.js
- authService.test.js
- teamService.test.js
- tools.routes.test.js
- health-monitor.sh
- pattern-consolidator.sh
- koreanComplianceService.js
- selfImprovingLoop.test.js
- flexportLogisticsAdapter.test.js
- hubspotCrmAdapter.test.js
- oracleProductAdapter.test.js
- restApiAdapter.test.js
- salesforceCrmAdapter.test.js
- sapProductAdapter.test.js
- shipbobLogisticsAdapter.test.js
- documentProcessingPipeline.test.js
- role.model.test.js
- aiIntelligenceService.test.js
- apifyService.test.js
- composioService.test.js
- customizationService.test.js
- customsEngineService.apify.test.js
- koreanComplianceService.apify.test.js
- koreanComplianceService.test.js
- koreanMarketAnalysisService.apify.test.js
- sourcingService.test.js
- workflowAutomationService.test.js
- serviceRunner.test.js
- github-safe.js
- statusline-hook.sh
- sourcing.js
- models/supplierTrust.js
- agentMemory.test.js
- chatAgent.test.js
- communication.test.js
- hermesAgent.test.js
- krwPaymentAdapter.test.js
- supplierRiskAdapter.test.js
- startup.test.js
- github-setup.sh
- guidance-hook.sh
- guidance-hooks.sh
- post-commit
- pre-commit
- quick-start.sh
- setup-mcp.sh
- update-v3-progress.sh
- v3.sh
- v3-quick-status.sh
- agentService.test.js
- logisticsService.test.js
- toolRegistry.test.js
- team.model.test.js

## God Nodes (most connected - your core abstractions)
1. `AnalysisAgent` - 38 edges
2. `ComplianceAgent` - 33 edges
3. `MarketIntelligenceAgent` - 33 edges
4. `initKafkaProducer()` - 32 edges
5. `ResearchAgent` - 32 edges
6. `OptimizationAgent` - 26 edges
7. `BaseAgent` - 25 edges
8. `SentryService` - 21 edges
9. `ChatAgent` - 20 edges
10. `authenticate()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `startFlexportLogisticsAdapter()` --calls--> `initKafkaProducer()`  [EXTRACTED]
  ingestion/adapters/flexportLogisticsAdapter.js → config/kafka.js
- `startHubspotCrmAdapter()` --calls--> `initKafkaProducer()`  [EXTRACTED]
  ingestion/adapters/hubspotCrmAdapter.js → config/kafka.js
- `startRestApiAdapter()` --calls--> `initKafkaProducer()`  [EXTRACTED]
  ingestion/adapters/restApiAdapter.js → config/kafka.js
- `startSalesforceCrmAdapter()` --calls--> `initKafkaProducer()`  [EXTRACTED]
  ingestion/adapters/salesforceCrmAdapter.js → config/kafka.js
- `startSapProductAdapter()` --calls--> `initKafkaProducer()`  [EXTRACTED]
  ingestion/adapters/sapProductAdapter.js → config/kafka.js

## Import Cycles
- None detected.

## Communities (223 total, 65 thin omitted)

### Community 0 - "LearningService"
Cohesion: 0.07
Nodes (12): CONFIG, DATA_DIR, DB_PATH, __dirname, EmbeddingService, __filename, HNSWIndex, initializeDatabase() (+4 more)

### Community 1 - "statusline.cjs"
Cohesion: 0.08
Nodes (42): ADR-0088, ADR-0137, ADR-0301, ADR-0311, applyLocalOverlays(), buildLocalFallback(), CACHE_FILE, c (+34 more)

### Community 2 - "intelligence.cjs"
Cohesion: 0.11
Nodes (38): ADR-0050, ADR-0095, boostConfidence(), bootstrapFromMemoryFiles(), buildEdges(), ADR-0174, clip(), computePageRank() (+30 more)

### Community 3 - "JsonFileBackend"
Cohesion: 0.10
Nodes (18): ADR-0048, DATA_DIR, dim(), __dirname, doImport(), doStatus(), doSync(), __filename (+10 more)

### Community 4 - "swarm-hooks.sh"
Cohesion: 0.22
Nodes (22): accept_handoff(), broadcast_context(), broadcast_pattern(), complete_handoff(), get_agents(), get_consensus_status(), get_messages(), get_pattern_broadcasts() (+14 more)

### Community 5 - "hook-handler.cjs"
Cohesion: 0.14
Nodes (19): ADR-0312, ADR-0316, ADR-0318, ADR-0174, firstRunAutoEnableIfEligible(), fs, intelligence, main() (+11 more)

### Community 6 - "metrics-db.mjs"
Cohesion: 0.21
Nodes (16): calculateModuleProgress(), checkSecurityFile(), countFilesAndLines(), countProcesses(), DB_PATH, dbDir, __dirname, exportToJSON() (+8 more)

### Community 7 - "supplierTrustService.js"
Cohesion: 0.10
Nodes (23): { authenticate, authorize }, express, logger, router, {
  searchSuppliers,
  getSupplierDetail,
  requestVerification,
  approveVerification,
  addReview,
  createEscrowTransaction,
  releaseEscrow,
  calculateAndUpdateTrustScore,
  getServiceStatus
}, SupplierTrust, addReview(), apifyDiscoverSuppliers() (+15 more)

### Community 11 - "wrapper.js"
Cohesion: 0.17
Nodes (15): checkQMeAvailability(), createDefaultViews(), { exec, spawn }, execAsync, fs, getDashboardStatus(), getTask(), initialize() (+7 more)

### Community 12 - "whatsappService.js"
Cohesion: 0.13
Nodes (23): createSourcingFromWhatsApp(), detectConversationContext(), extractEntities(), extractStructuredQuery(), generateConfirmationResponse(), generateHelpResponse(), generateOrderStatusResponse(), generatePaymentResponse() (+15 more)

### Community 14 - "agents/baseAgent.js"
Cohesion: 0.13
Nodes (11): AgentCommunication, AgentMemory, logger, toolRegistry, { v4: uuidv4 }, BaseAgent, logger, BaseAgent (+3 more)

### Community 15 - "customsEngineService.js"
Cohesion: 0.09
Nodes (19): agreementCache, apifyService, complianceCache, {
  CustomHSCode,
  TariffSchedule,
  CustomsRoute,
  CustomsShipment,
  ComplianceRule,
  TradeAgreement,
  DocumentTemplate
}, documentCache, generateDocument(), getNestedValue(), hsCodeCache (+11 more)

### Community 18 - "middleware/auth.js"
Cohesion: 0.16
Nodes (12): authenticate(), logger, optionalAuth(), scopeToCompany(), User, { verifyAccessToken }, { verifyClerkApiToken }, { authenticate } (+4 more)

### Community 19 - "index.js"
Cohesion: 0.09
Nodes (20): agentService, app, { cloudflareService }, composioService, connectDB, { HermesAgent }, { initKafkaProducer, initKafkaConsumer }, langchainOrchestrator (+12 more)

### Community 20 - "selfImprovingLoop.js"
Cohesion: 0.06
Nodes (29): auth, ersService, logger, analyzeFeedback(), collectUnprocessedFeedback(), Feedback, improvementMetrics, logger (+21 more)

### Community 21 - "serverlessServiceLoader.js"
Cohesion: 0.18
Nodes (20): attachServicesToApp(), getAgentService(), getCloudflare(), getDatabase(), getHermesAgent(), getKafka(), getLangChain(), getQMe() (+12 more)

### Community 22 - "workflowAutomationService.js"
Cohesion: 0.20
Nodes (19): determineNextStep(), evaluateCondition(), executeWorkflowStep(), generateMockOutput(), handleCustomerFeedbackReceived(), handleDocumentProcessed(), handleInventoryChanged(), handleOrderCreated() (+11 more)

### Community 24 - "sourcingService.js"
Cohesion: 0.16
Nodes (17): activeSourcingRequests, Feedback, generateMarketIntelligence(), generateQuote(), handleMarketTrendUpdated(), handleProductCatalogUpdated(), handleProductQueryReceived(), handleSupplierProfileUpdated() (+9 more)

### Community 25 - "apifyService.js"
Cohesion: 0.18
Nodes (17): ACTORS, { ApifyClient }, crawlTradeAgreements(), crawlWebsite(), enrichCompanyData(), getApiKey(), getClient(), getServiceStatus() (+9 more)

### Community 26 - "customizationService.js"
Cohesion: 0.18
Nodes (16): activeCustomizations, calculatePricing(), COST_DATABASE, Customization, generateTimeline(), handleCustomizationRequested(), handleDesignApproved(), handleMaterialSelected() (+8 more)

### Community 27 - "routes/index.js"
Cohesion: 0.10
Nodes (20): { abacAuthorize }, analyticsRoutes, { authenticate, scopeToCompany, authorize }, Company, customizationController, ersController, express, Feedback (+12 more)

### Community 28 - "app.js"
Cohesion: 0.09
Nodes (20): apiRoutes, app, { authenticate, authorize }, corsMiddleware, express, healthRoutes, helmet, { hermesAccess } (+12 more)

### Community 29 - "contacts.js"
Cohesion: 0.13
Nodes (14): logger, rbacAuthorize(), Role, as, { authenticate }, cs, express, { rbacAuthorize: rbac } (+6 more)

### Community 30 - "routes/customsEngine.js"
Cohesion: 0.12
Nodes (16): { authenticate, authorize }, {
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
}, { CustomsShipment, CustomHSCode }, express, logger, router, checkCompliance(), getCategories() (+8 more)

### Community 31 - "composioService.js"
Cohesion: 0.20
Nodes (14): AGENT_TOOLKIT_MAP, connectAccount(), createSession(), disconnectAccount(), executeTool(), getApiKey(), getClient(), getServiceStatus() (+6 more)

### Community 33 - "agentService.js"
Cohesion: 0.19
Nodes (13): ChatAgent, { ComplianceAgent }, CustomizationAgent, { LogisticsAgent }, { NegotiationAgent }, SourcingAgent, AgentManager, { ChatAgent, SourcingAgent, CustomizationAgent, LogisticsAgent, ComplianceAgent, NegotiationAgent } (+5 more)

### Community 35 - "initKafkaProducer"
Cohesion: 0.17
Nodes (11): initKafkaProducer(), generateMockKRWPayment(), { initKafkaProducer }, logger, serviceRunner, startKRWPaymentAdapter(), generateMockOracleProductUpdate(), { initKafkaProducer } (+3 more)

### Community 36 - "whatsapp.js"
Cohesion: 0.16
Nodes (13): getRequestUrl(), getTwilioAuthToken(), logger, validateTwilioSignature(), { authenticate, authorize }, express, {
  handleIncomingMessage,
  sendWhatsAppMessage,
  getWhatsAppServiceStatus,
  generateMpesaPaymentLink,
  processMessageNLP
}, logger (+5 more)

### Community 37 - "enrollments.js"
Cohesion: 0.11
Nodes (14): contactSchema, mongoose, enrollmentSchema, mongoose, mongoose, sequenceSchema, stepSchema, { authenticate } (+6 more)

### Community 40 - "langchainOrchestrator.js"
Cohesion: 0.21
Nodes (11): feedbackStore, getRagContextRuflo(), getTaskContextLegacy(), logger, runTaskScript(), runTaskWithRAG(), storeLearningPattern(), storeTaskResultRuflo() (+3 more)

### Community 41 - "OpenGraphImageGenerator"
Cohesion: 0.18
Nodes (6): { createCanvas, loadImage }, crypto, DEFAULT_CONFIG, logger, OpenGraphImageGenerator, path

### Community 42 - "accounts.js"
Cohesion: 0.15
Nodes (6): as, { authenticate }, express, { rbacAuthorize: rbac }, router, logger

### Community 43 - "health.js"
Cohesion: 0.17
Nodes (10): apifyService, CHECKS, composioService, express, logger, performLiveCheck(), { requireApiKey }, router (+2 more)

### Community 44 - "sequences.js"
Cohesion: 0.15
Nodes (6): { authenticate }, express, { rbacAuthorize: rbac }, router, ss, logger

### Community 46 - "toolRegistry.js"
Cohesion: 0.17
Nodes (7): apifyService, composioService, getCategoryBreakdown(), getServiceStatus(), LOCAL_TOOLS, logger, TOOL_CATEGORIES

### Community 47 - "AgentCommunication"
Cohesion: 0.17
Nodes (3): AgentCommunication, { Kafka }, logger

### Community 50 - "WatiService"
Cohesion: 0.21
Nodes (3): axios, logger, WatiService

### Community 51 - "agentManager.js"
Cohesion: 0.18
Nodes (5): AgentCommunication, BaseAgent, logger, PriorityQueue, { v4: uuidv4 }

### Community 53 - "apiKeyAuth.js"
Cohesion: 0.36
Nodes (10): buildKeyEntry(), constantTimeCompare(), getApiKeyMetadata(), getConfiguredApiKeys(), getKeyRotationStatus(), isKeyInList(), logger, parseKeyList() (+2 more)

### Community 54 - "sentryService.js"
Cohesion: 0.09
Nodes (22): logger, NOTE: Express error handler is NOT set up here to avoid circular dependency., sentryErrorHandler(), sentryTracingHandler(), logger, { AnalysisAgent }, { ComplianceAgent }, { MarketIntelligenceAgent } (+14 more)

### Community 55 - "ComplianceAgent"
Cohesion: 0.24
Nodes (3): BaseAgent, ComplianceAgent, logger

### Community 56 - "koreanMarketAnalysisController.js"
Cohesion: 0.20
Nodes (3): auth, koreanMarketAnalysisService, logger

### Community 57 - "serviceRunner.js"
Cohesion: 0.22
Nodes (7): generateMockHubSpotFeedback(), { initKafkaProducer }, logger, serviceRunner, startHubspotCrmAdapter(), defaultRunner, logger

### Community 58 - "sourcing-match.js"
Cohesion: 0.20
Nodes (8): africanSuppliers, allPrices, asianSuppliers, matches, path, result, startTime, supplierKnowledgeBase

### Community 60 - "authService.js"
Cohesion: 0.08
Nodes (40): bcrypt, mongoose, userSchema, { authenticate }, express, router, { signInWithClerk, linkClerkUser }, { signInWithFirebase, createCustomToken } (+32 more)

### Community 62 - "abac.js"
Cohesion: 0.13
Nodes (8): ABACAttributes, ABACPolicyEngine, logger, abacAuthorize(), abacEngine, { ABACPolicyEngine }, abacRequirePermission(), logger

### Community 63 - "CustomizationAgent"
Cohesion: 0.23
Nodes (3): BaseAgent, CustomizationAgent, logger

### Community 64 - "models/customsEngine.js"
Cohesion: 0.22
Nodes (8): complianceRuleSchema, customsRouteSchema, customsShipmentSchema, documentTemplateSchema, hsCodeSchema, mongoose, tariffScheduleSchema, tradeAgreementSchema

### Community 65 - "tools.js"
Cohesion: 0.22
Nodes (5): { authenticate, authorize }, express, logger, { requireApiKey }, router

### Community 67 - "kafka.js"
Cohesion: 0.36
Nodes (7): getBrokers(), getClient(), initKafkaConsumer(), { Kafka, logLevel }, logger, mockConsumer(), mockProducer()

### Community 68 - "flexportLogisticsAdapter.js"
Cohesion: 0.32
Nodes (6): generateMockInventoryChange(), generateMockOrderCreated(), { initKafkaProducer }, logger, serviceRunner, startFlexportLogisticsAdapter()

### Community 69 - "restApiAdapter.js"
Cohesion: 0.32
Nodes (6): generateMockCustomerProfile(), generateMockProductCatalog(), { initKafkaProducer }, logger, serviceRunner, startRestApiAdapter()

### Community 70 - "shipbobLogisticsAdapter.js"
Cohesion: 0.32
Nodes (6): generateMockInventoryChange(), generateMockOrderCreated(), { initKafkaProducer }, logger, serviceRunner, startShipBobLogisticsAdapter()

### Community 71 - "aiIntelligenceService.js"
Cohesion: 0.11
Nodes (35): accuracyTracker, analyzePattern(), analyzeSentiment(), analyzeTrend(), analyzeTurnover(), boundedMap(), detectAnomalies(), extractCategories() (+27 more)

### Community 72 - "routes/auth.js"
Cohesion: 0.13
Nodes (11): Feedback, logger, trackEngagement(), User, { authenticate }, authService, express, logger (+3 more)

### Community 73 - "logger.js"
Cohesion: 0.15
Nodes (9): allowedOrigins, logger, Contact, { logger }, mongoose, logDir, logger, path (+1 more)

### Community 74 - "dependencies"
Cohesion: 0.06
Nodes (35): autoprefixer, axios, @clerk/clerk-react, dependencies, axios, @clerk/clerk-react, react, react-dom (+27 more)

### Community 76 - "hermesAgent.js"
Cohesion: 0.17
Nodes (10): { BaseAgent }, logger, { SentryService }, { AnalysisAgent }, { ComplianceAgent }, logger, { MarketIntelligenceAgent }, { OptimizationAgent } (+2 more)

### Community 77 - "BingWebmasterToolsService"
Cohesion: 0.25
Nodes (3): axios, BingWebmasterToolsService, logger

### Community 78 - "rateLimiter.js"
Cohesion: 0.32
Nodes (6): getLimiter(), initializeRedis(), limiterCache, logger, rateLimit(), { RateLimiterMemory }

### Community 81 - "sapProductAdapter.js"
Cohesion: 0.33
Nodes (5): generateMockProductUpdate(), { initKafkaProducer }, logger, serviceRunner, startSapProductAdapter()

### Community 82 - "supplierRiskAdapter.js"
Cohesion: 0.33
Nodes (5): generateMockSupplierRiskUpdate(), { initKafkaProducer }, logger, serviceRunner, startSupplierRiskAdapter()

### Community 83 - "api.js"
Cohesion: 0.10
Nodes (14): QMeDashboard(), TASK_TEMPLATES, useQmeOrchestrator(), WORKFLOW_STATES, api, companyAPI, customizationAPI, feedbackAPI (+6 more)

### Community 84 - "sanitize.js"
Cohesion: 0.57
Nodes (6): hasMaliciousKeys(), logger, sanitizeBody(), sanitizeMongoOperators(), sanitizeParams(), sanitizeQuery()

### Community 85 - "admin.js"
Cohesion: 0.29
Nodes (6): adminService, { authenticate, authorize }, express, { getApiKeyMetadata }, { rbacAuthorize }, router

### Community 86 - "subscription.js"
Cohesion: 0.33
Nodes (3): hermesAccess(), logger, User

### Community 87 - "App.jsx"
Cohesion: 0.08
Nodes (17): App(), CustomsDashboard, DashboardPage, ExecutiveDashboard, HermesAdminPage, LandingPage, LoginPage, LogisticsDashboard (+9 more)

### Community 88 - "logistics-route.js"
Cohesion: 0.33
Nodes (5): matchingRoutes, result, ROUTE_DATABASE, routeOptions, startTime

### Community 89 - "billing.js"
Cohesion: 0.33
Nodes (5): { authenticate }, express, logger, TODO: Implement actual persistence, router

### Community 90 - "logisticsService.js"
Cohesion: 0.17
Nodes (18): activeShipments, calculateETA(), findOptimalRoute(), generateRouteOptions(), generateSyntheticRoute(), handleCustomerFeedbackReceived(), handleDocumentProcessed(), handleInventoryChanged() (+10 more)

### Community 91 - "customization-price.js"
Cohesion: 0.40
Nodes (4): COST_DATABASE, MATERIAL_COSTS, result, startTime

### Community 92 - "chatAgent.js"
Cohesion: 0.50
Nodes (3): BaseAgent, logger, { v4: uuidv4 }

### Community 94 - "global-types.d.ts"
Cohesion: 0.50
Nodes (3): Boolean, Number, Object

### Community 95 - "cloudflareService.js"
Cohesion: 0.50
Nodes (3): https, logger, { parse }

### Community 97 - "statusline.js"
Cohesion: 0.21
Nodes (15): BANNER_VERSION, { execSync, execFileSync }, getLearningStats(), getSecurityStatus(), getSwarmStatus(), getSystemMetrics(), getUserInfo(), getV3Progress() (+7 more)

### Community 98 - "useAuth"
Cohesion: 0.19
Nodes (10): ProtectedRoute(), Icons, Layout(), navItems, AuthContext, useAuth(), useDarkMode(), LoginPage() (+2 more)

### Community 102 - "calculateDuty"
Cohesion: 0.67
Nodes (3): buildDutyCalculation(), calculateDuty(), estimateDutyRate()

### Community 113 - "agentManager.test.js"
Cohesion: 0.12
Nodes (6): AgentManager, BaseAgent, logger, LogisticsAgent, SourceAgent, TestAgent

### Community 114 - "CustomsDashboard.jsx"
Cohesion: 0.13
Nodes (5): categoryColors, categoryLabels, COLORS, tabs, customsAPI

### Community 115 - "learning-hooks.sh"
Cohesion: 0.43
Nodes (12): error(), get_stats(), log(), record_usage(), run_benchmark(), search_patterns(), session_end(), session_start() (+4 more)

### Community 116 - "swarm-comms.sh"
Cohesion: 0.32
Nodes (13): batch_add(), batch_flush(), batch_flush_all(), broadcast_pattern_async(), enqueue(), get_comms_stats(), pool_acquire(), pool_init() (+5 more)

### Community 117 - "agentWorkflows.e2e.test.js"
Cohesion: 0.14
Nodes (12): AgentManager, AgentMemory, agentService, BaseAgent, ChatAgent, { ComplianceAgent }, CustomizationAgent, logger (+4 more)

### Community 118 - "daemon-manager.sh"
Cohesion: 0.49
Nodes (12): error(), is_running(), log(), restart_all(), daemon-manager.sh script, show_status(), start_all(), start_metrics_daemon() (+4 more)

### Community 119 - "DashboardPage.jsx"
Cohesion: 0.18
Nodes (5): ToastContext, ToastProvider(), typeStyles, useToast(), DashboardPage()

### Community 120 - "logisticsController.js"
Cohesion: 0.17
Nodes (5): logger, Logistics, qme, logisticsSchema, mongoose

### Community 121 - "auto-commit.sh"
Cohesion: 0.42
Nodes (9): auto_commit(), batch_commit(), error(), file_commit(), has_changes(), log(), push_only(), auto-commit.sh script (+1 more)

### Community 122 - "sync-v3-metrics.sh"
Cohesion: 0.22
Nodes (3): log(), sync-v3-metrics.sh script, sync_metrics()

### Community 123 - "customizationController.js"
Cohesion: 0.18
Nodes (5): Customization, logger, qme, customizationSchema, mongoose

### Community 124 - "adr-compliance.sh"
Cohesion: 0.24
Nodes (4): ADRS, check_compliance(), adr-compliance.sh script, should_run()

### Community 125 - "swarm-monitor.sh"
Cohesion: 0.49
Nodes (8): check_once(), error(), log(), monitor_continuous(), swarm-monitor.sh script, success(), update_activity_metrics(), warn()

### Community 126 - "teamService.js"
Cohesion: 0.20
Nodes (7): companySchema, mongoose, mongoose, teamSchema, Company, logger, User

### Community 127 - "adminService.js"
Cohesion: 0.20
Nodes (7): mongoose, roleSchema, hasPrototypeKey(), logger, mongoose, Role, SYSTEM_ROLES

### Community 128 - "checkpoint-manager.sh"
Cohesion: 0.42
Nodes (8): clean_checkpoints(), diff_checkpoint(), list_checkpoints(), rollback_checkpoint(), checkpoint-manager.sh script, show_checkpoint(), show_help(), show_summary()

### Community 129 - "memory.js"
Cohesion: 0.22
Nodes (6): commands, fs, MEMORY_DIR, MEMORY_FILE, path, value

### Community 130 - "HealthDashboard.jsx"
Cohesion: 0.28
Nodes (3): categoryIcons, HealthDashboard(), healthAPI

### Community 131 - "koreanComplianceController.js"
Cohesion: 0.22
Nodes (3): auth, koreanComplianceService, logger

### Community 132 - "documentProcessingPipeline.js"
Cohesion: 0.31
Nodes (7): DOCUMENT_TYPES, getRandomExtension(), { initKafkaProducer }, logger, processDocument(), serviceRunner, startDocumentProcessingPipeline()

### Community 135 - "perf-worker.sh"
Cohesion: 0.36
Nodes (4): run_benchmarks(), run_deep_benchmark(), perf-worker.sh script, should_run()

### Community 136 - "worker-manager.sh"
Cohesion: 0.57
Nodes (7): force_all(), log(), run_all_workers(), run_daemon(), run_worker(), worker-manager.sh script, status_all()

### Community 137 - "LandingPage.jsx"
Cohesion: 0.25
Nodes (6): FAQ, FEATURES, LIVE, PLANS, PROBLEMS, SOLUTIONS

### Community 138 - "sourcingController.js"
Cohesion: 0.25
Nodes (3): logger, qme, Sourcing

### Community 139 - "agents.js"
Cohesion: 0.25
Nodes (5): authorize(), { authenticate, authorize }, express, logger, router

### Community 140 - "ruflo-hook.cjs"
Cohesion: 0.43
Nodes (6): commandExists(), done(), fs, invokeHook(), main(), { spawnSync, execSync }

### Community 141 - "security-scanner.sh"
Cohesion: 0.38
Nodes (3): run_scan(), security-scanner.sh script, should_run()

### Community 142 - "salesforceCrmAdapter.js"
Cohesion: 0.33
Nodes (5): generateMockCustomerFeedback(), { initKafkaProducer }, logger, serviceRunner, startSalesforceCrmAdapter()

### Community 143 - "admin.routes.test.js"
Cohesion: 0.29
Nodes (6): adminRoutes, adminService, { authenticate, authorize }, express, { rbacAuthorize }, request

### Community 144 - "TestAgent"
Cohesion: 0.29
Nodes (3): BaseAgent, logger, TestAgent

### Community 145 - "composioService.integration.test.js"
Cohesion: 0.33
Nodes (4): graceAssert(), handleNockResult(), logger, nock

### Community 146 - "teams.routes.test.js"
Cohesion: 0.29
Nodes (6): { authenticate }, express, { rbacAuthorize }, request, teamService, teamsRoutes

### Community 147 - "ddd-tracker.sh"
Cohesion: 0.47
Nodes (3): ddd-tracker.sh script, should_run(), track_ddd()

### Community 148 - "learning-optimizer.sh"
Cohesion: 0.53
Nodes (4): optimize_patterns(), run_sona_training(), learning-optimizer.sh script, should_run()

### Community 149 - "session.js"
Cohesion: 0.33
Nodes (5): commands, fs, path, SESSION_DIR, SESSION_FILE

### Community 150 - "standard-checkpoint-hooks.sh"
Cohesion: 0.60
Nodes (5): post_edit_checkpoint(), pre_edit_checkpoint(), session_end_checkpoint(), standard-checkpoint-hooks.sh script, task_checkpoint()

### Community 151 - "validate-v3-config.sh"
Cohesion: 0.60
Nodes (5): log_error(), log_info(), log_success(), log_warning(), validate-v3-config.sh script

### Community 152 - "auth.test.js"
Cohesion: 0.33
Nodes (4): {
  authenticate,
  optionalAuth,
  authorize,
  scopeToCompany,
  requirePermission,
}, jwt, logger, User

### Community 153 - "supplierTrustService.apify.test.js"
Cohesion: 0.33
Nodes (4): apifyService, logger, SupplierTrust, supplierTrustService

### Community 154 - "router.js"
Cohesion: 0.40
Nodes (3): AGENT_CAPABILITIES, task, TASK_PATTERNS

### Community 155 - "SupplierTrustDashboard.jsx"
Cohesion: 0.60
Nodes (4): ratingColor(), SupplierTrustDashboard(), tierBadge(), supplierTrustAPI

### Community 156 - "koreanMarketAnalysisService.js"
Cohesion: 0.40
Nodes (4): apifyService, { DocumentProcessingPipeline }, koreanMarketData, logger

### Community 158 - "rbac.test.js"
Cohesion: 0.40
Nodes (4): logger, { rbacAuthorize }, Role, User

### Community 159 - "validate-env.test.js"
Cohesion: 0.60
Nodes (4): buildEnv(), envEntry(), envFromObj(), {
  validate,
  validateSelf,
  isPlaceholder,
  JWT_KEYS,
  EMPTY_OK_KEYS,
}

### Community 160 - "adminService.test.js"
Cohesion: 0.40
Nodes (4): AdminService, Company, Role, User

### Community 161 - "authService.test.js"
Cohesion: 0.40
Nodes (4): authService, Feedback, logger, User

### Community 162 - "teamService.test.js"
Cohesion: 0.40
Nodes (4): Company, Team, TeamService, User

### Community 163 - "tools.routes.test.js"
Cohesion: 0.40
Nodes (4): app, express, request, toolRoutes

### Community 164 - "health-monitor.sh"
Cohesion: 0.83
Nodes (3): check_health(), health-monitor.sh script, should_run()

### Community 165 - "pattern-consolidator.sh"
Cohesion: 0.83
Nodes (3): consolidate_patterns(), pattern-consolidator.sh script, should_run()

### Community 166 - "koreanComplianceService.js"
Cohesion: 0.50
Nodes (3): apifyService, DocumentProcessingPipeline, logger

### Community 167 - "selfImprovingLoop.test.js"
Cohesion: 0.50
Nodes (3): Feedback, logger, {
  startLoopEngine,
  stopLoopEngine,
  runLoopCycle,
  submitFeedback,
  getEngineStatus,
  predictAccuracy,
}

### Community 168 - "flexportLogisticsAdapter.test.js"
Cohesion: 0.50
Nodes (3): flexportAdapter, kafkaMock, logger

### Community 169 - "hubspotCrmAdapter.test.js"
Cohesion: 0.50
Nodes (3): hubspotAdapter, kafkaMock, logger

### Community 170 - "oracleProductAdapter.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, oracleAdapter

### Community 171 - "restApiAdapter.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, restApiAdapter

### Community 172 - "salesforceCrmAdapter.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, salesforceAdapter

### Community 173 - "sapProductAdapter.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, sapAdapter

### Community 174 - "shipbobLogisticsAdapter.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, shipbobAdapter

### Community 175 - "documentProcessingPipeline.test.js"
Cohesion: 0.50
Nodes (3): docPipeline, kafkaMock, logger

### Community 177 - "aiIntelligenceService.test.js"
Cohesion: 0.50
Nodes (3): aiIntelligenceService, kafkaMock, logger

### Community 178 - "apifyService.test.js"
Cohesion: 0.50
Nodes (3): { ApifyClient }, apifyService, logger

### Community 179 - "composioService.test.js"
Cohesion: 0.50
Nodes (3): { Composio }, composioService, logger

### Community 180 - "customizationService.test.js"
Cohesion: 0.50
Nodes (3): customizationService, kafkaMock, logger

### Community 181 - "customsEngineService.apify.test.js"
Cohesion: 0.50
Nodes (3): apifyService, customsEngine, logger

### Community 182 - "koreanComplianceService.apify.test.js"
Cohesion: 0.50
Nodes (3): apifyService, koreanCompliance, logger

### Community 184 - "koreanMarketAnalysisService.apify.test.js"
Cohesion: 0.50
Nodes (3): apifyService, koreanMarketAnalysis, logger

### Community 185 - "sourcingService.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, sourcingService

### Community 186 - "workflowAutomationService.test.js"
Cohesion: 0.50
Nodes (3): kafkaMock, logger, workflowAutomationService

### Community 187 - "serviceRunner.test.js"
Cohesion: 0.50
Nodes (3): defaultRunner, logger, { ServiceRunner }

## Knowledge Gaps
- **768 isolated node(s):** `ADRS`, `__filename`, `__dirname`, `PROJECT_ROOT`, `DATA_DIR` (+763 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AnalysisAgent` connect `AnalysisAgent` to `hermesAgent.js`, `sentryService.js`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `MarketIntelligenceAgent` connect `MarketIntelligenceAgent` to `hermesAgent.js`, `sentryService.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `ResearchAgent` connect `ResearchAgent` to `hermesAgent.js`, `sentryService.js`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `ADRS`, `__filename`, `__dirname` to the rest of the system?**
  _768 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LearningService` be split into smaller, more focused modules?**
  _Cohesion score 0.06887755102040816 - nodes in this community are weakly interconnected._
- **Should `statusline.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08456659619450317 - nodes in this community are weakly interconnected._
- **Should `intelligence.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.10661268556005399 - nodes in this community are weakly interconnected._