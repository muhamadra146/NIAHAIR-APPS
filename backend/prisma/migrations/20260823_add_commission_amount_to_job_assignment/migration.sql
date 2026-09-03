-- AddColumn: commissionAmount pada treatment_job_assignments
-- Nominal komisi yang diinput manual saat Selesaikan Treatment.
-- Null = engine hitung dari rate × subtotal (backward compat).
-- Terisi = engine pakai nilai ini langsung tanpa kalkulasi.

ALTER TABLE "treatment_job_assignments"
  ADD COLUMN "commissionAmount" DECIMAL(18, 2);
