'use strict';

const { object, string, number, boolean, optional, pipe, minLength, picklist } = require('valibot');

const QUOTA_TYPE = picklist(['ANNUAL', 'EVENT_BASED', 'LIFETIME']);

const createLeaveTypeSchema = object({
  code:                pipe(string(), minLength(1, 'code is required')),
  name:                pipe(string(), minLength(1, 'name is required')),
  quotaType:           optional(QUOTA_TYPE),
  maxDaysPerYear:      optional(number()),
  isPaid:              optional(boolean()),
  unusedDayPayoutRate: optional(number()),
});

const updateLeaveTypeSchema = object({
  code:                optional(string()),
  name:                optional(string()),
  quotaType:           optional(QUOTA_TYPE),
  maxDaysPerYear:      optional(number()),
  isPaid:              optional(boolean()),
  unusedDayPayoutRate: optional(number()),
});

module.exports = { createLeaveTypeSchema, updateLeaveTypeSchema };
