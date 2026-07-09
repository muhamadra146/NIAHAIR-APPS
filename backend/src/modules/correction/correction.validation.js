'use strict';

const { object, string, optional, pipe, minLength, picklist } = require('valibot');

const createCorrectionSchema = object({
  staffScheduleId:   pipe(string(), minLength(1, 'staffScheduleId is required')),
  attendanceId:      optional(string()),
  requestedCheckIn:  optional(string()),
  requestedCheckOut: optional(string()),
  reason:            pipe(string(), minLength(1, 'reason is required')),
  branchId:          optional(string()),
});

const reviewCorrectionSchema = object({
  status:     picklist(['APPROVED', 'REJECTED']),
  reviewNote: optional(string()),
});

module.exports = { createCorrectionSchema, reviewCorrectionSchema };
