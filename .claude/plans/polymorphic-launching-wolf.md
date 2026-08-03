# SokogateOS Service Refactoring & Observability Plan

## Context
This plan addresses three key improvement areas identified in the sokogateOS system analysis:
1. Service Cohesion Improvement - Refactor low-cohesion modules (LearningService: 0.07, statusline.cjs: 0.085 cohesion)
2. Observability Enhancement - Implement OpenTelemetry for distributed tracing  
3. Configuration Centralization - Evaluate and implement centralized configuration service

The analysis revealed that while sokogateOS has a strong architectural foundation, there are opportunities to improve modularity, observability, and configuration management.

## Phase 1: Service Cohesion Improvement

### Target Modules for Refactoring
Based on graph analysis showing low cohesion scores:
1. `.claude/helpers/learning-service.mjs` (0.07 cohesion) - Complex ML/HNSW learning system
2. `.claude/helpers/statusline.cjs` (0.085 cohesion) - Complex status bar implementation
3. `.claude/helpers/intelligence.cjs` - Knowledge graph/PageRank system

### Approach for Each Module

#### 1. Learning Service Refactoring
**Current Issues:**
- Single file (~1150 lines) handling multiple responsibilities:
  - HNSW index management
  - Embedding generation (ONNX/fallback)
  - Database operations (SQLite)
  - Pattern storage/retrieval/promotion
  - Consolidation logic
  - CLI interface

**Refactoring Plan:**
Split into focused modules:
- `learning-service/core/LearningService.js` - Main orchestration
- `learning-service/storage/PatternDatabase.js` - SQLite operations
- `learning-service/indexing/HNSWManager.js` - HNSW index operations
- `learning-service/embedding/EmbeddingService.js` - ONNX/fallback embeddings
- `learning-service/utils/ConsolidationManager.js` - Pattern consolidation logic
- `learning-service/cli/LearningServiceCLI.js` - Command line interface

**Benefits:**
- Improved testability (each module can be unit tested independently)
- Better separation of concerns
- Easier maintenance and evolution
- Clearer interfaces between components

#### 2. Statusline Refactoring
**Current Issues:**
- Single file (~1000 lines) handling:
  - CLI binary resolution and caching
  - Data fetching from multiple sources (CLI, filesystem, memdb)
  - Local overlays for missing data
  - Promo/funnel rendering logic
  - ANSI color management
  - Git integration
  - Stdin data parsing
  - Status line rendering (3-line format)

**Refactoring Plan:**
Split into focused modules:
- `statusline/core/StatuslineGenerator.js` - Main orchestration
- `statusline/services/CliDataService.js` - CLI communication and caching
- `statusline/services/LocalDataService.js` - Filesystem/local data retrieval
- `statusline/services/PromoService.js` - Promo/funnel row generation
- `statusline/utils/AnsiFormatter.js` - Color and formatting utilities
- `statusline/utils/GitUtils.js` - Git information extraction
- `statusline/utils/StdinParser.js` - Stdin data parsing
- `statusline/renderers/StatuslineRenderer.js` - Final output generation

**Benefits:**
- Each concern isolated and testable
- Easier to modify individual aspects (e.g., promo logic)
- Better caching strategies per service type
- Clearer data flow

#### 3. Intelligence Layer Refactoring
**Current Issues:**
- Single file (~800 lines) handling:
  - Memory entry processing and deduplication
  - Graph building and edge creation
  - PageRank computation
  - Session state management
  - Consensus and consolidation logic
  - Statistics and reporting

**Refactoring Plan:**
Split into focused modules:
- `intelligence/core/IntelligenceEngine.js` - Main orchestration
- `intelligence/storage/MemoryStore.js` - Memory entry management
- `intelligence/graph/GraphBuilder.js` - Node/edge creation
- `intelligence/analytics/PageRankComputer.js` - PageRank algorithms
- `intelligence/storage/SessionManager.js` - Session state handling
- `intelligence/processing/InsightProcessor.js` - Pending insights processing
- `intelligence/reporting/StatisticsGenerator.js` - Stats and reporting
- `intelligence/utils/DeduplicationUtils.js` - Content-based and deduping Phase 2: Observability Enhancement

** for tracing
- Currently using Sentry for and tracesSampleRate: 0.content/id deduplication

