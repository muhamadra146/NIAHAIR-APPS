-- Cleanup: drop partial-payment columns that phase11b added but were subsequently removed.
-- This migration sorts AFTER phase11b_ (c > b) so in the shadow DB the columns are
-- present from phase11b_, then dropped here, matching schema.prisma.
-- On the actual dev DB the columns are already gone — IF EXISTS makes this a safe no-op.

ALTER TABLE "deposits" DROP COLUMN IF EXISTS "paidAmount";
ALTER TABLE "deposits" DROP COLUMN IF EXISTS "outstandingAmount";
