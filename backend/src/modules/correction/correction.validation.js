'use strict';

const { object, string, optional, pipe, minLength, picklist, trim, check } = require('valibot');

const DATE_TIME = pipe(
  string('Format jam tidak valid'),
  check((v) => !Number.isNaN(Date.parse(v)), 'Format jam tidak valid'),
);

const createCorrectionSchema = object({
  staffScheduleId:   pipe(string('Jadwal wajib dipilih'), minLength(1, 'Jadwal wajib dipilih')),
  attendanceId:      optional(string('Data absensi tidak valid')),
  requestedCheckIn:  optional(DATE_TIME),
  requestedCheckOut: optional(DATE_TIME),
  // Alasan berisi spasi saja ditolak (dipangkas dulu)
  reason:            pipe(string('Alasan wajib diisi'), trim(), minLength(1, 'Alasan wajib diisi')),
  branchId:          optional(string('Cabang tidak valid')),
}, 'Data pengajuan koreksi tidak valid');

const reviewCorrectionSchema = object({
  status:     picklist(['APPROVED', 'REJECTED'], 'Status harus APPROVED atau REJECTED'),
  reviewNote: optional(string('Catatan harus berupa teks')),
}, 'Data persetujuan tidak valid');

module.exports = { createCorrectionSchema, reviewCorrectionSchema };
