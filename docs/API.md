# SokogateOS API Documentation

## Overview

Base URL: `http://localhost:3000/api`

All endpoints return `{ success: boolean, data?: any, error?: string }` unless otherwise noted.

Authentication: `Authorization: Bearer <accessToken>` header required for protected routes.

---

## 1. Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | Yes | Invalidate tokens |
| GET | `/api/auth/profile` | Yes | Get current user profile |
| PUT | `/api/auth/profile` | Yes | Update profile (name, phone, preferences) |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password/:token` | No | Reset password with token |
| POST | `/api/auth/accept-terms` | Yes | Accept Terms & Conditions |

### POST `/api/auth/register`
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "SecurePass1!",
  "companyId": "...", "role": "procurement_manager", "termsAccepted": true }

// Response 201
{ "success": true, "data": { "user": { ... }, "tokens": { "accessToken": "...", "refreshToken": "...", "expiresIn": "15m" } } }
```

### POST `/api/auth/login`
```json
// Request
{ "email": "jane@example.com", "password": "SecurePass1!" }

// Response 200
{ "success": true, "data": { "user": { ... }, "tokens": { ... } } }
```

---

## 2. Agent Engine (`/api/agents`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agents` | No | List all active agents |
| GET | `/api/agents/types` | No | Available agent types |
| GET | `/api/agents/:agentId` | No | Get specific agent details |
| POST | `/api/agents/spawn` | No | Spawn new agent instance |
| POST | `/api/agents/:agentId/tasks` | No | Assign task to specific agent |
| POST | `/api/agents/tasks` | No | Assign task to best-suited agent |
| POST | `/api/agents/broadcast` | No | Broadcast message to all agents |
| POST | `/api/agents/:agentId/shutdown` | No | Shutdown specific agent |
| POST | `/api/agents/shutdown-all` | No | Shutdown all agents |

### POST `/api/agents/spawn`
```json
// Request
{ "type": "sourcing", "options": { "config": { "region": "asia" } } }

// Response 201
{ "success": true, "data": { "id": "...", "type": "sourcing", "status": "ready",
  "message": "Agent spawned successfully" } }
```

**Agent types:** `chat`, `sourcing`, `customization`, `logistics`, `compliance`, `negotiation`

### POST `/api/agents/tasks`
```json
// Request
{ "type": "find-supplier", "requiredCapabilities": ["sourcing", "supplier_verification"],
  "payload": { "product": "cotton fabric", "quantity": 5000 }, "priority": 5 }
```

---

## 3. Admin (`/api/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/admin/roles` | `teams.manageMembers` | List roles |
| POST | `/api/admin/roles/seed` | none | Seed system roles |
| POST | `/api/admin/roles` | `users.manageSettings` | Create custom role |
| PATCH | `/api/admin/roles/:roleId` | `users.manageSettings` | Update role |
| DELETE | `/api/admin/roles/:roleId` | `users.manageSettings` | Soft-delete role |
| POST | `/api/admin/users/:userId/role` | `users.assignRole` | Assign role to user |
| POST | `/api/admin/invites` | `users.invite` | Invite user |
| GET | `/api/admin/stats` | `analytics.view` | Platform statistics |
| GET | `/api/admin/health` | none | Admin health check |

---

## 4. Teams (`/api/teams`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/teams` | none (auth) | List company teams |
| GET | `/api/teams/:teamId` | none (auth) | Get team details |
| POST | `/api/teams` | `teams.create` | Create team |
| PATCH | `/api/teams/:teamId` | `teams.update` | Update team |
| DELETE | `/api/teams/:teamId` | `teams.delete` | Soft-delete team |
| POST | `/api/teams/:teamId/members` | `teams.manageMembers` | Add member |
| DELETE | `/api/teams/:teamId/members/:memberId` | `teams.manageMembers` | Remove member |

---

