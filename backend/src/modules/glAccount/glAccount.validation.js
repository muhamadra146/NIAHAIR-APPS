const { object, string, nullable, pipe, maxLength } = require("valibot");

// PATCH /gl-accounts/:id/usage — field usage wajib dikirim (null = lepas tag). Tanpa body
// ditolak agar tag tidak terhapus diam-diam (G5-09)
const updateUsageSchema = object({
  usage: nullable(pipe(string("Penggunaan akun harus berupa teks"), maxLength(50, "Penggunaan akun maksimal 50 karakter"))),
});

module.exports = { updateUsageSchema };
