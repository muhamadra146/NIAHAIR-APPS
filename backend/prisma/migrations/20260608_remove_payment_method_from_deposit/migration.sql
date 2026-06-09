-- Payment method now belongs only to DepositPayment, not Deposit.
-- Remove FK constraint, index, and column from deposits table.

ALTER TABLE "deposits" DROP CONSTRAINT IF EXISTS "deposits_paymentMethodId_fkey";

DROP INDEX IF EXISTS "deposits_paymentMethodId_idx";

ALTER TABLE "deposits" DROP COLUMN IF EXISTS "paymentMethodId";
