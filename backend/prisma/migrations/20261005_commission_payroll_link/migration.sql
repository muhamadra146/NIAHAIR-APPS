-- Catat slip gaji tempat komisi dibayar.
-- Payroll mengambil semua komisi APPROVED yang belum masuk payroll mana pun (sampai akhir periode),
-- lalu menandai PAID tepat komisi yang terhubung — tidak dobel, tidak tertinggal.
ALTER TABLE "commissions" ADD COLUMN "payrollId" TEXT;

CREATE INDEX "commissions_payrollId_idx" ON "commissions"("payrollId");

ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payrollId_fkey"
  FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: komisi yang sudah PAID dihubungkan ke payroll PAID karyawan yang periodenya
-- memuat tanggal disetujui (aturan lama), dengan batas hari WIB.
UPDATE "commissions" c
SET "payrollId" = p."id"
FROM "payrolls" p
WHERE c."payrollId" IS NULL
  AND c."status" = 'PAID'
  AND c."approvedAt" IS NOT NULL
  AND p."employeeId" = c."employeeId"
  AND p."status" = 'PAID'
  -- approvedAt = timestamp tanpa zona berisi UTC → ubah ke tanggal kalender WIB
  AND ((c."approvedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date BETWEEN p."periodStart" AND p."periodEnd";
