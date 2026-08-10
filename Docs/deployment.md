# Deployment and operations

## Files changed

- `Dockerfile` — one dependency layer, a migration/seed target, and reusable Next.js standalone build/runner targets.
- `compose.yaml` — PostgreSQL 17, Redis 7.4, one-shot Prisma migration, Dashboard, API, and Demo services with health/dependency gates.
- `.dockerignore` — prevents local outputs, credentials, and dependency trees from entering the build context.
- `.env.example` — documents every required runtime and cryptographic setting.
- `packages/database/prisma/migrations/20260810000000_initial/migration.sql` — reproducible first production migration.

## Why this design

The application containers are immutable and run as the unprivileged Node user. Next.js standalone output keeps runtime images smaller than a source-based deployment. Schema migration is an explicit one-shot dependency, so web traffic cannot reach a new release before the database is ready. PostgreSQL and Redis are not published to the host by default; only the three HTTP services are exposed.

Redis uses append-only persistence for the local stack. PostgreSQL and Redis each have named volumes and health checks. API health verifies both dependencies, while Dashboard and Demo health checks verify their HTTP entry points.

The Compose file is a self-contained local/staging reference. Its database password, seed credentials, peppers, signing key, encryption key, and Site Secret are deliberately marked development-only and must never be reused in production.

## Local launch

Ports 3000–3004 are intentionally not used:

```text
Dashboard  http://localhost:4301
API        http://localhost:4302
Demo       http://localhost:4303
```

```powershell
docker compose up -d --build
docker compose ps
docker compose logs migrate
```

The migration container applies pending migrations and runs the idempotent seed. A second launch does not duplicate the customer, user, membership, or demo Site.

Local login:

```text
admin@trustcaptcha.local
TrustCaptcha-Local-Admin-2026!
```

Open the Demo with `localhost`, not `127.0.0.1`: origin matching is exact and the seeded Site only allows `http://localhost:4303`.

## Production configuration

Supply secrets through the target platform's secret manager rather than baking them into an image or committing an `.env` file. Generate independent random values for:

- `AUTH_SECRET`
- `SECRET_HASH_PEPPER`
- `IP_HASH_PEPPER`
- `REQUEST_BINDING_PEPPER`
- `IP_ENCRYPTION_KEY` (exactly 32 bytes, base64url encoded)
- every entry in `TOKEN_SIGNING_KEYS` (at least 32 random bytes per key)
- PostgreSQL and Redis credentials
- initial administrator password and every Site Secret/API Key

Set public/service URLs to their canonical HTTPS origins. Keep `TRUST_PROXY=false` unless requests always traverse a trusted reverse proxy that overwrites forwarding headers. At the edge, enforce TLS, HSTS, request-size limits, sane timeouts, and DDoS controls. Configure PostgreSQL TLS and Redis TLS/authentication when they run outside a private network.

`TOKEN_SIGNING_KEYS` is a comma-separated key ring (`key-id:base64url-secret`). To rotate safely, add a new key, point `ACTIVE_TOKEN_SIGNING_KEY_ID` to it, deploy, wait longer than the maximum token TTL, then remove the old key. Rotate Site Secrets and API Keys from the Dashboard; only their hashes are stored and newly issued plaintext is displayed once.

## Scaling and reliability

Dashboard, API, and Demo instances are stateless and may be replicated behind a load balancer. Shared challenge state, replay markers, and rate-limit counters live in Redis. Persistent tenant, credential, audit, and verification data live in PostgreSQL.

For a commercial deployment:

- use managed PostgreSQL with point-in-time recovery and tested restores;
- use a highly available Redis service with eviction/latency alerts;
- run `prisma migrate deploy` as a release job before shifting traffic;
- ship structured application logs and metrics to centralized observability;
- alert on health failures, elevated rate limiting, verification failure changes, Redis latency, database saturation, and migration failure;
- define retention for verification logs, encrypted IP values, and audit records according to privacy policy;
- keep clocks synchronized because token expiry is time-based.

## Verification method

Run the repository quality gates:

```powershell
pnpm db:validate
pnpm typecheck
pnpm test
pnpm lint
pnpm build
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Then exercise the end-to-end path: load widget config, create a challenge, complete it after the minimum dwell time, verify the returned token once, verify it again to confirm `TOKEN_REPLAYED`, and check that both attempts appear in `/logs` with request IDs and security metadata.
