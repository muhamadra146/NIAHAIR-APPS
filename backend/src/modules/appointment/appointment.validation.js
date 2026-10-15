const {
  object, string, optional, pipe, minLength, regex,
  picklist, number, minValue, array,
} = require("valibot");

const SLOT_KEYS = ["pemasang", "asisten", "colorist"];

const staffSlotSchema = object({
  employeeId: pipe(string(), minLength(1, "Karyawan wajib dipilih")),
  slotKey:    optional(picklist(SLOT_KEYS, "Slot tidak valid")),
});

const APPOINTMENT_STATUSES = [
  "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
];

// HH:MM — matches 00:00 through 23:59
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const serviceLineSchema = object({
  itemId: pipe(string(), minLength(1, "Item wajib dipilih")),
  qty:    pipe(number(), minValue(1,  "Jumlah minimal 1")),
  price:  pipe(number(), minValue(0,  "Harga tidak boleh negatif")),
  notes:  optional(string()),
});

const APPOINTMENT_TYPES = ["SALON", "HOME_SERVICE"];

const createAppointmentSchema = object({
  customerId:          pipe(string(), minLength(1, "Pelanggan wajib dipilih")),
  visitDate:           pipe(string(), minLength(1, "Tanggal kunjungan wajib diisi")),
  startTime:           pipe(string(), regex(HH_MM, "Jam mulai harus format JJ:MM (mis. 09:00)")),
  endTime:             pipe(string(), regex(HH_MM, "Jam selesai harus format JJ:MM (mis. 12:00)")),
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
  status:       picklist(APPOINTMENT_STATUSES, "Status booking tidak valid"),
  notes:        optional(string()),
  cancelReason: optional(string()),
});

const rescheduleSchema = object({
  visitDate: pipe(string(), minLength(1, "Tanggal kunjungan wajib diisi")),
  startTime: pipe(string(), regex(HH_MM, "Jam mulai harus format JJ:MM (mis. 09:00)")),
  endTime:   pipe(string(), regex(HH_MM, "Jam selesai harus format JJ:MM (mis. 12:00)")),
  reason:    pipe(string(), minLength(1, "Alasan wajib diisi")),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, changeStatusSchema, rescheduleSchema };
