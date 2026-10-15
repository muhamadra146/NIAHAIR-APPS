'use strict';

const { object, string, optional, pipe, minLength } = require('valibot');

const createHolidaySchema = object({
  date: pipe(string(), minLength(1, 'Tanggal wajib diisi')),
  name: pipe(string(), minLength(1, 'Nama wajib diisi')),
});

const updateHolidaySchema = object({
  date: optional(string()),
  name: optional(string()),
});

module.exports = { createHolidaySchema, updateHolidaySchema };
