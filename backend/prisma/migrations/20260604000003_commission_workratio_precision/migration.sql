-- Fix: increase workRatio precision from Decimal(18,2) to Decimal(18,6)
-- Reason: ratios like 1/3 = 0.333333 need 6dp; 2dp truncates to 0.33
-- Safe: commissions table is empty (no generator has run yet)

ALTER TABLE "commissions" ALTER COLUMN "workRatio" TYPE DECIMAL(18,6);
