-- PPh 21 (PAY-037) — disetujui owner 2026-11-06

-- CreateEnum
CREATE TYPE "PtkpStatus" AS ENUM ('TK0', 'TK1', 'TK2', 'TK3', 'K0', 'K1', 'K2', 'K3');

-- CreateEnum
CREATE TYPE "TaxEmploymentType" AS ENUM ('PERMANENT', 'NON_PERMANENT');

-- CreateEnum
CREATE TYPE "Pph21Method" AS ENUM ('TER', 'ANNUAL');

-- AlterTable
ALTER TABLE "employee_salary_settings" ADD COLUMN     "bpjsJkkEmployerPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bpjsJkmEmployerPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "ptkpStatus" "PtkpStatus",
ADD COLUMN     "taxEmploymentType" "TaxEmploymentType" NOT NULL DEFAULT 'PERMANENT';

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "pph21" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxGross" DECIMAL(18,2),
ADD COLUMN     "taxMethod" "Pph21Method",
ADD COLUMN     "taxPeriod" TEXT,
ADD COLUMN     "taxPtkpStatus" "PtkpStatus",
ADD COLUMN     "taxTerRate" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "tax_settings" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "ptkpSelf" DECIMAL(18,2) NOT NULL,
    "ptkpMarried" DECIMAL(18,2) NOT NULL,
    "ptkpDependent" DECIMAL(18,2) NOT NULL,
    "maxDependents" INTEGER NOT NULL DEFAULT 3,
    "positionCostPercent" DECIMAL(5,2) NOT NULL,
    "positionCostMonthlyMax" DECIMAL(18,2) NOT NULL,
    "pasal17Brackets" JSONB NOT NULL,
    "terA" JSONB NOT NULL,
    "terB" JSONB NOT NULL,
    "terC" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_settings_year_key" ON "tax_settings"("year");

-- CreateIndex
CREATE INDEX "payrolls_employeeId_taxPeriod_idx" ON "payrolls"("employeeId", "taxPeriod");

