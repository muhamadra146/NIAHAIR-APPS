-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('WORKING', 'OFF', 'LEAVE');

-- CreateTable: shifts
CREATE TABLE "shifts" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "startTime" TEXT,
    "endTime"   TEXT,
    "color"     TEXT,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: staff_schedules
CREATE TABLE "staff_schedules" (
    "id"         TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId"   TEXT NOT NULL,
    "shiftId"    TEXT,
    "workDate"   TIMESTAMP(3) NOT NULL,
    "status"     "ScheduleStatus" NOT NULL DEFAULT 'WORKING',
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: shifts unique code
CREATE UNIQUE INDEX "shifts_code_key" ON "shifts"("code");

-- CreateIndex: staff_schedules unique employee+branch+date
CREATE UNIQUE INDEX "staff_schedules_employeeId_branchId_workDate_key"
    ON "staff_schedules"("employeeId", "branchId", "workDate");

-- CreateIndex: staff_schedules performance index
CREATE INDEX "staff_schedules_branchId_workDate_idx"
    ON "staff_schedules"("branchId", "workDate");

-- AddForeignKey: staff_schedules → employees
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: staff_schedules → branches
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: staff_schedules → shifts
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "shifts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default shifts
INSERT INTO "shifts" ("id", "code", "name", "startTime", "endTime", "color", "isWorking", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'S1',  'Shift Pagi',   '09:00', '18:00', 'blue',  true,  true, NOW(), NOW()),
  (gen_random_uuid(), 'S2',  'Shift Siang',  '10:00', '19:00', 'green', true,  true, NOW(), NOW()),
  (gen_random_uuid(), 'OFF', 'Day Off',      NULL,    NULL,    'gray',  false, true, NOW(), NOW());
