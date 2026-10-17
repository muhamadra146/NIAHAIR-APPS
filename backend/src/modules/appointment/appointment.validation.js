const {
  object, string, optional, pipe, minLength, regex, check,
  picklist, number, minValue, array,
} = require("valibot");

// Field wajib: kunci yang tidak dikirim diperlakukan sama dengan kosong agar pesan
// error tetap Bahasa Indonesia (bukan "Invalid key: Expected …" bawaan valibot).
const requiredString = (message) => pipe(optional(string(message), ""), minLength(1, message));

const SLOT_KEYS = ["pemasang", "asisten", "colorist"];

const staffSlotSchema = object({
  employeeId: requiredString("Karyawan wajib dipilih"),
  slotKey:    optional(picklist(SLOT_KEYS, "Slot tidak valid")),
});

const APPOINTMENT_STATUSES = [
  "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
];

// HH:MM — matches 00:00 through 23:59 (kosong ditangani pesan "wajib diisi")
const HH_MM          = /^([01]\d|2[0-3]):[0-5]\d$/;
const HH_MM_OR_EMPTY = /^(?:([01]\d|2[0-3]):[0-5]\d)?$/;

const requiredTime = (label, example) => pipe(
  requiredString(`${label} wajib diisi`),
  regex(HH_MM_OR_EMPTY, `${label} harus format JJ:MM (mis. ${example})`),
);

const serviceLineSchema = object({
  itemId: requiredString("Item wajib dipilih"),
  qty:    pipe(number("Jumlah wajib diisi"), minValue(1,  "Jumlah minimal 1")),
  price:  pipe(number("Harga wajib diisi"),  minValue(0,  "Harga tidak boleh negatif")),
  notes:  optional(string()),
});

const APPOINTMENT_TYPES = ["SALON", "HOME_SERVICE"];

// Catatan: tanggal lampau, booking tanpa layanan, dan staf bentrok sengaja TIDAK divalidasi
// (APT-005, APT-007, APT-011 — keputusan owner 2026-10-17: biarkan fleksibel).
const createAppointmentSchema = object({
  customerId:          requiredString("Pelanggan wajib dipilih"),
  visitDate:           requiredString("Tanggal kunjungan wajib diisi"),
  startTime:           requiredTime("Jam mulai", "09:00"),
  endTime:             requiredTime("Jam selesai", "12:00"),
  type:                optional(picklist(APPOINTMENT_TYPES, "Tipe booking tidak valid")),
  homeServiceAddress:  optional(string()),
  notes:               optional(string()),
  estimatedTotal:      optional(pipe(number(), minValue(0, "Estimasi total tidak boleh negatif"))),
  services:      optional(array(serviceLineSchema)),
  staffsBySlot:  optional(array(staffSlotSchema)),
});

const updateAppointmentSchema = object({
  visitDate:           optional(string()),
  startTime:           optional(pipe(string(), regex(HH_MM, "Jam mulai harus format JJ:MM (mis. 09:00)"))),
  endTime:             optional(pipe(string(), regex(HH_MM, "Jam selesai harus format JJ:MM (mis. 12:00)"))),
  type:                optional(picklist(APPOINTMENT_TYPES, "Tipe booking tidak valid")),
  homeServiceAddress:  optional(string()),
  notes:               optional(string()),
  estimatedTotal:  optional(pipe(number(), minValue(0, "Estimasi total tidak boleh negatif"))),
  staffsBySlot:    optional(array(staffSlotSchema)),
});

const changeStatusSchema = object({
  status: pipe(
    requiredString("Status baru wajib dipilih"),
    check((s) => s === "" || APPOINTMENT_STATUSES.includes(s), "Status booking tidak valid"),
  ),
  notes:        optional(string()),
  cancelReason: optional(string()),
});

const rescheduleSchema = object({
  visitDate: requiredString("Tanggal kunjungan wajib diisi"),
  startTime: requiredTime("Jam mulai", "09:00"),
  endTime:   requiredTime("Jam selesai", "12:00"),
  reason:    requiredString("Alasan wajib diisi"),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, changeStatusSchema, rescheduleSchema };
