const {
  object, array, string, pipe, minLength, optional, nullable, picklist,
} = require("valibot");

const scheduleItemSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  date:       pipe(string(), minLength(1, "date is required")),
  shiftId:    optional(nullable(string())),
  status:     optional(nullable(picklist(["WORKING", "OFF", "LEAVE"]))),
});

const bulkScheduleSchema = object({
  branchId:  pipe(string(), minLength(1, "branchId is required")),
  schedules: array(scheduleItemSchema),
});

module.exports = { bulkScheduleSchema };
