# SokogateOS — AI Operating System for African Trade

> **Turn your company into an AI-native, self-improving organization.**  
> SokogateOS makes companies legible to AI by default — transforming artifacts into self-improving loops for sourcing, customization, and logistics.

[![Tests](https://img.shields.io/badge/tests-753%20passing-brightgreen)](#)
[![Build](https://img.shields.io/badge/build-passing-success)](#)
[![Node](https://img.shields.io/badge/node-%3E%3D22-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

---

## Table of Contents

- [Vision](#vision)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Dashboards](#dashboards)
- [Agent System](#agent-system)
- [Testing](#testing)
- [Infrastructure Services](#infrastructure-services)
- [Roadmap](#roadmap)
- [License](#license)

---

## Vision

**Every African business should be AI-legible.**

We're building the operating system that makes this possible. SokogateOS ingests company artifacts (documents, emails, processes, supply chain data) and turns them into a continuously self-improving AI engine. The result: procurement managers, logistics coordinators, and executives get superpowers they've never had before.

> **$1.5T+ addressable market** — African B2B commerce, wholesale trade, and cross-border logistics.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SokogateOS Platform                               │
├──────────────────────────────────────────────────────────────────────────┤
│                         AI Agent System                                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐ │
│  │Sourcing │ │Custom-   │ │Logistics │ │Negotiation │ │   Hermes      │ │
│  │Agent    │ │ization   │ │Agent     │ │Agent       │ │   (meta-actor)│ │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘ └───────────────┘ │
├──────────────┬──────────────┬──────────────┬────────────────────────────┤
│   Sourcing   │Customization │  Logistics   │     Self-Improving         │
│   Service    │   Service    │   Service    │     Loop Engine            │
├──────────────┴──────────────┴──────────────┴────────────────────────────┤
│          ABAC (Attribute-Based Access Control) Policy Engine             │
├──────────────────────────────────────────────────────────────────────────┤
│   Auth (JWT + RBAC + ABAC) │ Middleware (Helmet, Rate Limit, Validate)  │
├──────────────────────────────────────────────────────────────────────────┤
│   REST API (Express) │ Event Bus (Kafka) │ Agent IPC │ WebSocket (SO)   │
├──────────────────────────────────────────────────────────────────────────┤
│   MongoDB (docs) │ PostgreSQL (relational) │ Redis (cache)              │
│   MinIO (S3 storage) │ QMe Task Runner │ HNSW (vector index)           │
├──────────────────────────────────────────────────────────────────────────┤
│   Prometheus + Grafana (monitoring) │ Sentry (errors) │ PostHog (analytics)│
│   Docker Compose (10 services)                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Category        | Technologies                                                                 |
|-----------------|------------------------------------------------------------------------------|
| **Runtime**     | Node.js 22+, Express.js                                                      |
| **Databases**   | MongoDB 7 (Mongoose), PostgreSQL 16, Redis 7                                 |
| **Messaging**   | Apache Kafka 3.x / Confluent 7.7 (via KafkaJS)                               |
| **Storage**     | MinIO (S3-compatible object storage)                                         |
| **Auth**        | JWT (access + refresh tokens), bcrypt, RBAC (7 roles), ABAC policy engine    |
| **Auth Providers** | Firebase Admin (production), Clerk SDK (development)                     |
| **AI/ML**       | LangChain, OpenAI GPT-4, agentic-flow, natural.js, node-nlp                  |
| **Agents**      | 6 specialized agents + 5 Hermes meta-agents + AgentManager + AgentMemory     |
| **Ingestion**   | 9 source adapters + 1 document processor (SAP, Oracle, Salesforce, HubSpot, ShipBob, Flexport, REST, KRW, supplier risk) |
| **Payment**     | M-Pesa Daraja API (East Africa), KRW payment adapter (South Korea)           |
| **WhatsApp**    | WATI.io Business API, Twilio                                                 |
| **Monitoring**  | Sentry (errors + perf), PostHog (product analytics), Prometheus + Grafana    |
| **Vector Index**| HNSW (hierarchical navigable small world)                                    |
| **Task Runner** | QMe (async task queue with dashboard UI)                                     |
| **Scraping**    | Apify (web scraping & data enrichment)                                       |
| **CDN/Security**| Cloudflare (CDN, DNS, DDoS protection)                                       |
| **Validation**  | Joi schemas, input sanitization                                               |
| **Security**    | Helmet, rate-limiter-flexible, CORS                                          |
| **Containers**  | Docker (multi-stage Alpine build), Docker Compose                             |
| **Frontend**    | React 18, Vite 5, Tailwind CSS, recharts                                     |
| **Testing**     | Jest 29 (47 suites, 753 tests)                                               |

---

## Prerequisites

| Tool            | Version | Purpose                                      |
|-----------------|---------|----------------------------------------------|
| **Node.js**     | ≥ 22    | Runtime                                      |
| **npm**         | ≥ 9     | Package management                           |
| **Docker**      | ≥ 24    | Infrastructure services                      |
| **Docker Compose** | ≥ 2.20 | Orchestration                              |
| **QMe CLI**     | latest  | Async task runner (`@claude-flow/cli`)       |

> **Note:** QMe (`@claude-flow/cli`) is included as a project dependency and powers the async task execution system. Start the QMe daemon with:
> ```bash
> npx @claude-flow/cli@latest daemon start
> ```
> If QMe is not running, the QMe task endpoints and self-improving engine will gracefully degrade.

---

## Quick Start

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-org/sokogateos.git
cd sokogateos

# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure environment

Create `.env.development` in the project root:

```bash
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
```

All other variables have safe development defaults — the system degrades gracefully.

### 3. Start infrastructure services

This starts Kafka, Zookeeper, MongoDB, PostgreSQL, Redis, MinIO, Prometheus, and Grafana:

```bash
docker compose up -d
```

> ⚠️ **First build**: Compiling native addons (`sharp`, `better-sqlite3`, `argon2`, `hnswlib-node`) on Alpine takes **5-10 minutes**. Subsequent builds use Docker layer caching.

> **Note:** In production (Docker), the built frontend is served directly by Express at `/` via the SPA fallback — no separate dev server needed.

Verify all services are running:

```bash
docker compose ps
```

### 4. Start the backend

```bash
# Development mode (with auto-reload via nodemon)
npm run dev

# OR production mode
npm start
```

The API starts on **http://localhost:3000**.

### 5. Start the frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend starts on **http://localhost:5173** and automatically proxies API requests to `localhost:3000`.

### 6. Verify everything is running

```bash
# Check backend health
curl http://localhost:3000/health

# Check frontend
open http://localhost:5173
```

---

## Running the Backend

### Available npm scripts

| Script                  | Command                              | Description                         |
|-------------------------|--------------------------------------|-------------------------------------|
| `npm start`             | `node src/index.js`                  | Start production server             |
| `npm run dev`           | `nodemon src/index.js`               | Start with auto-reload              |
| `npm test`              | `jest`                               | Run all tests (47 suites, 753 tests)|
| `npm run test:hermes`   | `jest tests/hermesAgent.test.js`     | Run Hermes agent tests              |
| `npm run build`         | `tsc`                                | TypeScript type checking            |
| `npm run migrate`       | `node src/migrations/setup.js`       | Run database migrations             |
| `npm run docker:up`     | `docker compose up -d`               | Start infrastructure                |
| `npm run docker:down`   | `docker compose down`                | Stop infrastructure                 |

### Backend structure

```
src/
├── index.js                          # Express app entry, phased service orchestrator
├── abac/
│   └── policyEngine.js               # Attribute-Based Access Control (fine-grained auth)
├── agents/                           # AI Agent System — the core differentiator
│   ├── baseAgent.js                  # Abstract base class for all agents
│   ├── agentManager.js               # Registry, spawning, health monitoring
│   ├── agentMemory.js               # Short-term + long-term memory per agent
│   ├── index.js                      # Agent type registry
│   ├── chatAgent.js                  # Conversational AI with intent recognition
│   ├── communication.js              # Kafka-based inter-agent messaging
│   └── specialized/                  # Domain-specific agents
│       ├── sourcingAgent.js          # Supplier discovery & matching
│       ├── customizationAgent.js     # Product customization workflows
│       ├── logisticsAgent.js         # Shipping & route optimization
│       ├── complianceAgent.js        # Regulatory compliance
│       └── negotiationAgent.js       # Price & terms negotiation
├── api/v1/
│   ├── routes/index.js               # Core REST API routes (sourcing, customization, logistics)
│   └── controllers/                  # Controllers for v1 endpoints
├── config/
│   ├── constants.js                  # Application-wide constants
│   ├── database.js                   # MongoDB connection (graceful degradation)
│   └── kafka.js                      # Kafka producer/consumer (graceful degradation)
├── engine/
│   └── selfImprovingLoop.js          # Continuous learning & optimization (5-min cycles)
├── ingestion/                        # Data ingestion pipeline
│   ├── adapters/                     # 9 external system adapters
│   │   ├── sapProductAdapter.js      # SAP product catalog
│   │   ├── oracleProductAdapter.js   # Oracle product catalog
│   │   ├── salesforceCrmAdapter.js   # Salesforce CRM
│   │   ├── hubspotCrmAdapter.js      # HubSpot CRM
│   │   ├── shipbobLogisticsAdapter.js# ShipBob fulfillment
│   │   ├── flexportLogisticsAdapter.js # Flexport logistics
│   │   ├── restApiAdapter.js         # Generic REST API
│   │   ├── supplierRiskAdapter.js    # Supplier risk scoring
│   │   └── krwPaymentAdapter.js      # Korean Won payments
│   └── processors/
│       └── documentProcessingPipeline.js # Document OCR & parsing
├── data/
│   └── customs-engine/               # HS codes, tariffs, compliance rules, trade agreements, document templates
├── middleware/
│   ├── auth.js                       # JWT authentication middleware
│   ├── rbac.js                       # Role-Based Access Control
│   ├── abac.js                       # Attribute-Based Access Control middleware
│   ├── validation.js                 # Joi input validation
│   ├── cors.js                       # CORS configuration (comma-separated origins)
│   ├── errorHandler.js               # Centralized error handling
│   └── analytics/tracking.js         # PostHog engagement tracking
├── models/                           # Mongoose models (~20 total)
│   ├── user.js, company.js, team.js, role.js
│   ├── contact.js, account.js, sequence.js, enrollment.js
│   ├── sourcing.js, customization.js, logistics/logistics.js
│   ├── supplierTrust.js, customsEngine.js, whatsAppMessage.js
│   └── feedback.js, artifact.js
├── routes/                           # Express route handlers (12 files)
│   ├── health.js                     # Liveness + readiness probes
│   ├── auth.js                       # Register, login, logout, refresh, reset
│   ├── authProviders.js              # Firebase / Clerk provider routes
│   ├── admin.js                      # Admin CRUD, stats, health
│   ├── teams.js                      # Team/workspace management
│   ├── agents.js                     # Agent management & monitoring
│   ├── tools.js                      # Tool registry endpoints
│   ├── whatsapp.js                   # WhatsApp commerce operations
│   ├── supplierTrust.js              # Supplier Trust Network
│   ├── customsEngine.js              # Cross-border customs
│   ├── contacts.js, accounts.js, sequences.js, enrollments.js  # CRM
│   └── analytics/index.js            # Analytics endpoints
├── services/                         # All business logic & integrations
│   ├── authService.js                # JWT issuance, password management
│   ├── agentService.js               # Agent system lifecycle management
│   ├── adminService.js               # Admin operations (users, roles, invites)
│   ├── teamService.js                # Team CRUD & membership management
│   ├── sourcingService.js            # Bulk product discovery & supplier matching
│   ├── customizationService.js       # Product branding & design workflows
│   ├── logisticsService.js           # Route optimization & shipment tracking
│   ├── customsEngineService.js       # HS classification, duty calc, compliance
│   ├── supplierTrustService.js       # Supplier verification & trust scoring
│   ├── whatsappService.js            # WhatsApp message orchestration
│   ├── watiService.js                # WATI.io Business API client
│   ├── mpesaService.js               # M-Pesa Daraja payment integration
│   ├── langchainOrchestrator.js      # LangChain workflow chaining with RAG
│   ├── aiIntelligenceService.js      # Market intelligence & trend analysis
│   ├── workflowAutomationService.js  # Event-driven process automation
│   ├── cloudflareService.js          # CDN, DNS, DDoS protection
│   ├── apifyService.js               # Web scraping orchestration
│   ├── contactService.js             # Contact/CRM management logic
│   ├── composioService.js            # Composio tool integration
│   ├── firebaseAuthService.js        # Firebase Admin (production auth)
│   ├── clerkAuthService.js           # Clerk SDK (development auth)
│   ├── sequenceService.js            # Sequence/automation management
│   ├── accountService.js             # Account management
│   ├── compliance/koreanComplianceService.js  # K-Africa corridor compliance
│   ├── marketAnalysis/koreanMarketAnalysisService.js  # Korean market intel
│   ├── ers/ersService.js             # Export Readiness Score
│   ├── error/sentryService.js        # Sentry error & performance tracking
│   ├── seo/bingWebmasterTools.js     # SEO / Bing indexing
│   ├── seo/openGraphImage.js         # Dynamic OG image generation
│   └── hermes/                       # Hermes agent meta-orchestration
│       ├── hermesAgent.js            # Hermes agent controller
│       └── agents/specialized/       # 5 specialized Hermes sub-agents
│           ├── researchAgent.js
│           ├── analysisAgent.js
│           ├── optimizationAgent.js
│           ├── complianceAgent.js
│           └── marketIntelligenceAgent.js
├── utils/
│   ├── logger.js                     # Winston with rotation + JSON prod output
│   ├── serviceRunner.js              # Managed interval runner (backpressure, metrics)
│   └── posthogClient.js              # PostHog analytics client
└── qme/wrapper.js                    # QMe task runner integration
```

---

## Running the Frontend

### Available npm scripts (inside `frontend/`)

| Script                 | Command        | Description                    |
|------------------------|----------------|--------------------------------|
| `npm run dev`          | `vite`         | Start dev server (port 5173)   |
| `npm run build`        | `vite build`   | Production build               |
| `npm run preview`      | `vite preview` | Preview production build       |

### How the frontend connects to the backend

- **Development:** Vite proxies `/api` requests to `http://localhost:3000` (configured in `vite.config.js`)
- **Production:** Set `VITE_API_URL` env var to your API URL (defaults to `/api`)
- **Auth tokens** are stored in `localStorage` as `sokogate_token`

### Frontend structure

```
frontend/
├── src/
│   ├── main.jsx                          # Entry point
│   ├── App.jsx                           # Router + lazy-loaded pages
│   ├── index.css                         # Tailwind imports + global styles
│   ├── context/AuthContext.jsx           # Auth state + JWT management
│   ├── services/api.js                   # Axios client + API endpoints
│   ├── components/
│   │   ├── Layout.jsx                    # App shell with sidebar + header
│   │   └── ErrorBoundary.jsx             # Per-page error fallback
│   └── pages/
│       ├── LoginPage.jsx                 # Login + Register forms
│       ├── DashboardPage.jsx             # Executive dashboard
│       ├── ProcurementDashboard.jsx      # Sourcing & supplier discovery
│       ├── LogisticsDashboard.jsx        # Shipment tracking & routing
│       ├── ExecutiveDashboard.jsx        # Revenue, risk, market intel
│       ├── QMeDashboard.jsx              # Task queue & execution logs
│       ├── WhatsAppCommerce.jsx          # WhatsApp messaging & commerce
│       ├── SupplierTrustPage.jsx         # Supplier verification & scoring
│       ├── CustomsEnginePage.jsx         # HS classification & compliance
│       ├── HermesAdminPage.jsx           # Agent monitoring & control
│       └── HealthDashboard.jsx           # System health monitoring
```

---

## Environment Variables

### Backend (`.env.development` / `.env.production`)

| Variable                      | Description                        | Default                                        |
|-------------------------------|------------------------------------|------------------------------------------------|
| `NODE_ENV`                    | Environment mode                   | `development`                                  |
| `PORT`                        | API server port                    | `3000`                                         |
| `MONGODB_URI`                 | MongoDB connection string          | `mongodb://localhost:27017/sokogateos`          |
| `DATABASE_URL`                | PostgreSQL connection string       | `postgresql://sokogate:sokogate@localhost:5432/sokogate` |
| `JWT_SECRET`                  | JWT signing secret                 | *required — change in production*              |
| `JWT_REFRESH_SECRET`          | JWT refresh secret                 | *required — change in production*              |
| `JWT_EXPIRES_IN`              | JWT token expiry                   | `15m`                                          |
| `JWT_REFRESH_EXPIRES_IN`      | Refresh token expiry               | `7d`                                           |
| `KAFKA_BROKER`                | Kafka broker address               | `localhost:9092`                               |
| `MINIO_ENDPOINT`              | MinIO/S3 endpoint                  | `localhost:9000`                               |
| `MINIO_ACCESS_KEY`            | MinIO access key                   | `sokogate_access`                              |
| `MINIO_SECRET_KEY`            | MinIO secret key                   | `sokogate_secret_key_change_in_production`    |
| `REDIS_URL`                   | Redis connection                   | `redis://localhost:6379`                       |
| `FRONTEND_URL`                | CORS allowed origin                | `http://localhost:5173`                        |
| `SENTRY_DSN`                  | Sentry error tracking DSN          | *(optional — no-op without)*                   |
| `POSTHOG_API_KEY`             | PostHog product analytics key      | *(optional — no-op without)*                   |
| `OPENAI_API_KEY`              | OpenAI API key (LangChain)         | *(optional — falls back to NLP-only)*          |
| `FIREBASE_PROJECT_ID`         | Firebase Admin project ID          | *(optional — production auth)*                 |
| `CLERK_SECRET_KEY`            | Clerk development auth secret      | *(optional — dev auth)*                        |
| `CLOUDFLARE_API_TOKEN`        | Cloudflare API token               | *(optional — CDN/DNS)*                         |
| `LOG_LEVEL`                   | Winston log level                  | `debug`                                        |

### Frontend

| Variable         | Description       | Default      |
|------------------|-------------------|--------------|
| `VITE_API_URL`   | API base URL      | `/api`       |

No `.env` file is required for the frontend during development — the Vite proxy handles API routing automatically.

---

## API Overview

### Authentication

| Method | Endpoint                          | Auth | Description              |
|--------|-----------------------------------|------|--------------------------|
| POST   | `/api/auth/register`              | No   | Create account           |
| POST   | `/api/auth/login`                 | No   | Login (returns JWT)      |
| POST   | `/api/auth/refresh`               | Yes  | Refresh token            |
| POST   | `/api/auth/logout`                | Yes  | Logout                   |
| GET    | `/api/auth/profile`               | Yes  | Get profile              |
| PUT    | `/api/auth/profile`               | Yes  | Update profile           |
| POST   | `/api/auth/change-password`       | Yes  | Change password          |
| POST   | `/api/auth/request-reset`         | No   | Request password reset   |
| POST   | `/api/auth/reset-password`        | No   | Reset password           |
| GET    | `/api/auth/providers/firebase`    | No   | Firebase auth config     |
| GET    | `/api/auth/providers/clerk`       | No   | Clerk auth config        |

### Admin

| Method | Endpoint                           | Auth | Description              |
|--------|------------------------------------|------|--------------------------|
| GET    | `/api/admin/roles`                 | Yes  | List all roles           |
| POST   | `/api/admin/roles`                 | Yes  | Create role              |
| PUT    | `/api/admin/roles/:id`             | Yes  | Update role              |
| DELETE | `/api/admin/roles/:id`             | Yes  | Delete role              |
| POST   | `/api/admin/assign-role`           | Yes  | Assign role to user      |
| POST   | `/api/admin/invite`                | Yes  | Invite user              |
| GET    | `/api/admin/users`                 | Yes  | List users               |
| GET    | `/api/admin/stats`                 | Yes  | System statistics        |
| GET    | `/api/admin/health`                | Yes  | Admin health status      |

### Teams

| Method | Endpoint                           | Auth | Description              |
|--------|------------------------------------|------|--------------------------|
| GET    | `/api/teams`                       | Yes  | List teams               |
| GET    | `/api/teams/:id`                   | Yes  | Get team                 |
| POST   | `/api/teams`                       | Yes  | Create team              |
| PUT    | `/api/teams/:id`                   | Yes  | Update team              |
| DELETE | `/api/teams/:id`                   | Yes  | Delete team              |
| POST   | `/api/teams/:id/members`           | Yes  | Add member               |
| DELETE | `/api/teams/:id/members/:userId`   | Yes  | Remove member            |

### Agents

| Method | Endpoint                           | Auth | Description              |
|--------|------------------------------------|------|--------------------------|
| GET    | `/api/agents`                      | Yes  | List agents              |
| GET    | `/api/agents/:id`                  | Yes  | Get agent                |
| POST   | `/api/agents`                      | Yes  | Create agent             |
| DELETE | `/api/agents/:id`                  | Yes  | Delete agent             |
| POST   | `/api/agents/:id/task`             | Yes  | Assign task to agent     |

### Tools

| Method | Endpoint                    | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | `/api/tools`                | Yes  | List available tools     |
| POST   | `/api/tools/execute`        | Yes  | Execute a tool           |

### Sourcing

| Method | Endpoint                                    | Auth | Description               |
|--------|---------------------------------------------|------|---------------------------|
| GET    | `/api/v1/sourcing/request/:id`              | Yes  | Get sourcing request      |
| POST   | `/api/v1/sourcing/request`                  | Yes  | Create sourcing request   |
| GET    | `/api/v1/sourcing/company/:id`              | Yes  | Get company's requests    |
| PUT    | `/api/v1/sourcing/request/:id/status`       | Yes  | Update request status     |

### Customization

| Method | Endpoint                                        | Auth | Description                  |
|--------|--------------------------------------------------|------|------------------------------|
| GET    | `/api/v1/customization/request/:id`              | Yes  | Get customization request    |
| POST   | `/api/v1/customization/request`                  | Yes  | Create customization request |
| GET    | `/api/v1/customization/company/:id`              | Yes  | Get company's requests       |
| PUT    | `/api/v1/customization/request/:id/status`       | Yes  | Update request status        |

### Logistics

| Method | Endpoint                                    | Auth | Description              |
|--------|---------------------------------------------|------|--------------------------|
| GET    | `/api/v1/logistics/shipment/:id`            | Yes  | Get shipment details     |
| POST   | `/api/v1/logistics/shipment`                | Yes  | Create shipment          |
| GET    | `/api/v1/logistics/company/:id`             | Yes  | Get company's shipments  |
| PUT    | `/api/v1/logistics/shipment/:id/status`     | Yes  | Update shipment status   |
| GET    | `/api/v1/logistics/track/:id`               | Yes  | Track shipment real-time |

### WhatsApp Commerce

| Method | Endpoint                           | Auth | Description              |
|--------|------------------------------------|------|--------------------------|
| GET    | `/api/whatsapp/messages`           | Yes  | List WhatsApp messages   |
| POST   | `/api/whatsapp/send`               | Yes  | Send WhatsApp message    |
| POST   | `/api/whatsapp/webhook`            | No   | Incoming webhook         |

### Supplier Trust Network

| Method | Endpoint                           | Auth | Description               |
|--------|------------------------------------|------|---------------------------|
| GET    | `/api/trust/suppliers`             | Yes  | Search suppliers          |
| GET    | `/api/trust/supplier/:id`          | Yes  | Get supplier details      |
| POST   | `/api/trust/supplier/verify`       | Yes  | Verify supplier           |
| POST   | `/api/trust/review`                | Yes  | Submit supplier review    |

### Customs Engine

| Method | Endpoint                           | Auth | Description               |
|--------|------------------------------------|------|---------------------------|
| GET    | `/api/customs/classify/:hsCode`    | Yes  | HS code classification    |
| POST   | `/api/customs/calculate-duty`      | Yes  | Calculate customs duty    |
| GET    | `/api/customs/compliance/:productId` | Yes | Check product compliance  |

### CRM

| Method | Endpoint                           | Auth | Description               |
|--------|------------------------------------|------|---------------------------|
| GET    | `/api/contacts`                    | Yes  | List contacts             |
| POST   | `/api/contacts`                    | Yes  | Create contact            |
| GET    | `/api/accounts`                    | Yes  | List accounts             |
| POST   | `/api/accounts`                    | Yes  | Create account            |
| GET    | `/api/sequences`                   | Yes  | List sequences            |
| POST   | `/api/sequences`                   | Yes  | Create sequence           |
| GET    | `/api/enrollments`                 | Yes  | List enrollments          |
| POST   | `/api/enrollments`                 | Yes  | Create enrollment         |

### Self-Improving Engine

| Method | Endpoint                           | Auth | Description                  |
|--------|------------------------------------|------|------------------------------|
| GET    | `/api/engine/status`               | No   | Engine status and metrics    |
| POST   | `/api/engine/run-cycle`            | Yes  | Manually trigger cycle       |
| POST   | `/api/engine/feedback`             | Yes  | Submit feedback data point   |

### Hermes Agent System

| Method | Endpoint                               | Auth | Description                  |
|--------|----------------------------------------|------|------------------------------|
| GET    | `/api/hermes/status`                   | Yes  | Hermes agent status          |
| POST   | `/api/hermes/run-cycle`                | Yes  | Trigger Hermes analysis cycle|
| POST   | `/api/hermes/start-scheduled-runs`     | Yes  | Start scheduled Hermes runs  |
| POST   | `/api/hermes/stop-scheduled-runs`      | Yes  | Stop scheduled Hermes runs   |

### Health

| Method | Endpoint                    | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | `/health`                   | Server health check (liveness)  |
| GET    | `/health/live`              | Readiness probe                 |
| GET    | `/health/checks`            | List all health check definitions|

---

## Dashboards

All dashboards are accessible from the sidebar after login.

| Dashboard               | Route               | Roles                                       | Features                                              |
|-------------------------|---------------------|---------------------------------------------|-------------------------------------------------------|
| **Executive**           | `/dashboard`        | exec, super_admin                           | Revenue forecasts, market intel, risk heatmaps        |
| **Procurement**         | `/procurement`      | procurement_manager, company_admin          | Supplier discovery, RFQ, price benchmarking           |
| **Logistics**           | `/logistics`        | logistics_coordinator, company_admin        | Real-time tracking, route optimization, customs       |
| **WhatsApp Commerce**   | `/whatsapp`         | procurement_manager, company_admin          | Conversations, NLP, M-Pesa payments                    |
| **Supplier Trust**      | `/trust`            | all authenticated                          | Supplier search, reviews, trust scores                |
| **Customs Engine**      | `/customs`          | logistics_coordinator, company_admin        | HS classification, duty calculation, compliance       |
| **Hermes Admin**        | `/hermes`           | super_admin                                | Agent monitoring, control, and insights               |
| **QMe Tasks**           | `/qme`              | all authenticated                          | Task queue visualization, execution history, logs     |
| **System Health**       | `/health`           | super_admin                                | Service status, uptime, performance metrics           |

---

## Agent System

SokogateOS features a multi-layered AI agent architecture with specialized domain agents and a meta-orchestration layer.

### Agent Hierarchy

```
                    ┌──────────────────────────────────────┐
                    │           ChatAgent                   │
                    │  (NLU intent recognition, handoff)    │
                    └──────────────────┬───────────────────┘
                                       │ Handoff
                         ┌─────────────┼─────────────┐
                         ▼             ▼              ▼
                 ┌──────────┐   ┌──────────┐   ┌────────────┐
                 │ Sourcing │   │ Custom-  │   │  Logistics │
                 │ Agent    │   │ ization  │   │  Agent     │
                 └──────────┘   │ Agent    │   └────────────┘
                                └──────────┘
                         ┌────────────┐   ┌──────────────┐
                         │ Compliance │   │ Negotiation  │
                         │ Agent      │   │ Agent        │
                         └────────────┘   └──────────────┘

                    ┌──────────────────────────────────────┐
                    │         Hermes Agent System           │
                    │  Research │ Analysis │ Optimization   │
                    │  Compliance │ Market Intelligence     │
                    └──────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │    Self-Improving Loop Engine         │
                    │  Collect → Analyze → Retrain → Track  │
                    └──────────────────────────────────────┘
```

### Key Components

| Component           | File                         | Purpose                                     |
|---------------------|------------------------------|---------------------------------------------|
| **BaseAgent**       | `src/agents/baseAgent.js`    | Abstract class: init, executeTask, shutdown |
| **AgentManager**    | `src/agents/agentManager.js` | Registry, spawning, health monitoring       |
| **AgentMemory**     | `src/agents/agentMemory.js`  | Short-term + long-term memory per agent     |
| **ChatAgent**       | `src/agents/chatAgent.js`    | NLP intent recognition, entity extraction   |
| **Communication**   | `src/agents/communication.js`| Kafka-based inter-agent messaging           |
| **ServiceRunner**   | `src/utils/serviceRunner.js` | Managed interval runner (backpressure, error isolation, metrics) |

### Intent Recognition

The ChatAgent recognizes 8 intent patterns:

| Intent           | Example Input                               |
|------------------|---------------------------------------------|
| `sourcing`       | "Find suppliers for cotton fabric"          |
| `customization`  | "Customize these shirts with our logo"      |
| `logistics`      | "Ship 1000 units to Nairobi"                |
| `compliance`     | "Check regulations for textile imports"     |
| `negotiation`    | "Negotiate price with supplier"             |
| `certificate`    | "Get certificate of origin"                 |
| `pricing`        | "What's the price for 5000 units?"          |
| `help`           | "How does sourcing work?"                   |

---

## Scripts

The `scripts/` directory contains automation and tooling scripts for development workflows:

| Script                   | Purpose                                 |
|--------------------------|-----------------------------------------|
| `deep-research.js`       | Deep research via web search            |
| `performance-scan.js`    | Performance audit of the codebase       |
| `recursive-reviewer.js`  | Recursive code review                    |
| `health-check.js`        | System health check                     |
| `fanout-worktrees.js`    | Git worktree management                 |
| `scaffold-skill.js`      | Scaffold new skills/tools               |
| `tdd-scaffold.js`        | Generate test scaffolding               |
| `generate-docs.js`       | Auto-generate documentation             |
| `metaharness-audit.js`   | Meta-harness audit tool                 |

---

## Testing

```bash
# Run all tests (47 suites, 753 tests)
npm test

# Run with verbose output
npx jest --verbose

# Run a specific test file
npx jest tests/utils/serviceRunner.test.js
npx jest tests/ingestion/adapters/sapProductAdapter.test.js

# Run with coverage report
npx jest --coverage

# Run tests with force exit (for services with active connections)
npx jest --forceExit
```

### Test Suite Breakdown

| Category                     | Suites | Tests | Coverage                                |
|------------------------------|--------|-------|-----------------------------------------|
| Agent memory                 | 1      | 18    | CRUD, search, expiry                    |
| Agent manager                | 1      | 25    | Lifecycle, spawning, health monitoring  |
| Chat agent                   | 1      | 40    | Intent recognition, entity extraction   |
| Agent service                | 1      | 14    | Service lifecycle                       |
| Self-improving loop          | 1      | 14    | Feedback cycles, metrics                |
| Auth service                 | 1      | 22    | Registration, login, tokens             |
| Auth middleware               | 1      | 17    | JWT validation, guards                  |
| Admin service                | 1      | 9     | Role management, invites                |
| Team service                 | 1      | 4     | CRUD, membership                        |
| RBAC middleware               | 1      | 11    | Permission checks                       |
| ServiceRunner utils          | 1      | 31    | Start/stop, backpressure, metrics       |
| Model tests                  | 4      | 60+   | User, team, role, sourcing              |
| Route tests                  | 4      | 40+   | Admin, teams, tools, startup            |
| Service tests                | 7      | 80+   | All business services                   |
| Ingestion adapter tests      | 10     | 37    | SAP, Oracle, Salesforce, HubSpot, etc.  |
| Hermes / communication / base| 3      | 50+   | Hermes agent, IPC, base agent           |
| Auth provider tests          | 3      | 30+   | Firebase, Clerk, auth flow              |
| **Total**                    | **47** | **753**| All passing ✅                         |

---

## Infrastructure Services

Docker Compose starts 10 services:

| Service     | Port(s)          | Purpose                        | Credentials                                    |
|-------------|------------------|--------------------------------|------------------------------------------------|
| **API**     | `3000`           | Express application            | —                                              |
| **Frontend**| `5173`           | React SPA (Vite dev server)    | —                                              |
| **Kafka**   | `9092`           | Event streaming                | —                                              |
| **Zookeeper**| `2181`          | Kafka coordination             | —                                              |
| **MongoDB** | `27017`          | Document store                 | —                                              |
| **PostgreSQL**| `5432`         | Relational data                | `sokogate` / `sokogate`                        |
| **Redis**   | `6379`           | Caching / sessions             | —                                              |
| **MinIO**   | `9000` / `9001`  | S3-compatible storage          | `sokogate_access` / `MINIO_ROOT_PASSWORD`      |
| **Prometheus**| `9090`         | Metrics collection             | —                                              |
| **Grafana** | `3001`           | Monitoring dashboards          | `sokogate` / `GRAFANA_PASSWORD`                |

### Useful Docker commands

```bash
# Build the API image (first build: 5–10 min for native addon compilation)
docker compose build api

# Rebuild from scratch (ignore cache layers)
docker compose build --no-cache api

# Start all services
docker compose up -d

# Start only API + its dependencies (skips Prometheus/Grafana if not needed)
docker compose up -d api

# View service logs
docker compose logs -f api
docker compose logs -f kafka

# Restart a service
docker compose restart mongo

# Rebuild API and restart
docker compose up -d --build api

# Tear down all services (preserves volumes)
docker compose down

# Full clean — wipes all data volumes (MongoDB, PostgreSQL, Redis, MinIO, Prometheus, Grafana)
docker compose down -v
```

> **Running tests:** The Docker image is production-optimized and excludes `tests/` and `jest.config.js` (via `.dockerignore`). Run tests on the host:
> ```bash
> npm install       # install devDependencies
> npm test          # 47 suites, 753 tests
> ```

### Architecture diagram

```
┌──────────────────────┐    ┌──────────────────────┐
│   Frontend (5173)    │    │    Grafana (3001)    │
│   React + Vite       │    │    Monitoring UI     │
└─────┬────────────────┘    └──────────┬───────────┘
      │ HTTP proxy (/api)              │
      ▼                                ▼
┌──────────────────────┐    ┌──────────────────────┐
│   API (3000)         │◄───│  Prometheus (9090)   │
│   Express · Node 22  │    │  Metrics collection  │
└──┬────┬────┬────┬────┘    └──────────────────────┘
   │    │    │    │
   ▼    ▼    ▼    ▼
 Kafka  PG  Mongo Redis
·9092  ·5432 ·27017 ·6379
            │
            ▼
          MinIO
         ·9000 (API) / ·9001 (Console)
```

---

## Roadmap

| Phase                          | Status       | Description                                                           |
|--------------------------------|--------------|-----------------------------------------------------------------------|
| **Phase 1: Foundation**        | ✅ Complete  | Auth (JWT + RBAC), data models, QMe integration, infrastructure       |
| **Phase 2: Core Services**     | ✅ Complete  | Real service logic, AI intelligence, self-improving loop              |
| **Phase 3: Frontend**          | ✅ Complete  | React dashboards, lazy loading, error boundaries                      |
| **Phase 4: Scale Ready**       | ✅ Complete  | ServiceRunner migration, 10 ingestion adapters, 47/753 test suite, ABAC,
|                                |              | Hermes agent system, CRM, auth providers (Firebase/Clerk), Sentry,
|                                |              | PostHog, Cloudflare, Korean-Africa corridor, multi-stage Docker build |
| **Phase 5: Production**        | 📅 Planned   | Multi-region deployment, advanced ML pipelines, marketplace launch    |

---

## License

MIT © SokogateOS
