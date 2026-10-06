-- Satu karyawan boleh memegang beberapa peran (pemasang/asisten/colorist) di booking yang sama.
-- Unik sekarang per (booking, karyawan, peran). Aturan lebih longgar: data lama tetap valid.

-- DropIndex
DROP INDEX "appointment_staffs_appointmentId_employeeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "appointment_staffs_appointmentId_employeeId_slotKey_key" ON "appointment_staffs"("appointmentId", "employeeId", "slotKey");

