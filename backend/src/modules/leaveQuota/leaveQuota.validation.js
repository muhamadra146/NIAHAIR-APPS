'use strict';

const { object, string, number, pipe, minLength, integer, minValue } = require('valibot');

const assignLeaveQuotaSchema = object({
  employeeId:  pipe(string(), minLength(1, 'employeeId is required')),
  leaveTypeId: pipe(string(), minLength(1, 'leaveTypeId is required')),
  year:        pipe(number(), integer(), minValue(2000)),
  totalDays:   pipe(number(), minValue(0)),
});

module.exports = { assignLeaveQuotaSchema };
