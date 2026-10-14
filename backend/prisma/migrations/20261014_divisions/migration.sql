-- Divisi karyawan + manager divisi (izin user 2026-10-13/14)

CREATE TABLE "divisions" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "divisions_code_key" ON "divisions"("code");

ALTER TABLE "employees" ADD COLUMN "divisionId" TEXT;
ALTER TABLE "employees" ADD COLUMN "isDivisionManager" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "employees_divisionId_idx" ON "employees"("divisionId");

ALTER TABLE "employees" ADD CONSTRAINT "employees_divisionId_fkey"
    FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Divisi awal (jawaban Finance): Operasional, Finance, Office
INSERT INTO "divisions" ("id", "code", "name", "updatedAt") VALUES
    (gen_random_uuid()::text, 'OPERASIONAL', 'Operasional', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'FINANCE',     'Finance',     CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'OFFICE',      'Office',      CURRENT_TIMESTAMP);
