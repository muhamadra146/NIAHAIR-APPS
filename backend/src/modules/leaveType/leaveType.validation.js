'use strict';

const { object, string, number, boolean, optional, pipe, minLength, picklist, integer, minValue, trim } = require('valibot');

const QUOTA_TYPE = picklist(['ANNUAL', 'EVENT_BASED', 'LIFETIME'], 'Jenis kuota tidak valid');

// Jumlah hari per tahun: bilangan bulat, tidak negatif
const MAX_DAYS    = pipe(number('Maksimal hari per tahun harus berupa angka'), integer('Maksimal hari per tahun harus bilangan bulat'), minValue(0, 'Maksimal hari per tahun tidak boleh negatif'));
const PAYOUT_RATE = pipe(number('Tarif uang pengganti harus berupa angka'), minValue(0, 'Tarif uang pengganti tidak boleh negatif'));

const createLeaveTypeSchema = object({
  code:                pipe(string('Kode wajib diisi'), trim(), minLength(1, 'Kode wajib diisi')),
  name:                pipe(string('Nama wajib diisi'), trim(), minLength(1, 'Nama wajib diisi')),
  quotaType:           optional(QUOTA_TYPE),
  maxDaysPerYear:      optional(MAX_DAYS),
  isPaid:              optional(boolean('Pilihan dibayar tidak valid')),
  unusedDayPayoutRate: optional(PAYOUT_RATE),
}, 'Data jenis cuti tidak valid');

const updateLeaveTypeSchema = object({
  code:                optional(pipe(string('Kode harus berupa teks'), trim(), minLength(1, 'Kode tidak boleh kosong'))),
  name:                optional(pipe(string('Nama harus berupa teks'), trim(), minLength(1, 'Nama tidak boleh kosong'))),
  quotaType:           optional(QUOTA_TYPE),
  maxDaysPerYear:      optional(MAX_DAYS),
  isPaid:              optional(boolean('Pilihan dibayar tidak valid')),
  unusedDayPayoutRate: optional(PAYOUT_RATE),
  isActive:            optional(boolean('Status aktif tidak valid')),
}, 'Data jenis cuti tidak valid');

module.exports = { createLeaveTypeSchema, updateLeaveTypeSchema };
