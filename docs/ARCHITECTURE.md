# SokogateOS — System Architecture

> **Version**: 1.0.0  
> **Updated**: 2026-06-24

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Directory Structure](#3-directory-structure)
4. [Core Architecture](#4-core-architecture)
5. [Service Layer](#5-service-layer)
6. [Agent System](#6-agent-system)
7. [API Layer](#7-api-layer)
8. [Authorization & Security](#8-authorization--security)
9. [Data Flow](#9-data-flow)
10. [External Integrations](#10-external-integrations)
11. [Frontend Architecture](#11-frontend-architecture)

---

## 1. Overview

SokogateOS is an **AI Operating System** that makes companies legible to AI and turns company artifacts into self-improving loops. It serves African wholesalers, importers, exporters, and procurement managers with three core services: bulk products sourcing, product customization, and cross-border logistics.

### Design Principles

- **Graceful degradation**: Every external dependency (Kafka, MongoDB, etc.) can fail without crashing the system
- **Self-improving**: Feedback loops continuously optimize every component
- **Agent-driven**: Specialized AI agents handle domain-specific operations with Hermes-level orchestration
- **Multi-modal communication**: WhatsApp, web, API, and SMS interfaces
- **Security-first**: JWT authentication, RBAC + ABAC authorization, rate limiting, input validation

---

## 2. Technology Stack

| Layer            | Technology                               |
|------------------|------------------------------------------|
| **Runtime**      | Node.js 20+, Express.js                  |
| **Databases**    | PostgreSQL 16, MongoDB 7, Redis 7        |
| **AI/ML**        | LangChain, OpenAI GPT-4, Natural.js      |
| **Messaging**    | Apache Kafka 3.x / Confluent 7.7         |
| **Storage**      | MinIO (S3-compatible)                    |
| **Auth**         | JWT, bcrypt, RBAC, ABAC policy engine    |
| **Monitoring**   | Sentry, PostHog, Prometheus, Grafana     |
| **Containers**   | Docker, Docker Compose                   |
| **Frontend**     | React 18, Vite, Tailwind CSS 3           |
| **Payments**     | M-Pesa Daraja API, KRW payment adapter   |
| **WhatsApp**     | WATI.io API (Business), Twilio           |
| **Scraping**     | Apify                                    |
| **Testing**      | Jest (476+ tests, 36 suites)             |

---

## 3. Directory Structure

```text
sokogateOS/
├── src/
│   ├── index.js                # Express app entry, service orchestrator
│   ├── abac/                   # Attribute-Based Access Control engine
│   │   └── policyEngine.js
│   ├── agents/                 # AI agent system (core differentiator)
│   │   ├── agentManager.js     # Agent lifecycle, spawning, health monitoring
│   │   ├── agentMemory.js      # Short-term + long-term memory per agent
│   │   ├── index.js           # Agent type registry
│   │   ├── baseAgent.js        # Abstract base class for all agents
│   │   ├── chatAgent.js        # Conversational AI with intent recognition
│   │   ├── communication.js    # Kafka-based inter-agent messaging
│   │   └── specialized/
│   │       ├── sourcingAgent.js
│   │       ├── customizationAgent.js
│   │       ├── logisticsAgent.js
│   │       └── negotiationAgent.js
│   ├── api/
│   │   └── v1/routes.js        # Core v1 REST API routes
│   ├── config/
│   │   ├── constants.js        # Application-wide constants
│   │   ├── database.js         # MongoDB connection (graceful)
│   │   └── kafka.js            # Kafka producer/consumer (graceful)
│   ├── engine/
│   │   └── selfImprovingLoop.js # Continuous learning & optimization engine
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication middleware
│   │   ├── rbac.js             # Role-Based Access Control
│   │   ├── abac.js             # Attribute-Based Access Control middleware
│   │   ├── validation.js       # Joi input validation
│   │   ├── cors.js             # CORS configuration
│   │   ├── errorHandler.js     # Centralized error handling
│   │   └── analytics/tracking.js # PostHog engagement tracking
│   ├── models/                 # Mongoose/Mongoose-like models
│   │   ├── user.js, company.js, team.js, role.js
│   │   ├── contact.js, account.js, sequence.js, enrollment.js
│   │   ├── sourcing.js, customization.js, logistics.js
│   │   ├── supplierTrust.js, customsEngine.js
│   │   ├── whatsAppMessage.js, feedback.js, artifact.js
│   │   └── ... (total: ~20 models)
│   ├── routes/                 # Express route handlers
│   │   ├── health.js           # Liveness, readiness probes
│   │   ├── auth.js             # Register, login, logout, refresh
│   │   ├── admin.js            # Admin CRUD, user management, analytics
│   │   ├── teams.js            # Team/workspace management
│   │   ├── agents.js           # Agent management & monitoring
│   │   ├── whatsapp.js         # WhatsApp commerce operations
│   │   ├── supplierTrust.js    # Supplier Trust Network
│   │   ├── customsEngine.js    # Cross-border customs
│   │   ├── contacts.js, accounts.js, sequences.js, enrollments.js  # CRM
│   │   └── ... (total: 12 route files)
│   ├── services/               # All business logic & integrations
│   │   ├── authService.js      # Authentication business logic
│   │   ├── agentService.js     # Agent system management
│   │   ├── adminService.js     # Admin operations
│   │   ├── teamService.js      # Team CRUD & membership
│   │   ├── sourcingService.js  # Bulk product sourcing
│   │   ├── logisticsService.js # Shipping & route optimization
│   │   ├── customizationService.js # Product customization
│   │   ├── customsEngineService.js # HS codes, duties, compliance
│   │   ├── supplierTrustService.js  # Supplier verification & scoring
│   │   ├── whatsappService.js  # WhatsApp messaging orchestration
│   │   ├── watiService.js      # WATI.io API client
│   │   ├── mpesaService.js     # M-Pesa payment integration
│   │   ├── langchainOrchestrator.js # LangChain workflow chaining
│   │   ├── aiIntelligenceService.js # AI market intelligence
│   │   ├── workflowAutomationService.js # Automated workflows
│   │   ├── cloudflareService.js # Cloudflare API integration
│   │   ├── apifyService.js     # Apify scraping orchestration
│   │   ├── contactService.js   # Contact management business logic
│   │   ├── hermes/             # Hermes agent subsystem
│   │   │   └── agents/specialized/
│   │   │       ├── researchAgent.js
│   │   │       ├── analysisAgent.js
│   │   │       ├── optimizationAgent.js
│   │   │       ├── complianceAgent.js
│   │   │       └── marketIntelligenceAgent.js
│   │   ├── compliance/koreanComplianceService.js  # K-Africa corridor
│   │   ├── marketAnalysis/koreanMarketAnalysisService.js
│   │   └── error/sentryService.js  # Sentry error tracking
│   ├── utils/
│   │   ├── logger.js           # Winston with rotation + JSON prod output
│   │   └── posthogClient.js    # PostHog analytics client
│   └── qme/wrapper.js          # QMe task runner interface
├── frontend/                   # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── main.jsx, App.jsx, index.css
│   │   └── pages/              # 10+ dashboard & page components
│   └── ... (Vite config, Tailwind, PostCSS)
├── tests/                      # 36 test suites, 476+ tests
│   ├── services/               # Service-level tests
│   ├── middleware/              # Auth, RBAC tests
│   ├── engine/                 # Self-improving loop tests
│   └── ... (model, agent, route tests)
├── config/
│   └── prometheus.yml          # Prometheus scraping configuration
├── scripts/                    # Automation & tooling scripts
├── docker-compose.yml          # Full production stack
├── Dockerfile                  # Multi-stage production build
├── jest.config.js              # Jest configuration
├── eslint.config.js            # ESLint flat config
└── PLAN.md                     # Implementation roadmap
```

---

## 4. Core Architecture

### 4.1 Server Entry (`src/index.js`)

The server starts in a phased initialization pattern — each phase is wrapped in try/catch for graceful degradation:

```
1. Security middleware (helmet, CORS, rate limiting)
2. Database connection (MongoDB — graceful failure)
3. QMe task runner
4. LangChain orchestrator
5. Hermes agent system
6. Agent service (critical — hard failure on error)
7. Cloudflare service
8. Kafka producer/consumer (graceful failure)
9. All background service adapters
10. Self-improving loop engine
11. API route registration
12. Error handlers + server listen
```

### 4.2 Graceful Degradation Pattern

Every external service follows this pattern:

```javascript
try {
  await connectDB();
} catch (error) {
  logger.warn('Continuing without database:', error.message);
  // System continues in degraded mode
}
```

Services that degrade gracefully: MongoDB, Kafka, QMe, LangChain, Cloudflare, Hermes agents, all ingestion adapters.

### 4.3 Configuration (`src/config/constants.js`)

```javascript
// Pattern: requireSecret for critical values, defaults for non-critical
function requireSecret(key) {
  if (!process.env[key] && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${key} in ${process.env.NODE_ENV}`);
  }
  return process.env[key] || fallback;
}
```

---

## 5. Service Layer

### 5.1 Core Business Services

| Service                      | Purpose                                      | Phase |
|------------------------------|----------------------------------------------|-------|
| `sourcingService`            | Bulk product discovery, supplier matching    | Core  |
| `customizationService`       | Product branding, design customization       | Core  |
| `logisticsService`           | Route optimization, shipment tracking        | Core  |
| `customsEngineService`       | HS classification, duty calc, compliance     | 2     |
| `supplierTrustService`       | Supplier verification, trust scoring         | 1     |
| `workflowAutomationService`  | Automated process workflows                  | Core  |
| `aiIntelligenceService`      | Market trends, competitor analysis           | Core  |

### 5.2 Communication Services

| Service               | Purpose                        | Protocol       |
|-----------------------|--------------------------------|----------------|
| `whatsappService`     | WhatsApp message orchestration | WATI.io + Twilio |
| `watiService`         | WATI.io Business API client    | REST           |
| `twilioService`       | SMS/WhatsApp via Twilio         | REST           |

### 5.3 Payment Services

| Service           | Purpose                    | Region    |
|-------------------|----------------------------|-----------|
| `mpesaService`    | M-Pesa Daraja API          | East Africa |
| `krwPaymentAdapter` | Korean Won payments      | South Korea  |

### 5.4 Data Services

| Service                   | Purpose                             |
|---------------------------|-------------------------------------|
| `apifyService`            | Web scraping & data enrichment      |
| `cloudflareService`       | CDN, DNS, DDoS protection           |
| `langchainOrchestrator`   | LLM workflow chaining with RAG      |
| `contactService`          | Contact/CRM management              |
| `posthogClient`           | Product analytics                   |
| `sentryService`           | Error tracking & performance        |

### 5.5 Korean-Africa Corridor Services

| Service                         | Purpose                                  |
|---------------------------------|------------------------------------------|
| `koreanComplianceService`       | HACCP, Halal, phytosanitary, K-REACH     |
| `koreanMarketAnalysisService`   | Top imports, opportunities, trends       |
| Export Readiness Score (ERS)    | Built into compliance service             |

---

## 6. Agent System

### 6.1 Agent Hierarchy

```
┌─────────────────────────────────────────┐
│              ChatAgent                   │  ← Conversational interface
│  (intent recognition, entity extraction) │
└────────────┬────────────────────────────┘
             │ Handoff
    ┌────────┴────────┬──────────┬──────────┐
    ▼                 ▼          ▼          ▼
┌─────────┐   ┌──────────┐ ┌────────┐ ┌───────────┐
│Sourcing │   │Custom-   │ │Logistics│ │Negotiation│
│Agent    │   │ization   │ │Agent    │ │Agent      │
└─────────┘   └──────────┘ └────────┘ └───────────┘

┌─────────────────────────────────────────┐
│           Hermes Agent System            │  ← Meta-orchestration
│  Research │ Analysis │ Optimization      │
│  Compliance │ Market Intelligence        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│       Self-Improving Loop Engine        │  ← Cross-cutting learning
│  Collect → Analyze → Retrain → Track    │
└─────────────────────────────────────────┘
```

### 6.2 Agent Components

| Component         | File                         | Purpose                                     |
|-------------------|------------------------------|---------------------------------------------|
| **BaseAgent**     | `src/agents/baseAgent.js`    | Abstract class: init, executeTask, handleMessage, shutdown |
| **AgentManager**  | `src/agents/agentManager.js` | Registry, spawning, health monitoring, task assignment |
| **AgentMemory**   | `src/agents/agentMemory.js`  | Short-term + long-term memory per agent instance |
| **AgentService**  | `src/services/agentService.js` | Singleton service wrapping AgentManager lifecycle |
| **ChatAgent**     | `src/agents/chatAgent.js`    | NLP intent recognition (8 patterns), entity extraction, handoff |
| **Communication** | `src/agents/communication.js` | Kafka-based inter-agent messaging with Hermes routing |
| **SourcingAgent** | `src/agents/specialized/`    | Supplier discovery, price negotiation         |
| **Hermes agents** | `src/services/hermes/agents/`| Research, analysis, optimization, compliance, market intel |

### 6.3 Intent Recognition (ChatAgent)

The ChatAgent recognizes 8 intent patterns via regex:

| Intent        | Example Input                               |
|---------------|---------------------------------------------|
| `sourcing`    | "Find suppliers for cotton fabric"          |
| `customization` | "Customize these shirts with our logo"    |
| `logistics`   | "Ship 1000 units to Nairobi"                |
| `compliance`  | "Check regulations for textile imports"     |
| `negotiation` | "Negotiate price with supplier"             |
| `certificate` | "Get certificate of origin"                 |
| `pricing`     | "What's the price for 5000 units?"          |
| `help`        | "How does sourcing work?"                   |

### 6.4 Self-Improving Loop

The engine runs a continuous cycle every 5 minutes:

1. **Collect** — Gather feedback from all agent interactions and service touchpoints
2. **Analyze** — Calculate accuracy trend, categorize feedback (positive/negative/neutral)
3. **Retrain** — Update improvement metrics, trigger optimization
4. **Track** — Store metrics, increment cycle count, update model accuracy prediction

---

## 7. API Layer

### 7.1 Route Map

| Prefix               | Auth Required | Purpose                     |
|----------------------|---------------|-----------------------------|
| `GET /health`        | No            | Liveness probe              |
| `GET /health/live`   | No            | Readiness check             |
| `GET /health/checks` | No            | List all health check definitions |
| `POST /api/auth/register` | No      | User registration           |
| `POST /api/auth/login`    | No      | User login                  |
| `POST /api/auth/logout`   | Yes     | User logout                 |
| `POST /api/auth/refresh`  | Yes     | Token refresh               |
| `GET /api/admin/*`        | Yes     | Admin CRUD, stats, health   |
| `GET /api/teams/*`        | Yes     | Team management             |
| `GET /api/agents/*`       | Yes     | Agent management & monitoring|
| `GET /api/whatsapp/*`     | Yes     | WhatsApp commerce           |
| `GET /api/trust/*`        | Yes     | Supplier Trust Network      |
| `GET /api/customs/*`      | Yes     | Customs Engine              |
| `GET /api/contacts/*`     | Yes     | Contact management          |
| `GET /api/accounts/*`     | Yes     | Account management          |
| `GET /api/sequences/*`    | Yes     | Sequence management         |
| `GET /api/enrollments/*`  | Yes     | Enrollment management       |
| `GET /api/v1/*`           | Yes     | Core REST API (v1)          |
| `GET /api/engine/status`  | No      | Self-improving loop status  |
| `GET /api/hermes/*`       | Yes     | Hermes agent system control |

### 7.2 Response Format

All API responses follow a consistent JSON envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Human-readable message" }

// List with pagination
{ "success": true, "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }
```

### 7.3 Rate Limiting

Rate limiting is applied at two levels — global per-route-prefix and route-specific for sensitive operations:

**Global rate limiters (inter-service):**

| Scope                          | Requests | Window | Block Duration |
|--------------------------------|----------|--------|----------------|
| `/api/auth`                    | 10       | 60s    | 120s           |
| `/api/v1`, `/api/admin`, `/api/teams`, `/api/agents`, `/api/whatsapp`, `/api/trust`, `/api/customs`, `/api/contacts`, `/api/accounts`, `/api/sequences`, `/api/enrollments` | 200 | 60s | 120s |

**Route-specific rate limits (in-memory):**

| Endpoint           | Attempts | Window  |
|--------------------|----------|---------|
| `POST /api/auth/register` | 5  | 15 min  |
| `POST /api/auth/login`    | 10 | 15 min  |
| `POST /api/auth/forgot-password` | 3 | 15 min |

---

## 8. Authorization & Security

### 8.1 Authentication Flow

```
Client → POST /api/auth/login → JWT issued (access + refresh)
       → All subsequent requests: Authorization: Bearer <access_token>
       → POST /api/auth/refresh → New token pair
       → POST /api/auth/logout → Token revocation
```

- **Access token**: 15 min expiry (`JWT_ACCESS_EXPIRY`)
- **Refresh token**: 7 day expiry (`JWT_REFRESH_EXPIRY`)
- **Pasword hashing**: bcrypt with `BCRYPT_ROUNDS` (default: 12)
- **Token versioning**: Each user has a token version; increment on password change/logout

### 8.2 RBAC & ABAC

Two-layer authorization:

| Layer | Mechanism | File           | Purpose                              |
|-------|-----------|----------------|--------------------------------------|
| 1     | RBAC      | `rbac.js`      | Role-based: admin, manager, agent, user |
| 2     | ABAC      | `abac.js`      | Attribute-based: department, region, resource type |

**ABAC Policy Engine** (`src/abac/policyEngine.js`):
- Policies define `effect` (allow/deny), `actions`, `resources`, and `conditions`
- Conditions support operators: `eq`, `neq`, `in`, `gt`, `gte`, `lt`, `lte`, `contains`
- Example policy: `{ "effect": "allow", "actions": ["read"], "resources": ["sourcing:*"], "conditions": { "department": { "eq": "procurement" } } }`

### 8.3 Security Middleware Stack (Execution Order)

```
1. Sentry tracing handler     → Captures request context for performance monitoring
2. helmet()                   → HTTP headers (HSTS, CSP, XSS, etc.)
3. JSON body parsing          → 10MB limit
4. CORS middleware             → Supports comma-separated FRONTEND_URL, proper Vary header
5. Rate limiting               → Auth: 10/60s, All other API: 200/60s
6. PostHog tracking            → Engagement analytics
7. Health check routes         → /health, /health/live, /health/checks
8. JWT authentication          → Required on protected routes, optional on others
9. RBAC/ABAC                   → Route-level + resource-level authorization
10. Validation (Joi)           → Input sanitization at system boundaries
11. 404 handler                → Unmatched routes
12. Sentry error handler       → Captures errors before global handler
13. Global error handler       → Catches + formats all errors
```

---

## 9. Data Flow

### 9.1 Core Transaction Flow

```
User (Web/WhatsApp)
    │
    ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  ChatAgent   │───▶│  LangChain       │───▶│  Specialized │
│  (NLU)       │    │  Orchestrator    │    │  Agent       │
└──────────────┘    └──────────────────┘    └──────────────┘
                           │                       │
                           ▼                       ▼
                    ┌──────────────┐        ┌──────────────┐
                    │  External    │        │  Database    │
                    │  Services    │        │  (PG/Mongo)  │
                    │  (WATI,      │        └──────────────┘
                    │   M-Pesa,    │               │
                    │   Apify)     │               ▼
                    └──────────────┘        ┌──────────────┐
                                            │  Self-       │
                                            │  Improving   │
                                            │  Loop        │
                                            └──────────────┘
```

### 9.2 Event Flow (Kafka)

```
Producer                          Consumer
─────────                        ─────────
agentService    ──▶ kafka ◀──    hermes agents
whatsappService ──▶ kafka ◀──    selfImprovingLoop
sourcingService ──▶ kafka ◀──    aiIntelligenceService
```

Topics: `product.updated`, `order.created`, `inventory.changed`, `supplier.risk.updated`, `customer.feedback.received`, `document.processed`

### 9.3 Feedback Loop

```
Every user interaction ──▶ Feedback stored ──▶ Self-Improving Loop
                                                      │
                        ┌─────────────────────────────┘
                        ▼
              Model accuracy recalculated
                        │
                        ▼
              Improvement metrics updated
                        │
                        ▼
              Next cycle: better predictions
```

---

## 10. External Integrations

### 10.1 AI & Language

| Service    | Purpose                      | Graceful Degradation |
|------------|------------------------------|----------------------|
| OpenAI     | LLM via LangChain            | Falls back to NLP-only mode |
| LangChain  | Workflow chaining + RAG      | Falls back to direct service calls |

### 10.2 Communication

| Service    | Purpose                      | Graceful Degradation |
|------------|------------------------------|----------------------|
| WATI.io    | WhatsApp Business API        | Falls back to Twilio |
| Twilio     | WhatsApp + SMS               | None                 |

### 10.3 Payments

| Service    | Purpose                      | Region         |
|------------|------------------------------|----------------|
| M-Pesa     | Mobile money (Daraja API)    | East Africa    |
| KRW Adapter| Korean Won payments          | South Korea    |

### 10.4 Data Enrichment

| Service    | Purpose                      |
|------------|------------------------------|
| Apify      | Web scraping, supplier data, market research |
| Cloudflare | CDN, DDoS protection, DNS    |

### 10.5 Monitoring

| Service    | Purpose                      |
|------------|------------------------------|
| Sentry     | Error tracking + performance |
| PostHog    | Product analytics            |
| Prometheus | Metrics collection           |
| Grafana    | Dashboard visualization      |

---

## 11. Frontend Architecture

### 11.1 Stack

- **Framework**: React 18 with hooks
- **Build tool**: Vite
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v6 (hash router)
- **State**: React context + localStorage (theme, auth)

### 11.2 Pages / Dashboards

| Page                      | Route          | Purpose                              |
|---------------------------|----------------|--------------------------------------|
| Landing                   | `/`            | Marketing, features, pricing, FAQ    |
| Login                     | `/login`       | Authentication                       |
| Register                  | `/register`    | User registration                    |
| Dashboard                 | `/dashboard`   | Stats, activity feed, system health  |
| Procurement               | `/procurement` | Sourcing forms, supplier cards       |
| Logistics                 | `/logistics`   | Shipment tracking, route optimization|
| Executive                 | `/executive`   | KPIs, investor highlights            |
| QMe                       | `/qme`         | Task runner, workflow orchestration  |
| WhatsApp Commerce         | `/whatsapp`    | Conversations, NLP, M-Pesa           |
| Supplier Trust Network    | `/trust`       | Search, reviews, trust scores        |
| Customs Engine            | `/customs`     | HS classification, duty, compliance  |
| Hermes Admin              | `/hermes`      | Agent monitoring & control           |

### 11.3 Design System

- **Dark mode**: System preference detection + localStorage persistence
- **Toast notifications**: Success, error, warning, info
- **SVG icon system**: In sidebar and throughout dashboards
- **Responsive**: Mobile-first with Tailwind breakpoints

---

## Appendix: Testing Architecture

| Test Suite            | File(s)                                  | Tests |
|-----------------------|------------------------------------------|-------|
| Agent memory          | `tests/agentMemory.test.js`              | 18    |
| Agent manager         | `tests/agentManager.test.js`             | 25    |
| Chat agent            | `tests/chatAgent.test.js`                | 40    |
| Agent service         | `tests/services/agentService.test.js`    | 14    |
| Self-improving loop   | `tests/engine/selfImprovingLoop.test.js` | 14    |
| Auth service          | `tests/services/authService.test.js`     | 22    |
| Auth middleware       | `tests/middleware/auth.test.js`          | 17    |
| Admin service         | `tests/services/adminService.test.js`    | 9     |
| Team service          | `tests/services/teamService.test.js`     | 4     |
| RBAC middleware       | `tests/middleware/rbac.test.js`          | 11    |
| Model tests           | `tests/*.model.test.js`                  | 60+   |
| Route tests           | `tests/*.routes.test.js`                 | 40+   |
| Service tests         | `tests/services/*.test.js`               | 80+   |
| Hermes/comm/base      | `tests/*.test.js`                        | 50+   |
| **Total**             | **36 suites**                            | **476+**|
