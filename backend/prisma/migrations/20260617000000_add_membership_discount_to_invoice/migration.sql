-- AlterTable: Add membership discount columns to invoices
ALTER TABLE "invoices" ADD COLUMN "membershipDiscountTotal" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN "membershipId" TEXT;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: membershipId on invoices
CREATE INDEX "invoices_membershipId_idx" ON "invoices"("membershipId");

-- CreateIndex: composite index on customer_memberships for active-membership lookup
CREATE INDEX "customer_memberships_customerId_status_endDate_idx" ON "customer_memberships"("customerId", "status", "endDate");
