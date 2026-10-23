'use strict';

const { object, string, optional, pipe, minLength, trim, check } = require('valibot');

// Tanggal mustahil (mis. 2026-02-30) ditolak di service (400 "Tanggal tidak valid")
const DATE = pipe(string('Tanggal wajib diisi'), minLength(1, 'Tanggal wajib diisi'), check((v) => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid'));
const NAME = pipe(string('Nama wajib diisi'), trim(), minLength(1, 'Nama wajib diisi'));

const createHolidaySchema = object({
  date: DATE,
  name: NAME,
}, 'Data hari libur tidak valid');

const updateHolidaySchema = object({
  date: optional(DATE),
  name: optional(NAME),
}, 'Data hari libur tidak valid');

module.exports = { createHolidaySchema, updateHolidaySchema };
