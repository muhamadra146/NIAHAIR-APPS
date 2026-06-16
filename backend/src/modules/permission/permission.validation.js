const { object, string, pipe, minLength, optional, picklist } = require("valibot");

const createPermissionSchema = object({
  type:             optional(picklist(["ABSENCE", "LATE"])),
  date:             pipe(string(), minLength(1, "Tanggal wajib diisi")),
  reason:           pipe(string(), minLength(3, "Alasan minimal 3 karakter")),
  notes:            optional(string()),
  estimatedArrival: optional(string()),
});

const reviewPermissionSchema = object({
  reviewNote: optional(string()),
});

module.exports = { createPermissionSchema, reviewPermissionSchema };
