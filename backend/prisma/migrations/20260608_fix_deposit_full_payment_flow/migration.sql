-- Revert partial-payment columns added in Phase 11B.
-- Deposit payment is always full amount — paidAmount and outstandingAmount are not needed.

ALTER TABLE "deposits" DROP COLUMN IF EXISTS "paidAmount";
ALTER TABLE "deposits" DROP COLUMN IF EXISTS "outstandingAmount";

-- Note: DepositStatus enum value 'PARTIAL' was added in Phase 11B.
-- PostgreSQL does not support dropping enum values.
-- The value is left in the DB but will not be used by application code.
