-- TrustCaptcha v1 initial schema
-- The PostgreSQL provider provisions the public schema. Application roles only
-- need CREATE privileges on that schema, not database-level CREATE privileges.

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('VERIFY', 'READ_LOGS', 'MANAGE_SITES');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('SUCCESS', 'FAILED', 'EXPIRED', 'REPLAYED', 'RATE_LIMITED', 'INVALID');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'API_KEY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('AUTH_LOGIN_SUCCEEDED', 'AUTH_LOGIN_FAILED', 'AUTH_LOGOUT', 'SITE_CREATED', 'SITE_UPDATED', 'SITE_DISABLED', 'SITE_DELETED', 'SITE_SECRET_VIEWED', 'SITE_SECRET_ROTATED', 'API_KEY_CREATED', 'API_KEY_ROTATED', 'API_KEY_REVOKED', 'MEMBER_ROLE_CHANGED', 'MEMBER_SUSPENDED', 'EXPORT_CREATED', 'SECURITY_RATE_LIMITED', 'SECURITY_CROSS_TENANT_DENIED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120),
    "email" VARCHAR(320),
    "emailVerified" TIMESTAMPTZ(3),
    "image" TEXT,
    "passwordHash" VARCHAR(255),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(64),
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" VARCHAR(320) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL
);

-- CreateTable
CREATE TABLE "authenticators" (
    "credentialID" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" VARCHAR(32) NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "authenticators_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_members" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "siteKey" VARCHAR(80) NOT NULL,
    "secretKeyId" VARCHAR(48) NOT NULL,
    "secretHash" VARCHAR(255) NOT NULL,
    "secretPrefix" VARCHAR(24) NOT NULL,
    "secretLastFour" CHAR(4) NOT NULL,
    "secretCreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "riskThreshold" SMALLINT NOT NULL DEFAULT 60,
    "tokenTtlSeconds" SMALLINT NOT NULL DEFAULT 300,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "siteId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "keyId" VARCHAR(48) NOT NULL,
    "secretHash" VARCHAR(255) NOT NULL,
    "prefix" VARCHAR(24) NOT NULL,
    "lastFour" CHAR(4) NOT NULL,
    "scopes" "ApiKeyScope"[],
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID,
    "revokedById" UUID,
    "rotatedFromId" UUID,
    "lastUsedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_logs" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "apiKeyId" UUID,
    "requestId" VARCHAR(64) NOT NULL,
    "challengeId" VARCHAR(64),
    "tokenFingerprint" VARCHAR(32),
    "ipAddressEncrypted" BYTEA,
    "ipHash" CHAR(64) NOT NULL,
    "userAgent" VARCHAR(512),
    "userAgentHash" CHAR(64),
    "origin" VARCHAR(255),
    "score" SMALLINT,
    "riskReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "VerificationStatus" NOT NULL,
    "failureCode" VARCHAR(64),
    "verificationDurationMs" INTEGER,
    "apiLatencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorUserId" UUID,
    "actorApiKeyId" UUID,
    "action" "AuditAction" NOT NULL,
    "targetType" VARCHAR(64),
    "targetId" VARCHAR(64),
    "requestId" VARCHAR(64),
    "ipHash" CHAR(64),
    "userAgentHash" CHAR(64),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "authenticators_credential_id_key" ON "authenticators"("credentialID");

-- CreateIndex
CREATE INDEX "authenticators_user_id_idx" ON "authenticators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");

-- CreateIndex
CREATE INDEX "customers_status_created_at_idx" ON "customers"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "customer_members_user_id_status_idx" ON "customer_members"("userId", "status");

-- CreateIndex
CREATE INDEX "customer_members_customer_role_status_idx" ON "customer_members"("customerId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_members_customer_id_user_id_key" ON "customer_members"("customerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "sites_site_key_key" ON "sites"("siteKey");

-- CreateIndex
CREATE UNIQUE INDEX "sites_secret_key_id_key" ON "sites"("secretKeyId");

-- CreateIndex
CREATE INDEX "sites_customer_status_created_at_idx" ON "sites"("customerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sites_customer_name_idx" ON "sites"("customerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sites_customer_id_domain_active_key" ON "sites"("customerId", "domain") WHERE ("deletedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_id_key" ON "api_keys"("keyId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_rotated_from_id_key" ON "api_keys"("rotatedFromId");

-- CreateIndex
CREATE INDEX "api_keys_customer_status_created_at_idx" ON "api_keys"("customerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "api_keys_customer_site_status_idx" ON "api_keys"("customerId", "siteId", "status");

-- CreateIndex
CREATE INDEX "api_keys_expires_at_idx" ON "api_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "verification_logs_customer_created_at_idx" ON "verification_logs"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verification_logs_customer_site_created_at_idx" ON "verification_logs"("customerId", "siteId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verification_logs_customer_status_created_at_idx" ON "verification_logs"("customerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verification_logs_customer_score_created_at_idx" ON "verification_logs"("customerId", "score", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verification_logs_customer_ip_hash_created_at_idx" ON "verification_logs"("customerId", "ipHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "verification_logs_challenge_id_idx" ON "verification_logs"("challengeId");

-- CreateIndex
CREATE INDEX "verification_logs_request_id_idx" ON "verification_logs"("requestId");

-- CreateIndex
CREATE INDEX "verification_logs_created_at_brin_idx" ON "verification_logs" USING BRIN ("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_customer_created_at_idx" ON "audit_logs"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_customer_action_created_at_idx" ON "audit_logs"("customerId", "action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_created_at_idx" ON "audit_logs"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_target_created_at_idx" ON "audit_logs"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_brin_idx" ON "audit_logs" USING BRIN ("createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_members" ADD CONSTRAINT "customer_members_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_members" ADD CONSTRAINT "customer_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
