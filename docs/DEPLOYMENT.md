# Deployment Guide — SokogateOS

> **Version**: 1.0.0  
> **Updated**: 2026-06-24

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start (Development)](#2-quick-start-development)
3. [Production Deployment](#3-production-deployment)
4. [Environment Configuration](#4-environment-configuration)
5. [Docker Stack](#5-docker-stack)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Database & Storage](#8-database--storage)
9. [Worktree Deployment](#9-worktree-deployment)
10. [Production Checklist](#10-production-checklist)

---

## 1. Prerequisites

| Tool      | Minimum Version | Notes                          |
|-----------|-----------------|----------------------------------|
| Node.js   | 20.x            | LTS recommended                 |
| Docker    | 24+             | With Compose V2 plugin          |
| npm       | 10.x            | Bundled with Node 20            |
| PostgreSQL| 16              | Or managed equivalent (RDS, etc.)|
| Redis     | 7               | Or managed (ElastiCache, etc.)  |
| MongoDB   | 7               | Or managed (Atlas, etc.)        |

Optional:
- Apache Kafka 3.x / Confluent Platform 7.7+ (graceful degradation if absent)
- MinIO or S3-compatible object storage
- Prometheus + Grafana (monitoring stack)

---

## 2. Quick Start (Development)

```bash
# 1. Clone & install
git clone <repo-url> sokogateos
cd sokogateos
npm install

# 2. Configure environment
cp .env.example .env.development
# Edit .env.development with your local settings

# 3. Start infrastructure dependencies
docker compose up -d postgres redis mongo

# 4. Run database migrations
npm run migrate

# 5. Start the API server
npm run dev

# 6. (Separate terminal) Start the frontend
cd frontend
npm install
npm run dev
```

The API is now available at **http://localhost:3000** and the frontend at **http://localhost:5173**.

---

## 3. Production Deployment

### 3.1 Docker Compose (Recommended)

```bash
# 1. Set up environment
cp .env.example .env.production
# Fill in all production values — especially secrets and API keys

# 2. Build and start the full stack
docker compose --env-file .env.production up -d --build

# 3. Verify health
curl http://localhost:3000/health
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana (user: sokogate)
```

### 3.2 Standalone (Without Docker)

```bash
export NODE_ENV=production
npm ci
npm run build
npm start
```

### 3.3 Health Check Endpoints

| Endpoint           | Purpose                        |
|--------------------|--------------------------------|
| `GET /health`           | Config validation (env vars, service keys)         |
| `GET /health/live`     | Config + live API connectivity tests                |
| `GET /health/checks`   | List all available health check definitions          |
| `GET /api/engine/status` | Self-improving loop status                          |

Docker HEALTHCHECK is configured to hit `/health` every 30s with a 40s startup grace period.

---

## 4. Environment Configuration

### 4.1 Critical Secrets (Must Set in Production)

| Variable               | Description                      | Source                          |
|------------------------|----------------------------------|----------------------------------|
| `JWT_SECRET`           | 64+ char random string           | `openssl rand -hex 32`          |
| `JWT_REFRESH_SECRET`   | Different 64+ char random string | `openssl rand -hex 32`          |
| `POSTGRES_PASSWORD`    | PostgreSQL password               | Your choice                      |
| `MINIO_ROOT_PASSWORD`  | MinIO admin password (> 8 chars)  | Your choice                      |
| `GRAFANA_PASSWORD`     | Grafana admin password             | Your choice                      |

### 4.2 Required Service Keys

See `.env.example` for the full list. Critical production keys:

- **Twilio** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
- **M-Pesa** — `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`
- **OpenAI** — `OPENAI_API_KEY` (for LangChain orchestration)
- **Sentry** — `SENTRY_DSN` (error tracking)
- **PostHog** — `POSTHOG_API_KEY` (analytics)
- **Apify** — `APIFY_API_KEY` (web scraping & data enrichment)
- **Cloudflare** — `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ACCOUNT_ID`
- **WATI.io** — `WATI_API_KEY` (WhatsApp Business)

### 4.3 Feature Flags

```env
ENABLE_VOICE_INTERFACE=false
ENABLE_OFFLINE_MODE=false
ENABLE_AI_FEEDBACK_LOOP=true
```

### 4.4 File-Based Configuration

The system loads environment from two files in order:
1. `.env` — Base configuration (secrets)
2. `.env.development` or `.env.production` — Environment-specific overrides

---

## 5. Docker Stack

### 5.1 Services Overview

| Service    | Image                              | Port(s)     | Resource Limits   |
|------------|-------------------------------------|-------------|-------------------|
| **API**    | `sokogateos` (local build)          | 3000        | 512M RAM / 1 CPU  |
| **Frontend**| Custom build                       | 5173        | 256M RAM / 0.5 CPU|
| **PostgreSQL** | `postgres:16-alpine`           | 5432        | 512M RAM / 0.5 CPU|
| **MongoDB**    | `mongo:7`                      | 27017       | 1G RAM / 0.5 CPU  |
| **Redis**      | `redis:7-alpine`               | 6379        | 128M RAM / 0.3 CPU|
| **Kafka**      | `confluentinc/cp-kafka:7.7.0` | 9092        | 1G RAM / 0.5 CPU  |
| **ZooKeeper**  | `confluentinc/cp-zookeeper:7.7.0` | 2181    | 256M RAM / 0.3 CPU|
| **MinIO**      | `minio/minio:latest`           | 9000, 9001  | 512M RAM / 0.5 CPU|
| **Prometheus** | `prom/prometheus:v2.54.0`     | 9090        | 256M RAM / 0.3 CPU|
| **Grafana**    | `grafana/grafana:11.2.0`      | 3001        | 256M RAM / 0.3 CPU|

### 5.2 Dockerfile Architecture (Multi-Stage)

```dockerfile
FROM node:20-alpine AS deps    # Stage 1: Install ALL dependencies
FROM node:20-alpine AS builder  # Stage 2: Prune dev deps
FROM node:20-alpine AS runner   # Stage 3: Production runtime
```

- Runs as non-root user `sokogate` (UID 1001)
- HEALTHCHECK configured with 30s interval and 40s startup period
- Logs written to `/app/logs/` with rotation (10MB per file, 10 files retention)
- **`.dockerignore`** excludes `tests/`, `docs/`, `scripts/`, `.git/`, `node_modules/` (local),
  `coverage/`, and tooling config to reduce build context and prevent cache invalidation

### 5.3 Healthcheck Dependencies

The API service waits for healthy dependencies before starting:

```
api → kafka (started), mongo (healthy), redis (healthy), postgres (healthy)
frontend → api (healthy)
prometheus → api (healthy)
```

### 5.4 Resource Management

All services have explicit resource limits and reservations:
- **Limits**: Hard ceiling the container cannot exceed
- **Reservations**: Guaranteed minimum resources for reliable performance

---

## 6. CI/CD Pipeline

### 6.1 Pipeline Stages (`.github/workflows/ci.yml`)

```
lint ─┬─ test ──┬─ build (master only)
      │         │
      └─ health-check ─┘
      
security-audit (runs in parallel, non-blocking)
```

### 6.2 Job Details

| Job              | Tools                                    | Timeout |
|------------------|------------------------------------------|---------|
| `lint`           | ESLint, Prettier, tsc --noEmit           | 10 min  |
| `test`           | Jest with coverage, Postgres + Redis     | 15 min  |
| `health-check`   | `scripts/health-check.js`                | 10 min  |
| `build`          | Docker build (`sokogateos:${{ github.sha }})` | 10 min |
| `frontend-build` | Vite build                               | 10 min  |
| `security-audit` | npm audit --audit-level=moderate         | 5 min   |

### 6.3 Key Practices

- **`npm ci`** — Used everywhere for deterministic, reproducible installs
- **Frozen lockfile** — Ensures dependency integrity across environments
- **Build only on master** — Saves CI time on feature branches
- **Concurrency group** — Cancels redundant runs on the same branch
- **Coverage artifacts** — Uploaded with 14-day retention
- **Security audit** — Non-blocking, uses `continue-on-error: true`

---

## 7. Monitoring & Observability

### 7.1 Logging (`src/utils/logger.js`)

| Environment | Format      | Output                        |
|-------------|-------------|-------------------------------|
| Development | Colorized   | Console + files (debug level) |
| Production  | JSON        | Rotating files (info level)   |

- **Log rotation**: 10MB max per file, 10 files retention, tailable
- **Log levels**: `error`, `warn`, `info`, `debug`, `silly`
- **Error logs** include full stack traces
- **Output paths**: `/app/logs/combined.log` and `/app/logs/error.log`

### 7.2 Metrics (Prometheus)

Configured at `config/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

scrape_configs:
  - job_name: 'sokogateos-api'    # API metrics at /metrics
  - job_name: 'prometheus'        # Self-monitoring
  # - job_name: 'node'            # Host metrics (requires node_exporter)
  # - job_name: 'docker'          # Docker daemon metrics
```

Retention: **30 days** (`--storage.tsdb.retention.time=30d`)

### 7.3 Error Tracking (Sentry)

- DSN: `SENTRY_DSN` env var
- Traces sample rate: 0.1 (10% of transactions)
- Error sample rate: 1.0 (all errors captured)
- Release tracking via `SENTRY_RELEASE`

### 7.4 Health Check Script (Standalone)

```bash
node scripts/health-check.js          # Config validation
node scripts/health-check.js --live   # Live dependency checks
node scripts/health-check.js --json   # JSON output for automation
```

---

## 8. Database & Storage

### 8.1 PostgreSQL

- **Role**: Primary relational database (users, teams, accounts, artifacts)
- **Migrations**: `npm run migrate`
- **Connection**: `POSTGRES_*` env vars
- **Health check**: `pg_isready -U sokogate`

### 8.2 MongoDB

- **Role**: Document storage (feedback, conversations, agent memory, logs)
- **Connection**: `MONGODB_URI` env var
- **Health check**: `mongosh --eval "db.adminCommand('ping')"`
- **Graceful degradation**: App continues even if MongoDB is unavailable

### 8.3 Redis

- **Role**: Caching (sessions, rate limiting, temporary data)
- **Connection**: `REDIS_URL` env var
- **Health check**: `redis-cli ping`

### 8.4 MinIO (Object Storage)

- **Role**: S3-compatible storage for documents, images, recordings
- **Console**: Port 9001
- **Credentials**: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` (required in production)
- **Bucket**: `MINIO_BUCKET` (default: `sokogateos-recordings`)

### 8.5 Kafka (Event Streaming)

- **Graceful degradation**: System operates in degraded mode if Kafka is down
- **Topics**: `product.updated`, `order.created`, `inventory.changed`, `supplier.risk.updated`, `customer.feedback.received`, `document.processed`

---

## 9. Worktree Deployment

The project supports parallel development via Git worktrees:

```bash
# Create a worktree for a component
git worktree add .worktrees/services services

# Make changes in the worktree
cd .worktrees/services
# ... edit, commit ...

# Merge back to master
cd ../../
git merge services --no-ff
```

Each worktree in `.worktrees/` can be deployed independently via merge to master. The CI pipeline validates all merged code through linting, testing, and health checks.

---

## 10. Production Checklist

### ☐ Security
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` set to unique 64+ char random values
- [ ] `BCRYPT_ROUNDS` set to 12 (or higher for additional security)
- [ ] `FRONTEND_URL` set to explicit production URL (CORS locked down)
- [ ] `NODE_ENV=production` (disables dev-only behavior, forces strict mode)
- [ ] MinIO password set via `MINIO_ROOT_PASSWORD` (no default fallback)
- [ ] Grafana password set via `GRAFANA_PASSWORD`
- [ ] HTTPS/TLS termination configured (reverse proxy or Cloudflare)

### ☐ Infrastructure
- [ ] Docker Compose resource limits reviewed and tuned for your hardware
- [ ] Persistent volume backups configured (Mongo, Postgres, MinIO)
- [ ] Log rotation configured (default: 10MB × 10 files)
- [ ] Prometheus retention period set (default: 30 days)
- [ ] Grafana data source connected to Prometheus

### ☐ Monitoring
- [ ] Sentry DSN configured
- [ ] PostHog API key set
- [ ] Health check endpoint integrated with your monitoring system
- [ ] AlertManager configured (create `config/alerts.yml` and uncomment in Prometheus config)
- [ ] Log aggregation set up (e.g., Loki, ELK, or cloud log service)

### ☐ External Services
- [ ] All API keys provisioned and rotated from defaults
- [ ] Twilio WhatsApp number configured and approved
- [ ] M-Pesa environment set to `production` (not `sandbox`)
- [ ] OpenAI API key with sufficient quota
- [ ] Apify API key with required actors installed
- [ ] Cloudflare API token with proper DNS + CDN permissions

### ☐ Operations
- [ ] `docker compose up -d` verified with clean startup
- [ ] Health check responds 200
- [ ] First user registration works (creates admin role)
- [ ] Graceful degradation verified (disconnect Kafka/DB — system still starts)
- [ ] SSL/TLS certificates valid and auto-renewal configured
