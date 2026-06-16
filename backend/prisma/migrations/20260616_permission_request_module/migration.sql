-- Add IZIN value to ScheduleStatus enum
ALTER TYPE "ScheduleStatus" ADD VALUE 'IZIN';

-- Add PermissionStatus enum
CREATE TYPE "PermissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create permission_requests table
CREATE TABLE "permission_requests" (
  "id"         TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "branchId"   TEXT NOT NULL,
  "date"       TIMESTAMP(3) NOT NULL,
  "reason"     TEXT NOT NULL,
  "notes"      TEXT,
  "status"     "PermissionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permission_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "permission_requests_employeeId_idx" ON "permission_requests"("employeeId");
CREATE INDEX "permission_requests_branchId_date_idx" ON "permission_requests"("branchId", "date");
CREATE INDEX "permission_requests_status_idx" ON "permission_requests"("status");

ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
