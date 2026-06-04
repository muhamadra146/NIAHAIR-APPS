-- Phase 9.0: Commission base calculation support
-- Changes:
--   1. CreateEnum  CommissionBase (BEFORE_DISCOUNT, AFTER_DISCOUNT)
--   2. AlterTable  commission_rules  ADD commissionBase (default AFTER_DISCOUNT)
--   3. AlterTable  commissions       ADD commissionBase (NOT NULL snapshot)
--   4. AlterTable  commissions       DROP NOT NULL on invoiceItemId

-- Step 1: Create enum
CREATE TYPE "CommissionBase" AS ENUM ('BEFORE_DISCOUNT', 'AFTER_DISCOUNT');

-- Step 2: Add commissionBase to commission_rules with default (backfills all existing rows)
ALTER TABLE "commission_rules" ADD COLUMN "commissionBase" "CommissionBase" NOT NULL DEFAULT 'AFTER_DISCOUNT';

-- Step 3: Add commissionBase snapshot to commissions (NOT NULL — table is empty, no generator yet)
ALTER TABLE "commissions" ADD COLUMN "commissionBase" "CommissionBase" NOT NULL;

-- Step 4: Make invoiceItemId nullable
ALTER TABLE "commissions" ALTER COLUMN "invoiceItemId" DROP NOT NULL;
