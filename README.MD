# Multi-Tenant Backend API

TypeScript + Express backend with:
- Tenant scoped API key auth
- Redis sliding-window rate limiting
- Queue-based email processing with Bull
- Tamper-evident audit chain
- PostgreSQL via Prisma

## Quick Start (Docker only)

Run everything with one command:

```bash
docker compose up --build
```

This starts:
- API server on `http://localhost:4000`
- Email worker
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

Stop all services:

```bash
docker compose down
```

## Environment Variables

Used by `docker-compose.yml`:
- `PORT=4000`
- `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/multitenant?schema=public`
- `REDIS_URL=redis://redis:6379`
- `SMTP_HOST=smtp.ethereal.email`
- `SMTP_PORT=587`
- `SMTP_USER=test_user`
- `SMTP_PASS=test_pass`

## Core Features Implemented

### 1) Multi-tenant API key auth
- API key lookup resolves tenant context (`req.tenant`) per request.
- API keys are hashed before storage.
- API key rotation supported with old-key grace period (`expiresAt`).

### 2) Sliding-window rate limiting (Redis)
- Global: 1000 req/min per tenant
- Endpoint: configurable req/min per tenant+endpoint
- Burst: 50 req/5 sec per API key
- Returns structured `429` response with tier/limit/count/reset details.
- Emits rate limit headers.

### 3) Queue-based email engine
- All emails are enqueued using Bull.
- Worker sends mail via Nodemailer.
- Retries with exponential backoff (`attempts: 3`).
- Failed final attempts are pushed to dead-letter queue.
- Delivery attempts are logged in `EmailLog`.

### 4) Tamper-evident audit trail
- State-changing actions are recorded in `AuditLog`.
- Hash chain (`prevHash` + content => `hash`) per tenant.
- `GET /audit/verify` verifies chain integrity.
- DB trigger migration prevents update/delete on `AuditLog`.
- `GET /audit/logs` supports cursor pagination.

## Main Endpoints

- `POST /tenants`
- `POST /users`
- `POST /apikeys/generate`
- `POST /apikeys/rotate`
- `GET /emails/logs`
- `GET /audit/verify`
- `GET /audit/logs?cursor=<id>`

## Known Limitations

- Health and metrics endpoints are not yet fully implemented.
- Seed script and integration test suite are still pending.
- Some advanced audit filters (user/action/date/resource) are pending.
