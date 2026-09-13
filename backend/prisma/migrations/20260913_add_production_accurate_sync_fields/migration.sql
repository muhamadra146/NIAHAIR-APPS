-- AddColumn: Accurate Online sync fields for production_orders
-- Maps Pekerjaan Pesanan (job order) and Penyelesaian Pesanan (job completion)

ALTER TABLE "production_orders"
  ADD COLUMN IF NOT EXISTS "accurate_pekerjaan_id"        INTEGER,
  ADD COLUMN IF NOT EXISTS "accurate_pekerjaan_number"    TEXT,
  ADD COLUMN IF NOT EXISTS "accurate_penyelesaian_id"     INTEGER,
  ADD COLUMN IF NOT EXISTS "accurate_penyelesaian_number" TEXT,
  ADD COLUMN IF NOT EXISTS "last_sync_at"                 TIMESTAMP(3);
