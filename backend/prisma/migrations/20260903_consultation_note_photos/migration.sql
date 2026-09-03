-- AddColumn: foto before/after pada client_consultation_notes
-- Additive only — zero impact pada existing rows (semua nullable)

ALTER TABLE "client_consultation_notes"
  ADD COLUMN "beforePhotoUrl"      TEXT,
  ADD COLUMN "beforePhotoPublicId" TEXT,
  ADD COLUMN "afterPhotoUrl"       TEXT,
  ADD COLUMN "afterPhotoPublicId"  TEXT;
