-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "DepositStatus" ADD VALUE 'PARTIAL_USED';
ALTER TYPE "DepositStatus" ADD VALUE 'USED';

-- AlterTable
ALTER TABLE "deposits" ADD COLUMN     "accurateInvoiceId" INTEGER,
ADD COLUMN     "accurateInvoiceNumber" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "deposits_accurateInvoiceId_key" ON "deposits"("accurateInvoiceId");
