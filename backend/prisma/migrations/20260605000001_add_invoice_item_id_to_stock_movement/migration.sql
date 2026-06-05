-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "invoiceItemId" TEXT;

-- CreateIndex
CREATE INDEX "stock_movements_invoiceItemId_idx" ON "stock_movements"("invoiceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_referenceType_referenceId_invoiceItemId_key" ON "stock_movements"("referenceType", "referenceId", "invoiceItemId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
