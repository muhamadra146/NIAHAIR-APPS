-- ============================================================
-- Migration: add payroll, attendance (rework), loans, home service
-- ============================================================

-- 1. Drop old AttendanceStatus enum (not used by any column yet)
DROP TYPE IF EXISTS "AttendanceStatus";

-- 2. Create new AttendanceStatus enum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'EARLY_LEAVE');

-- 3. Create AppointmentType enum
DO $$ BEGIN
  CREATE TYPE "AppointmentType" AS ENUM ('SALON', 'HOME_SERVICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create LoanStatus enum
DO $$ BEGIN
  CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Create PayrollStatus enum
DO $$ BEGIN
  CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Create PayrollItemType enum
DO $$ BEGIN
  CREATE TYPE "PayrollItemType" AS ENUM ('INCOME', 'DEDUCTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 7. Rework attendances table
--    (old table had no status column and different structure)
-- ============================================================
DROP TABLE IF EXISTS "attendances";

CREATE TABLE "attendances" (
    "id"                  TEXT NOT NULL,
    "staffScheduleId"     TEXT NOT NULL,
    "employeeId"          TEXT NOT NULL,
    "branchId"            TEXT NOT NULL,
    "workDate"            DATE NOT NULL,
    "checkInAt"           TIMESTAMP(3),
    "checkOutAt"          TIMESTAMP(3),
    "checkInLatitude"     DECIMAL(10,7),
    "checkInLongitude"    DECIMAL(10,7),
    "checkOutLatitude"    DECIMAL(10,7),
    "checkOutLongitude"   DECIMAL(10,7),
    "checkInPhotoUrl"     TEXT,
    "checkOutPhotoUrl"    TEXT,
    "status"              "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "lateMinutes"         INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes"   INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes"     INTEGER NOT NULL DEFAULT 0,
    "isHolidayWork"       BOOLEAN NOT NULL DEFAULT false,
    "notes"               TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendances_staffScheduleId_key" ON "attendances"("staffScheduleId");
CREATE INDEX "attendances_employeeId_idx"       ON "attendances"("employeeId");
CREATE INDEX "attendances_branchId_workDate_idx" ON "attendances"("branchId", "workDate");
CREATE INDEX "attendances_workDate_idx"          ON "attendances"("workDate");

ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_staffScheduleId_fkey"
    FOREIGN KEY ("staffScheduleId") REFERENCES "staff_schedules"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 8. Add GPS fields to branches
-- ============================================================
ALTER TABLE "branches"
    ADD COLUMN IF NOT EXISTS "latitude"     DECIMAL(10,8),
    ADD COLUMN IF NOT EXISTS "longitude"    DECIMAL(11,8),
    ADD COLUMN IF NOT EXISTS "radiusMeters" INTEGER NOT NULL DEFAULT 100;

-- ============================================================
-- 9. Add type + homeServiceAddress to appointments
-- ============================================================
ALTER TABLE "appointments"
    ADD COLUMN IF NOT EXISTS "type"               "AppointmentType" NOT NULL DEFAULT 'SALON',
    ADD COLUMN IF NOT EXISTS "homeServiceAddress" TEXT;

-- ============================================================
-- 10. Create employee_salary_settings
-- ============================================================
CREATE TABLE "employee_salary_settings" (
    "id"                          TEXT NOT NULL,
    "employeeId"                  TEXT NOT NULL,
    "baseSalary"                  DECIMAL(18,2) NOT NULL,
    "mealAllowancePerDay"         DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transportAllowance"          DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overtimeRatePerHour"         DECIMAL(18,2) NOT NULL DEFAULT 0,
    "holidayOvertimeRate"         DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lateDeductionPerMinute"      DECIMAL(18,2) NOT NULL DEFAULT 0,
    "absentDeductionPerDay"       DECIMAL(18,2) NOT NULL DEFAULT 0,
    "earlyLeaveDeductionPerMinute" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bpjsJhtPercent"              DECIMAL(5,2)  NOT NULL DEFAULT 2,
    "bpjsJpPercent"               DECIMAL(5,2)  NOT NULL DEFAULT 1,
    "effectiveDate"               TIMESTAMP(3)  NOT NULL,
    "endDate"                     TIMESTAMP(3),
    "isActive"                    BOOLEAN NOT NULL DEFAULT true,
    "notes"                       TEXT,
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_salary_settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_salary_settings_employeeId_idx"    ON "employee_salary_settings"("employeeId");
CREATE INDEX "employee_salary_settings_effectiveDate_idx" ON "employee_salary_settings"("effectiveDate");

ALTER TABLE "employee_salary_settings"
    ADD CONSTRAINT "employee_salary_settings_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 11. Create loans
-- ============================================================
CREATE TABLE "loans" (
    "id"               TEXT NOT NULL,
    "employeeId"       TEXT NOT NULL,
    "branchId"         TEXT NOT NULL,
    "loanNo"           TEXT NOT NULL,
    "totalAmount"      DECIMAL(18,2) NOT NULL,
    "remainingAmount"  DECIMAL(18,2) NOT NULL,
    "monthlyDeduction" DECIMAL(18,2) NOT NULL,
    "startDate"        TIMESTAMP(3) NOT NULL,
    "endDate"          TIMESTAMP(3),
    "status"           "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loans_loanNo_key" ON "loans"("loanNo");
CREATE INDEX "loans_employeeId_idx"   ON "loans"("employeeId");
CREATE INDEX "loans_branchId_idx"     ON "loans"("branchId");
CREATE INDEX "loans_status_idx"       ON "loans"("status");

ALTER TABLE "loans"
    ADD CONSTRAINT "loans_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "loans"
    ADD CONSTRAINT "loans_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 12. Create payrolls
-- ============================================================
CREATE TABLE "payrolls" (
    "id"              TEXT NOT NULL,
    "employeeId"      TEXT NOT NULL,
    "branchId"        TEXT NOT NULL,
    "periodStart"     DATE NOT NULL,
    "periodEnd"       DATE NOT NULL,
    "status"          "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "grossIncome"     DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netSalary"       DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedBy"      TEXT,
    "approvedAt"      TIMESTAMP(3),
    "paidAt"          TIMESTAMP(3),
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payrolls_employeeId_periodStart_key" ON "payrolls"("employeeId", "periodStart");
CREATE INDEX "payrolls_employeeId_idx" ON "payrolls"("employeeId");
CREATE INDEX "payrolls_branchId_idx"   ON "payrolls"("branchId");
CREATE INDEX "payrolls_status_idx"     ON "payrolls"("status");

ALTER TABLE "payrolls"
    ADD CONSTRAINT "payrolls_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payrolls"
    ADD CONSTRAINT "payrolls_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 13. Create loan_repayments (needs payrolls to exist first)
-- ============================================================
CREATE TABLE "loan_repayments" (
    "id"        TEXT NOT NULL,
    "loanId"    TEXT NOT NULL,
    "payrollId" TEXT,
    "amount"    DECIMAL(18,2) NOT NULL,
    "paidAt"    TIMESTAMP(3) NOT NULL,
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_repayments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loan_repayments_loanId_idx"    ON "loan_repayments"("loanId");
CREATE INDEX "loan_repayments_payrollId_idx" ON "loan_repayments"("payrollId");

ALTER TABLE "loan_repayments"
    ADD CONSTRAINT "loan_repayments_loanId_fkey"
    FOREIGN KEY ("loanId") REFERENCES "loans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "loan_repayments"
    ADD CONSTRAINT "loan_repayments_payrollId_fkey"
    FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 14. Create payroll_items
-- ============================================================
CREATE TABLE "payroll_items" (
    "id"        TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "type"      "PayrollItemType" NOT NULL,
    "category"  TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "amount"    DECIMAL(18,2) NOT NULL,
    "quantity"  DECIMAL(10,2),
    "rate"      DECIMAL(18,2),
    "isAuto"    BOOLEAN NOT NULL DEFAULT true,
    "notes"     TEXT,
    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payroll_items_payrollId_idx" ON "payroll_items"("payrollId");

ALTER TABLE "payroll_items"
    ADD CONSTRAINT "payroll_items_payrollId_fkey"
    FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
