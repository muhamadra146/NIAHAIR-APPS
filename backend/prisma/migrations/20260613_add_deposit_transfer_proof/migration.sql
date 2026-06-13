-- AlterTable: add transfer proof photo fields to deposits
ALTER TABLE "deposits" ADD COLUMN "transferProofUrl" TEXT;
ALTER TABLE "deposits" ADD COLUMN "transferProofPublicId" TEXT;
