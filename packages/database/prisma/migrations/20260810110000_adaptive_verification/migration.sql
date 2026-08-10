ALTER TABLE "verification_logs"
ADD COLUMN "action" VARCHAR(32) NOT NULL DEFAULT 'generic';

CREATE INDEX "verification_logs_customer_action_created_at_idx"
ON "verification_logs"("customerId", "action", "createdAt" DESC);
