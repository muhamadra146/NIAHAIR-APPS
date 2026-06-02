-- Add snapshot fields to commissions table

ALTER TABLE "commissions" ADD COLUMN "commissionRuleId" TEXT;
ALTER TABLE "commissions" ADD COLUMN "workQty" DECIMAL(18,2);
ALTER TABLE "commissions" ADD COLUMN "workRatio" DECIMAL(18,2);

-- FK: commissions.commissionRuleId → commission_rules.id (nullable, SET NULL on delete)
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_commissionRuleId_fkey"
  FOREIGN KEY ("commissionRuleId")
  REFERENCES "commission_rules"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Index for FK lookups
CREATE INDEX "commissions_commissionRuleId_idx" ON "commissions"("commissionRuleId");
