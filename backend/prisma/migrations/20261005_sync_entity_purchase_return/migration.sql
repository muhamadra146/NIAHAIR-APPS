-- Retur pembelian di-sync ke Accurate lewat antrean (retry + monitor), bukan panggilan langsung
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
