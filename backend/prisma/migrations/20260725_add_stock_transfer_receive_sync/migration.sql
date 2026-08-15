-- Add STOCK_TRANSFER_RECEIVE to SyncEntityType enum
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'STOCK_TRANSFER_RECEIVE';

-- Add accurateReceiveId, accurateReceiveNumber, lastReceiveSyncAt to stock_transfers
ALTER TABLE "stock_transfers"
  ADD COLUMN IF NOT EXISTS "accurateReceiveId"     INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS "accurateReceiveNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "lastReceiveSyncAt"     TIMESTAMP(3);
