'use strict';

const { object, string, optional, pipe, minLength, trim, check } = require('valibot');

const DATE = pipe(string(), minLength(1, 'Tanggal wajib diisi'), check((v) => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid'));
const NAME = pipe(string(), trim(), minLength(1, 'Nama wajib diisi'));

const createHolidaySchema = object({
  date: DATE,
  name: NAME,
});

const updateHolidaySchema = object({
  date: optional(DATE),
  name: optional(NAME),
});

module.exports = { createHolidaySchema, updateHolidaySchema };
