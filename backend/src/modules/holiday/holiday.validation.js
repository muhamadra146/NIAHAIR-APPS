'use strict';

const { object, string, optional, pipe, minLength } = require('valibot');

const createHolidaySchema = object({
  date: pipe(string(), minLength(1, 'date is required')),
  name: pipe(string(), minLength(1, 'name is required')),
});

const updateHolidaySchema = object({
  date: optional(string()),
  name: optional(string()),
});

module.exports = { createHolidaySchema, updateHolidaySchema };
