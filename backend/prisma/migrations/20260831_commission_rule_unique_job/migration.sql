-- Migration: tambah commissionJobId ke unique constraint CommissionRule
-- Agar satu karyawan bisa punya rule berbeda per job dalam kategori yang sama

-- Drop old unique constraint
ALTER TABLE "commission_rules"
DROP CONSTRAINT IF EXISTS "commission_rules_employeeId_commissionCategoryId_slotKey_coloristCondition_effectiveDate_key";

-- Add new unique constraint yang include commissionJobId
ALTER TABLE "commission_rules"
ADD CONSTRAINT "commission_rules_employeeId_commissionCategoryId_slotKey_commissionJobId_coloristCondition_effectiveDate_key"
UNIQUE ("employeeId", "commissionCategoryId", "slotKey", "commissionJobId", "coloristCondition", "effectiveDate");
