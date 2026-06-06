-- Rename Deposit Accurate sync fields to reflect their semantic meaning.
-- In the website domain these are "deposit" references, not generic "invoice" references,
-- even though Accurate internally models them as sales invoices.

-- Rename columns (preserves existing data, safe over DROP+ADD)
ALTER TABLE "deposits" RENAME COLUMN "accurateInvoiceId"     TO "accurateDepositId";
ALTER TABLE "deposits" RENAME COLUMN "accurateInvoiceNumber" TO "accurateDepositNumber";

-- Rename the unique constraint to match the new column name
ALTER INDEX "deposits_accurateInvoiceId_key" RENAME TO "deposits_accurateDepositId_key";