**Benefits:**
- Isolation of complex algorithms (PageRank, deduplication)
- Better test coverage for mathematical components
- Clear separation of data storage vs processing
- Easier to swap algorithms (e.g., different ranking approaches)

### Implementation Approach
1. **Extract Interface First** - Define clear interfaces between modules before implementation
2. **Maintain Backward Compatibility** - Ensure existing CLI usage and API contracts remain unchanged
3. **Incremental Refactoring** - Move one responsibility at a time with tests
4. **Preserve Performance** - Ensure refactoring doesn't degrade performance characteristics
5. **Add Unit Tests** - Create test suite for each new module

## Phase 2: Observability Enhancement

### Current State
- Sentry.io integration for error tracking and basic performance tracing
- Basic Winston logging in `src/utils/logger.js`
- No distributed tracing across service boundaries
- No trace propagation between frontend/backend/services

### Target State
- OpenTelemetry implementation for distributed tracing
- Trace context propagation across all service boundaries
- Integration with existing logging and monitoring
- Custom metrics for business logic tracking
- Export capabilities to multiple backends (Jaeger, Zipkin, OTLP)

### Implementation Plan

#### 1. Core Tracing Infrastructure
Create `src/observability/tracing/TracerProvider.js`:
- Initialize OpenTelemetry SDK with appropriate resource attributes
- Configure SDK configuration (sampling, exports, etc.)
- Provide singleton tracer instance for application use

Create `src/observability/tracing/Instrumentation.js`:
- Automatic instrumentation for common libraries (Express, PostgreSQL, Redis, etc.)
- Custom instrumentation for business logic spans
- Context propagation utilities

#### 2. Express Middleware Integration
Create `src/middleware/tracing/TracingMiddleware.js`:
- Request/response tracing for HTTP endpoints
- Automatic span creation for incoming requests
- Context extraction from headers (traceparent, tracestate)
- Error handling and status recording
- Integration with request logging

#### 3. Service Client Instrumentation
Create instrumentation helpers for:
- **Database Clients** (`src/observability/instrumentation/DatabaseInstrumentation.js`)
  - PostgreSQL query spanning
  - Connection pooling metrics
- **HTTP Clients** (`src/observability/instrumentation/HttpClientInstrumentation.js`)
  - Outgoing HTTP request spanning
  - Redis, Kafka, external API call tracing
- **Message Queues** (`src/observability/instrumentation/MessageQueueInstrumentation.js`)
  - Producer/consumer spans
  - Message processing tracking

#### 4. Custom Business Metrics
Create `src/observability/metrics/BusinessMetrics.js`:
- Custom counters for key business operations
- Histograms for latency measurements
- Gauges for system state metrics
- Integration with OpenTelemetry Meter API

#### 5. Exporter Configuration
Create `src/observability/exporters/ExporterConfig.js`:
- Configuration for multiple export destinations:
  - Console (development)
  - OTLP (production - Jaeger/Tempo/etc.)
  - File (for debugging)
- Environment-based configuration switching

#### 6. Integration Points
Modify existing code to:
- Add trace context to logger (traceID, spanID in log records)
- Instrument service initialization and shutdown
- Add spans to critical business logic flows
- Ensure proper error recording in spans

### Implementation Approach
1. **Start with Library Instrumentation** - Auto-instrument common dependencies
2. **Add Manual Instrumentation** - Critical business flows and service boundaries
3. **Configure Exporters** - Set up appropriate backends for different environments
4. **Create Dashboards** - Define key metrics and traces to monitor
5. **Validate and Tune** - Ensure sampling rates and performance are appropriate

## Phase 3: Configuration Centralization

### Current State
- Configuration scattered across multiple files:
  - `src/config/constants.js` - Application constants
  - `src/config/database.js` - Database connection config
  - `src/config/kafka.js` - Kafka producer/consumer config
  - `src/config/redis.js` - Redis client config
  - Environment variables accessed directly via `process.env`
  - Service-specific configs embedded in service files
  - Hardcoded values throughout codebase

### Target State
- Centralized configuration service with:
  - Strong typing and validation
  - Environment-specific configuration layers
  - Runtime configuration reloading capability
  - Secret management integration
  - Default value handling and validation
  - Configuration change notifications

### Implementation Plan

#### 1. Configuration Service Core
Create `src/config/ConfigurationService.js`:
- Singleton configuration manager
- Environment variable parsing with type conversion
- Configuration validation using schemas (Zod/Joi)
- Default value management
- Change event emission
- Secure handling of sensitive values

