-- AddUniqueConstraint: customers.mobile_phone
-- CRM-005: Phone number must be unique across all customers
-- Handles existing duplicates: keep oldest customer's phone, null out newer duplicates

-- Step 1: For duplicate phone numbers, null out the phone of newer customers
-- (keeping the oldest record's phone intact)
UPDATE "customers" c1
SET "mobilePhone" = NULL
WHERE "mobilePhone" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "customers" c2
    WHERE c2."mobilePhone" = c1."mobilePhone"
      AND c2."id" <> c1."id"
      AND c2."createdAt" < c1."createdAt"
  );

-- Step 2: Drop the old non-unique index
DROP INDEX IF EXISTS "customers_mobilePhone_idx";

-- Step 3: Add unique constraint (creates implicit unique index)
-- NULL values are not considered duplicates, so this is safe
ALTER TABLE "customers" ADD CONSTRAINT "customers_mobilePhone_key" UNIQUE ("mobilePhone");
