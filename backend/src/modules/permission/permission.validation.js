const { object, string, pipe, minLength, optional, picklist, trim } = require("valibot");

// Pesan Bahasa Indonesia juga untuk galat tipe (bawaan Valibot berbahasa Inggris)
const createPermissionSchema = object({
  type:             optional(picklist(["ABSENCE", "LATE"], "Jenis izin harus Tidak Hadir atau Terlambat")),
  date:             pipe(string("Tanggal wajib diisi"), minLength(1, "Tanggal wajib diisi")),
  // Alasan berisi spasi saja ditolak (di-trim dulu)
  reason:           pipe(string("Alasan wajib diisi"), trim(), minLength(3, "Alasan minimal 3 karakter")),
  notes:            optional(string("Keterangan harus berupa teks")),
  estimatedArrival: optional(string("Estimasi jam datang harus berupa teks")),
}, "Data izin tidak valid");

const reviewPermissionSchema = object({
  reviewNote: optional(string("Catatan harus berupa teks")),
}, "Data tidak valid");

module.exports = { createPermissionSchema, reviewPermissionSchema };
