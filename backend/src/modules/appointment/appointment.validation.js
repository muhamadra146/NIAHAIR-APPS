const {
  object, string, optional, pipe, minLength, regex,
  picklist, number, minValue, array,
} = require("valibot");

const SLOT_KEYS = ["stylist", "asisten", "colorist"];

const staffSlotSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  slotKey:    optional(picklist(SLOT_KEYS, "Invalid slotKey")),
});

const APPOINTMENT_STATUSES = [
  "BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW",
];

// HH:MM — matches 00:00 through 23:59
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const serviceLineSchema = object({
  itemId: pipe(string(), minLength(1, "itemId is required")),
  qty:    pipe(number(), minValue(1,  "qty must be >= 1")),
  price:  pipe(number(), minValue(0,  "price must be >= 0")),
  notes:  optional(string()),
});

const APPOINTMENT_TYPES = ["SALON", "HOME_SERVICE"];

const createAppointmentSchema = object({
  customerId:          pipe(string(), minLength(1, "customerId is required")),
  visitDate:           pipe(string(), minLength(1, "visitDate is required")),
  startTime:           pipe(string(), regex(HH_MM, "startTime must be HH:MM (e.g. 09:00)")),
  endTime:             pipe(string(), regex(HH_MM, "endTime must be HH:MM (e.g. 12:00)")),
  type:                optional(picklist(APPOINTMENT_TYPES, "Invalid appointment type")),
  homeServiceAddress:  optional(string()),
  notes:               optional(string()),
  estimatedTotal:      optional(pipe(number(), minValue(0, "estimatedTotal must be >= 0"))),
  services:      optional(array(serviceLineSchema)),
  staffsBySlot:  optional(array(staffSlotSchema)),
});

const updateAppointmentSchema = object({
  visitDate:           optional(string()),
  startTime:           optional(pipe(string(), regex(HH_MM, "startTime must be HH:MM (e.g. 09:00)"))),
  endTime:             optional(pipe(string(), regex(HH_MM, "endTime must be HH:MM (e.g. 12:00)"))),
  type:                optional(picklist(APPOINTMENT_TYPES, "Invalid appointment type")),
  homeServiceAddress:  optional(string()),
  notes:               optional(string()),
  estimatedTotal:  optional(pipe(number(), minValue(0, "estimatedTotal must be >= 0"))),
  staffsBySlot:    optional(array(staffSlotSchema)),
});

const changeStatusSchema = object({
  status:       picklist(APPOINTMENT_STATUSES, "Invalid appointment status"),
  notes:        optional(string()),
  cancelReason: optional(string()),
});

const rescheduleSchema = object({
  visitDate: pipe(string(), minLength(1, "visitDate is required")),
  startTime: pipe(string(), regex(HH_MM, "startTime must be HH:MM (e.g. 09:00)")),
  endTime:   pipe(string(), regex(HH_MM, "endTime must be HH:MM (e.g. 12:00)")),
  reason:    pipe(string(), minLength(1, "reason is required")),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema, changeStatusSchema, rescheduleSchema };
