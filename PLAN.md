# Autonomous AI Agent Engine Implementation Plan

## Overview
SokogateOS is a fully built autonomous AI agent engine with:
- Chat Agent interface (conversational AI) — ✅ IMPLEMENTED
- Specialized Agents library (domain-specific trade operations) — ✅ IMPLEMENTED
- Agent spawning and management system — ✅ IMPLEMENTED
- Inter-agent communication mechanism — ✅ IMPLEMENTED
- Integration with existing Self-Improving Loop and LangChain Orchestrator — ✅ IMPLEMENTED

## Current State (All Implemented)

### 1. Self-Improving Loop Engine ✅
**Location:** `./src/engine/selfImprovingLoop.js`
- Continuous improvement cycle: collect feedback → analyze → retrain → track
- Memory layer for agent learning
- Running with 5-minute intervals
- API endpoints: `/api/engine/status`, `/api/engine/run-cycle`, `/api/engine/feedback`

### 2. LangChain Orchestrator ✅
**Location:** `./src/services/langchainOrchestrator.js`
- Task orchestration with RAG context
- Workflow chaining: sourcing-match → customization-price → logistics-route
- Functions: `runTaskWithRAG()`, `updateWorkflow()`, `getTaskContext()`, `submitFeedback()`

### 3. External Service Integration ✅
- Graceful degradation for Kafka/MongoDB/QMe
- JWT-based authentication with RBAC + ABAC
- Multiple service adapters (WhatsApp, Supplier Trust, Customs, M-Pesa, etc.)

### 4. Chat Agent Interface ✅
**Location:** `src/agents/chatAgent.js`
- Natural language understanding for trade operations ✅
- Intent recognition and entity extraction ✅
- Context-aware responses using company knowledge graph ✅
- Integration with existing LLM capabilities ✅
- Handoff to specialized agents for complex tasks ✅

### 5. Specialized Agents Library ✅
**Location:** `src/agents/specialized/`
- `SourcingAgent` — Product discovery, supplier verification, price negotiation ✅
- `CustomizationAgent` — Design parsing, manufacturing instructions, quality control ✅
- `LogisticsAgent` — Route optimization, inventory forecasting, real-time tracking ✅
- `ComplianceAgent` — Regulatory checking, documentation automation, risk assessment ✅
- `NegotiationAgent` — Contract terms, payment terms, supplier relationships ✅

### 6. Agent Spawning & Management System ✅
**Location:** `src/agents/agentManager.js`
- Agent registry and discovery ✅
- Dynamic spawning based on workload ✅
- Health monitoring and restart policies ✅
- Resource allocation and limits ✅
- Integration with Ruflo swarm coordination ✅

### 7. Inter-Agent Communication Mechanism ✅
**Location:** `src/agents/communication.js`
- Message passing via Kafka topics ✅
- Request/response patterns ✅
- Event broadcasting for system-wide updates ✅
- Dead letter queues for failed messages ✅
- Message persistence and replay capability ✅
- **Hermes-mediated routing** — messages can be routed through a central Hermes agent for coordinated intelligence, with automatic fallback to direct messaging

### 8. Hermes Agent System ✅
**Location:** `src/services/hermes/`
- `ResearchAgent` — Market trends, competitor analysis, supplier/buyer intelligence
- `AnalysisAgent` — Data analysis, onboarding personalization, error trends, system health
- `OptimizationAgent` — Performance tuning, resource utilization, cost efficiency
- `ComplianceAgent` — GDPR, CCPA, PCI DSS, ISO 27001, SOC 2, local data protection
- `MarketIntelligenceAgent` — Market trends, competitor analysis, customer insights, pricing intelligence

### 9. Backend Infrastructure ✅
- JWT Authentication with refresh tokens and token versioning ✅
- Role-Based Access Control (RBAC) with dynamic role documents ✅
- Attribute-Based Access Control (ABAC) policy engine ✅
- Rate limiting for auth and API routes ✅
- Centralized error handling with AppError class ✅
- CORS middleware ✅
- Validation with Joi ✅
- PostHog analytics tracking ✅
- Sentry error tracking ✅

### 10. API Routes ✅
- `/api/auth` — Authentication ✅
- `/api/agents` — Agent management ✅
- `/api/teams` — Team/workspace management ✅
- `/api/admin` — Admin operations ✅
- `/api/whatsapp` — WhatsApp commerce ✅
- `/api/trust` — Supplier Trust Network ✅
- `/api/customs` — Customs Engine ✅
- `/api/contacts` — Contact management ✅
- `/api/accounts` — Account management ✅
- `/api/sequences` — Sequence management ✅
- `/api/enrollments` — Enrollment management ✅
- `/api/v1` — Core v1 REST API (sourcing, customization, logistics, ERS, Korean compliance, market analysis) ✅
- `/api/hermes` — Hermes agent system status/control ✅
- `/api/engine` — Self-Improving Loop control ✅