## 5. WhatsApp Commerce (`/api/whatsapp`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/whatsapp/webhook` | No | Twilio incoming message webhook |
| POST | `/api/whatsapp/status` | No | Twilio delivery status callback |
| POST | `/api/whatsapp/send` | `company_admin`+ | Send WhatsApp message |
| POST | `/api/whatsapp/mpesa-pay` | Yes | Generate M-Pesa payment request |
| GET | `/api/whatsapp/conversations` | Yes | Conversation history |
| GET | `/api/whatsapp/training-data` | `super_admin` | NLP training data |
| POST | `/api/whatsapp/parse` | Yes | Test NLP parsing |
| GET | `/api/whatsapp/status` | Yes | Service status + message count |

---

## 6. Supplier Trust Network (`/api/trust`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trust/search` | Yes | Search suppliers |
| GET | `/api/trust/top` | Yes | Top suppliers |
| GET | `/api/trust/supplier/:supplierId` | Yes | Supplier detail |
| POST | `/api/trust/supplier/:supplierId/verify` | `admin`+ | Request verification |
| POST | `/api/trust/supplier/:supplierId/approve` | `super_admin` | Approve verification |
| POST | `/api/trust/supplier/:supplierId/recalculate-score` | `super_admin` | Recalculate trust score |
| POST | `/api/trust/supplier/:supplierId/review` | Yes | Submit review |
| GET | `/api/trust/supplier/:supplierId/reviews` | Yes | Get supplier reviews |
| POST | `/api/trust/escrow/create` | Yes | Create escrow transaction |
| POST | `/api/trust/escrow/:escrowId/release` | Yes | Release escrow funds |
| PUT | `/api/trust/supplier/:supplierId/subscription` | `super_admin` | Update subscription tier |
| GET | `/api/trust/status` | Yes | Service status |

**Subscription tiers:** `free`, `basic`, `verified`, `premium`

---

## 7. Customs Engine (`/api/customs`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/customs/classify` | Yes | AI HS code classification |
| GET | `/api/customs/hs-codes` | Yes | Search HS codes |
| GET | `/api/customs/hs-codes/:code` | Yes | HS code detail |
| GET | `/api/customs/categories` | Yes | Product categories |
| POST | `/api/customs/calculate-duty` | Yes | Duty & tax calculation |
| GET | `/api/customs/compliance` | Yes | Compliance check |
| GET | `/api/customs/trade-agreement` | Yes | Trade agreement optimization |
| GET | `/api/customs/trade-agreements` | Yes | List trade agreements |
| GET | `/api/customs/routes` | Yes | Customs route intelligence |
| POST | `/api/customs/shipments` | Yes | Create customs shipment |
| GET | `/api/customs/shipments` | Yes | List company shipments |
| GET | `/api/customs/shipments/:shipmentId` | Yes | Shipment detail |
| PUT | `/api/customs/shipments/:shipmentId/status` | Yes | Update shipment status |
| POST | `/api/customs/shipments/:shipmentId/documents/generate` | Yes | Generate document |
| GET | `/api/customs/document-templates` | Yes | Document templates |
| GET | `/api/customs/status` | Yes | Service status |

**Document types:** `bill_of_lading`, `commercial_invoice`, `packing_list`, `certificate_of_origin`, `import_declaration`, `export_declaration`, `certificate_of_insurance`, `single_administrative_document`, `customs_bond`, `preference_certificate`, `manufacturers_declaration`

**Shipment statuses:** `draft`, `documents_generated`, `submitted`, `in_processing`, `cleared`, `held_for_inspection`, `rejected`, `released`, `exported`

---

## 8. Health (`/health`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Config check + basic status |
| GET | `/health/live` | No | Config + live API connectivity |
| GET | `/health/checks` | No | List all available checks |

### GET `/health`
```json
{ "status": "OK", "timestamp": "2026-06-24T...", "version": "1.0.0",
  "summary": { "total": 17, "passed": 15, "failed": 2, "requiredFailed": 1, "ok": false },
  "checks": [ { "name": "JWT", "category": "Core", "required": true, "ok": true, "message": "Configured" }, ... ] }
```

