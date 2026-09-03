-- Drop partial unique indexes lama yang dibuat di 20260614_add_slot_key_to_commission_rule
-- Sudah digantikan oleh full unique constraint yang include commissionJobId
-- (20260831_commission_rule_unique_job)

DROP INDEX IF EXISTS "commission_rules_emp_cat_null_slot_eff_key";
DROP INDEX IF EXISTS "commission_rules_emp_cat_slot_eff_key";
