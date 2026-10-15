const { object, string, optional, nullable, pipe, minLength } = require("valibot");

const createSessionSchema = object({
  customerId:    pipe(string(), minLength(1, "Pelanggan wajib dipilih")),
  branchId:      pipe(string(), minLength(1, "Cabang wajib dipilih")),
  appointmentId: optional(string()),
  startedAt:     optional(string()),
  notes:         optional(string()),
});

const updateSessionSchema = object({
  // null = batalkan status selesai (didukung service)
  completedAt: optional(nullable(string())),
  notes:       optional(string()),
});

module.exports = { createSessionSchema, updateSessionSchema };