---

## 9. Engine & Hermes `/api/engine`, `/api/hermes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/engine/status` | No | Self-Improving Loop status |
| POST | `/api/engine/run-cycle` | No | Manually trigger improvement cycle |
| POST | `/api/engine/feedback` | No | Submit feedback |
| GET | `/api/hermes/status` | No | Hermes agent system status |
| POST | `/api/hermes/run-cycle` | No | Run Hermes agent cycle |
| POST | `/api/hermes/start-scheduled-runs` | No | Start scheduled Hermes runs |
| POST | `/api/hermes/stop-scheduled-runs` | No | Stop scheduled Hermes runs |
| GET | `/api/qme/status` | No | QMe task runner status |

---

## 10. CRM: Contacts, Accounts, Sequences, Enrollments

### Contacts (`/api/contacts`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/contacts` | `contacts.read` | List contacts |
| POST | `/api/contacts` | `contacts.write` | Create contact |
| GET | `/api/contacts/:id` | `contacts.read` | Get contact |
| PATCH | `/api/contacts/:id` | `contacts.write` | Update contact |
| POST | `/api/contacts/:id/account/:accountId` | `contacts.write` | Assign account |
| DELETE | `/api/contacts/:id` | `contacts.delete` | Remove contact |

### Accounts (`/api/accounts`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/accounts` | `accounts.read` | List accounts |
| POST | `/api/accounts` | `accounts.write` | Create account |
| GET | `/api/accounts/:id` | `accounts.read` | Get account |
| PATCH | `/api/accounts/:id` | `accounts.write` | Update account |
| DELETE | `/api/accounts/:id` | `accounts.delete` | Delete account |

### Sequences (`/api/sequences`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/api/sequences` | `sequences.read` | List sequences |
| POST | `/api/sequences` | `sequences.write` | Create sequence |
| GET | `/api/sequences/:id` | `sequences.read` | Get sequence |
| PATCH | `/api/sequences/:id` | `sequences.write` | Update sequence |
| DELETE | `/api/sequences/:id` | `sequences.delete` | Delete sequence |

### Enrollments (`/api/enrollments`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/api/enrollments` | `enrollments.write` | Enroll contact in sequence |
| GET | `/api/enrollments` | `enrollments.read` | List enrollments |
| PATCH | `/api/enrollments/:id/step` | `enrollments.write` | Update step/status |
| DELETE | `/api/enrollments/:id` | `enrollments.delete` | Pause enrollment |

---

## 11. Root

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Server status `{ "name": "sokogateos", "status": "running" }` |

---

## Response Format

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "Human-readable error message",
  "details": { ... } }
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (task queued) |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | Service unavailable |

## Rate Limiting

**Global per-prefix limits (rate-limiter-flexible, in-memory):**

| Route Prefix | Requests | Window | Block Duration |
|---|---|---|---|
| `/api/auth` | 10 | 60s | 120s |
| All other API routes `/api/v1`, `/api/admin`, `/api/teams`, `/api/agents`, `/api/whatsapp`, `/api/trust`, `/api/customs`, `/api/contacts`, `/api/accounts`, `/api/sequences`, `/api/enrollments` | 200 | 60s | 120s |

**Route-specific limits (simple in-memory Map):**

| Endpoint | Attempts | Window |
|---|---|---|
| `POST /api/auth/register` | 5 | 15 min |
| `POST /api/auth/login` | 10 | 15 min |
| `POST /api/auth/forgot-password` | 3 | 15 min |

## Authentication

1. `POST /api/auth/register` or `POST /api/auth/login` → get `{ accessToken, refreshToken }`
2. Include `Authorization: Bearer <accessToken>` on protected requests
3. When token expires (default 15 min), call `POST /api/auth/refresh` with `{ refreshToken }`
4. Refresh token rotation invalidates used refresh tokens

**Token versioning:** Logout, password change, and refresh token rotation increment `tokenVersion` — all tokens issued before the increment are invalidated.
