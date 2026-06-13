-- CreateEnum
CREATE TYPE "AppointmentPhotoType" AS ENUM ('REFERENCE', 'HAIR_CURRENT');

-- CreateTable
CREATE TABLE "appointment_photos" (
  "id"            TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "url"           TEXT NOT NULL,
  "publicId"      TEXT NOT NULL,
  "type"          "AppointmentPhotoType" NOT NULL DEFAULT 'REFERENCE',
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "appointment_photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "appointment_photos"
  ADD CONSTRAINT "appointment_photos_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "appointment_photos_appointmentId_idx" ON "appointment_photos"("appointmentId");
