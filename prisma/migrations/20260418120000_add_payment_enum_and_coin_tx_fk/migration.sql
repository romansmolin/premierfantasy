-- Extend PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ERROR';

-- Payment uniqueness + traceability
ALTER TABLE "payment_tokens" ADD COLUMN IF NOT EXISTS "tracking_id" TEXT;
ALTER TABLE "payment_tokens" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "payment_tokens_gateway_uid_key" ON "payment_tokens"("gateway_uid");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_tokens_tracking_id_key" ON "payment_tokens"("tracking_id");

-- Link coin transaction to payment token for replay-proof idempotency
ALTER TABLE "coin_transactions" ADD COLUMN IF NOT EXISTS "payment_token_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "coin_transactions_payment_token_id_key" ON "coin_transactions"("payment_token_id");
ALTER TABLE "coin_transactions"
    ADD CONSTRAINT "coin_transactions_payment_token_id_fkey"
    FOREIGN KEY ("payment_token_id") REFERENCES "payment_tokens"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