-- Seed: tarif berlaku sejak tahun pajak 2024 (PP 58/2023, PMK 168/2023, UU HPP).
-- Tabel lengkap & koreksi salah ketik materi: docs/23_PPH21_PLANNING.md Bagian 6.
-- "upTo" = batas atas bruto (inklusif); null = di atas batas terakhir. "rate" dalam persen.
INSERT INTO "tax_settings" (
  "id", "year", "ptkpSelf", "ptkpMarried", "ptkpDependent", "maxDependents",
  "positionCostPercent", "positionCostMonthlyMax",
  "pasal17Brackets", "terA", "terB", "terC", "updatedAt"
) VALUES (
  'a1f2c3d4-0000-4000-8000-000000002024', 2024, 54000000, 4500000, 4500000, 3,
  5, 500000,
  '[{"upTo":60000000,"rate":5},{"upTo":250000000,"rate":15},{"upTo":500000000,"rate":25},{"upTo":5000000000,"rate":30},{"upTo":null,"rate":35}]',
  '[{"upTo":5400000,"rate":0},{"upTo":5650000,"rate":0.25},{"upTo":5950000,"rate":0.5},{"upTo":6300000,"rate":0.75},{"upTo":6750000,"rate":1},{"upTo":7500000,"rate":1.25},{"upTo":8550000,"rate":1.5},{"upTo":9650000,"rate":1.75},{"upTo":10050000,"rate":2},{"upTo":10350000,"rate":2.25},{"upTo":10700000,"rate":2.5},{"upTo":11050000,"rate":3},{"upTo":11600000,"rate":3.5},{"upTo":12500000,"rate":4},{"upTo":13750000,"rate":5},{"upTo":15100000,"rate":6},{"upTo":16950000,"rate":7},{"upTo":19750000,"rate":8},{"upTo":24150000,"rate":9},{"upTo":26450000,"rate":10},{"upTo":28000000,"rate":11},{"upTo":30050000,"rate":12},{"upTo":32400000,"rate":13},{"upTo":35400000,"rate":14},{"upTo":39100000,"rate":15},{"upTo":43850000,"rate":16},{"upTo":47800000,"rate":17},{"upTo":51400000,"rate":18},{"upTo":56300000,"rate":19},{"upTo":62200000,"rate":20},{"upTo":68600000,"rate":21},{"upTo":77500000,"rate":22},{"upTo":89000000,"rate":23},{"upTo":103000000,"rate":24},{"upTo":125000000,"rate":25},{"upTo":157000000,"rate":26},{"upTo":206000000,"rate":27},{"upTo":337000000,"rate":28},{"upTo":454000000,"rate":29},{"upTo":550000000,"rate":30},{"upTo":695000000,"rate":31},{"upTo":910000000,"rate":32},{"upTo":1400000000,"rate":33},{"upTo":null,"rate":34}]',
  '[{"upTo":6200000,"rate":0},{"upTo":6500000,"rate":0.25},{"upTo":6850000,"rate":0.5},{"upTo":7300000,"rate":0.75},{"upTo":9200000,"rate":1},{"upTo":10750000,"rate":1.5},{"upTo":11250000,"rate":2},{"upTo":11600000,"rate":2.5},{"upTo":12600000,"rate":3},{"upTo":13600000,"rate":4},{"upTo":14950000,"rate":5},{"upTo":16400000,"rate":6},{"upTo":18450000,"rate":7},{"upTo":21850000,"rate":8},{"upTo":26000000,"rate":9},{"upTo":27700000,"rate":10},{"upTo":29350000,"rate":11},{"upTo":31450000,"rate":12},{"upTo":33950000,"rate":13},{"upTo":37100000,"rate":14},{"upTo":41100000,"rate":15},{"upTo":45800000,"rate":16},{"upTo":49500000,"rate":17},{"upTo":53800000,"rate":18},{"upTo":58500000,"rate":19},{"upTo":64000000,"rate":20},{"upTo":71000000,"rate":21},{"upTo":80000000,"rate":22},{"upTo":93000000,"rate":23},{"upTo":109000000,"rate":24},{"upTo":129000000,"rate":25},{"upTo":163000000,"rate":26},{"upTo":211000000,"rate":27},{"upTo":374000000,"rate":28},{"upTo":459000000,"rate":29},{"upTo":555000000,"rate":30},{"upTo":704000000,"rate":31},{"upTo":957000000,"rate":32},{"upTo":1405000000,"rate":33},{"upTo":null,"rate":34}]',
  '[{"upTo":6600000,"rate":0},{"upTo":6950000,"rate":0.25},{"upTo":7350000,"rate":0.5},{"upTo":7800000,"rate":0.75},{"upTo":8850000,"rate":1},{"upTo":9800000,"rate":1.25},{"upTo":10950000,"rate":1.5},{"upTo":11200000,"rate":1.75},{"upTo":12050000,"rate":2},{"upTo":12950000,"rate":3},{"upTo":14150000,"rate":4},{"upTo":15550000,"rate":5},{"upTo":17050000,"rate":6},{"upTo":19500000,"rate":7},{"upTo":22700000,"rate":8},{"upTo":26600000,"rate":9},{"upTo":28100000,"rate":10},{"upTo":30100000,"rate":11},{"upTo":32600000,"rate":12},{"upTo":35400000,"rate":13},{"upTo":38900000,"rate":14},{"upTo":43000000,"rate":15},{"upTo":47400000,"rate":16},{"upTo":51200000,"rate":17},{"upTo":55800000,"rate":18},{"upTo":60400000,"rate":19},{"upTo":66700000,"rate":20},{"upTo":74500000,"rate":21},{"upTo":83200000,"rate":22},{"upTo":95000000,"rate":23},{"upTo":110000000,"rate":24},{"upTo":134000000,"rate":25},{"upTo":169000000,"rate":26},{"upTo":221000000,"rate":27},{"upTo":390000000,"rate":28},{"upTo":463000000,"rate":29},{"upTo":561000000,"rate":30},{"upTo":709000000,"rate":31},{"upTo":965000000,"rate":32},{"upTo":1419000000,"rate":33},{"upTo":null,"rate":34}]',
  CURRENT_TIMESTAMP
);
