-- Add slotKey column (safe if already exists)
ALTER TABLE "commission_rules" ADD COLUMN IF NOT EXISTS "slotKey" TEXT;

-- Drop old unique constraint (safe if already dropped)
ALTER TABLE "commission_rules" DROP CONSTRAINT IF EXISTS "commission_rules_employeeId_commissionCategoryId_effectiveDat_key";

-- Drop indexes if they exist from a previous attempt
DROP INDEX IF EXISTS "commission_rules_employeeId_commissionCategoryId_slotKey_effect";
DROP INDEX IF EXISTS "commission_rules_employeeId_commissionCategoryId_slotKey_effectiveDate_key";
DROP INDEX IF EXISTS "commission_rules_employeeId_commissionCategoryId_slotKey_effectiveDate_key2";

-- Unique index for rows where slotKey IS NULL
CREATE UNIQUE INDEX "commission_rules_emp_cat_null_slot_eff_key"
  ON "commission_rules"("employeeId", "commissionCategoryId", "effectiveDate")
  WHERE "slotKey" IS NULL;

-- Unique index for rows where slotKey IS NOT NULL
CREATE UNIQUE INDEX "commission_rules_emp_cat_slot_eff_key"
  ON "commission_rules"("employeeId", "commissionCategoryId", "slotKey", "effectiveDate")
  WHERE "slotKey" IS NOT NULL;
