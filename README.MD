# 🚀 Docker Setup & API Testing Guide

## Run Application with Docker

Follow these steps to start the project:

### 1. Build and start services
docker compose up --build

### 2. Run database migration
docker compose exec app npx prisma migrate deploy

### 3. Seed the database
docker compose exec app npm run seed

After running seed, you will get important values in terminal:

- x-api-key → used for API authentication  
- x-user-id → owner user ID   
- COPY all values for further Testing Api

Example:
Base URL: http://localhost:4000  
x-api-key: alpha_raw_key_1234567890  
x-user-id: alpha-owner-1  
oldKeyId: tenant-alpha-key-1  

Save these values. You will need them to test APIs.

---

## API Testing

You can test APIs using Postman or curl.

### Create Tenant
POST /tenants

{
  "name": "Acme Corp",
  "ownerEmail": "owner@acme.com"
}

---

### Create User
POST /users

{
  "name": "Jane Doe",
  "email": "owner@acme.com",
  "role": "OWNER"
}

---

### Generate API Key
POST /apikeys/generate

Headers:
x-api-key: alpha_raw_key_1234567890  
x-user-id: alpha-owner-1  
Idempotency-Key: rotate-001  

---

### Rotate API Key
curl -X POST "$BASE/apikeys/rotate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: alpha_raw_key_1234567890" \
  -H "x-user-id: alpha-owner-1" \
  -H "Idempotency-Key: rotate-001" \
  -d '{ "oldKeyId":"tenant-alpha-key-1" }'

---

### Check Email Logs
GET /emails/logs

---

### Verify Audit Logs
curl "$BASE/audit/verify" \
  -H "x-api-key: <NEW_RAW_KEY>" \
  -H "x-user-id: alpha-owner-1"

---

### Fetch Audit Logs
GET /audit/logs?cursor=<id>

---

## Notes

- Always send correct headers (x-api-key, x-user-id)
- If API not working, check API key, user ID, and headers
- Use values from seed output
























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

Use your own created by creating .env

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


## Known Limitations

- Health and metrics endpoints are not yet fully implemented.
- Seed script and integration test suite are still pending.
- Some advanced audit filters (user/action/date/resource) are pending.