#### 2. Configuration Sources
Implement layered configuration loading:
1. **Defaults** - Hardcoded default values in code
2. **Environment Files** - `.env`, `.env.development`, `.etc`
3. **Environment Variables** - Process environment overrides
4. **Secrets Manager** - Integration with secret stores (AWS Secrets Manager, HashiCorp Vault, etc.)
5. **Remote Configuration** - Optional: Consul, etcd, or custom config service

#### 3. Configuration Schema Definition
Create schema definitions for:
- **Database Configuration** - Connection pooling, timeouts, retry policies
- **Kafka Configuration** - Producer/consumer settings, security protocols
- **Redis Configuration** - Connection pooling, cluster mode, TLS
- **Service Configuration** - Timeouts, retries, circuit breaker settings
- **Feature Flags** - Toggle functionality per environment
- **Third-party API Config** - External service credentials and endpoints

#### 4. Migration Strategy
Gradual migration approach:
1. **Phase 1**: Create configuration service, migrate simplest configs first (constants)
2. **Phase 2**: Move database, Kafka, Redis configurations
3. **Phase 3**: Migrate service-specific configurations
4. **Phase 4**: Replace direct `process.env` usage throughout codebase
5. **Phase 5**: Add advanced features (validation, caching, hot reloading)

#### 5. Usage Pattern
Services will access configuration via:
```javascript
const config = ConfigurationService.getInstance();
const dbConfig = config.getDatabase();
const kafkaConfig = config.getKafka();
// Strongly typed access with validation
```

### Implementation Approach
1. **Start Small** - Begin with migrating constant values to config service
2. **Validate Approach** - Ensure performance and reliability meet requirements
3. **Expand Gradually** - Move more complex configurations as confidence grows
4. **Maintain Compatibility** - Ensure existing code continues to work during transition
5. **Add Comprehensive Tests** - Validate configuration loading, validation, and error handling

## Detailed Implementation Roadmap

### Week 1-2: Foundation Work
1. **Create Implementation Plan** (Complete - this document)
2. **Set up Development Environment** - Ensure testing and build tools are ready
3. **Create Package.json Updates** - Add required dependencies:
   - OpenTelemetry packages (`@opentelemetry/api`, `@opentelemetry/sdk-node`, etc.)
   - Configuration validation library (Zod or Joi)
   - Additional testing utilities if needed

### Week 3-4: Service Cohesion - Phase 1
1. **Start with Learning Service** (highest impact, clearest boundaries)
   - Create module structure and interfaces
   - Extract EmbeddingService first (most isolated concern)
   - Extract HNSWManager next
   - Extract PatternDatabase
   - Finally refactor main LearningService to use new modules
2. **Write Unit Tests** for each extracted module
3. **Verify Backward Compatibility** - CLI and programmatic usage unchanged

### Week 5-6: Service Cohesion - Phase 2
1. **Refactor Statusline** 
   - Start with CliDataService and LocalDataService
   - Extract PromoService
   - Extract ANSI formatting and Git utilities
   - Refactor main generator to use services
2. **Update Tests** for new structure
3. **Verify CLI Behavior** identical to original

### Week 7-8: Service Cohesion - Phase 3 & Observability - Phase 1
1. **Refactor Intelligence Layer** 
   - Start with storage and graph building modules
   - Extract PageRank computation
   - Separate session management and insight processing
2. **Begin Observability Implementation**
   - Set up TracerProvider and basic instrumentation
   - Add Express middleware for request tracing
   - Instrument database client connections

### Week 9-10: Observability - Phase 2 & Configuration - Phase 1
1. **Complete Observability Implementation**
   - Instrument HTTP clients, message queues
   - Add custom business metrics
   - Configure exporters for different environments
   - Integrate tracing with logging (trace IDs in logs)
2. **Start Configuration Centralization**
   - Create ConfigurationService core
   - Begin migrating simplest configurations (constants, feature flags)
   - Add basic validation and type safety

### Week 11-12: Configuration - Phase 2 & Integration
1. **Complete Configuration Migration**
   - Move database, Kafka, Redis configurations
   - Migrate service-specific configurations
   - Replace direct process.env usage
2. **Add Advanced Configuration Features**
   - Runtime change notifications
   - Secret manager integration (stub for future)
   - Configuration caching layer
