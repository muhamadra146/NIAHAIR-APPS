-- Paket membership bisa dinonaktifkan (keputusan user 2026-10-19)
ALTER TABLE "memberships" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
