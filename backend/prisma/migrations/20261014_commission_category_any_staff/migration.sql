-- Kategori komisi: staf bisa dipilih bebas (Charge Lembur) — izin user 2026-10-14
ALTER TABLE "commission_categories" ADD COLUMN "allowAnyStaff" BOOLEAN NOT NULL DEFAULT false;
