-- Drop transfer proof fields from deposits (moved to deposit_payments)
ALTER TABLE "deposits" DROP COLUMN IF EXISTS "transferProofUrl";
ALTER TABLE "deposits" DROP COLUMN IF EXISTS "transferProofPublicId";

-- Add transfer proof fields to deposit_payments
ALTER TABLE "deposit_payments" ADD COLUMN "transferProofUrl" TEXT;
ALTER TABLE "deposit_payments" ADD COLUMN "transferProofPublicId" TEXT;
