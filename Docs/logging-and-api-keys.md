# Verification operations and API keys

## API key lifecycle

TrustCaptcha API keys use the wire format `tc_ak_<key-id>_<secret>`. The key ID is indexed for lookup while the complete credential is hashed with Argon2id and an independent `SECRET_HASH_PEPPER`. The plaintext is returned only from create and rotate operations and is never recoverable from the database.

Keys can be global to a customer or restricted to one Site. A site-restricted key cannot verify a token issued for another Site. Scopes are explicit (`VERIFY`, `READ_LOGS`, `MANAGE_SITES`); the public verify endpoint currently requires `VERIFY`.

Rotation creates a new key and shortens the old key's expiry to the requested grace period (five minutes in the dashboard). A zero-second grace period revokes the old key immediately. The Dashboard's Delete action is implemented as an immediate, irreversible revocation rather than a physical row deletion so credential history and audit evidence remain intact. Deletion/revocation and rotation are tenant-scoped and recorded in `AuditLog`.

## Verification logs

Every verification that can be safely attributed to a customer and Site records:

- the response request ID, challenge ID and a truncated SHA-256 token fingerprint;
- status, failure code, score and risk reasons;
- API and end-to-end verification duration;
- Site and optional API key identity;
- origin and bounded user-agent metadata;
- an HMAC IP correlation hash and, when configured, an AES-256-GCM encrypted IP value.

Raw IP addresses are never returned by the management API or CSV export. The Dashboard decrypts them only inside the authenticated server process, masks the host portion, and returns the masked value alongside the non-reversible correlation hash. `IP_ENCRYPTION_KEY` must be an independent 32-byte base64url value and must therefore be available to both API and Dashboard runtimes. Ciphertext contains a format version, random 96-bit IV, authentication tag and encrypted value, allowing future key/version migration.

Invalid credentials and pre-authentication rate limits are intentionally not inserted into tenant verification tables because they cannot be attributed without risking cross-tenant leakage; infrastructure security telemetry should capture those gateway-level events.

Logging is best-effort: a database observability outage is emitted to server logs but does not change an otherwise valid verification result. The response request ID is reused in the database record for correlation.

## Management UI and export

The Verification Logs table supports server-side pagination and filters by time, Site, request ID and status. It shows time, Site, masked IP, bounded User-Agent, score and result, while the Drawer exposes the remaining security-safe diagnostic fields. CSV exports are tenant-scoped, capped at 10,000 rows per request, include only the masked IP, exclude encrypted IP material and write an `EXPORT_CREATED` audit event.

## Required secret separation

Use independently generated values for `AUTH_SECRET`, `SECRET_HASH_PEPPER`, `IP_HASH_PEPPER`, `REQUEST_BINDING_PEPPER`, `IP_ENCRYPTION_KEY` and every token-signing key. Do not derive one from another. Rotate token signing keys by adding the new key to `TOKEN_SIGNING_KEYS`, selecting it with `ACTIVE_TOKEN_SIGNING_KEY_ID`, waiting past the maximum token TTL, and only then removing the previous key.
