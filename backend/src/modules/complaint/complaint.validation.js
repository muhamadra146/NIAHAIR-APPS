const { object, string, pipe, minLength, optional, picklist, integer, number, minValue } = require("valibot");

const createComplaintSchema = object({
  branchId:      optional(string()),
  appointmentId: pipe(string(), minLength(1, "appointmentId wajib diisi")),
  invoiceId:     optional(string()),
  employeeId:    optional(string()),
  category:      picklist(
    ["HASIL_LAYANAN", "SIKAP_KARYAWAN", "WAKTU_TUNGGU", "HARGA", "FASILITAS", "PRODUK", "LAINNYA"],
    "Kategori tidak valid",
  ),
  severity:    optional(picklist(["LOW", "MEDIUM", "HIGH"], "Tingkat keparahan tidak valid")),
  description: pipe(string(), minLength(1, "Deskripsi wajib diisi")),
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
  correctedStrands: optional(pipe(number(), integer(), minValue(0))),
  totalStrands:     optional(pipe(number(), integer(), minValue(1))),
  commissionId:     optional(string()),
});

module.exports = { createComplaintSchema, updateComplaintSchema };
