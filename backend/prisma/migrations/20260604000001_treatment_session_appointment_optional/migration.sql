-- Phase 8A Fix: Make appointmentId nullable on treatment_sessions
-- Walk-in customers do not have an appointment.

ALTER TABLE "treatment_sessions" ALTER COLUMN "appointmentId" DROP NOT NULL;
