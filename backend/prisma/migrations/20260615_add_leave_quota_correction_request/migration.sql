-- Add CorrectionStatus enum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add leaveTypeId and totalDays to leaves
ALTER TABLE "leaves" ADD COLUMN "leaveTypeId" TEXT;
ALTER TABLE "leaves" ADD COLUMN "totalDays" INTEGER;

-- Create leave_types table
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxDaysPerYear" INTEGER NOT NULL DEFAULT 12,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- Create leave_quotas table
CREATE TABLE "leave_quotas" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "usedDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_quotas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leave_quotas_employeeId_leaveTypeId_year_key" ON "leave_quotas"("employeeId", "leaveTypeId", "year");
CREATE INDEX "leave_quotas_employeeId_idx" ON "leave_quotas"("employeeId");

-- Create attendance_correction_requests table
CREATE TABLE "attendance_correction_requests" (
    "id" TEXT NOT NULL,
    "staffScheduleId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "requestedCheckIn" TIMESTAMP(3),
    "requestedCheckOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "attendance_correction_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "attendance_correction_requests_employeeId_idx" ON "attendance_correction_requests"("employeeId");
CREATE INDEX "attendance_correction_requests_staffScheduleId_idx" ON "attendance_correction_requests"("staffScheduleId");
CREATE INDEX "attendance_correction_requests_status_idx" ON "attendance_correction_requests"("status");

-- Add index on leaves.leaveTypeId
CREATE INDEX "leaves_leaveTypeId_idx" ON "leaves"("leaveTypeId");

-- Foreign keys: leave_types
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_quotas" ADD CONSTRAINT "leave_quotas_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_quotas" ADD CONSTRAINT "leave_quotas_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys: correction requests
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_staffScheduleId_fkey" FOREIGN KEY ("staffScheduleId") REFERENCES "staff_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
