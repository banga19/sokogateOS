# SokogateOS — AI Operating System for African Trade

> **Turn your company into an AI-native, self-improving organization.**  
> SokogateOS makes companies legible to AI by default — transforming artifacts into self-improving loops for sourcing, customization, and logistics.

[![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)](#)
[![Build](https://img.shields.io/badge/build-passing-success)](#)
[![Node](https://img.shields.io/badge/node-%3E%3D18-blue)](#)
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
┌──────────────────────────────────────────────────────────────────────┐
│                         SokogateOS Platform                          │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│   Sourcing   │Customization │  Logistics   │   Self-Improving       │
│   Service    │   Service    │   Service    │   Loop Engine          │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│                         AI Intelligence Service                       │
├──────────────────────────────────────────────────────────────────────┤
│   Auth (JWT + RBAC)   │   Middleware (Helmet, Rate Limit, Validate)  │
├──────────────────────────────────────────────────────────────────────┤
│   REST API (Express)   │   Event Bus (Kafka)   │   WebSocket (SO)    │
├──────────────────────────────────────────────────────────────────────┤
│   MongoDB (docs)  │  PostgreSQL (relational)  │  Redis (cache)       │
│   MinIO (S3 storage)   │   QMe Task Runner                           │
├──────────────────────────────────────────────────────────────────────┤
│   Prometheus + Grafana (monitoring)   │   Docker Compose             │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Category | Technologies |
|----------|-------------|
| **Backend** | Node.js 18+, Express.js, Socket.io, JWT, bcrypt |
| **Frontend** | React 18, Vite 5, Tailwind CSS, recharts |
| **Databases** | MongoDB (Mongoose 7), PostgreSQL, Redis |
| **Messaging** | Apache Kafka (via kafka-node) |
| **Storage** | MinIO (S3-compatible object storage) |
| **Auth** | JWT, bcryptjs, RBAC with 7 role levels |
| **AI/ML** | Natural.js, node-nlp, custom ML pipelines |
| **Monitoring** | Prometheus, Grafana, Winston logging |
| **Task Runner** | QMe (async task queue with dashboard UI) |
| **Validation** | Joi schemas, input sanitization |
| **Security** | Helmet, rate-limiter-flexible, CORS |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 18 | Runtime |
| **npm** | ≥ 9 | Package management |
| **Docker** | ≥ 24 | Infrastructure services |
| **Docker Compose** | ≥ 2.20 | Orchestration |
| **QMe CLI** | latest | Async task runner (`@claude-flow/cli` installed globally) |

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

### 2. Start infrastructure services

This starts MongoDB, PostgreSQL, Redis, MinIO, Kafka, Zookeeper, Prometheus, and Grafana:

```bash
docker-compose up -d
```

Verify all services are running:

```bash
docker-compose ps
```

### 3. Start the backend

```bash
# Development mode (with auto-reload via nodemon)
npm run dev

# OR production mode
npm start
```

The API starts on **http://localhost:3000**.

### 4. Start the frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend starts on **http://localhost:5173** and automatically proxies API requests to `localhost:3000`.

### 5. Verify everything is running

```bash
# Check backend health
curl http://localhost:3000/

# Check frontend
open http://localhost:5173
```

---

## Running the Backend

### Available npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node src/index.js` | Start production server |
| `npm run dev` | `nodemon src/index.js` | Start with auto-reload |
| `npm test` | `jest` | Run all tests |
| `npm run build` | `tsc` | TypeScript type checking (requires tsconfig.json in project root) |
| `npm run migrate` | `node src/migrations/setup.js` | Run database migrations |
| `npm run docker:up` | `docker-compose up -d` | Start infrastructure |
| `npm run docker:down` | `docker-compose down` | Stop infrastructure |

### Backend structure

```
src/
├── index.js                          # Entry point — Express app setup
├── config/
│   ├── database.js                   # MongoDB connection (Mongoose)
│   └── kafka.js                      # Kafka producer/consumer setup
├── middleware/
│   ├── auth.js                       # JWT authentication + RBAC
│   └── validation.js                 # Joi input validation + sanitization
├── routes/
│   └── auth.js                       # Auth endpoints (register, login, etc.)
├── api/v1/
│   ├── routes/index.js               # API v1 routes (sourcing, customization, logistics, QMe)
│   └── controllers/
│       ├── sourcingController.js
│       ├── customizationController.js
│       └── logisticsController.js
├── services/
│   ├── authService.js                # User management, password reset
│   ├── sourcingService.js            # Supplier discovery, RFQ, quoting
│   ├── customizationService.js       # Design workflow, pricing, QC
│   ├── logisticsService.js           # Route optimization, tracking, customs
│   ├── aiIntelligenceService.js      # NLP patterns, insights, anomaly detection
│   └── workflowAutomationService.js  # Event-driven process automation
├── engine/
│   └── selfImprovingLoop.js          # Feedback + pattern analysis + retraining
├── models/
│   ├── user.js, company.js, sourcing.js, customization.js
│   ├── feedback.js, artifact.js
│   └── logistics/logistics.js
├── qme/
│   └── wrapper.js                    # QMe task runner integration
└── utils/
    └── logger.js                     # Winston logger
```

---

## Running the Frontend

### Available npm scripts (inside `frontend/`)

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `vite` | Start dev server (port 5173) |
| `npm run build` | `vite build` | Production build |
| `npm run preview` | `vite preview` | Preview production build |

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
│       └── QMeDashboard.jsx              # Task queue & execution logs
```

---

## Environment Variables

### Backend (`.env.development` / `.env.production`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/sokogateos` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://sokogate:sokogate@localhost:5432/sokogate` |
| `JWT_SECRET` | JWT signing secret | *required — change in production* |
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |
| `KAFKA_BROKER` | Kafka broker address | `localhost:9092` |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint | `localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `sokogate_access` |
| `MINIO_SECRET_KEY` | MinIO secret key | `sokogate_secret_key_change_in_production` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |
| `LOG_LEVEL` | Winston log level | `debug` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `/api` (uses Vite proxy in dev) |

No `.env` file is required for the frontend during development — the Vite proxy handles API routing automatically.

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/profile` | Get profile |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/request-reset` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### Sourcing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/sourcing/request/:id` | ✅ | Get sourcing request |
| POST | `/api/v1/sourcing/request` | ✅ | Create sourcing request |
| GET | `/api/v1/sourcing/company/:id` | ✅ | Get company's requests |
| PUT | `/api/v1/sourcing/request/:id/status` | ✅ | Update request status |

### Customization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/customization/request/:id` | ✅ | Get customization request |
| POST | `/api/v1/customization/request` | ✅ | Create customization request |
| GET | `/api/v1/customization/company/:id` | ✅ | Get company's requests |
| PUT | `/api/v1/customization/request/:id/status` | ✅ | Update request status |

### Logistics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/logistics/shipment/:id` | ✅ | Get shipment details |
| POST | `/api/v1/logistics/shipment` | ✅ | Create shipment |
| GET | `/api/v1/logistics/company/:id` | ✅ | Get company's shipments |
| PUT | `/api/v1/logistics/shipment/:id/status` | ✅ | Update shipment status |
| GET | `/api/v1/logistics/track/:id` | ✅ | Track shipment in real-time |

### QMe Tasks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/qme/run/:taskName` | ✅ | Execute a QMe task |
| GET | `/api/v1/qme/tasks` | ✅ | List available tasks |
| GET | `/api/v1/qme/task/:id` | ✅ | Get task details and logs |
| GET | `/api/qme/status` | ✅ | QMe dashboard status |

### Self-Improving Engine

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/engine/status` | ✅ | Engine status and metrics |
| POST | `/api/engine/run-cycle` | ✅ | Manually trigger feedback cycle |
| POST | `/api/engine/feedback` | ✅ | Submit feedback data point |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

---

## Dashboards

All dashboards are accessible from the sidebar after login.

| Dashboard | Route | Roles | Features |
|-----------|-------|-------|----------|
| **Executive** | `/dashboard` | exec, super_admin | Revenue forecasts, market intelligence, risk heatmaps, ROI analytics |
| **Procurement** | `/procurement` | procurement_manager, company_admin | Supplier discovery, RFQ management, price benchmarking |
| **Logistics** | `/logistics` | logistics_coordinator, company_admin | Real-time tracking, route optimization, customs handling |
| **QMe Tasks** | `/qme` | all authenticated | Task queue visualization, execution history, live logs |

---

## Testing

```bash
# Run all tests (13 suites, 62 tests)
npm test

# Run with verbose output
npx jest --verbose

# Run a specific test file
npx jest tests/services/sourcingService.test.js
npx jest tests/services/logisticsService.test.js

# Run with coverage report
npx jest --coverage

# Run tests with force exit (for services with active connections)
npx jest --forceExit
```

**Current coverage:** 62 tests across 13 suites — all passing.

---

## Infrastructure Services

Docker Compose starts 10 services:

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| **API** | `3000` | Express application | — |
| **Kafka** | `9092` | Event streaming | — |
| **Zookeeper** | `2181` | Kafka coordination | — |
| **MongoDB** | `27017` | Document store | — |
| **PostgreSQL** | `5432` | Relational data | `sokogate` / `sokogate` |
| **Redis** | `6379` | Caching / sessions | — |
| **MinIO** | `9000` / `9001` | S3-compatible storage | `sokogate_access` / `sokogate_secret_key_change_in_production` |
| **Prometheus** | `9090` | Metrics collection | — |
| **Grafana** | `3001` | Monitoring dashboards | `sokogate` / `sokogate_admin` |

### Useful Docker commands

```bash
# View service logs
docker-compose logs -f api
docker-compose logs -f kafka

# Restart a service
docker-compose restart mongo

# Stop and clean up volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1: Foundation** | ✅ Complete | Auth, RBAC, data models, QMe integration, infrastructure |
| **Phase 2: Core Services** | ✅ Complete | Real service logic, AI intelligence, self-improving loop |
| **Phase 3: Frontend** | ✅ Complete | React dashboards, lazy loading, error boundaries |
| **Phase 4: Scale Ready** | ✅ Complete | Monitoring (Prometheus/Grafana), security hardening, investor materials, comprehensive README |
| **Phase 5: Production** | 📅 Planned | Multi-region deployment, advanced ML pipelines, marketplace launch |

---

## License

MIT © SokogateOS
