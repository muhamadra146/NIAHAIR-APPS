-- Migration: add_supplier_extended_fields
-- Tambah field kontak dan diskon default dari Accurate ke tabel suppliers

ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "businessPhone"     TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp"          TEXT,
  ADD COLUMN IF NOT EXISTS "website"           TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseDiscount"  DECIMAL(5,2);
