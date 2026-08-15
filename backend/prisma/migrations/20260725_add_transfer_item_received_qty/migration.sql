-- Add receivedQty to stock_transfer_items (actual quantity received, may differ from qty sent)
ALTER TABLE "stock_transfer_items"
  ADD COLUMN IF NOT EXISTS "receivedQty" DECIMAL(18, 6);
