-- CreateTable: commission_categories
CREATE TABLE "commission_categories" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique code
CREATE UNIQUE INDEX "commission_categories_code_key" ON "commission_categories"("code");

-- AddColumn: items.commissionCategoryId (nullable)
ALTER TABLE "items" ADD COLUMN "commissionCategoryId" TEXT;

-- AddColumn: commission_rules.commissionCategoryId (nullable first for safe ALTER)
ALTER TABLE "commission_rules" ADD COLUMN "commissionCategoryId" TEXT;

-- commission_rules table is empty (development) — make NOT NULL immediately
ALTER TABLE "commission_rules" ALTER COLUMN "commissionCategoryId" SET NOT NULL;

-- Drop old FK: commission_rules.serviceItemId → items
ALTER TABLE "commission_rules" DROP CONSTRAINT "commission_rules_serviceItemId_fkey";

-- Drop old index on serviceItemId
DROP INDEX "commission_rules_serviceItemId_idx";

-- Drop old unique constraint [employeeId, serviceItemId, effectiveDate]
DROP INDEX "commission_rules_employeeId_serviceItemId_effectiveDate_key";

-- Drop serviceItemId column from commission_rules
ALTER TABLE "commission_rules" DROP COLUMN "serviceItemId";

-- AddForeignKey: commission_rules.commissionCategoryId → commission_categories
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_commissionCategoryId_fkey"
    FOREIGN KEY ("commissionCategoryId")
    REFERENCES "commission_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: items.commissionCategoryId → commission_categories (nullable, SET NULL on delete)
ALTER TABLE "items" ADD CONSTRAINT "items_commissionCategoryId_fkey"
    FOREIGN KEY ("commissionCategoryId")
    REFERENCES "commission_categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: items.commissionCategoryId
CREATE INDEX "items_commissionCategoryId_idx" ON "items"("commissionCategoryId");

-- CreateIndex: commission_rules.commissionCategoryId
CREATE INDEX "commission_rules_commissionCategoryId_idx" ON "commission_rules"("commissionCategoryId");

-- CreateUniqueIndex: [employeeId, commissionCategoryId, effectiveDate]
CREATE UNIQUE INDEX "commission_rules_employeeId_commissionCategoryId_effectiveDate_key"
    ON "commission_rules"("employeeId", "commissionCategoryId", "effectiveDate");
