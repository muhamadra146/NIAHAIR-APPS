-- Add discount type and percent fields to invoice_items
ALTER TABLE "invoice_items" ADD COLUMN "discountType" TEXT NOT NULL DEFAULT 'AMOUNT';
ALTER TABLE "invoice_items" ADD COLUMN "discountPercent" DECIMAL(5,2);
