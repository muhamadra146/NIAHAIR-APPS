-- Add tax invoice fields to purchase_invoices
ALTER TABLE "purchase_invoices"
  ADD COLUMN "taxInvoiceDate"     TIMESTAMP(3),
  ADD COLUMN "taxTransactionType" TEXT,
  ADD COLUMN "taxInvoiceNo"       TEXT;
