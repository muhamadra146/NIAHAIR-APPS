-- Add SAKIT value to ScheduleStatus enum
ALTER TYPE "ScheduleStatus" ADD VALUE 'SAKIT';

-- Add SickLeaveStatus enum
CREATE TYPE "SickLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create sick_leaves table
CREATE TABLE "sick_leaves" (
  "id"         TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "branchId"   TEXT NOT NULL,
  "startDate"  TIMESTAMP(3) NOT NULL,
  "endDate"    TIMESTAMP(3) NOT NULL,
  "totalDays"  INTEGER NOT NULL,
  "hasLetter"  BOOLEAN NOT NULL DEFAULT false,
  "letterDate" TIMESTAMP(3),
  "doctorName" TEXT,
  "diagnosis"  TEXT,
  "clinicName" TEXT,
  "status"     "SickLeaveStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sick_leaves_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sick_leaves_employeeId_idx"       ON "sick_leaves"("employeeId");
CREATE INDEX "sick_leaves_branchId_startDate_idx" ON "sick_leaves"("branchId", "startDate");
CREATE INDEX "sick_leaves_status_idx"            ON "sick_leaves"("status");

ALTER TABLE "sick_leaves" ADD CONSTRAINT "sick_leaves_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sick_leaves" ADD CONSTRAINT "sick_leaves_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sick_leaves" ADD CONSTRAINT "sick_leaves_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
