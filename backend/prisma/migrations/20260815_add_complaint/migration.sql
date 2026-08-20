-- CreateEnum
CREATE TYPE "ComplaintStatus"   AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "ComplaintCategory" AS ENUM ('HASIL_LAYANAN', 'SIKAP_KARYAWAN', 'WAKTU_TUNGGU', 'HARGA', 'FASILITAS', 'PRODUK', 'LAINNYA');
CREATE TYPE "ComplaintSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "complaints" (
  "id"                        TEXT NOT NULL,
  "complaintNo"               TEXT NOT NULL,
  "branchId"                  TEXT NOT NULL,
  "appointmentId"             TEXT NOT NULL,
  "invoiceId"                 TEXT,
  "employeeId"                TEXT,
  "category"                  "ComplaintCategory" NOT NULL,
  "severity"                  "ComplaintSeverity" NOT NULL DEFAULT 'MEDIUM',
  "description"               TEXT NOT NULL,
  "status"                    "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "handledBy"                 TEXT,
  "resolutionNotes"           TEXT,
  "followUpAction"            TEXT,
  "resolvedAt"                TIMESTAMP(3),
  "correctedStrands"          INTEGER,
  "totalStrands"              INTEGER,
  "commissionId"              TEXT,
  "commissionDeductionAmount" DECIMAL(18,2),
  "createdBy"                 TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "complaints_complaintNo_key" ON "complaints"("complaintNo");
CREATE INDEX "complaints_branchId_idx"      ON "complaints"("branchId");
CREATE INDEX "complaints_appointmentId_idx" ON "complaints"("appointmentId");
CREATE INDEX "complaints_invoiceId_idx"     ON "complaints"("invoiceId");
CREATE INDEX "complaints_employeeId_idx"    ON "complaints"("employeeId");
CREATE INDEX "complaints_status_idx"        ON "complaints"("status");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_branchId_fkey"      FOREIGN KEY ("branchId")      REFERENCES "branches"("id")      ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_invoiceId_fkey"     FOREIGN KEY ("invoiceId")     REFERENCES "invoices"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_employeeId_fkey"    FOREIGN KEY ("employeeId")    REFERENCES "employees"("id")    ON DELETE SET NULL ON UPDATE CASCADE;
