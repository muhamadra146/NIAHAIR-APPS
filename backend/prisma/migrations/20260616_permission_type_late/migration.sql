-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('ABSENCE', 'LATE');

-- AlterTable
ALTER TABLE "permission_requests"
  ADD COLUMN "type" "PermissionType" NOT NULL DEFAULT 'ABSENCE',
  ADD COLUMN "estimatedArrival" TEXT;
