CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'SCALE', 'PRIVATE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');
CREATE TYPE "VerificationPolicyPreset" AS ENUM ('CONVERSION', 'BALANCED', 'STRICT', 'CUSTOM');
CREATE TYPE "VerificationPolicyMode" AS ENUM ('MANAGED', 'INVISIBLE', 'CHECKBOX', 'NON_INTERACTIVE');
CREATE TYPE "PolicyFailMode" AS ENUM ('CLOSED', 'OPEN');
CREATE TYPE "BrandAssetStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TYPE "AuditAction" ADD VALUE 'POLICY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'POLICY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'POLICY_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'BRAND_ASSET_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'BRAND_ASSET_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'BILLING_SUBSCRIPTION_UPDATED';

ALTER TABLE "customers"
ADD COLUMN "planTier" "PlanTier" NOT NULL DEFAULT 'FREE';

ALTER TABLE "sites"
ADD COLUMN "defaultLocale" VARCHAR(16) NOT NULL DEFAULT 'auto',
ADD COLUMN "supportedLocales" TEXT[] NOT NULL DEFAULT ARRAY['auto']::TEXT[];

CREATE TABLE "verification_policies" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "action" VARCHAR(32) NOT NULL DEFAULT '*',
  "preset" "VerificationPolicyPreset" NOT NULL DEFAULT 'BALANCED',
  "mode" "VerificationPolicyMode" NOT NULL DEFAULT 'MANAGED',
  "allowedChallenges" TEXT[] NOT NULL DEFAULT ARRAY['POW', 'CHECKBOX']::TEXT[],
  "riskThreshold" SMALLINT,
  "maxAttempts" SMALLINT NOT NULL DEFAULT 3,
  "immunitySeconds" INTEGER NOT NULL DEFAULT 300,
  "failMode" "PolicyFailMode" NOT NULL DEFAULT 'CLOSED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "verification_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "verification_policies_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "verification_policies_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "verification_policies_site_action_key" ON "verification_policies"("siteId", "action");
CREATE INDEX "verification_policies_customer_site_idx" ON "verification_policies"("customerId", "siteId");

CREATE TABLE "brand_assets" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "altText" VARCHAR(180) NOT NULL,
  "mimeType" VARCHAR(32) NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "content" BYTEA NOT NULL,
  "status" "BrandAssetStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "brand_assets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "brand_assets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "brand_assets_site_sha256_key" ON "brand_assets"("siteId", "sha256");
CREATE INDEX "brand_assets_customer_site_status_idx" ON "brand_assets"("customerId", "siteId", "status");

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "provider" VARCHAR(16) NOT NULL DEFAULT 'CREEM',
  "providerCustomerId" VARCHAR(80),
  "providerSubscriptionId" VARCHAR(80),
  "providerProductId" VARCHAR(80),
  "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  "currentPeriodStart" TIMESTAMPTZ(3),
  "currentPeriodEnd" TIMESTAMPTZ(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "subscriptions_customer_id_key" ON "subscriptions"("customerId");
CREATE UNIQUE INDEX "subscriptions_provider_customer_id_key" ON "subscriptions"("providerCustomerId");
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("providerSubscriptionId");
CREATE INDEX "subscriptions_status_period_end_idx" ON "subscriptions"("status", "currentPeriodEnd");

CREATE TABLE "billing_webhook_events" (
  "id" UUID NOT NULL,
  "customerId" UUID,
  "provider" VARCHAR(16) NOT NULL DEFAULT 'CREEM',
  "providerEventId" VARCHAR(96) NOT NULL,
  "eventType" VARCHAR(64) NOT NULL,
  "payloadHash" CHAR(64) NOT NULL,
  "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_webhook_events_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_webhook_events_provider_event_id_key" ON "billing_webhook_events"("providerEventId");
CREATE INDEX "billing_webhook_events_customer_processed_idx" ON "billing_webhook_events"("customerId", "processedAt" DESC);
