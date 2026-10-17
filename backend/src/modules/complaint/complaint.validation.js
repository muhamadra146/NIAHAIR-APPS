const { object, string, pipe, minLength, optional, picklist, integer, number, minValue, check } = require("valibot");

// Field wajib: kunci yang tidak dikirim diperlakukan sama dengan kosong agar pesan tetap Bahasa Indonesia
const requiredString = (message) => pipe(optional(string(message), ""), minLength(1, message));

const CATEGORIES = ["HASIL_LAYANAN", "SIKAP_KARYAWAN", "WAKTU_TUNGGU", "HARGA", "FASILITAS", "PRODUK", "LAINNYA"];

const createComplaintSchema = object({
  branchId:      optional(string()),
  appointmentId: requiredString("Booking wajib dipilih"),
  invoiceId:     optional(string()),
  employeeId:    optional(string()),
  category:      pipe(
    requiredString("Kategori wajib dipilih"),
    check((c) => c === "" || CATEGORIES.includes(c), "Kategori tidak valid"),
  ),
  severity:    optional(picklist(["LOW", "MEDIUM", "HIGH"], "Tingkat keparahan tidak valid")),
  description: requiredString("Deskripsi wajib diisi"),
  // Follow up & komunikasi
  followUpDate: optional(string()),
  chatNotes:    optional(string()),
  // Perbaikan
  repairDate:      optional(string()),
  repairNotes:     optional(string()),
  repairStaff:     optional(string()),
  repairAssistant: optional(string()),
});

const updateComplaintSchema = object({
  status:          optional(picklist(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], "Status tidak valid")),
  handledBy:       optional(string()),
  // Follow up & komunikasi
  followUpDate:    optional(string()),   // ISO date string
  chatNotes:       optional(string()),
  // Resolusi
  resolutionNotes: optional(string()),
  followUpAction:  optional(string()),
  // Perbaikan
  repairDate:      optional(string()),   // ISO date string
  repairNotes:     optional(string()),
  repairStaff:     optional(string()),
  repairAssistant: optional(string()),
  // Potongan komisi
  correctedStrands: optional(pipe(number("Helaian diperbaiki harus angka"), integer("Helaian diperbaiki harus bilangan bulat"), minValue(0, "Helaian diperbaiki tidak boleh negatif"))),
  totalStrands:     optional(pipe(number("Total helaian harus angka"), integer("Total helaian harus bilangan bulat"), minValue(1, "Total helaian minimal 1"))),
  commissionId:     optional(string()),
});

module.exports = { createComplaintSchema, updateComplaintSchema };
