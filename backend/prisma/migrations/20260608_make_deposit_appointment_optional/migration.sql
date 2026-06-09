-- Add customerId to deposits (nullable first so we can backfill).
ALTER TABLE "deposits" ADD COLUMN "customerId" TEXT;

-- Backfill: derive customerId from the linked appointment.
-- All existing deposits have an appointmentId, so this covers every row.
UPDATE "deposits" d
   SET "customerId" = a."customerId"
  FROM "appointments" a
 WHERE d."appointmentId" = a."id";

-- Make customerId NOT NULL now that all rows are populated.
ALTER TABLE "deposits" ALTER COLUMN "customerId" SET NOT NULL;

-- FK: deposits.customerId → customers.id
ALTER TABLE "deposits"
    ADD CONSTRAINT "deposits_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index for customer lookup
CREATE INDEX "deposits_customerId_idx" ON "deposits"("customerId");

-- Make appointmentId optional (nullable).
-- Existing FK constraint and index are preserved — they still work on nullable columns.
ALTER TABLE "deposits" ALTER COLUMN "appointmentId" DROP NOT NULL;
