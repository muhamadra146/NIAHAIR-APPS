-- AlterTable: Invoice tax header fields
ALTER TABLE "invoices"
  ADD COLUMN "taxable"      BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN "inclusiveTax" BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN "taxDate"      TIMESTAMP(3);

-- AlterTable: InvoiceItem tax line fields
ALTER TABLE "invoice_items"
  ADD COLUMN "taxable"  BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN "taxName"  TEXT,
  ADD COLUMN "taxRate"  DECIMAL(18,2)    NOT NULL DEFAULT 0;
