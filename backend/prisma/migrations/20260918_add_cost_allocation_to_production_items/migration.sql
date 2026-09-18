-- Migration: add cost_allocation_percentage to production_items
-- Porsi alokasi biaya untuk Penyelesaian Pesanan di Accurate Online.
-- Default 100 = single-item orders sudah benar tanpa perubahan data.

ALTER TABLE "production_items"
  ADD COLUMN IF NOT EXISTS "cost_allocation_percentage" DECIMAL(5,2) NOT NULL DEFAULT 100;

-- Fix existing multi-item production orders: distribusikan 100% secara merata.
-- Single-item orders (paling banyak) sudah benar dengan default 100.
-- Multi-item orders sebelumnya tidak memiliki field ini → set ke distribusi rata.
-- Catatan: Prisma menyimpan field sebagai camelCase di PostgreSQL (tanpa @map).
WITH ranked AS (
  SELECT
    pi.id,
    ROW_NUMBER() OVER (PARTITION BY pi."productionOrderId" ORDER BY pi."createdAt") AS rn,
    COUNT(*)     OVER (PARTITION BY pi."productionOrderId")                          AS total
  FROM "production_items" pi
)
UPDATE "production_items" pi
SET    "cost_allocation_percentage" = CASE
         WHEN r.rn = r.total
           -- Item terakhir mendapat sisa pembulatan agar total tepat = 100
           THEN ROUND(100.0 - TRUNC(100.0 / r.total, 2) * (r.total - 1), 2)
         ELSE TRUNC(100.0 / r.total, 2)
       END
FROM   ranked r
WHERE  pi.id = r.id
  AND  r.total > 1;  -- hanya multi-item orders; single-item tetap 100
