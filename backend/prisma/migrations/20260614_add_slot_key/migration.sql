-- Add slotKey to appointment_staffs
ALTER TABLE "appointment_staffs" ADD COLUMN "slotKey" TEXT;

-- Add slotKey to treatment_assignments
ALTER TABLE "treatment_assignments" ADD COLUMN "slotKey" TEXT;
