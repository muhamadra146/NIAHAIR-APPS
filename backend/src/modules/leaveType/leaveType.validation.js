'use strict';

const { object, string, number, boolean, optional, pipe, minLength, picklist, integer, minValue, trim } = require('valibot');

const QUOTA_TYPE = picklist(['ANNUAL', 'EVENT_BASED', 'LIFETIME']);

// Jumlah hari per tahun: bilangan bulat, tidak negatif
const MAX_DAYS    = pipe(number(), integer('Maksimal hari per tahun harus bilangan bulat'), minValue(0, 'Maksimal hari per tahun tidak boleh negatif'));
const PAYOUT_RATE = pipe(number(), minValue(0, 'Tarif uang pengganti tidak boleh negatif'));

const createLeaveTypeSchema = object({
  code:                pipe(string(), trim(), minLength(1, 'Kode wajib diisi')),
  name:                pipe(string(), trim(), minLength(1, 'Nama wajib diisi')),
  quotaType:           optional(QUOTA_TYPE),
  maxDaysPerYear:      optional(MAX_DAYS),
  isPaid:              optional(boolean()),
  unusedDayPayoutRate: optional(PAYOUT_RATE),
});

const updateLeaveTypeSchema = object({
  code:                optional(pipe(string(), trim(), minLength(1, 'Kode tidak boleh kosong'))),
  name:                optional(pipe(string(), trim(), minLength(1, 'Nama tidak boleh kosong'))),
  quotaType:           optional(QUOTA_TYPE),
  maxDaysPerYear:      optional(MAX_DAYS),
  isPaid:              optional(boolean()),
  unusedDayPayoutRate: optional(PAYOUT_RATE),
  isActive:            optional(boolean()),
});

module.exports = { createLeaveTypeSchema, updateLeaveTypeSchema };