3. **End-to-End Testing**
   - Verify all three improvements work together
   - Performance benchmarking
   - Documentation updates

## Risk Mitigation

### Technical Risks
1. **Performance Degradation** - Mitigation: Benchmark before/after each refactoring step
2. **Breaking Changes** - Mitigation: Maintain backward compatibility, comprehensive test suite
3. **Increased Complexity** - Mitigation: Clear module boundaries, documentation, interface definitions
4. **Observability Overhead** - Mitigation: Configure appropriate sampling rates, lightweight instrumentation

### Schedule Risks
1. **Scope Creep** - Mitigation: Strict adherence to defined phases, regular checkpoints
2. **Underestimation of Complexity** - Mitigation: Start with simplest components, build confidence
3. **Dependency Conflicts** - Mitigation: Careful version management, thorough testing in integration

## Success Metrics

### Service Cohesion
- Improved module cohesion scores (target: >0.3 for refactored modules)
- Reduced file sizes (target: avg < 400 lines per module)
- Increased unit test coverage (target: >80% for new modules)
- Maintained or improved performance benchmarks

### Observability
- Distributed traces visible across service boundaries
- Trace context propagated in logs
- Custom business metrics collected and exportable
- Minimal performance impact (<5% overhead)

### Configuration
- Reduced number of direct process.env calls (target: <10 remaining)
- Centralized validation prevents misconfiguration
- Environment-specific configurations work correctly
- No runtime configuration errors in production

## Dependencies

### New Packages Required
```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.4.0",
    "@opentelemetry/sdk-node": "^0.39.0",
    "@opentelemetry/auto-instrumentations-node": "^0.39.0",
    "@opentelemetry/exporter-trace-otlp-grpc": "^0.39.0",
    "@opentelemetry/resources": "^1.13.0",
    "@opentelemetry/semantic-conventions": "^1.13.0",
    "zod": "^3.21.0"  // or joi for validation
  },
  "devDependencies": {
    "@types/node": "^18.11.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"  // if using TypeScript
  }
}
```

## Files to be Created/Modified

### Service Cohesion Refactoring
```
learning-service/
  src/
    core/
      LearningService.js
    storage/
      PatternDatabase.js
    indexing/
      HNSWManager.js
    embedding/
      EmbeddingService.js
    utils/
      ConsolidationManager.js
    cli/
      LearningServiceCLI.js

statusline/
  src/
    core/
      StatuslineGenerator.js
    services/
      CliDataService.js
      LocalDataService.js
      PromoService.js
    utils/
      AnsiFormatter.js
      GitUtils.js
      StdinParser.js
    renderers/
      StatuslineRenderer.js

intelligence/
  src/
    core/
      IntelligenceEngine.js
    storage/
      MemoryStore.js
    graph/
      GraphBuilder.js
    analytics/
      PageRankComputer.js
    storage/
      SessionManager.js
    processing/
      InsightProcessor.js
    reporting/
      StatisticsGenerator.js
    utils/
      DeduplicationUtils.js
```

### Observability Enhancement
```
src/
  observability/
    tracing/
      TracerProvider.js
      Instrumentation.js
    middleware/
      tracing/
        TracingMiddleware.js
    instrumentation/
      DatabaseInstrumentation.js
      HttpClientInstrumentation.js
      MessageQueueInstrumentation.js
    metrics/
      BusinessMetrics.js
    exporters/
      ExporterConfig.js
```

### Configuration Centralization
```
src/
  config/
    ConfigurationService.js
    schemas/
      databaseSchema.js
      kafkaSchema.js
      redisSchema.js
      serviceSchema.js
      featureFlagsSchema.js
    loaders/
      EnvFileLoader.js
      EnvironmentVariableLoader.js
      SecretManagerLoader.js
    watchers/
      FileWatcher.js
```

## Conclusion

This plan provides a structured approach to improving the sokogateOS system across three critical dimensions:
1. **Modularity and Maintainability** through service refactoring
2. **Observability and Monitoring** through OpenTelemetry implementation
3. **Configuration Management** through centralized configuration service

Each phase builds upon the previous, allowing for incremental delivery of value while minimizing risk. The approach emphasizes maintaining backward compatibility, thorough testing, and measurable improvements in code quality and system observability.

By following this plan, sokogateOS will evolve toward a more maintainable, observable, and configurable architecture while preserving its existing strengths and functionality.