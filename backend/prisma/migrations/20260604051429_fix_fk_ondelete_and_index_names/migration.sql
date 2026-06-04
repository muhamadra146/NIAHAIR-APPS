-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_invoiceItemId_fkey";

-- DropForeignKey
ALTER TABLE "treatment_sessions" DROP CONSTRAINT "treatment_sessions_appointmentId_fkey";

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "commission_rules_employeeId_commissionCategoryId_effectiveDate_" RENAME TO "commission_rules_employeeId_commissionCategoryId_effectiveD_key";
