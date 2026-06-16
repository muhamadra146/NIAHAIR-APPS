-- Add Accurate sync fields to stock_transfers
ALTER TABLE "stock_transfers"
  ADD COLUMN "accurateTransferId"     INTEGER,
  ADD COLUMN "accurateTransferNumber" TEXT,
  ADD COLUMN "lastSyncAt"             TIMESTAMP(3);

CREATE UNIQUE INDEX "stock_transfers_accurateTransferId_key"
  ON "stock_transfers"("accurateTransferId");

-- Add Accurate detail line ID to stock_transfer_items
ALTER TABLE "stock_transfer_items"
  ADD COLUMN "accurateDetailId" INTEGER;

-- Add STOCK_TRANSFER to SyncEntityType enum
ALTER TYPE "SyncEntityType" ADD VALUE 'STOCK_TRANSFER';
