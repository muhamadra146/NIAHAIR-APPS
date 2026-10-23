'use strict';

const { object, string, number, pipe, minLength, integer, minValue } = require('valibot');

const assignLeaveQuotaSchema = object({
  employeeId:  pipe(string('Karyawan wajib dipilih'), minLength(1, 'Karyawan wajib dipilih')),
  leaveTypeId: pipe(string('Jenis cuti wajib dipilih'), minLength(1, 'Jenis cuti wajib dipilih')),
  year:        pipe(number('Tahun wajib diisi'), integer('Tahun harus bilangan bulat'), minValue(2000, 'Tahun tidak valid')),
  totalDays:   pipe(number('Jatah cuti wajib diisi'), integer('Jatah cuti harus bilangan bulat'), minValue(0, 'Jatah cuti tidak boleh negatif')),
}, 'Data jatah cuti tidak valid');

module.exports = { assignLeaveQuotaSchema };
