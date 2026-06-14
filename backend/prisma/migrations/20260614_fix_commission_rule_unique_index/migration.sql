-- Fix: drop old 3-field unique index that was created as INDEX (not CONSTRAINT)
-- Previous migration incorrectly used DROP CONSTRAINT instead of DROP INDEX
DROP INDEX IF EXISTS "commission_rules_employeeId_commissionCategoryId_effectiveDate_key";
