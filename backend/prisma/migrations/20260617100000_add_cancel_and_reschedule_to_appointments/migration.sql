-- AlterTable: add cancel fields to appointments
ALTER TABLE "appointments"
  ADD COLUMN "cancelReason"      TEXT,
  ADD COLUMN "cancelledAt"       TIMESTAMP(3),
  ADD COLUMN "cancelledByUserId" TEXT;

-- CreateTable: appointment_reschedule_histories
CREATE TABLE "appointment_reschedule_histories" (
    "id"              TEXT NOT NULL,
    "appointmentId"   TEXT NOT NULL,
    "oldVisitDate"    TIMESTAMP(3) NOT NULL,
    "oldStartTime"    TIMESTAMP(3) NOT NULL,
    "oldEndTime"      TIMESTAMP(3) NOT NULL,
    "newVisitDate"    TIMESTAMP(3) NOT NULL,
    "newStartTime"    TIMESTAMP(3) NOT NULL,
    "newEndTime"      TIMESTAMP(3) NOT NULL,
    "reason"          TEXT NOT NULL,
    "changedByUserId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reschedule_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_reschedule_histories_appointmentId_idx" ON "appointment_reschedule_histories"("appointmentId");

-- AddForeignKey
ALTER TABLE "appointment_reschedule_histories"
  ADD CONSTRAINT "appointment_reschedule_histories_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