### 11. Frontend ✅
- Landing page with hero, features, pricing, FAQ, live AI activity feed ✅
- Dashboard with stats cards, real-time activity feed, system health ✅
- Dark mode with system preference detection and localStorage persistence ✅
- Toast notification system (success, error, warning, info) ✅
- SVG icon system in sidebar ✅
- Full procurement dashboard with sourcing forms and supplier cards ✅
- Full logistics dashboard with shipment tracking and route optimization ✅
- Full executive dashboard with KPIs and investor highlights ✅
- Full QMe task runner with workflow orchestration and RAG feedback ✅
- Full WhatsApp commerce copilot with conversations, NLP, M-Pesa ✅
- Full Supplier Trust Network with search, reviews, trust scores ✅
- Full customs engine with HS classification, duty calculation, compliance ✅
- Full Hermes admin page for agent monitoring ✅
- Terms of Service, Privacy Policy, Terms Acceptance pages ✅
- Login/Register page ✅

### 12. Korean-Africa Corridor ✅
- Korean compliance checker (HACCP, Halal, phytosanitary, etc.) ✅
- Korean market analysis service (top imports, opportunities, trends) ✅
- Export Readiness Score (ERS) calculator ✅
- Controller and route integration ✅

### 13. Agent Tool Integration Layer (Apify + Composio) ✅
**Location:** `src/services/composioService.js`, `src/services/toolRegistry.js`

**Composio Service** (`composioService.js`) — Centralized wrapper around Composio SDK for connecting AI agents to 200+ external tools:
- Session management (`createSession`, `getTools`) ✅
- Account authentication (`connectAccount`, `listConnectedAccounts`, `disconnectAccount`) ✅
- Direct tool execution (`executeTool`, `proxyExecute`) ✅
- Agent-aware toolkit mapping (`AGENT_TOOLKIT_MAP` — sourcing, logistics, compliance, etc.) ✅
- Graceful degradation when `COMPOSIO_API_KEY` is not set ✅
- Safe module loading with try/catch for ESM compatibility ✅
- Cached `listAvailableToolkits` (5-min TTL) ✅
- Health check endpoint integration ✅

**Unified Tool Registry** (`toolRegistry.js`) — Combines Apify, Composio, and local tools:
- 19+ registered tools across 8 categories (sourcing, compliance, logistics, market intelligence, etc.) ✅
- `getToolsForAgent(agentType, userId)` — returns merged local + Apify + Composio tools ✅
- `registerTool(name, definition)` — runtime tool registration ✅
- `listTools(filters)` — filterable tool listing ✅
- Wired into `agentService.getStats()` ✅
- Mapped to health check endpoint ✅

**Tests:**
- `tests/services/composioService.test.js` — 28 tests (sessions, accounts, tool execution, graceful degradation) ✅
- `tests/services/toolRegistry.test.js` — 26 tests (tool definitions, category mapping, agent queries, registration) ✅
- **Result: 39 suites, 613 tests — all passing** ✅

## Future Enhancements

### Phase 2: Chat Interface & Additional Agents
- [x] Build Chat Agent with NLP capabilities — DONE
- [x] Implement CustomizationAgent and LogisticsAgent — DONE
- [x] Add agent discovery and registry — DONE
- [x] Create agent health monitoring — DONE
- [x] Implement basic task delegation from chat to specialists — DONE

### Phase 3: Advanced Features & Integration
- [x] Implement ComplianceAgent and NegotiationAgent — DONE
- [x] Add sophisticated inter-agent workflows — DONE
- [x] Enhance self-improving loop with agent-specific feedback — DONE
- [x] Create agent performance metrics and tracking — DONE
- [x] Add agent-specific endpoints to API — DONE

### Phase 4: Testing & Optimization
- [x] Expand test coverage for all agent systems ✅
  - `tests/agentManager.test.js` — 25 tests (agent lifecycle, task assignment, health monitoring)
  - `tests/agentMemory.test.js` — 18 tests (short/long-term memory, search, consolidation)
  - `tests/chatAgent.test.js` — 40 tests (NLP, intent detection, entity extraction, handoff)
  - `tests/services/agentService.test.js` — 14 tests (initialization, agent type registration)
  - `tests/engine/selfImprovingLoop.test.js` — 14 tests (collect→analyze→retrain→track pipeline)
  - `tests/services/authService.test.js` — 22 tests (register, login, tokens, password mgmt)
  - `tests/middleware/auth.test.js` — 17 tests (JWT verify, optional auth, RBAC, scoping)
  - Fixed: `tests/team.model.test.js`, `jest.config.js` (exclude `.worktrees/`)
  - **Result: 36 suites, 476 tests — all passing**
- [x] Migrate ingestion adapters to ServiceRunner ✅
  - Converted **25 `setInterval` calls → `serviceRunner.start()`** across 10 files:
    - 9 ingestion adapters: `sapProductAdapter`, `shipbobLogisticsAdapter`, `supplierRiskAdapter`, `hubspotCrmAdapter`, `oracleProductAdapter`, `restApiAdapter`, `krwPaymentAdapter`, `flexportLogisticsAdapter`, `salesforceCrmAdapter`
    - 1 document processor: `documentProcessingPipeline`
  - Each adapter now gets backpressure, error isolation, graceful shutdown, and metrics tracking
  - Updated 8 test files to mock `ServiceRunner` for synchronous handler execution
  - **Result: All 27 ingestion adapter tests — passing**
