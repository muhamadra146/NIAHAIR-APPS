-- Add bracket-based late deduction fields and BPJS Kesehatan fields to employee_salary_settings
ALTER TABLE "employee_salary_settings"
  ADD COLUMN "lateDeductionBracket1"        DECIMAL(18,2) NOT NULL DEFAULT 25000,
  ADD COLUMN "lateDeductionBracket2"        DECIMAL(18,2) NOT NULL DEFAULT 50000,
  ADD COLUMN "lateDeductionBracket3"        DECIMAL(18,2) NOT NULL DEFAULT 75000,
  ADD COLUMN "bpjsKesehatanEmployeePercent" DECIMAL(5,2)  NOT NULL DEFAULT 1,
  ADD COLUMN "bpjsKesehatanEmployerPercent" DECIMAL(5,2)  NOT NULL DEFAULT 4;
