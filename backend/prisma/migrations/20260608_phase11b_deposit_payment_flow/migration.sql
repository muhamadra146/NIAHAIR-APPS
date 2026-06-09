-- Add UNPAID to DepositStatus enum
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'UNPAID';

-- Add PARTIAL to DepositStatus enum
ALTER TYPE "DepositStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

-- Add DEPOSIT_PAYMENT to SyncEntityType enum
ALTER TYPE "SyncEntityType" ADD VALUE IF NOT EXISTS 'DEPOSIT_PAYMENT';

-- AlterTable: add paidAmount and outstandingAmount to deposits
ALTER TABLE "deposits"
    ADD COLUMN "paidAmount"        DECIMAL(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN "outstandingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Backfill: existing PAID deposits are fully paid
UPDATE "deposits"
   SET "paidAmount"        = "amount",
       "outstandingAmount" = 0
 WHERE "status" IN ('PAID', 'PARTIAL_USED', 'USED', 'REFUNDED');

-- Backfill: existing PENDING deposits — outstandingAmount = amount
UPDATE "deposits"
   SET "outstandingAmount" = "amount"
 WHERE "status" IN ('PENDING', 'CANCELLED');

-- CreateTable: deposit_payments
CREATE TABLE "deposit_payments" (
    "id"                    TEXT NOT NULL,
    "depositId"             TEXT NOT NULL,
    "paymentMethodId"       TEXT NOT NULL,
    "amount"                DECIMAL(18,2) NOT NULL,
    "paymentNo"             TEXT NOT NULL,
    "accurateReceiptId"     INTEGER,
    "accurateReceiptNumber" TEXT,
    "lastSyncAt"            TIMESTAMP(3),
    "referenceNo"           TEXT,
    "notes"                 TEXT,
    "paidAt"                TIMESTAMP(3) NOT NULL,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_payments_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "deposit_payments_paymentNo_key"         ON "deposit_payments"("paymentNo");
CREATE UNIQUE INDEX "deposit_payments_accurateReceiptId_key" ON "deposit_payments"("accurateReceiptId");

-- Indexes
CREATE INDEX "deposit_payments_depositId_idx"       ON "deposit_payments"("depositId");
CREATE INDEX "deposit_payments_paymentMethodId_idx" ON "deposit_payments"("paymentMethodId");

-- Foreign keys
ALTER TABLE "deposit_payments"
    ADD CONSTRAINT "deposit_payments_depositId_fkey"
    FOREIGN KEY ("depositId") REFERENCES "deposits"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deposit_payments"
    ADD CONSTRAINT "deposit_payments_paymentMethodId_fkey"
    FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