- [x] Add unit tests for ServiceRunner utility ✅
  - `tests/utils/serviceRunner.test.js` — **31 tests** covering:
    - `start()` — registration, handler invocation, duplicate prevention, `immediate` option
    - `stop()` — cleanup, prevents future calls, missing service warning
    - `dispose()` — stops all services, safe for empty/multiple calls
    - `getStatus()` — empty state, run/error counts, duration tracking
    - Backpressure — skips overlapping ticks, resumes after handler completes
    - Error isolation — silent mode, interval survives errors, `running` flag reset
    - Metrics — run count, lastRunAt, lastDurationMs across ticks
    - Singleton & class — independent `new ServiceRunner()` instances
  - **Result: 45 test suites, 500+ tests — all passing**
- [ ] End-to-end testing of agent workflows
- [ ] Performance optimization and resource tuning
- [x] Security review and hardening ✅
  - **PASS 1 — 10 vulnerabilities fixed**:
    - CRITICAL: `trackSignUp`/`trackActivation` undefined in auth routes
    - CRITICAL: Sentry circular dependency (`require('../../index')` at module load)
    - HIGH: Password reset token leaked in production (now dev-only)
    - HIGH: Refresh token rotation timing race (inc version BEFORE generating tokens)
    - HIGH: Inline CORS only handled single origin — migrated to dedicated `cors.js`
    - HIGH: Password strength validation on change/reset routes
    - HIGH: ABAC company scoping `.equals()` crash on string companyId
    - HIGH: Rate limiting applied to all API routes (was missing on 10+ routes)
    - MEDIUM: JWT sign now explicitly specifies HS256 algorithm
    - MEDIUM: Terms version validated (semver format check)
  - **PASS 2 — 2 additional issues fixed**:
    - HIGH: `accept-terms` route — `result` referenced before `authService.acceptTerms()` call (ReferenceError)
    - MEDIUM: Sentry `requestHandler()` and `errorHandler()` never wired in middleware stack
  - **Audit scope**: middleware ordering, RBAC ownership edge cases, input validation gaps, Sentry integration, CORS, rate limiting, helmet, error handler
  - **Result: 36 suites, 476 tests — all passing**
- [x] Documentation and knowledge transfer ✅
  - `docs/ARCHITECTURE.md` — Comprehensive rewrite:
    - Directory structure, agent hierarchy (ChatAgent→Specialized→Hermes→SIL)
    - Service layer (20+ services, 5 categories), API route map (18 groups)
    - Security stack, data flow diagrams, external integrations, frontend arch
    - Testing architecture (45 suites, 500+ tests)
  - `docs/DEPLOYMENT.md` — Production deployment guide:
    - Docker Compose stack, multi-stage Dockerfile, CI/CD pipeline (6 jobs)
    - Monitoring (Prometheus/Grafana/Sentry/PostHog), env vars, production checklist
  - `docs/API.md` — Complete API reference with 35+ endpoints, examples, auth requirements
  - **Review pass**: Fixed directory tree (`agent.js → index.js`), added `.dockerignore` to Docker section
  - **Result: 36 suites, 476 tests — all passing**

- [x] Production deployment preparation ✅
  - **Dockerfile**: Multi-stage build (Node 20), `HEALTHCHECK`, `node` user, `npm prune --production`
  - **docker-compose.yml**: Resource limits, restart policies, version-pinned images, healthcheck dependencies, YAML anchors, env-var-secured credentials
  - **CI workflow**: `npm ci` (frozen lockfile), security-audit stage (`npm audit`), build on master-only
  - **Logger**: Rotating file transports (10MB/10 files), JSON in production, colorized in dev, absolute paths
  - **Prometheus**: Scrape config with metric filtering, alerting skeleton, retention policy
  - **Health check**: `GET /health`, `GET /health/live`, `GET /health/checks` — full service monitoring
  - **Result: All 36 test suites, 476 tests — passing**

## Technical Architecture

### Agent Base Class (`src/agents/baseAgent.js`)
```javascript
class BaseAgent {
  constructor(options) { ... }
  async initialize() { ... }
  async executeTask(task) { ... }
  async handleMessage(message) { ... }
  async handleIncomingMessage(message) { ... }
  shutdown() { ... }
}
```

### Agent Manager (`src/agents/agentManager.js`)
```javascript
class AgentManager {
  constructor() { ... }
  registerAgentType(type, constructor) { ... }
  async spawnAgent(type, options) { ... }
  async assignTaskToAgent(task) { ... }
  selectOptimalAgent(task) { ... }
  startAgentHealthMonitor(agent) { ... }
}
```

### Communication System (`src/agents/communication.js`)
```javascript
class AgentCommunication {
  constructor(agentId, options) { ... }
  async initialize() { ... }
  async sendMessage(targetAgentId, message, routeViaHermes) { ... }
  async broadcastMessage(message) { ... }
}
```
